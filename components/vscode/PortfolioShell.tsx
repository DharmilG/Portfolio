"use client";

// PortfolioShell — the interactive workbench chrome. The server page loads
// profile/projects once and passes them here so the first paint has real
// content; this client shell owns all keyboard, tab, and pane behavior.
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import Breadcrumb from "@/components/vscode/Breadcrumb";
import Explorer from "@/components/vscode/Explorer";
import PageSurface from "@/components/vscode/PageSurface";
import PrimarySideBar from "@/components/vscode/PrimarySideBar";
import Sash from "@/components/vscode/Sash";
import Section from "@/components/vscode/Section";
import StatusBar from "@/components/vscode/StatusBar";
import Tabs from "@/components/vscode/Tabs";
import TitleBar from "@/components/vscode/TitleBar";
import Toast from "@/components/vscode/Toast";
import WorkInProgressNotice from "@/components/vscode/WorkInProgressNotice";
import { COMMANDS, newTextFile, nextFreeKey } from "@/lib/commands";
import { supabase } from "@/lib/db";
import { isMarkdownPath } from "@/lib/langs";
import { useStore, type ProfileContent } from "@/lib/store";

// Lazy editor panes share the same loading surface: MarkdownPreview is loaded
// by FileViewer on the first Markdown tab, BrowserPreview on the first browser
// tab (DOC/10 §4/§5).
function PreviewLoading() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-vscode-editor text-xs text-vscode-dim">
      Loading preview…
    </div>
  );
}

function PaneLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center bg-vscode-side text-xs text-vscode-dim">
      {label}
    </div>
  );
}

const EditorLoading = () => <PaneLoading label="Loading editor…" />;
const TerminalLoading = () => <PaneLoading label="Loading terminal…" />;
const SideViewLoading = () => <PaneLoading label="Loading view…" />;

// Heavy, interaction-only panes are loaded on demand so their parser/editor
// runtimes are not part of the first page's JavaScript payload.
const FileViewer = dynamic(() => import("@/components/vscode/FileViewer"), {
  ssr: false,
  loading: EditorLoading,
});
const TerminalPanel = dynamic(
  () => import("@/components/vscode/TerminalPanel"),
  { ssr: false, loading: TerminalLoading },
);
const SourceControl = dynamic(
  () => import("@/components/vscode/SourceControl"),
  { ssr: false, loading: SideViewLoading },
);
const SearchView = dynamic(() => import("@/components/vscode/SearchView"), {
  ssr: false,
  loading: SideViewLoading,
});
const RunView = dynamic(() => import("@/components/vscode/RunView"), {
  ssr: false,
  loading: SideViewLoading,
});
const ExtensionsView = dynamic(
  () => import("@/components/vscode/ExtensionsView"),
  { ssr: false, loading: SideViewLoading },
);
const CommandPalette = dynamic(
  () => import("@/components/vscode/CommandPalette"),
  { ssr: false, loading: () => null },
);

// The integrated browser pane (iframe + picker) loads with the first browser
// tab; one instance is mounted per browser tab and stays alive when hidden
// (DOC/10 §4 — manual suspend is the way to free its renderer).
const BrowserPreview = dynamic(
  () => import("@/components/vscode/BrowserPreview"),
  { ssr: false, loading: PreviewLoading },
);

// Sidebar titles per activity view (VS Code view pane names).
const VIEW_TITLES: Record<string, string> = {
  explorer: "Explorer",
  search: "Search",
  scm: "Source Control",
  run: "Run and Debug",
  extensions: "Extensions",
};

function loadSections() {
  supabase
    .from("sections")
    .select("id,slug,title,icon,orders")
    .then(({ data }) => {
      if (data) useStore.getState().setSections(data);
    });
}

type ProjectsPayload = { projects?: unknown; groups?: unknown };

// Server-rendered data is passed in on first paint; the refresh action and
// environments without initial data still fall back to the public Route
// Handlers.
async function loadProjects(initial?: ProjectsPayload) {
  try {
    let data = initial;
    if (!data) {
      const res = await fetch("/api/projects", { cache: "no-store" });
      if (!res.ok) throw new Error(`projects ${res.status}`);
      data = (await res.json()) as ProjectsPayload;
    }
    const st = useStore.getState();
    if (Array.isArray(data.projects)) st.setProjects(data.projects);
    if (Array.isArray(data.groups)) st.setProjectGroups(data.groups);
  } catch (error) {
    console.error("Could not load projects:", error);
  }
}

