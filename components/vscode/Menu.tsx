// Menu — shared dropdown/context menu box + items. Presentational only:
// callers own triggers (click state, hover wrappers) and placement via className.
// Densities reproduce today's two menu styles exactly ("menu": title-bar menus,
// "compact": gear menu) — converge them only with explicit visual sign-off.
// "tree" density = quick-pick tree rows (breadcrumb pickers): optional leading
// icon (chevrons for folders, file glyphs for files), `depth` indent, `active`
// current row (1px accent outline, VS Code focusBorder), truncated labels.
// Plain menu/compact items render as before.
import Codicon from "./Codicon";

export type MenuItem =
  | { separator: true }
  | {
      id?: string;
      label: string;
      hint?: string;
      disabled?: boolean;
      icon?: string;
      active?: boolean;
      depth?: number;
    };

type MenuProps = {
  items: readonly MenuItem[];
  onAction?: (id: string) => void;
  density?: "menu" | "compact" | "tree";
  className?: string;
  label?: string;
};

const DENSITY_ITEM: Record<string, string> = {
  menu: "px-4 py-1 hover:bg-vscode-list-active",
  compact: "px-3 py-1.5 text-xs hover:bg-vscode-list-hover",
  tree: "h-6 rounded-control pr-2 text-xs hover:bg-vscode-list-hover",
};

export default function Menu({
  items,
  onAction,
  density = "menu",
  className = "",
  label,
}: MenuProps) {
  return (
    <div
      role="menu"
      aria-label={label}
      className={`rounded-control border border-vscode-border bg-vscode-widget-bg py-1 shadow-vscode ${className}`}
    >
      {items.map((item, i) =>
        "separator" in item ? (
          <div
            key={i}
            role="separator"
            className="my-1 border-t border-vscode-border"
          />
        ) : (
          <button
            key={item.id ?? item.label}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            title={item.hint}
            data-active={item.active || undefined}
            onClick={() => {
              if (!item.disabled && item.id) onAction?.(item.id);
            }}
            style={
              density === "tree"
                ? { paddingLeft: 5 + (item.depth ?? 0) * 16 }
                : undefined
            }
            className={`${
              item.icon ? "flex items-center gap-2" : "block"
            } w-full text-left text-vscode-fg ${
              item.active
                ? "outline-1 -outline-offset-1 outline-vscode-accent"
                : ""
            } disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${DENSITY_ITEM[density]}`}
          >
            {item.icon ? (
              <span className="shrink-0 text-vscode-dim">
                <Codicon name={item.icon} />
              </span>
            ) : null}
            {density === "tree" ? (
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
            ) : (
              item.label
            )}
          </button>
        ),
      )}
    </div>
  );
}
