"use client";

// BrowserPreview — the integrated browser pane for one browser tab (DOC/10 §4).
// A web clone of the VS Code integrated browser (contrib/browserView): navbar =
// nav toolbar (back/forward/reload) + URL container + actions toolbar. The URL
// container doubles as the quick-input anchor — focusing it opens the picker
// (Recents / History / Open Tabs groups, the group label collapsing into the
// first row, right-aligned) and typing offers the primary action rows
// ("{text} - Bing Search" and/or the go-to entry, order per the URL-vs-query
// heuristic) plus history matches. VS Code saves page titles with history; a
// clone cannot read cross-origin titles, so rows fall back to host + URL (the
// same fallback the real Recents picker uses for untitled pages).
// The two chat actions in the real actions toolbar (Add Element to Chat,
// Comment on Elements) render disabled — no chat engine here — while the ⋯
// menu carries the real actions (copy URL / open externally / reload / suspend
// / clear history). Manual suspend unmounts the iframe to free the renderer;
// the paused card mirrors browser-overlay-paused.
//
// Cross-origin walls (no title, no favicon, no page JS) are inherent to a web
// clone. Framing refusals are not: before an iframe mounts, the pane asks
// /api/embed-check for a verdict (session-cached per origin) and shows its own
// blocked card instead of Chrome's error page. Mapped URLs (Google's igu=1
// search, YouTube /embed/) skip the check — they are known embeddable — and
// the card offers a read-only view through /api/embed for everything else.
// Search rows use Bing: it sends no framing block, so results render in-frame.
// See DOC/10 §4.
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { resolveEmbedSrc } from "@/lib/embedTargets";
import { browserTabLabel, normalizeBrowserUrl, useStore } from "@/lib/store";
import Codicon from "./Codicon";
import Menu, { type MenuItem } from "./Menu";
import Tooltip from "./Tooltip";

// Picker rows: primary actions + Recents/History/Open Tabs entries.
type Row =
  | { kind: "goto"; label: string; url: string; header?: string }
  | { kind: "search"; label: string; url: string; header?: string }
  | { kind: "visit"; label: string; description: string; header?: string; url: string }
  | { kind: "tab"; label: string; header?: string; tabId: string };

// Search rows use Bing: verified to render its SERP inside the pane (Google
// and DuckDuckGo refuse framing; typed google.com URLs still map to Google's
// embeddable igu=1 page).
function searchUrl(text: string): string {
  return `https://www.bing.com/search?q=${encodeURIComponent(text)}`;
}

// Plain Enter (picker closed) behaves like the picker's first action row.
function defaultRow(text: string): Row | null {
  const norm = normalizeBrowserUrl(text);
  if (norm) return { kind: "goto", label: text, url: norm };
  if (text)
    return { kind: "search", label: `${text} - Bing Search`, url: searchUrl(text) };
  return null;
}

// Framing verdicts from /api/embed-check, cached per origin for the session:
// the headers rarely differ per path and the probe is a full round trip.
type Verdict = { verdict: "allowed" | "blocked" | "unknown"; reason?: string };
const VERDICT_TTL_MS = 10 * 60_000;
const verdicts = new Map<string, Verdict & { at: number }>();

function readVerdict(url: string): Verdict | null {
  let key: string;
  try {
    key = new URL(url).origin;
  } catch {
    return null;
  }
  const hit = verdicts.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > VERDICT_TTL_MS) {
    verdicts.delete(key);
    return null;
  }
  return hit;
}

function writeVerdict(url: string, verdict: Verdict): void {
  try {
    verdicts.set(new URL(url).origin, { ...verdict, at: Date.now() });
  } catch {
    // Unparseable URLs are never cached.
  }
}

function forgetVerdict(url: string): void {
  try {
    verdicts.delete(new URL(url).origin);
  } catch {
    // nothing to forget
  }
}

// Load pipeline for the pane: a new URL starts "checking"; "ready" lets the
// iframe mount; "loaded" stops the fallback timer; "blocked" pins the card.
// Every entry carries the URL it belongs to, so a stale verdict never leaks
// into a freshly typed address.
type LoadState =
  | { url: string; phase: "checking" }
  | { url: string; phase: "ready" }
  | { url: string; phase: "loaded" }
  | { url: string; phase: "blocked"; reason: string | null };

