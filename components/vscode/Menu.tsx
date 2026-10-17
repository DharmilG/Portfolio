// Menu — shared dropdown/context menu box + items. Presentational only:
// callers own triggers (click state, hover wrappers) and placement via className.
// Densities reproduce today's two menu styles exactly ("menu": title-bar menus,
// "compact": gear menu) — converge them only with explicit visual sign-off.
// Optional per-item icon (file-type glyphs in breadcrumb pickers); icon-less
// items render exactly as before.
import Codicon from "./Codicon";

export type MenuItem =
  | { separator: true }
  | {
      id?: string;
      label: string;
      hint?: string;
      disabled?: boolean;
      icon?: string;
    };

type MenuProps = {
  items: readonly MenuItem[];
  onAction?: (id: string) => void;
  density?: "menu" | "compact";
  className?: string;
  label?: string;
};

const DENSITY_ITEM: Record<string, string> = {
  menu: "px-4 py-1 hover:bg-vscode-list-active",
  compact: "px-3 py-1.5 text-xs hover:bg-vscode-list-hover",
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
            onClick={() => {
              if (!item.disabled && item.id) onAction?.(item.id);
            }}
            className={`${
              item.icon ? "flex items-center gap-2" : "block"
            } w-full text-left text-vscode-fg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${DENSITY_ITEM[density]}`}
          >
            {item.icon ? (
              <span className="shrink-0 text-vscode-dim">
                <Codicon name={item.icon} />
              </span>
            ) : null}
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}
