"use client";

// TerminalPanel — bottom Panel card hosting xterm (DOC/10 §1-3).
// Source-true chrome: 35px panel title (11px uppercase TERMINAL tab + 1px
// accent underline), 22px terminal tab strip (1px accent left border on the
// active tab), toolbar hover #5a5d5e50, #181818 surface. One xterm instance
// per session keeps scrollback across tab switches and panel hides.
// Input is a line editor on top of xterm (no pty): the pure parser returns
// output + effects; this component applies them to the zustand store and
// performs the single async effect (curl via /api/proxy).
import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef, useState } from "react";
import type { Terminal as XTerm } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import Codicon from "./Codicon";
import Tooltip from "./Tooltip";
import { useStore, type TerminalSession } from "@/lib/store";
import {
  SGR,
  complete,
  parse,
  renderPrompt,
  type Effect,
  type TerminalCtx,
} from "@/lib/terminal/parser";

type XtermLibs = {
  Terminal: typeof import("@xterm/xterm").Terminal;
  FitAddon: typeof import("@xterm/addon-fit").FitAddon;
};

type Handle = {
  term: XTerm;
  fit: FitAddon;
  host: HTMLDivElement;
  sessionId: string;
};

type LineState = {
  line: string;
  cursor: number;
  histIndex: number;
  draft: string;
  busy: boolean;
};

// Dark Modern terminal palette — terminalColorRegistry.ts (DOC/10 §1).
const TERM_THEME = {
  background: "#181818",
  foreground: "#CCCCCC",
  cursor: "#CCCCCC",
  cursorAccent: "#181818",
  selectionBackground: "#264F78",
  black: "#000000",
  red: "#cd3131",
  green: "#0DBC79",
  yellow: "#e5e510",
  blue: "#2472c8",
  magenta: "#bc3fbc",
  cyan: "#11a8cd",
  white: "#e5e5e5",
  brightBlack: "#666666",
  brightRed: "#f14c4c",
  brightGreen: "#23d18b",
  brightYellow: "#f5f543",
  brightBlue: "#3b8eea",
  brightMagenta: "#d670d6",
  brightCyan: "#29b8db",
  brightWhite: "#e5e5e5",
} as const;

const WELCOME =
  "\x1b[2mType \x1b[0m\x1b[94mhelp\x1b[0m\x1b[2m for commands.\x1b[0m";

const PROMPT_DIRTY = (cwd: string, dirty: boolean, shell: TerminalSession["shell"]) =>
  renderPrompt(cwd, dirty, shell);

function toCRLF(s: string): string {
  return s.replace(/\r?\n/g, "\r\n");
}

function capOutput(s: string): string {
  if (s.length <= 20000) return s;
  return `${s.slice(0, 20000)}\r\n\x1b[2m... output truncated at 20 KB\x1b[0m`;
}

// --- Virtual FS context -----------------------------------------------------
// Sections map to folders (the `projects` slug is the capitalised Projects
// namespace), project trees become Projects/<owner>/<repo>/..., and saved
// edits + tmp scratch overlay on top (DOC/10 §3).
function buildCtx(session: TerminalSession): TerminalCtx {
  const st = useStore.getState();
  const vfs = new Set<string>();
  const dirs = new Set<string>();
  // Canonical namespaces exist even before data loads (the terminal's `ls`
  // never looks broken on a fresh session).
  dirs.add("Projects");
  dirs.add("tmp");

  for (const sec of st.sections) {
    if (sec.slug === "tmp") continue;
    dirs.add(sec.slug === "projects" ? "Projects" : sec.slug);
  }
  for (const p of st.projects) {
    const repo = `${p.repo_owner}/${p.repo_name}`;
    const base = `Projects/${repo}`;
    dirs.add(base);
    for (const entry of st.trees[repo] ?? []) {
      if (entry.type === "blob") vfs.add(`${base}/${entry.path}`);
      else dirs.add(`${base}/${entry.path}`);
    }
  }
  for (const path of Object.keys(st.edits)) vfs.add(path);
  for (const path of Object.keys(st.tmpFs)) {
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join("/"));
  }

  return {
    cwd: session.cwd,
    shell: session.shell,
    vfs: [...vfs],
    dirs: [...dirs],
    localEdits: st.edits,
    localCommits: st.commits,
    tmpFs: st.tmpFs,
    cached: {},
    realCommits: [],
    branch: "main",
  };
}

