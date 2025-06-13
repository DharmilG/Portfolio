"use client";

// Tab — one editor tab tile (editor chrome). Presentational: the parent owns
// select/close behavior. File-type glyph + truncated name + trailing zone:
// dirty dot (--color-vscode-dot) swaps to the close x while the tile is
// hovered; the active tab always shows x. Shape mirrors VS Code: top corners
// rounded with --radius-tab + 6px outward fillets at the bottom when active
// (no accent line). See DOC/05 §6.
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
      className={`group relative flex h-[35px] max-w-60 min-w-0 shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-t-tab pl-3 pr-[6px] text-[13px] ${
        active
          ? "bg-vscode-tab-active text-vscode-fg"
          : "text-vscode-muted hover:bg-vscode-tab-hover hover:text-vscode-fg"
      }`}
    >
      {active ? (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-1.5 bottom-0 h-1.5 w-1.5 rounded-tl-full bg-vscode-tab-active"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-1.5 bottom-0 h-1.5 w-1.5 rounded-tr-full bg-vscode-tab-active"
          />
        </>
      ) : null}
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
          dirty || active ? "" : "opacity-0 group-hover:opacity-100"
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
