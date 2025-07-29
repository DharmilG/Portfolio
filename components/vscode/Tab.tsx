"use client";

// Tab — one editor tab tile (editor chrome). Presentational: the parent owns
// select/close behavior. File-type glyph + truncated name + trailing zone:
// `dirty` swaps the close x for a status dot (hover swaps back to x for
// closing); `status` colors the dot + name (--color-vscode-modified amber for
// edited files, --color-vscode-added green for new tmp files) and shows the M
// badge just left of the dot/close button. Corners use --radius-tab (top only
// — the tile sits on the editor group header band). See DOC/05 §6.
import { fileIcon } from "@/lib/fileIcons";
import Codicon from "./Codicon";

type TabProps = {
  name: string;
  icon?: string; // explicit glyph — browser tabs pass the globe
  active?: boolean;
  dirty?: boolean;
  status?: "new" | "modified" | null;
  onSelect?: () => void;
  onClose?: () => void;
};

export default function Tab({
  name,
  icon,
  active = false,
  dirty = false,
  status = null,
  onSelect,
  onClose,
}: TabProps) {
  const nameTone =
    status === "new"
      ? "text-vscode-added"
      : status === "modified"
        ? "text-vscode-modified"
        : "";
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
      <Codicon name={icon ?? fileIcon(name)} />
      <span className={`min-w-0 flex-1 truncate ${nameTone}`}>{name}</span>
      <span className="flex shrink-0 items-center gap-1">
        {status === "modified" ? (
          <span className="text-[10px] font-semibold leading-none text-vscode-modified">
            M
          </span>
        ) : null}
        <button
          type="button"
          title="Close"
          aria-label={`Close ${name}`}
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}
          className={`flex h-5 w-5 items-center justify-center rounded-control hover:bg-vscode-activity-active-bg focus-visible:opacity-100 ${
            dirty ? "" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {dirty ? (
            <>
              <span
                className={`h-2 w-2 rounded-full group-hover:hidden ${
                  status === "new" ? "bg-vscode-added" : "bg-vscode-modified"
                }`}
              />
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
      </span>
    </div>
  );
}