// --- Prompt / line editor ---------------------------------------------------
function drawPrompt(h: Handle, ed: LineState): void {
  const st = useStore.getState();
  const session = st.sessions.find((s) => s.id === h.sessionId);
  if (!session) return;
  const dirty = Object.keys(st.edits).length > 0;
  h.term.write(`\r\x1b[2K${PROMPT_DIRTY(session.cwd, dirty, session.shell)}${ed.line}`);
  const back = ed.line.length - ed.cursor;
  if (back > 0) h.term.write(`\x1b[${back}D`);
}

function resetLine(ed: LineState): void {
  ed.line = "";
  ed.cursor = 0;
  ed.histIndex = -1;
  ed.draft = "";
}

function cancelLine(h: Handle, ed: LineState): void {
  if (h.term.hasSelection()) {
    const selection = h.term.getSelection();
    if (selection) void navigator.clipboard?.writeText(selection).catch(() => {});
    h.term.clearSelection();
    return;
  }
  resetLine(ed);
  h.term.write("^C\r\n");
  drawPrompt(h, ed);
}

function doComplete(h: Handle, ed: LineState): void {
  const session = useStore.getState().sessions.find((s) => s.id === h.sessionId);
  if (!session) return;
  const result = complete(ed.line, buildCtx(session), ed.cursor);
  if (result.listing) {
    h.term.write(`\r\n${toCRLF(result.listing)}\r\n`);
    ed.line = result.line;
    ed.cursor = result.cursor;
    drawPrompt(h, ed);
    return;
  }
  if (result.line !== ed.line || result.cursor !== ed.cursor) {
    ed.line = result.line;
    ed.cursor = result.cursor;
    drawPrompt(h, ed);
  }
}

function historyPrev(h: Handle, ed: LineState): void {
  const session = useStore.getState().sessions.find((s) => s.id === h.sessionId);
  if (!session || session.hist.length === 0) return;
  if (ed.histIndex === -1) {
    ed.draft = ed.line;
    ed.histIndex = session.hist.length;
  }
  if (ed.histIndex > 0) {
    ed.histIndex -= 1;
    ed.line = session.hist[ed.histIndex] ?? "";
    ed.cursor = ed.line.length;
    drawPrompt(h, ed);
  }
}

function historyNext(h: Handle, ed: LineState): void {
  const session = useStore.getState().sessions.find((s) => s.id === h.sessionId);
  if (!session || ed.histIndex === -1) return;
  if (ed.histIndex < session.hist.length - 1) {
    ed.histIndex += 1;
    ed.line = session.hist[ed.histIndex] ?? "";
  } else {
    ed.histIndex = -1;
    ed.line = ed.draft;
  }
  ed.cursor = ed.line.length;
  drawPrompt(h, ed);
}

// --- Effects ----------------------------------------------------------------
async function runCurl(term: XTerm, url: string): Promise<void> {
  term.write(`\x1b[2mGET ${url}\x1b[0m\r\n`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
    });
    if (!res.ok) {
      // Only trust the body for errors this proxy generated; an upstream 404
      // may be a whole HTML page, not a useful one-line message.
      const detail =
        res.headers.get("x-proxy-error") === "1"
          ? (await res.text()).replace(/\s+/g, " ").trim().slice(0, 200)
          : "";
      term.write(
        `\x1b[91mcurl: (HTTP ${res.status}) ${detail || "proxy unavailable"}\x1b[0m\r\n`,
      );
      return;
    }
    const raw = await res.text();
    // Text only: drop ANSI/control sequences from the remote body.
    const text = raw
      .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
      .replace(/\x1b/g, "")
      .replace(/\r\n?/g, "\n");
    if (!text) {
      term.write("\x1b[2mcurl: (empty response)\x1b[0m\r\n");
      return;
    }
    const capped =
      res.headers.get("x-proxy-truncated") === "1" || text.length > 20000;
    term.write(toCRLF(text.slice(0, 20000)) + "\r\n");
    if (capped) term.write("\x1b[2m... truncated at 20 KB\x1b[0m\r\n");
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    term.write(
      `\x1b[91mcurl: ${aborted ? "timed out after 8s" : "proxy unavailable"}\x1b[0m\r\n`,
    );
  } finally {
    clearTimeout(timer);
  }
}

