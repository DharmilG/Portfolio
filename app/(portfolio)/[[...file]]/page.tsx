"use client";

// Portfolio shell mount — workbench chrome + regions (panel fills in next).
// View/sidebar/palette state lives in the store (session-only UI slice);
// title-bar menus and the palette share lib/commands ids. Partial
// PV-PAGE-PORTFOLIO: mounts built components, fetches sections live.
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import Breadcrumb from "@/components/vscode/Breadcrumb";
import CommandPalette from "@/components/vscode/CommandPalette";
import Explorer from "@/components/vscode/Explorer";
import ExtensionsView from "@/components/vscode/ExtensionsView";
import FileViewer from "@/components/vscode/FileViewer";
import PageSurface from "@/components/vscode/PageSurface";
import PrimarySideBar from "@/components/vscode/PrimarySideBar";
import RunView from "@/components/vscode/RunView";
import Sash from "@/components/vscode/Sash";
import SearchView from "@/components/vscode/SearchView";
import Section from "@/components/vscode/Section";
import SourceControl from "@/components/vscode/SourceControl";
import StatusBar from "@/components/vscode/StatusBar";
import Tabs from "@/components/vscode/Tabs";
import TerminalPanel from "@/components/vscode/TerminalPanel";
import TitleBar from "@/components/vscode/TitleBar";
import Toast from "@/components/vscode/Toast";
import WorkInProgressNotice from "@/components/vscode/WorkInProgressNotice";
import { COMMANDS, newTextFile, nextFreeKey } from "@/lib/commands";
import { supabase } from "@/lib/db";
import { isMarkdownPath } from "@/lib/langs";
import { useStore } from "@/lib/store";

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

// Projects are read through the Route Handler (same allowlisted rows the repo
// APIs use), not queried directly from the browser.
async function loadProjects() {
  try {
    const res = await fetch("/api/projects", { cache: "no-store" });
    if (!res.ok) throw new Error(`projects ${res.status}`);
    const data: { projects?: unknown; groups?: unknown } = await res.json();
    if (Array.isArray(data.projects)) {
      useStore.getState().setProjects(data.projects);
    }
    if (Array.isArray(data.groups)) {
      useStore.getState().setProjectGroups(data.groups);
    }
  } catch (error) {
    console.error("Could not load projects:", error);
  }
}

// The portfolio pages (About, Resume, Certificates, ...) read one public
// payload from /api/profile.
async function loadProfile() {
  try {
    const res = await fetch("/api/profile", { cache: "no-store" });
    if (!res.ok) throw new Error(`profile ${res.status}`);
    const data = await res.json();
    const st = useStore.getState();
    st.setProfile(data);
    // First visit: land on the About page, not an empty editor.
    if (st.tabs.length === 0) {
      st.openTab({ kind: "page", path: "about", sha: null });
    }
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

export default function PortfolioPage() {
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
    void loadProjects();
    void loadProfile();
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
                <Tabs onReveal={handleReveal} />
                <Breadcrumb onOpenFile={openCodeTab} />
                {hasTabs ? (
                  <>
                    <FileViewer />
                    <PageSurface />
                  </>
                ) : (
                  <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-vscode-dim">
                    Open a file from the Explorer
                  </div>
                )}
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
