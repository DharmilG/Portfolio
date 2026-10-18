"use client";

// Portfolio shell mount — workbench chrome + regions (panel fills in next).
// Partial PV-PAGE-PORTFOLIO: mounts built components, fetches sections live.
import { useEffect, useRef, useState } from "react";
import { type ActivityId } from "@/components/vscode/ActivityBar";
import Breadcrumb from "@/components/vscode/Breadcrumb";
import Explorer from "@/components/vscode/Explorer";
import FileViewer from "@/components/vscode/FileViewer";
import PrimarySideBar from "@/components/vscode/PrimarySideBar";
import Sash from "@/components/vscode/Sash";
import Section from "@/components/vscode/Section";
import Tabs from "@/components/vscode/Tabs";
import TitleBar from "@/components/vscode/TitleBar";
import { supabase } from "@/lib/db";
import { useStore } from "@/lib/store";

function loadSections() {
  supabase
    .from("sections")
    .select("id,slug,title,icon,orders")
    .then(({ data }) => {
      if (data) useStore.getState().setSections(data);
    });
}

function nextFreeKey(
  tmpFs: Record<string, string>,
  first: string,
  numbered: (n: number) => string,
): string {
  if (!tmpFs[first]) return first;
  let n = 2;
  while (tmpFs[numbered(n)]) n += 1;
  return numbered(n);
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
  const [view, setView] = useState<ActivityId>("explorer");
  const [showSidebar, setShowSidebar] = useState(true);
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

  // Ctrl+B — toggle primary sidebar (VS Code default).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setShowSidebar((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleAction = (action: string) => {
    if (action === "toggle-sidebar") setShowSidebar((s) => !s);
    else console.info("menu action (wires with its feature):", action);
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
      const path = nextFreeKey(
        st.tmpFs,
        "tmp/untitled-1",
        (n) => `tmp/untitled-${n}`,
      );
      st.writeTmp(path, "");
      if (!st.expanded["tmp"]) st.toggleExpanded("tmp");
      openCodeTab(path);
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

  // VS Code semantics: active activity icon toggles the sidebar; others switch + show.
  const handleSelectView = (next: ActivityId) => {
    if (next === view) setShowSidebar((s) => !s);
    else {
      setView(next);
      setShowSidebar(true);
    }
  };

  // Tab menu "Reveal in Explorer" (full parity): show the Explorer view +
  // sidebar, then expand ancestors + select + scroll (store.revealPath).
  const handleReveal = (path: string) => {
    setView("explorer");
    setShowSidebar(true);
    revealPath(path);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TitleBar onMenuAction={handleAction} />
      <div
        ref={rowRef}
        className="flex min-h-0 flex-1 gap-[5px] bg-vscode-titlebar p-[5px]"
      >
        {showSidebar ? (
          <div className="relative flex shrink-0">
            <PrimarySideBar active={view} onSelect={handleSelectView}>
              {view === "explorer" ? (
                <Explorer onOpenFile={openCodeTab} onAction={handleViewAction} />
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
    </div>
  );
}
