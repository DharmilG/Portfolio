"use client";

// Portfolio shell mount — workbench chrome + regions (editor/panel fill in next).
// Partial PV-PAGE-PORTFOLIO: mounts built components, fetches sections live.
import { useEffect, useState } from "react";
import ActivityBar, { type ActivityId } from "@/components/vscode/ActivityBar";
import Explorer from "@/components/vscode/Explorer";
import SideBar from "@/components/vscode/SideBar";
import TitleBar from "@/components/vscode/TitleBar";
import { supabase } from "@/lib/db";
import { useStore } from "@/lib/store";

export default function PortfolioPage() {
  const [view, setView] = useState<ActivityId>("explorer");
  const setSections = useStore((s) => s.setSections);

  useEffect(() => {
    useStore.persist.rehydrate();
    supabase
      .from("sections")
      .select("id,slug,title,icon,orders")
      .then(({ data }) => {
        if (data) setSections(data);
      });
  }, [setSections]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <ActivityBar active={view} onSelect={setView} />
        <SideBar>
          {view === "explorer" ? (
            <Explorer
              onOpenFile={(path) => console.info("open (FileViewer next):", path)}
            />
          ) : (
            <p className="px-4 py-2 text-xs text-vscode-dim">
              {view} view lands with its component.
            </p>
          )}
        </SideBar>
        <div className="flex min-h-0 flex-1 items-center justify-center bg-vscode-tab text-sm text-vscode-dim">
          Open a file from the Explorer
        </div>
      </div>
    </div>
  );
}
