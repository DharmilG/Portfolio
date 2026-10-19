// TreeRow — 28px list row shared by Explorer-style trees (and future views
// like Search results). Presentational like Tab: callers own state. Focus
// decides the selection tone — active blue while the tree is focused,
// inactive gray otherwise (VS Code list.active/inactiveSelection).
// data-path feeds autoReveal scroll (lib/store ancestorKeys + revealNonce).
// See DOC/05 §5.
import type { ReactNode } from "react";

type TreeRowProps = {
  path: string;
  indent: string;
  right?: string;
  selected?: boolean;
  focused?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  className?: string;
  children: ReactNode;
};

export default function TreeRow({
  path,
  indent,
  right = "pr-2",
  selected = false,
  focused = false,
  onClick,
  onDoubleClick,
  className = "",
  children,
}: TreeRowProps) {
  // Hover is suppressed on the selected row — VS Code keeps the selection
  // background underneath the pointer.
  const state = selected
    ? `text-vscode-fg-active ${
        focused ? "bg-vscode-list-active" : "bg-vscode-list-inactive"
      }`
    : "hover:bg-vscode-list-hover";
  return (
    <div
      data-path={path}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`flex h-7 cursor-pointer items-center gap-1 ${indent} ${right} ${state} ${className}`}
    >
      {children}
    </div>
  );
}
