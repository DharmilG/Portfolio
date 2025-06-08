// Tooltip — shared VS Code hover tooltip. Wrap any trigger; the styled box
// is defined once so every tooltip renders pixel-identical chrome-wide.
// <Tooltip text="Views and More Actions..." position="bottom" align="end">
import type { ReactNode } from "react";

type TooltipProps = {
  text: string;
  position?: "top" | "bottom" | "left" | "right";
  align?: "center" | "start" | "end";
  className?: string;
  children: ReactNode;
};

const POSITION: Record<string, string> = {
  bottom: "top-full mt-1",
  top: "bottom-full mb-1",
  left: "right-full mr-1 top-1/2 -translate-y-1/2",
  right: "left-full ml-1 top-1/2 -translate-y-1/2",
};

const ALIGN: Record<string, string> = {
  center: "left-1/2 -translate-x-1/2",
  start: "left-0",
  end: "right-0",
};

export default function Tooltip({
  text,
  position = "bottom",
  align = "center",
  className = "",
  children,
}: TooltipProps) {
  const side =
    position === "left" || position === "right" ? "" : ` ${ALIGN[align]}`;
  return (
    <span className={`group relative inline-flex shrink-0 ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none invisible absolute z-30 whitespace-nowrap rounded-control border border-vscode-widget-border bg-vscode-widget-bg px-2 py-1 text-xs text-vscode-fg shadow-vscode group-hover:visible ${POSITION[position]}${side}`}
      >
        {text}
      </span>
    </span>
  );
}
