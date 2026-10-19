"use client";

// SideBar — panel shell, 280px default (Sash drags it live: session
// `sidebarPreview` ?? the persisted width; DOC/05 §5).
// Header shows the view title + one actions group (the view's own buttons
// then the "Views and More Actions..." overflow). The group hides at rest
// and reveals on pane hover / focus-within — VS Code ViewPaneShowActions
// .Default (`.pane:hover > .pane-header.expanded > .actions`,
// base/browser/ui/splitview/paneview.css; a display toggle, no animation).
// See DOC/05 §5, skills rounded-workbench + vscode-tokens.
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import ViewActionButton from "./ViewActionButton";

type SideBarProps = {
  title?: string;
  onOverflow?: () => void;
  actions?: ReactNode;
  children?: ReactNode;
};

export default function SideBar({
  title = "Explorer",
  onOverflow,
  actions,
  children,
}: SideBarProps) {
  const sidebarWidth = useStore((s) => s.sidebarWidth);
  const sidebarPreview = useStore((s) => s.sidebarPreview);
  return (
    <aside
      style={{ width: sidebarPreview ?? sidebarWidth }}
      className="group/sidebar flex shrink-0 flex-col bg-vscode-side text-vscode-fg"
    >
      <div className="flex h-9 shrink-0 items-center pl-4 pr-[4px] text-[11px] font-medium tracking-normal text-vscode-emphasis">
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <div className="hidden shrink-0 items-center group-hover/sidebar:flex group-focus-within/sidebar:flex">
          {actions}
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