async function applyEffects(effects: Effect[], term: XTerm): Promise<void> {
  const st = useStore.getState();
  for (const fx of effects) {
    switch (fx.kind) {
      case "OPEN_TAB": {
        const markdown = /\.(md|mdx)$/i.test(fx.path);
        st.openTab({
          kind: markdown ? "markdown" : "code",
          path: fx.path,
          sha: null,
        });
        break;
      }
      case "WRITE_EDIT":
        st.saveEdit(fx.path, fx.content);
        break;
      case "WRITE_TMP":
        st.writeTmp(fx.path, fx.content);
        break;
      case "DELETE":
        st.deleteTmp(fx.path);
        break;
      case "COMMIT":
        st.commitLocal(fx.msg);
        break;
      case "DISCARD":
        st.discardEdit(fx.path);
        break;
      case "SET_THEME":
        st.setMode(fx.mode);
        if (fx.mode === "light") {
          term.write(
            "\x1b[2m(light palette lands with Appearance — staying Dark Modern for now)\x1b[0m\r\n",
          );
        }
        break;
      case "CLEAR":
        term.clear();
        break;
      case "RELOAD_PREVIEW":
        // Browser preview lands with PV-C-PREVIEW; nothing to reload yet.
        break;
      case "CURL":
        await runCurl(term, fx.url);
        break;
    }
  }
}

async function submit(h: Handle, ed: LineState): Promise<void> {
  if (ed.busy) return;
  const line = ed.line;
  resetLine(ed);
  h.term.write("\r\n");

  if (!line.trim()) {
    drawPrompt(h, ed);
    return;
  }

  const st = useStore.getState();
  st.pushHist(h.sessionId, line);
  const session = useStore.getState().sessions.find((s) => s.id === h.sessionId);
  if (!session) return;

  const result = parse(line, buildCtx(session));
  if (result.output) {
    h.term.write(toCRLF(capOutput(result.output)) + "\r\n");
  }
  if (result.cwd) st.setCwd(h.sessionId, result.cwd);

  ed.busy = true;
  try {
    await applyEffects(result.effects, h.term);
  } finally {
    ed.busy = false;
    drawPrompt(h, ed);
    h.term.scrollToBottom();
  }
}

function handleData(h: Handle, ed: LineState, data: string): void {
  if (ed.busy) return;
  const clean = data.replace(/\x1b\[20[01]~/g, "");
  let i = 0;

  while (i < clean.length) {
    const ch = clean[i];

    if (ch === "\x1b") {
      const rest = clean.slice(i);
      if (rest.startsWith("\x1b[A")) {
        historyPrev(h, ed);
        i += 3;
      } else if (rest.startsWith("\x1b[B")) {
        historyNext(h, ed);
        i += 3;
      } else if (rest.startsWith("\x1b[C")) {
        if (ed.cursor < ed.line.length) ed.cursor += 1;
        drawPrompt(h, ed);
        i += 3;
      } else if (rest.startsWith("\x1b[D")) {
        if (ed.cursor > 0) ed.cursor -= 1;
        drawPrompt(h, ed);
        i += 3;
      } else if (
        rest.startsWith("\x1b[H") ||
        rest.startsWith("\x1bOH") ||
        rest.startsWith("\x1b[1~") ||
        rest.startsWith("\x1b[7~")
      ) {
        ed.cursor = 0;
        drawPrompt(h, ed);
        i += rest.startsWith("\x1b[1~") || rest.startsWith("\x1b[7~") ? 4 : 3;
      } else if (
        rest.startsWith("\x1b[F") ||
        rest.startsWith("\x1bOF") ||
        rest.startsWith("\x1b[4~") ||
        rest.startsWith("\x1b[8~")
      ) {
        ed.cursor = ed.line.length;
        drawPrompt(h, ed);
        i += rest.startsWith("\x1b[4~") || rest.startsWith("\x1b[8~") ? 4 : 3;
      } else if (rest.startsWith("\x1b[3~")) {
        if (ed.cursor < ed.line.length) {
          ed.line = ed.line.slice(0, ed.cursor) + ed.line.slice(ed.cursor + 1);
          drawPrompt(h, ed);
        }
        i += 4;
      } else {
        const seq = rest.match(/^\x1b\[[0-9;]*[A-Za-z~]/);
        i += seq ? seq[0].length : 1;
      }
      continue;
    }

    if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && clean[i + 1] === "\n") i += 1;
      void submit(h, ed);
      i += 1;
      continue;
    }

    if (ch === "\x7f" || ch === "\b") {
      if (ed.cursor > 0) {
        ed.line =
          ed.line.slice(0, ed.cursor - 1) + ed.line.slice(ed.cursor);
        ed.cursor -= 1;
        drawPrompt(h, ed);
      }
      i += 1;
      continue;
    }

    if (ch === "\t") {
      doComplete(h, ed);
      i += 1;
      continue;
    }

    if (ch === "\x03") {
      cancelLine(h, ed);
      i += 1;
      continue;
    }

    if (ch === "\x0c" || ch === "\x0b") {
      h.term.clear();
      resetLine(ed);
      drawPrompt(h, ed);
      i += 1;
      continue;
    }

    if (ch === "\x01") {
      ed.cursor = 0;
      drawPrompt(h, ed);
      i += 1;
      continue;
    }

    if (ch === "\x05") {
      ed.cursor = ed.line.length;
      drawPrompt(h, ed);
      i += 1;
      continue;
    }

    if (ch === "\x15") {
      ed.line = ed.line.slice(ed.cursor);
      ed.cursor = 0;
      drawPrompt(h, ed);
      i += 1;
      continue;
    }

    if (ch === "\x17") {
      const left = ed.line.slice(0, ed.cursor).replace(/\S+\s*$/, "");
      ed.line = left + ed.line.slice(ed.cursor);
      ed.cursor = left.length;
      drawPrompt(h, ed);
      i += 1;
      continue;
    }

    if (ch === "\x04") {
      if (!ed.line) useStore.getState().killSession(h.sessionId);
      i += 1;
      continue;
    }

    if (ch === "\x1b" || ch.charCodeAt(0) < 32) {
      i += 1;
      continue;
    }

    // Printable run: insert once, then redraw (cleaner for paste + IME).
    let end = i;
    while (end < clean.length) {
      const code = clean.charCodeAt(end);
      if (code < 32 || code === 127) break;
      end += 1;
    }
    ed.line = ed.line.slice(0, ed.cursor) + clean.slice(i, end) + ed.line.slice(ed.cursor);
    ed.cursor += end - i;
    drawPrompt(h, ed);
    i = end;
  }
}

