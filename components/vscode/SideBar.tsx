"use client";

// SideBar — panel shell, 280px default (Sash drags it live: session
// `sidebarPreview` ?? the persisted width; DOC/05 §5).
// Header shows the view title + the view-level overflow button
// ("Views and More Actions..."); row/view actions live with their rows
// (the Explorer root row carries its own, hover-revealed).
// See DOC/05 §5, skills rounded-workbench + vscode-tokens.
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import ViewActionButton from "./ViewActionButton";

type SideBarProps = {
  title?: string;
  onOverflow?: () => void;
  children?: ReactNode;
};

export default function SideBar({
  title = "Explorer",
  onOverflow,
  children,
}: SideBarProps) {
  const sidebarWidth = useStore((s) => s.sidebarWidth);
  const sidebarPreview = useStore((s) => s.sidebarPreview);
  return (
    <aside
      style={{ width: sidebarPreview ?? sidebarWidth }}
      className="flex shrink-0 flex-col bg-vscode-side text-vscode-fg"
    >
      <div className="flex h-9 shrink-0 items-center justify-between pl-4 pr-[4px] text-[11px] font-medium tracking-normal text-vscode-emphasis">
        <span>{title}</span>
        <div className="flex items-center">
          <ViewActionButton
            icon="more"
            label="Views and More Actions..."
            align="end"
            onClick={onOverflow}
          />
        </div>
      </div>
      {/* overflow-x hidden: absolutely-positioned tooltips are invisible
          phantom overflow and must never create a horizontal scrollbar. */}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        {children}
      </div>
    </aside>
  );
}
