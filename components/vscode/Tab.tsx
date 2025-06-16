"use client";

// Tab — one editor tab tile (editor chrome). Presentational: the parent owns
// select/close behavior. Shape mirrors VS Code 1.142 "connected tabs": a slim
// 32px tile whose active state sits flush on the strip's base with concave
// bottom fillets ("shoulders") so the tab background merges into the editor
// below. Fillet recipe (VS Code's own): a --radius-tab square pushed outside
// each bottom corner — border-radius carves the cove, box-shadow (offset =
// spread = radius/2, colour = tile background) fills it, the hairline border
// traces the arc into the strip's bottom rule; clip-path keeps the shadow
// inside the square. Dirty dot swaps to a 12px close x on hover; the active
// tab always shows x. See DOC/05 §6.
import { fileIcon } from "@/lib/fileIcons";
import Codicon from "./Codicon";

type TabProps = {
  name: string;
  active?: boolean;
  dirty?: boolean;
  onSelect?: () => void;
  onClose?: () => void;
};

// Active cap edge: 1px hairline hugging the tile's top + sides, stopping
// --radius-tab above the base where the fillets take over (VS Code clips its
// connected edge at shoulder height the same way).
const capEdge =
  "pointer-events-none absolute inset-x-0 top-0 bottom-[var(--radius-tab)] rounded-t-tab border-t border-l border-r border-vscode-border";

// Concave bottom fillets — see the file header for the recipe.
const filletLeft =
  "before:pointer-events-none before:absolute before:right-full before:bottom-0 before:size-[var(--radius-tab)] before:content-[''] before:rounded-br-full before:border-b before:border-r before:border-vscode-border before:[clip-path:inset(0)] before:shadow-[calc(var(--radius-tab)*0.5)_calc(var(--radius-tab)*0.5)_0_calc(var(--radius-tab)*0.5)_var(--color-vscode-tab-active)]";

const filletRight =
  "after:pointer-events-none after:absolute after:left-full after:bottom-0 after:size-[var(--radius-tab)] after:content-[''] after:rounded-bl-full after:border-b after:border-l after:border-vscode-border after:[clip-path:inset(0)] after:shadow-[calc(var(--radius-tab)*-0.5)_calc(var(--radius-tab)*0.5)_0_calc(var(--radius-tab)*0.5)_var(--color-vscode-tab-active)]";

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
      className={`group relative flex h-8 max-w-60 min-w-0 shrink-0 cursor-pointer select-none items-center gap-1 rounded-t-tab pl-2 pr-2 text-[13px] ${
        active
          ? `z-10 bg-vscode-tab-active text-vscode-fg ${filletLeft} ${filletRight}`
          : "text-vscode-muted hover:bg-vscode-tab-hover hover:text-vscode-fg"
      }`}
    >
      {active ? <span aria-hidden="true" className={capEdge} /> : null}
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
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-control hover:bg-vscode-activity-active-bg focus-visible:opacity-100 ${
          dirty || active ? "" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        {dirty ? (
          <>
            <span className="h-2 w-2 rounded-full bg-vscode-dot group-hover:hidden" />
            <Codicon
              name="close"
              size={12}
              className="hidden group-hover:block"
            />
          </>
        ) : (
          <Codicon name="close" size={12} />
        )}
      </button>
    </div>
  );
}