async function loadProfile(
  initial?: ProfileContent,
  initialPage = "about",
  openInitialTab = true,
) {
  try {
    let data = initial;
    if (!data) {
      const res = await fetch("/api/profile", { cache: "no-store" });
      if (!res.ok) throw new Error(`profile ${res.status}`);
      data = (await res.json()) as ProfileContent;
    }
    const st = useStore.getState();
    st.setProfile(data);
    if (!openInitialTab) return;
    const page = initialPage || "about";
    const existing = st.tabs.find(
      (tab) => tab.kind === "page" && tab.path === page,
    );
    if (existing) st.setActiveTab(existing.id);
    else st.openTab({ kind: "page", path: page, sha: null });
  } catch (error) {
    console.error("Could not load profile:", error);
  }
}

// <768px the sidebar is an overlay drawer; opening a file from it dismisses
// the drawer so the editor (full width underneath) is visible.
function closeSidebarOnNarrow() {
  if (!window.matchMedia("(max-width: 767px)").matches) return;
  const st = useStore.getState();
  if (st.showSidebar) st.toggleSidebar();
}

function openCodeTab(path: string, sha?: string | null) {
  useStore.getState().openTab({ kind: "code", path, sha: sha ?? null });
  closeSidebarOnNarrow();
}

type PortfolioShellProps = {
  initialProfile?: ProfileContent | null;
  initialProjects?: ProjectsPayload | null;
  initialPage?: string;
};

