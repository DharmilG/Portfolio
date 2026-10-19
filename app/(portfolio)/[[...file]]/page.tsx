"use client";

// Portfolio shell mount — workbench chrome + regions (panel fills in next).
// View/sidebar/palette state lives in the store (session-only UI slice);
// title-bar menus and the palette share lib/commands ids. Partial
// PV-PAGE-PORTFOLIO: mounts built components, fetches sections live.
import { useEffect, useRef, useState } from "react";
import Breadcrumb from "@/components/vscode/Breadcrumb";
import CommandPalette from "@/components/vscode/CommandPalette";
import Explorer from "@/components/vscode/Explorer";
import FileViewer from "@/components/vscode/FileViewer";
import PrimarySideBar from "@/components/vscode/PrimarySideBar";
import Sash from "@/components/vscode/Sash";
import Section from "@/components/vscode/Section";
import StatusBar from "@/components/vscode/StatusBar";
import Tabs from "@/components/vscode/Tabs";
import TitleBar from "@/components/vscode/TitleBar";
import ViewActionButton from "@/components/vscode/ViewActionButton";
import { COMMANDS, newTextFile, nextFreeKey } from "@/lib/commands";
import { supabase } from "@/lib/db";
import { useStore } from "@/lib/store";

// Explorer pane-header actions (VS Code tooltips; behavior owned here).
// They render in the SideBar header actions group — hidden at rest,
// revealed on pane hover / focus (ViewPaneShowActions.Default).
const EXPLORER_ACTIONS = [
  { id: "new-file", icon: "new-file", label: "New File..." },
  { id: "new-folder", icon: "new-folder", label: "New Folder..." },
  { id: "refresh", icon: "refresh", label: "Refresh Explorer" },
  { id: "collapse", icon: "collapse-all", label: "Collapse Folders in View" },
] as const;

function loadSections() {
  supabase
    .from("sections")
    .select("id,slug,title,icon,orders")
    .then(({ data }) => {
      if (data) useStore.getState().setSections(data);
    });
}

function openCodeTab(path: string) {
  useStore.getState().openTab({ kind: "code", path, sha: null });
}

export default function PortfolioPage() {
  const hasTabs = useStore((s) => s.tabs.length > 0);
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
  const [rowWidth, setRowWidth] = useState(0);
  const rowRef = useRef<HTMLDivElement>(null);

  // Sash max: keep the editor >= 320px in the workspace row
  // (10px padding + 48px activity rail + 5px gutter + 320px editor = 383px).
  const maxPane = Math.max(170, rowWidth - 383);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const measure = () => setRowWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    useStore.persist.rehydrate();
    loadSections();
  }, []);

  // Ctrl+B — toggle primary sidebar (VS Code default); a dialog owns the
  // keyboard while it is up (Modal convention).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey && !e.shiftKey && !e.altKey)) return;
      if (e.key.toLowerCase() !== "b") return;
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      useStore.getState().toggleSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Menu ids run through the shared command registry (TitleBar MENU_ITEMS
  // carry command ids); ids without a live command keep the demo console note.
  const handleAction = (action: string) => {
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

  // StatusBar branch click: focus the Source Control view (sidebar shown).
  const handleBranchClick = () => {
    showView("scm");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TitleBar
        onMenuAction={handleAction}
        onQuickOpen={() => openPalette("files")}
      />
      <div
        ref={rowRef}
        className="flex min-h-0 flex-1 gap-[5px] bg-vscode-titlebar p-[5px]"
      >
        {showSidebar ? (
          <div className="relative flex shrink-0">
            <PrimarySideBar
              active={view}
              onSelect={selectView}
              actions={
                view === "explorer"
                  ? EXPLORER_ACTIONS.map((a) => (
                      <ViewActionButton
                        key={a.id}
                        icon={a.icon}
                        label={a.label}
                        onClick={() => handleViewAction(a.id)}
                      />
                    ))
                  : null
              }
            >
              {view === "explorer" ? (
                <Explorer onOpenFile={openCodeTab} />
              ) : (
                <p className="px-4 py-2 text-xs text-vscode-dim">
                  {view} view lands with its component.
                </p>
              )}
            </PrimarySideBar>
            <Sash
              className="-right-[5px]"
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
        <Section className="flex-1 bg-vscode-editor">
          <Tabs onReveal={handleReveal} />
          <Breadcrumb onOpenFile={openCodeTab} />
          {hasTabs ? (
            <FileViewer />
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-vscode-dim">
              Open a file from the Explorer
            </div>
          )}
        </Section>
      </div>
      <StatusBar onBranchClick={handleBranchClick} />
      <CommandPalette />
    </div>
  );
}
