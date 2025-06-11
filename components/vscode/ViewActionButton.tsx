"use client";

// ViewActionButton — 28px square view action (Explorer root-row actions,
// header overflow). Fixed construction: 16px glyph centered, control-radius
// hover; label doubles as tooltip + aria-label. Clicks never bubble to a
// parent row toggle. Tooltip box is the shared single definition.
import Codicon from "./Codicon";
import Tooltip from "./Tooltip";

type ViewActionButtonProps = {
  icon: string;
  label: string;
  onClick?: () => void;
  align?: "center" | "start" | "end";
};

export default function ViewActionButton({
  icon,
  label,
  onClick,
  align = "center",
}: ViewActionButtonProps) {
  return (
    <Tooltip text={label} position="bottom" align={align}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control hover:bg-vscode-list-hover hover:text-vscode-fg"
        aria-label={label}
      >
        <Codicon name={icon} />
      </button>
    </Tooltip>
  );
}