export default function PortfolioShell({
  initialProfile,
  initialProjects,
  initialPage = "about",
}: PortfolioShellProps) {
  const hasTabs = useStore((s) => s.tabs.length > 0);
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const sidebarWidth = useStore((s) => s.sidebarWidth);
  const sidebarPreview = useStore((s) => s.sidebarPreview);
  const setSidebarWidth = useStore((s) => s.setSidebarWidth);
  const setSidebarPreview = useStore((s) => s.setSidebarPreview);
  const revealPath = useStore((s) => s.revealPath);
  const view = useStore((s) => s.view);
  const showSidebar = useStore((s) => s.showSidebar);
  const selectView = useStore((s) => s.selectView);
  const showView = useStore((s) => s.showView);
  const openPalette = useStore((s) => s.openPalette);
  const panelOpen = useStore((s) => s.panelOpen);
  const panelHeight = useStore((s) => s.panelHeight);
  const panelPreview = useStore((s) => s.panelPreview);
  const panelMaximized = useStore((s) => s.panelMaximized);
  const setPanelHeight = useStore((s) => s.setPanelHeight);
  const setPanelPreview = useStore((s) => s.setPanelPreview);
  const [rowWidth, setRowWidth] = useState(0);
  const [rowHeight, setRowHeight] = useState(0);
  const rowRef = useRef<HTMLDivElement>(null);
  const browserTabs = tabs.filter((t) => t.kind === "browser");

  // Sash max: keep the editor >= 320px in the workspace row
  // (10px padding + 48px activity rail + 5px gutter + 320px editor = 383px).
  const maxPane = Math.max(170, rowWidth - 383);
  // Panel: keep >= 120px terminal and >= 200px editor; maximize toggles 60vh
  // (DOC/10 §1). rowHeight includes the 5px grid padding.
  const maxPanel = rowHeight > 0 ? Math.max(170, rowHeight - 215) : 10000;
  const panelPx = Math.min(panelPreview ?? panelHeight, maxPanel);
  const panelStyle = panelOpen
    ? {
        height: panelMaximized
          ? `min(60vh, ${maxPanel}px)`
          : `${panelPx}px`,
      }
    : undefined;

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const measure = () => {
      setRowWidth(el.clientWidth);
      setRowHeight(el.clientHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Persisted local state hydrates at store module scope (lib/store.ts);
    // doing it here would run after child effects and lose the snapshot.
    useStore.getState().initTerminal();
    loadSections();
    if (initialProjects) loadProjects(initialProjects);
    else void loadProjects();
    if (initialProfile) loadProfile(initialProfile, initialPage, false);
    else void loadProfile(undefined, initialPage, true);
    closeSidebarOnNarrow();
  }, []);

  // Phones start with the sidebar collapsed (Ctrl+B / the rail reveal it as
  // an overlay — the in-flow 280px pane would leave no editor at that width).
  useEffect(() => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const st = useStore.getState();
    if (st.showSidebar) st.toggleSidebar();
  }, []);

  // Ctrl+B — toggle primary sidebar (VS Code default); a dialog owns the
  // keyboard while it is up (Modal convention). Ctrl+J / Ctrl+` toggle the
  // bottom Panel (VS Code Toggle Panel / Toggle Terminal defaults).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey && !e.shiftKey && !e.altKey)) return;
      const key = e.key.toLowerCase();
      const toggle =
        key === "b" ||
        key === "j" ||
        key === "`" ||
        e.code === "Backquote";
      if (!toggle) return;
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      if (key === "b") useStore.getState().toggleSidebar();
      else useStore.getState().togglePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Terminal: Ctrl+Shift+` new terminal, Ctrl+Shift+5 split (VS Code
  // defaults). xterm releases both chords; a dialog owns the keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey && e.shiftKey && !e.altKey)) return;
      const newTerminal = e.code === "Backquote";
      const split = e.code === "Digit5";
      if (!newTerminal && !split) return;
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      if (newTerminal) useStore.getState().spawnSession("bash");
      else useStore.getState().splitTerminal("bash");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Markdown: Ctrl+Shift+V toggles preview/source in the active editor tab.
  // Ignore fields outside the source editor and the terminal: Ctrl+Shift+V is
  // paste in xterm/SCM, and the palette owns its input while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const markdown =
        e.ctrlKey &&
        e.shiftKey &&
        !e.altKey &&
        (e.code === "KeyV" || e.key.toLowerCase() === "v");
      if (!markdown) return;
      if (document.querySelector('[role="dialog"]')) return;
      const target = e.target as HTMLElement | null;
      const foreign =
        target instanceof HTMLInputElement ||
        (target instanceof HTMLTextAreaElement &&
          !target.closest(".font-code"));
      if (foreign) return;
      const st = useStore.getState();
      const tab = st.tabs.find((t) => t.id === st.activeTabId);
      if (!tab || tab.kind !== "code" || !isMarkdownPath(tab.path)) return;
      e.preventDefault();
      st.toggleMdView(tab.path);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Ctrl+L — Focus URL Input for the active browser tab (VS Code Browser:
  // Focus URL Input). Never hijack fields (the URL input itself, xterm, SCM,
  // the palette); keydown inside the framed page cannot reach us (cross-origin).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey && !e.shiftKey && !e.altKey)) return;
      if (e.key.toLowerCase() !== "l") return;
      if (document.querySelector('[role="dialog"]')) return;
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      )
        return;
      const st = useStore.getState();
      const tab = st.tabs.find((t) => t.id === st.activeTabId);
      if (!tab || tab.kind !== "browser") return;
      e.preventDefault();
      st.focusBrowserUrl();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Menu ids run through the shared command registry (TitleBar MENU_ITEMS
  // carry command ids); ids without a live command keep the demo console note.
  const handleAction = (action: string) => {
    // TitleBar browser menu: `browser-tab:<id>` focuses an existing instance.
    if (action.startsWith("browser-tab:")) {
      useStore.getState().setActiveTab(action.slice("browser-tab:".length));
      return;
    }
    const cmd = COMMANDS.find((c) => c.id === action);
    if (cmd && !cmd.disabled) {
      cmd.run();
      return;
    }
    console.info("menu action (wires with its feature):", action);
  };

  const handleViewAction = (id: string) => {
    const st = useStore.getState();
    if (id === "refresh") {
      loadSections();
      void loadProjects();
      return;
    }
    if (id === "collapse") {
      st.collapseAll();
      return;
    }
    if (id === "new-file") {
      newTextFile();
      return;
    }
    if (id === "new-folder") {
      const key = nextFreeKey(
        st.tmpFs,
        "tmp/New Folder/.gitkeep",
        (n) => `tmp/New Folder ${n}/.gitkeep`,
      );
      st.writeTmp(key, "");
      if (!st.expanded["tmp"]) st.toggleExpanded("tmp");
      return;
    }
    console.info("view action (wires with its feature):", id);
  };

  // Tab menu "Reveal in Explorer" (full parity): show the Explorer view +
  // sidebar, then expand ancestors + select + scroll (store.revealPath).
  const handleReveal = (path: string) => {
    showView("explorer");
    revealPath(path);
  };

  const profileContent = useStore((s) => s.profile);
  const avatarUrl = profileContent?.profile?.avatar_url ?? null;
  const userInitial = (
    profileContent?.profile?.name ??
    "Dharmil Gajjar"
  )
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <TitleBar
        onMenuAction={handleAction}
        onQuickOpen={() => openPalette("files")}
      />
      <div
        ref={rowRef}
        className="relative flex min-h-0 min-w-0 flex-1 gap-[5px] bg-vscode-titlebar p-[5px]"
      >
        {showSidebar ? (
          <div className="relative flex shrink-0 max-md:absolute max-md:bottom-[5px] max-md:left-[5px] max-md:top-[5px] max-md:z-10 max-md:shadow-vscode">
            <PrimarySideBar
              active={view}
              onSelect={selectView}
              title={VIEW_TITLES[view] ?? "Explorer"}
              avatarUrl={avatarUrl}
              userInitial={userInitial}
            >
              {view === "explorer" ? (
                <Explorer onOpenFile={openCodeTab} onAction={handleViewAction} />
              ) : view === "scm" ? (
                <SourceControl onOpenFile={openCodeTab} />
              ) : view === "search" ? (
                <SearchView onOpenFile={openCodeTab} />
              ) : view === "run" ? (
                <RunView />
              ) : view === "extensions" ? (
                <ExtensionsView />
              ) : (
                <p className="px-4 py-2 text-xs text-vscode-dim">
                  {view} view lands with its component.
                </p>
              )}
            </PrimarySideBar>
            <Sash
              className="-right-[5px] max-md:hidden"
              label="Resize primary sidebar"
              value={sidebarPreview ?? sidebarWidth}
              min={170}
              max={maxPane}
              onPreview={setSidebarPreview}
              onCommit={(w) => {
                setSidebarPreview(null);
                setSidebarWidth(w);
              }}
            />
          </div>
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Section className="flex-1 bg-vscode-editor">
            <div className="flex min-h-0 min-w-0 flex-1">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <Tabs onReveal={handleReveal} initialPage={initialPage} />
                <Breadcrumb
                  onOpenFile={openCodeTab}
                  initialPage={initialPage}
                />
                {hasTabs ? <FileViewer /> : null}
                <PageSurface
                  initialPage={initialPage}
                  initialProfile={initialProfile}
                  initialProjects={initialProjects}
                />
                {!hasTabs && !initialPage ? (
                  <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-vscode-dim">
                    Open a file from the Explorer
                  </div>
                ) : null}
                {/* One pane per browser tab, kept alive across tab switches
                    (display:none, not unmount) — VS Code keeps the page alive
                    until Suspend. */}
                {browserTabs.map((bt) => (
                  <div
                    key={bt.id}
                    className={`min-h-0 min-w-0 flex-col ${
                      bt.id === activeTabId ? "flex flex-1" : "hidden"
                    }`}
                  >
                    <BrowserPreview tabId={bt.id} />
                  </div>
                ))}
              </div>
            </div>
          </Section>
          {panelOpen ? (
            <div className="relative h-[5px] shrink-0">
              {!panelMaximized ? (
                <Sash
                  orientation="horizontal"
                  label="Resize panel"
                  value={panelPx}
                  min={120}
                  max={maxPanel}
                  onPreview={setPanelPreview}
                  onCommit={(h) => {
                    setPanelPreview(null);
                    setPanelHeight(h);
                  }}
                />
              ) : null}
            </div>
          ) : null}
          {/* Kept mounted while closed so xterm scrollback survives (VS Code
              keeps terminal buffers on panel hide). */}
          <div
            className={panelOpen ? "shrink-0" : "hidden"}
            style={panelStyle}
          >
            <TerminalPanel />
          </div>
        </div>
      </div>
      <StatusBar />
      <CommandPalette />
      <Toast />
      <WorkInProgressNotice />
    </div>
  );
}
