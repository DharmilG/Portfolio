"use client";

// IconButton — shared icon action for the workbench chrome.
// Sizes: sm = title-bar control (p-1, 16px glyph, styled tooltip),
// md = rail footer gear (32px box, 24px glyph), lg = activity item
// (40px box, active pill bg, badge slot via children). "off" = native title.
// The styled box comes from shared Tooltip (single definition chrome-wide).
import type { ReactNode } from "react";
import Codicon from "./Codicon";
import Tooltip from "./Tooltip";

type IconButtonProps = {
  icon: string;
  label: string;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  active?: boolean;
  tooltip?: "off" | "center" | "right";
  className?: string;
  children?: ReactNode;
};

const SIZE = {
  sm: { box: "rounded p-1", glyph: 16 },
  md: { box: "h-8 w-8 rounded-control", glyph: 24 },
  lg: { box: "h-10 w-10 rounded-control", glyph: 24 },
} as const;

export default function IconButton({
  icon,
  label,
  onClick,
  size = "sm",
  active = false,
  tooltip = "center",
  className = "",
  children,
}: IconButtonProps) {
  const s = SIZE[size];
  const state =
    size === "lg"
      ? active
        ? "text-vscode-fg bg-vscode-activity-active-bg"
        : "hover:text-vscode-fg hover:bg-vscode-activity-hover-bg"
      : "hover:bg-vscode-list-hover hover:text-vscode-fg";

  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={tooltip === "off" ? label : undefined}
      className={`relative flex items-center justify-center ${s.box} ${state} ${className}`}
    >
      <Codicon name={icon} size={s.glyph} />
      {children}
    </button>
  );

  if (tooltip === "off") return button;
  return (
    <Tooltip
      text={label}
      position="bottom"
      align={tooltip === "right" ? "end" : "center"}
    >
      {button}
    </Tooltip>
  );
}