// --- Chrome helpers ---------------------------------------------------------
function PanelAction({
  icon,
  label,
  onClick,
  compact = false,
  align = "center",
  disabled = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  compact?: boolean;
  align?: "center" | "start" | "end";
  disabled?: boolean;
}) {
  return (
    <Tooltip text={label} position="top" align={align}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`flex items-center justify-center text-vscode-muted transition-colors hover:bg-vscode-toolbar-hover hover:text-vscode-fg disabled:pointer-events-none disabled:opacity-40 ${
          compact
            ? "h-[22px] w-[22px] rounded-control"
            : "h-7 w-7 rounded-none"
        }`}
      >
        <Codicon name={icon} size={16} />
      </button>
    </Tooltip>
  );
}

export default function TerminalPanel() {
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const panelOpen = useStore((s) => s.panelOpen);
  const panelMaximized = useStore((s) => s.panelMaximized);
  const setActiveSession = useStore((s) => s.setActiveSession);
  const spawnSession = useStore((s) => s.spawnSession);
  const killSession = useStore((s) => s.killSession);
  const closePanel = useStore((s) => s.closePanel);
  const togglePanelMaximized = useStore((s) => s.togglePanelMaximized);
  const clearTerminal = useStore((s) => s.clearTerminal);
  const initTerminal = useStore((s) => s.initTerminal);
  const clearNonce = useStore((s) => s.termClearNonce);

  const hostRef = useRef<HTMLDivElement>(null);
  const libsRef = useRef<XtermLibs | null>(null);
  const handles = useRef(new Map<string, Handle>());
  const editors = useRef(new Map<string, LineState>());
  const lastClear = useRef(0);
  const [ready, setReady] = useState(false);

  // Seed pwsh + bash once (history replays from vscode-term-hist).
  useEffect(() => {
    initTerminal();
  }, [initTerminal]);

  // xterm is client-only: dynamic import keeps SSR clean (Next 16 docs).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [xterm, fit] = await Promise.all([
          import("@xterm/xterm"),
          import("@xterm/addon-fit"),
        ]);
        if (!alive) return;
        libsRef.current = { Terminal: xterm.Terminal, FitAddon: fit.FitAddon };
        setReady(true);
      } catch (err) {
        console.error("xterm failed to load", err);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const sessionKey = sessions.map((s) => `${s.id}:${s.shell}`).join("|");

  // Create/dispose one xterm per session; show the active one.
  useEffect(() => {
    const libs = libsRef.current;
    const host = hostRef.current;
    if (!ready || !libs || !host) return;

    const live = new Set(useStore.getState().sessions.map((s) => s.id));
    for (const [id, h] of handles.current) {
      if (!live.has(id)) {
        h.term.dispose();
        h.host.remove();
        handles.current.delete(id);
        editors.current.delete(id);
      }
    }

    for (const session of useStore.getState().sessions) {
      if (handles.current.has(session.id)) continue;
      const el = document.createElement("div");
      el.className = "absolute inset-0 overflow-hidden";
      el.style.display = "none";
      host.appendChild(el);

      const term = new libs.Terminal({
        theme: TERM_THEME,
        fontFamily: '"Fira Code", "Cascadia Code", Consolas, "Courier New", monospace',
        fontSize: 13,
        lineHeight: 1,
        cursorBlink: true,
        cursorStyle: "block",
        scrollback: 1000,
        allowProposedApi: false,
        convertEol: false,
      });
      const fit = new libs.FitAddon();
      term.loadAddon(fit);
      term.open(el);

      const ed: LineState = {
        line: "",
        cursor: 0,
        histIndex: -1,
        draft: "",
        busy: false,
      };
      const h: Handle = { term, fit, host: el, sessionId: session.id };
      editors.current.set(session.id, ed);
      handles.current.set(session.id, h);

      term.attachCustomKeyEventHandler((e) => {
        if (e.type !== "keydown") return true;
        // Workbench chords stay with the window handler: xterm would otherwise
        // consume Ctrl+J as LF / Ctrl+B as ^B and swallow the toggle.
        if (
          e.ctrlKey &&
          !e.shiftKey &&
          !e.altKey &&
          (e.code === "KeyJ" || e.code === "KeyB" || e.code === "Backquote")
        ) {
          return false;
        }
        if (e.ctrlKey && e.shiftKey && e.code === "KeyC") {
          if (term.hasSelection()) {
            void navigator.clipboard?.writeText(term.getSelection()).catch(() => {});
            return false;
          }
          return true;
        }
        // Ctrl+C copies a selection instead of cancelling the line (VS Code's
        // terminal copySelection binding); without a selection xterm emits \x03.
        if (
          e.ctrlKey &&
          !e.shiftKey &&
          !e.altKey &&
          e.code === "KeyC" &&
          term.hasSelection()
        ) {
          void navigator.clipboard?.writeText(term.getSelection()).catch(() => {});
          return false;
        }
        if (e.ctrlKey && e.shiftKey && e.code === "KeyV") {
          void navigator.clipboard
            ?.readText()
            .then((text) => {
              if (text) handleData(h, ed, text);
            })
            .catch(() => {});
          return false;
        }
        // Ctrl+Enter: submit explicitly (xterm otherwise flattens it to \r;
        // same commit behavior, but this keeps the intent explicit).
        if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === "Enter") {
          void submit(h, ed);
          return false;
        }
        return true;
      });

      term.onData((data) => handleData(h, ed, data));

      term.writeln(WELCOME);
      term.writeln("");
      term.write(
        PROMPT_DIRTY(
          session.cwd,
          Object.keys(useStore.getState().edits).length > 0,
          session.shell,
        ),
      );
    }

    // Visibility + fit for the active session.
    for (const [id, h] of handles.current) {
      h.host.style.display = id === activeSessionId ? "block" : "none";
    }
    const active = activeSessionId ? handles.current.get(activeSessionId) : null;
    if (active) {
      const raf = requestAnimationFrame(() => {
        if (!active.host.isConnected) return;
        if (active.host.clientWidth < 10 || active.host.clientHeight < 10) return;
        try {
          active.fit.fit();
        } catch {
          // zero-size while hidden — ResizeObserver refits on open
        }
        if (panelOpen) active.term.focus();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [ready, sessionKey, activeSessionId, panelOpen]);

  // Refit on panel/sash/viewport resize (fit measures the session host).
  useEffect(() => {
    if (!ready) return;
    const host = hostRef.current;
    if (!host) return;
    let raf = 0;
    const refit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const id = useStore.getState().activeSessionId;
        const h = id ? handles.current.get(id) : null;
        if (!h || !h.host.isConnected) return;
        if (h.host.clientWidth < 10 || h.host.clientHeight < 10) return;
        try {
          h.fit.fit();
        } catch {
          // ignore transient zero-size layouts
        }
      });
    };
    const ro = new ResizeObserver(refit);
    ro.observe(host);
    window.addEventListener("resize", refit);
    // Fira Code may settle after first paint; refit once fonts are ready.
    void document.fonts?.ready.then(refit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", refit);
      cancelAnimationFrame(raf);
    };
  }, [ready]);

  // Terminal: Clear (menu command) → clear the active session.
  useEffect(() => {
    if (clearNonce === lastClear.current) return;
    lastClear.current = clearNonce;
    const id = useStore.getState().activeSessionId;
    const h = id ? handles.current.get(id) : null;
    const ed = id ? editors.current.get(id) : null;
    if (!h || !ed) return;
    h.term.clear();
    resetLine(ed);
    drawPrompt(h, ed);
  }, [clearNonce]);

  // Dispose every xterm on unmount.
  useEffect(
    () => () => {
      for (const h of handles.current.values()) h.term.dispose();
      handles.current.clear();
      editors.current.clear();
    },
    [],
  );

  const active = sessions.find((s) => s.id === activeSessionId);

  return (
    <section
      aria-label="Terminal"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-section border border-vscode-border bg-vscode-panel-bg"
    >
      {/* Panel title — 35px, composite tab + title actions */}
      <div className="flex h-[35px] shrink-0 items-center justify-between border-b border-vscode-panel-tab-border pl-1 pr-1">
        <div
          role="tablist"
          aria-label="Panel views"
          className="flex h-full items-stretch"
        >
          <button
            type="button"
            role="tab"
            aria-selected="true"
            className="relative flex items-center gap-2 px-3 text-[11px] uppercase tracking-[0.01em] text-vscode-panel-tab-active"
          >
            <Codicon name="terminal" size={16} />
            <span>Terminal</span>
            <span className="absolute inset-x-[2px] bottom-0 h-px bg-vscode-accent" />
          </button>
        </div>
        <div className="flex items-center gap-[2px]">
          <PanelAction
            icon={panelMaximized ? "chevron-down" : "chevron-up"}
            label={panelMaximized ? "Restore Panel Size" : "Maximize Panel Size"}
            onClick={togglePanelMaximized}
            align="end"
          />
          <PanelAction
            icon="close"
            label="Close Panel"
            onClick={closePanel}
            align="end"
          />
        </div>
      </div>

      {/* Terminal instance tabs — 22px */}
      <div
        role="tablist"
        aria-label="Terminal sessions"
        className="flex h-[22px] shrink-0 items-stretch border-b border-vscode-panel-tab-border bg-vscode-panel-bg"
      >
        <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <button
                key={session.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveSession(session.id)}
                title={session.shell === "pwsh" ? "PowerShell" : "bash"}
                className={`relative flex h-full max-w-[180px] min-w-[88px] items-center gap-[6px] border-r border-vscode-panel-tab-border px-[10px] text-[12px] transition-colors hover:bg-vscode-toolbar-hover ${
                  isActive
                    ? "text-vscode-panel-tab-active"
                    : "text-vscode-panel-tab-inactive"
                }`}
              >
                {isActive ? (
                  <span className="absolute inset-y-0 left-0 w-px bg-vscode-terminal-tab-border" />
                ) : null}
                <Codicon
                  name={session.shell === "pwsh" ? "terminal-powershell" : "terminal-bash"}
                  size={14}
                  className="shrink-0"
                />
                <span className="truncate">
                  {session.shell === "pwsh" ? "pwsh" : "bash"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center gap-[1px] pr-1">
          <PanelAction
            icon="add"
            label="New Terminal"
            onClick={() => spawnSession("bash")}
            compact
            align="end"
          />
          <PanelAction
            icon="clear-all"
            label="Clear Terminal"
            onClick={clearTerminal}
            compact
            align="end"
          />
          <PanelAction
            icon="trash"
            label="Kill Terminal"
            onClick={() => {
              if (activeSessionId) killSession(activeSessionId);
            }}
            compact
            align="end"
            disabled={!activeSessionId}
          />
        </div>
      </div>

      {/* xterm host — one absolute session layer per shell */}
      <div
        ref={hostRef}
        className="terminal-xterm relative min-h-0 flex-1 bg-vscode-panel-bg"
        onClick={() => {
          const h = activeSessionId ? handles.current.get(activeSessionId) : null;
          h?.term.focus();
        }}
      >
        {!ready && active ? (
          <div className="flex h-full items-center justify-center text-xs text-vscode-dim">
            Loading terminal…
          </div>
        ) : null}
      </div>
    </section>
  );
}
