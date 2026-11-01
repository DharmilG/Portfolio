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
  activeIndicator?: boolean;
  title?: string;
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
      className={`group relative flex h-7 cursor-pointer items-center gap-1 transition-all duration-150 ${indent} ${right} ${state}`}
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
