// TreeRow — list row shared by Explorer-style trees.
// Features 38px height (+10px from 28px default), 5px top/bottom spacing,
// 14px font size, and optional active indicator bar.
// data-path feeds autoReveal scroll (lib/store ancestorKeys + revealNonce).
import type { ReactNode } from "react";

type TreeRowProps = {
  path: string;
  indent: string;
  right?: string;
  selected?: boolean;
  focused?: boolean;
  activeIndicator?: boolean;
  title?: string;
  className?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  children: ReactNode;
};

export default function TreeRow({
  path,
  indent,
  right = "pr-2",
  selected = false,
  focused = false,
  activeIndicator = false,
  title,
  className = "",
  onClick,
  onDoubleClick,
  children,
}: TreeRowProps) {
  // Hover is suppressed on the selected row — VS Code keeps the selection
  // background underneath the pointer.
  const state = selected
    ? `text-vscode-fg-active ${
        focused ? "bg-vscode-list-active" : "bg-vscode-list-inactive"
      }`
    : activeIndicator
      ? "text-vscode-fg-active bg-vscode-list-inactive/70 hover:bg-vscode-list-hover"
      : "hover:bg-vscode-list-hover";

  return (
    <div
      data-path={path}
      title={title}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`group relative flex h-[38px] cursor-pointer items-center gap-2 py-[5px] text-[14px] transition-all duration-150 ${indent} ${right} ${state} ${className}`}
    >
      {activeIndicator ? (
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-[2.5px] bg-vscode-accent transition-transform duration-200 ease-out origin-center"
        />
      ) : null}
      {children}
    </div>
  );
}