// Toolbar action button: 28px square, 4px apart (actions-toolbar). Disabled
// keeps the glyph at 40% and the default cursor (chat actions, no engine).
function NavButton({
  icon,
  label,
  disabled = false,
  align = "center",
  onClick,
}: {
  icon: string;
  label: string;
  disabled?: boolean;
  align?: "center" | "start" | "end";
  onClick?: () => void;
}) {
  return (
    <Tooltip text={label} position="bottom" align={align}>
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        onClick={onClick}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-control text-vscode-fg ${
          disabled ? "cursor-default opacity-40" : "hover:bg-vscode-toolbar-hover"
        }`}
      >
        <Codicon name={icon} />
      </button>
    </Tooltip>
  );
}

const BTN_PRIMARY =
  "h-[26px] shrink-0 rounded-control bg-vscode-accent px-3 text-[13px] text-white hover:bg-vscode-accent-hover";
const BTN_SECONDARY =
  "h-[26px] shrink-0 rounded-control bg-vscode-quick-input-bg px-3 text-[13px] text-vscode-fg hover:bg-vscode-quick-input-border";

export default function BrowserPreview({ tabId }: { tabId: string }) {
  const state = useStore((s) => s.browser[tabId]);
  const tabs = useStore((s) => s.tabs);
  const history = useStore((s) => s.browserHistory);
  const focusNonce = useStore((s) => s.browserFocusNonce);

  const url = state?.url ?? "";
  const canBack = !!state && state.idx > 0;
  const canForward = !!state && state.idx < state.hist.length - 1;

  const [value, setValue] = useState(url);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [load, setLoad] = useState<LoadState | null>(null);
  const [proxy, setProxy] = useState<{ url: string; src: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlWrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // The address bar follows the instance URL (typing, back/forward, terminal).
  useEffect(() => {
    setValue(url);
  }, [url]);

  // Iframe sources: known-embeddable mappings for the URL itself (address bar
  // keeps what the user typed), otherwise the URL, or the read-only view.
  const mappedSrc = useMemo(() => (url ? resolveEmbedSrc(url) : ""), [url]);
  const isMapped = !!url && mappedSrc !== url;
  const proxyActive = !!proxy && proxy.url === url;
  const frameSrc = proxyActive && proxy ? proxy.src : mappedSrc;

  // A stale proxy belongs to an old address.
  useEffect(() => {
    setProxy((current) => (current && current.url === url ? current : null));
  }, [url]);

  // Pre-flight: mapped URLs mount straight away; everything else gets a
  // session-cached verdict from /api/embed-check before the iframe may mount.
  // A failed probe degrades to "ready" (best effort, 8s fallback still runs).
  useEffect(() => {
    if (!url || state?.suspended) {
      setLoad(null);
      return;
    }
    if (isMapped) {
      setLoad({ url, phase: "ready" });
      return;
    }
    const cached = readVerdict(url);
    if (cached) {
      setLoad(
        cached.verdict === "blocked"
          ? { url, phase: "blocked", reason: cached.reason ?? null }
          : { url, phase: "ready" },
      );
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    const timer = window.setTimeout(() => controller.abort(), 6000);
    setLoad({ url, phase: "checking" });

    fetch(`/api/embed-check?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
    })
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error("probe")),
      )
      .then((verdict: Verdict) => {
        if (cancelled) return;
        writeVerdict(url, verdict);
        setLoad(
          verdict.verdict === "blocked"
            ? { url, phase: "blocked", reason: verdict.reason ?? null }
            : { url, phase: "ready" },
        );
      })
      .catch(() => {
        if (!cancelled) setLoad({ url, phase: "ready" });
      })
      .finally(() => window.clearTimeout(timer));

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [url, isMapped, state?.suspended, state?.reloadKey]);

  // Fallback for frames that never fire load (allowed/unknown verdicts).
  const phase = url && !state?.suspended ? (load && load.url === url ? load.phase : "checking") : null;
  useEffect(() => {
    if (phase !== "ready") return;
    const timer = window.setTimeout(() => {
      setLoad((current) =>
        current && current.url === url && current.phase === "ready"
          ? { url, phase: "blocked", reason: null }
          : current,
      );
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [phase, url, state?.reloadKey]);

  // "Focus URL Input" (Ctrl+L / palette): focus + select + open the picker.
  useEffect(() => {
    if (!focusNonce) return;
    if (useStore.getState().activeTabId !== tabId) return;
    inputRef.current?.focus();
    inputRef.current?.select();
    setOpen(true);
  }, [focusNonce, tabId]);

  // A fresh tab opens the picker ready for typing (VS Code does the same).
  useEffect(() => {
    const st = useStore.getState();
    if (st.activeTabId === tabId && !st.browser[tabId]?.url) {
      inputRef.current?.focus();
      setOpen(true);
    }
    // Mount-only: keep-alive tabs keep whatever state they had.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click-away closes the picker (rows keep focus via mousedown preventDefault).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!urlWrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  // Explicit reloads drop the cached verdict so the probe runs again.
  const reload = () => {
    forgetVerdict(url);
    useStore.getState().reloadBrowser(tabId);
  };

  const openReadOnly = () => {
    if (!url) return;
    setProxy({ url, src: `/api/embed?url=${encodeURIComponent(url)}` });
    setLoad({ url, phase: "ready" });
  };

  const q = value.trim();
  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    if (q) {
      const norm = normalizeBrowserUrl(q);
      const search: Row = {
        kind: "search",
        label: `${q} - Bing Search`,
        url: searchUrl(q),
      };
      // URL-like input: navigation first, search fallback. Query: search only.
      if (norm) out.push({ kind: "goto", label: q, url: norm });
      out.push(search);
      const needle = q.toLowerCase();
      history
        .filter((u) => u.toLowerCase().includes(needle))
        .slice(0, 6)
        .forEach((u, i) =>
          out.push({
            kind: "visit",
            label: browserTabLabel(u),
            description: u,
            header: i === 0 ? "History" : undefined,
            url: u,
          }),
        );
    } else {
      // Empty input: the three most recent explicit navigations (Recents),
      // then the other open browser tabs (Open Tabs).
      history.slice(0, 3).forEach((u, i) =>
        out.push({
          kind: "visit",
          label: browserTabLabel(u),
          description: u,
          header: i === 0 ? "Recents" : undefined,
          url: u,
        }),
      );
      tabs
        .filter((t) => t.kind === "browser" && t.id !== tabId)
        .forEach((t, i) =>
          out.push({
            kind: "tab",
            label: browserTabLabel(t.path),
            header: i === 0 ? "Open Tabs" : undefined,
            tabId: t.id,
          }),
        );
    }
    return out;
  }, [q, history, tabs, tabId]);

  const accept = (row: Row | undefined) => {
    const st = useStore.getState();
    setOpen(false);
    setIndex(0);
    if (!row) return;
    if (row.kind === "tab") {
      st.setActiveTab(row.tabId);
      return;
    }
    if (row.kind === "search") {
      // Bing renders in-frame, so search results load like any other page.
      // They open here while the tab is still empty, else in a new tab.
      if (st.browser[tabId]?.url) st.openBrowser(row.url);
      else st.navigateBrowser(tabId, row.url);
      return;
    }
    st.navigateBrowser(tabId, row.url);
  };

  const onInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!rows.length) return;
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const dir = e.key === "ArrowDown" ? 1 : -1;
      setIndex((i) => (i + dir + rows.length) % rows.length);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const row = open
        ? rows[Math.min(index, rows.length - 1)]
        : q
          ? defaultRow(q) ?? undefined
          : undefined;
      accept(row);
      return;
    }
    if (e.key === "Escape") {
      // First Escape closes the picker, a second one leaves the field.
      if (open) setOpen(false);
      else inputRef.current?.blur();
    }
  };

  const menuItems: MenuItem[] = [
    { id: "copy-url", label: "Copy URL", disabled: !url },
    { id: "external", label: "Open in External Browser", disabled: !url },
    { separator: true },
    { id: "reload", label: "Reload", disabled: !url },
    {
      id: "suspend",
      label: state?.suspended ? "Resume Tab" : "Suspend Tab",
      disabled: !url,
    },
    { separator: true },
    {
      id: "clear-history",
      label: "Clear Browser History",
      disabled: history.length === 0,
    },
  ];

  const fireMenu = (id: string) => {
    setMenuOpen(false);
    const st = useStore.getState();
    if (id === "copy-url" && url) void navigator.clipboard.writeText(url);
    else if (id === "external" && url)
      window.open(url, "_blank", "noopener");
    else if (id === "reload") reload();
    else if (id === "suspend") {
      if (st.browser[tabId]?.suspended) st.reloadBrowser(tabId);
      else st.suspendBrowser(tabId);
    } else if (id === "clear-history") st.clearBrowserHistory();
  };

  const showFrame =
    !!url && !state?.suspended && (phase === "ready" || phase === "loaded");

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-vscode-editor">
      {/* Navbar — 6/8/3 insets, 8px gaps, 4px inside each toolbar */}
      <div className="flex shrink-0 items-center gap-2 px-2 pb-[3px] pt-[6px]">
        <div className="flex shrink-0 items-center gap-1">
          <NavButton
            icon="arrow-left"
            label="Go Back"
            disabled={!canBack}
            onClick={() => useStore.getState().browserBack(tabId)}
          />
          <NavButton
            icon="arrow-right"
            label="Go Forward"
            disabled={!canForward}
            onClick={() => useStore.getState().browserForward(tabId)}
          />
          <NavButton
            icon="refresh"
            label="Reload"
            disabled={!url}
            onClick={reload}
          />
        </div>

        {/* URL container — the picker anchors to it (overlay below) */}
        <div ref={urlWrapRef} className="relative min-w-0 flex-1">
          <div
            className={`flex h-[26px] items-center rounded-quick-input border bg-vscode-quick-input-bg px-[6px] ${
              open ? "border-vscode-accent" : "border-vscode-quick-input-border"
            }`}
          >
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setOpen(true);
                setIndex(0);
              }}
              onFocus={() => {
                setOpen(true);
                inputRef.current?.select();
              }}
              onKeyDown={onInputKeyDown}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              placeholder="Search or enter URL"
              aria-label="Browser address"
              className="h-full w-full bg-transparent text-[13px] text-vscode-fg caret-vscode-accent outline-none placeholder:text-vscode-quick-placeholder"
            />
          </div>
          {open && rows.length > 0 ? (
            <div
              role="listbox"
              aria-label="Browser suggestions"
              className="absolute left-0 right-0 top-full z-30 mt-[3px] max-h-[min(40vh,440px)] overflow-y-auto rounded-quick border border-vscode-quick-border bg-vscode-quick-bg py-[4px] text-[13px] text-vscode-fg shadow-vscode"
            >
              <div className="px-[6px]">
                {rows.map((row, i) => {
                  const selected = i === index;
                  return (
                    <div
                      key={i}
                      role="option"
                      aria-selected={selected}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseMove={() => {
                        if (!selected) setIndex(i);
                      }}
                      onClick={() => accept(row)}
                      className={`flex h-[22px] items-center rounded-quick-row px-[6px] ${
                        selected
                          ? "bg-vscode-list-active text-vscode-fg-active"
                          : "hover:bg-vscode-list-hover"
                      }`}
                    >
                      <span className="flex h-full w-[22px] shrink-0 items-center justify-center pr-[6px] text-vscode-dim">
                        <Codicon name={row.kind === "search" ? "search" : "globe"} />
                      </span>
                      <span className="ml-[5px] min-w-0 flex-1 truncate">
                        {row.label}
                      </span>
                      {row.kind === "visit" ? (
                        <span className="ml-1.5 max-w-[55%] shrink-0 truncate text-vscode-muted">
                          {row.description}
                        </span>
                      ) : null}
                      {row.header ? (
                        <span className="ml-auto shrink-0 pl-2 text-xs text-vscode-dim">
                          {row.header}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <NavButton icon="comment" label="Comment on Elements" disabled />
          <NavButton icon="inspect" label="Add Element to Chat" disabled />
          <div ref={menuRef} className="relative">
            <NavButton
              icon="more"
              label="More Actions"
              align="end"
              onClick={() => setMenuOpen((v) => !v)}
            />
            {menuOpen ? (
              <Menu
                items={menuItems}
                onAction={fireMenu}
                density="compact"
                label="Browser actions"
                className="absolute right-0 top-full z-30 mt-1 min-w-48"
              />
            ) : null}
          </div>
        </div>
      </div>

      {/* Content — inset card; the iframe holds the page (or a state card) */}
      <div className="relative min-h-0 flex-1 px-2 pb-2">
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[4px] bg-vscode-editor">
          {proxyActive ? (
            <div className="flex h-6 shrink-0 items-center gap-1.5 border-b border-vscode-widget-border bg-vscode-editor px-2 text-[11px] text-vscode-muted">
              <Codicon name="eye" size={12} />
              <span className="truncate">
                Read-only view — scripts disabled, links stay in this view
              </span>
              <button
                type="button"
                className="ml-auto h-[18px] shrink-0 rounded-control px-1.5 text-[11px] text-vscode-fg hover:bg-vscode-toolbar-hover"
                onClick={() => {
                  setProxy(null);
                  reload();
                }}
              >
                Try Live
              </button>
            </div>
          ) : null}
          <div className="relative min-h-0 flex-1">
            {showFrame ? (
              <iframe
                key={`${state?.reloadKey ?? 0}:${proxyActive ? "proxy" : "live"}`}
                src={frameSrc}
                title="Browser"
                sandbox={
                  proxyActive
                    ? ""
                    : "allow-scripts allow-forms allow-same-origin allow-downloads allow-popups"
                }
                className="h-full w-full border-0 bg-white"
                onLoad={() => setLoad({ url, phase: "loaded" })}
                onError={() => setLoad({ url, phase: "blocked", reason: null })}
              />
            ) : phase === "checking" ? (
              <div className="flex h-full w-full items-center justify-center">
                <div className="flex items-center gap-2 text-[13px] text-vscode-muted">
                  <Codicon name="loading" className="animate-spin" />
                  Checking whether this page can be embedded…
                </div>
              </div>
            ) : phase === "blocked" ? (
              <div className="flex h-full w-full items-start justify-center overflow-y-auto px-10 pt-20">
                <div className="w-full max-w-[520px]">
                  <h3 className="text-[18px] font-semibold text-vscode-error">
                    Failed to Load Page
                  </h3>
                  <p className="mt-2 text-[13px] text-vscode-muted">
                    {load?.phase === "blocked" && load.reason ? (
                      <>
                        The site refuses to be embedded (
                        <span className="text-vscode-fg">{load.reason}</span>).
                        A real browser window is not an iframe; open the page
                        externally, or read a script-free copy here.
                      </>
                    ) : (
                      "The page did not respond in time. Sites that send X-Frame-Options or a frame-ancestors CSP refuse to be embedded."
                    )}
                  </p>
                  <p className="mt-4 break-all text-[13px]">
                    <span className="text-vscode-muted">URL: </span>
                    <span className="text-vscode-fg">{url}</span>
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className={BTN_PRIMARY}
                      onClick={openReadOnly}
                    >
                      Read-Only View
                    </button>
                    <button
                      type="button"
                      className={BTN_SECONDARY}
                      onClick={reload}
                    >
                      Try Again
                    </button>
                    <button
                      type="button"
                      className={BTN_SECONDARY}
                      onClick={() => window.open(url, "_blank", "noopener")}
                    >
                      Open in External Browser
                    </button>
                  </div>
                </div>
              </div>
            ) : state?.suspended ? (
              <div className="flex h-full w-full items-center justify-center p-8">
                <div className="max-w-[80%] rounded-[4px] border border-vscode-widget-border bg-vscode-editor px-10 py-5 text-center shadow-vscode">
                  <h3 className="text-[18px] font-semibold text-vscode-fg">
                    Tab Suspended
                  </h3>
                  <p className="mt-2 text-sm text-vscode-muted">
                    The page was unloaded to free memory. Reload to resume.
                  </p>
                  <button
                    type="button"
                    className={`${BTN_PRIMARY} mt-4`}
                    onClick={() => useStore.getState().reloadBrowser(tabId)}
                  >
                    Reload
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <div className="flex flex-col items-center">
                  <Codicon name="globe" size={40} className="mb-6 text-vscode-muted" />
                  <h2 className="text-[13px] font-semibold text-vscode-fg">
                    Browser
                  </h2>
                  <p className="mt-2 max-w-[280px] px-5 text-center text-xs text-vscode-muted">
                    Enter a URL above to get started.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
