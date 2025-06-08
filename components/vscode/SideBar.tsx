"use client";

// SideBar — 280px panel shell (layout only; views mounted by parent).
// See DOC/05 §5, skills rounded-workbench + vscode-tokens.
import type { ReactNode } from "react";
import Codicon from "./Codicon";
import Tooltip from "./Tooltip";

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
  return (
    <aside className="flex w-70 shrink-0 flex-col bg-vscode-side text-vscode-fg">
      <div className="flex h-9 shrink-0 items-center justify-between pl-4 pr-[4px] text-[11px] font-medium tracking-normal text-vscode-emphasis">
        <span>{title}</span>
        <Tooltip
          text="Views and More Actions..."
          position="bottom"
          align="end"
        >
          <button
            type="button"
            onClick={onOverflow}
            className="flex h-7 w-7 items-center justify-center rounded-control hover:bg-vscode-list-hover hover:text-vscode-fg"
            aria-label="Explorer options"
          >
            <Codicon name="more" />
          </button>
        </Tooltip>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </aside>
  );
}
