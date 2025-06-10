"use client";

// SideBar — 280px panel shell (layout only; views mounted by parent).
// Header shows the view title + view-action toolbar (actions are data;
// the parent owns behavior via onAction). See DOC/05 §5,
// skills rounded-workbench + vscode-tokens.
import type { ReactNode } from "react";
import Codicon from "./Codicon";
import Tooltip from "./Tooltip";

export type ViewAction = {
  id: string;
  icon: string;
  label: string;
};

export const EXPLORER_ACTIONS: ViewAction[] = [
  { id: "new-file", icon: "new-file", label: "New File..." },
  { id: "new-folder", icon: "new-folder", label: "New Folder..." },
  { id: "refresh", icon: "refresh", label: "Refresh Explorer" },
  { id: "collapse", icon: "collapse-all", label: "Collapse Folders in View" },
];

type SideBarProps = {
  title?: string;
  actions?: ViewAction[];
  onAction?: (id: string) => void;
  onOverflow?: () => void;
  children?: ReactNode;
};

export default function SideBar({
  title = "Explorer",
  actions = EXPLORER_ACTIONS,
  onAction,
  onOverflow,
  children,
}: SideBarProps) {
  return (
    <aside className="flex w-70 shrink-0 flex-col bg-vscode-side text-vscode-fg">
      <div className="flex h-9 shrink-0 items-center justify-between pl-4 pr-[4px] text-[11px] font-medium tracking-normal text-vscode-emphasis">
        <span>{title}</span>
        <div className="flex items-center">
          {actions.map((a) => (
            <Tooltip
              key={a.id}
              text={a.label}
              position="bottom"
              align="center"
            >
              <button
                type="button"
                onClick={() => onAction?.(a.id)}
                className="flex h-7 w-7 items-center justify-center rounded-control hover:bg-vscode-list-hover hover:text-vscode-fg"
                aria-label={a.label}
              >
                <Codicon name={a.icon} />
              </button>
            </Tooltip>
          ))}
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
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </aside>
  );
}
