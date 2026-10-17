"use client";

// Tab — one editor tab tile (editor chrome). Presentational: the parent owns
// select/close behavior. File-type glyph + truncated name + trailing zone:
// dirty dot (--color-vscode-dot) swaps to the close x while the tile is
// hovered; clean tiles reveal x on hover. Corners use --radius-tab (top only —
// the tile sits on the editor group header band). See DOC/05 §6.
import { fileIcon } from "@/lib/fileIcons";
import Codicon from "./Codicon";

type TabProps = {
  name: string;
  active?: boolean;
  dirty?: boolean;
  onSelect?: () => void;
  onClose?: () => void;
};

export default function Tab({
  name,
  active = false,
  dirty = false,
  onSelect,
  onClose,
}: TabProps) {
  return (
    <div
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          onClose?.();
        }
      }}
      className={`group flex h-[35px] max-w-60 min-w-0 shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-t-tab pl-3 pr-[6px] text-[13px] ${
        active
          ? "bg-vscode-tab-active text-vscode-fg"
          : "text-vscode-muted hover:bg-vscode-tab-hover hover:text-vscode-fg"
      }`}
    >
      <Codicon name={fileIcon(name)} />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <button
        type="button"
        title="Close"
        aria-label={`Close ${name}`}
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-control hover:bg-vscode-activity-active-bg focus-visible:opacity-100 ${
          dirty ? "" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        {dirty ? (
          <>
            <span className="h-2 w-2 rounded-full bg-vscode-dot group-hover:hidden" />
            <Codicon
              name="close"
              size={14}
              className="hidden group-hover:block"
            />
          </>
        ) : (
          <Codicon name="close" size={14} />
        )}
      </button>
    </div>
  );
}
