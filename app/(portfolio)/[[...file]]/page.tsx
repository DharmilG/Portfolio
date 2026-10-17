"use client";

// Portfolio shell mount — workbench chrome + regions (editor/panel fill in next).
// Partial PV-PAGE-PORTFOLIO: mounts built components, fetches sections live.
import { useEffect, useState } from "react";
import { type ActivityId } from "@/components/vscode/ActivityBar";
import Explorer from "@/components/vscode/Explorer";
import PrimarySideBar from "@/components/vscode/PrimarySideBar";
import Section from "@/components/vscode/Section";
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

export default function PortfolioPage() {
  const [view, setView] = useState<ActivityId>("explorer");
  const [showSidebar, setShowSidebar] = useState(true);
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
      st.openTab({ kind: "code", path, sha: null });
      console.info("new tmp file (tabs UI next):", path);
      return;
    }
    if (id === "new-folder") {
      const key = nextFreeKey(
        st.tmpFs,
        "tmp/New Folder/.gitkeep",
        (n) => `tmp/New Folder ${n}/.gitkeep`,
      );
      st.writeTmp(key, "");
      console.info("new tmp folder (tmp view next):", key);
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TitleBar onMenuAction={handleAction} />
      <div className="flex min-h-0 flex-1 gap-[5px] bg-vscode-titlebar p-[5px]">
        {showSidebar ? (
          <PrimarySideBar active={view} onSelect={handleSelectView}>
            {view === "explorer" ? (
              <Explorer
                onOpenFile={(path) => console.info("open (FileViewer next):", path)}
                onAction={handleViewAction}
              />
            ) : (
              <p className="px-4 py-2 text-xs text-vscode-dim">
                {view} view lands with its component.
              </p>
            )}
          </PrimarySideBar>
        ) : null}
        <Section className="flex-1 bg-vscode-bg">
          <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-vscode-dim">
            Open a file from the Explorer
          </div>
        </Section>
      </div>
    </div>
  );
}
