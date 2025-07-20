"use client";

// Sash — drag grip between workbench regions (DOC/05 §3/§5). The 5px gutter
// between two floating cards carries an always-visible grip (three 3px dots,
// new VS Code UI); drag to resize the neighbour region — the dots brighten on
// hover and keep that emphasis through the drag (no accent state).
// Vertical (default) resizes width left/right; horizontal resizes the bottom
// panel's height up/down. Live size goes to onPreview (cheap re-render), the
// released size to onCommit (caller persists).
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type SashProps = {
  value: number;
  min: number;
  max: number;
  onPreview: (size: number) => void;
  onCommit: (size: number) => void;
  label?: string;
  className?: string;
  orientation?: "vertical" | "horizontal";
};

export default function Sash({
  value,
  min,
  max,
  onPreview,
  onCommit,
  label = "Resize",
  className,
  orientation = "vertical",
}: SashProps) {
  const [dragging, setDragging] = useState(false);
  const start = useRef({ x: 0, y: 0, size: 0, cursor: "" });
  const horizontal = orientation === "horizontal";

  const clamp = (w: number) => Math.min(Math.max(Math.round(w), min), max);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = {
      x: e.clientX,
      y: e.clientY,
      size: value,
      cursor: document.body.style.cursor,
    };
    // Cursor follows hit-testing, not pointer capture — pin it for the drag.
    document.body.style.cursor = horizontal ? "row-resize" : "col-resize";
    setDragging(true);
  };

  const nextSize = (e: ReactPointerEvent<HTMLDivElement>) =>
    clamp(
      horizontal
        ? start.current.size + start.current.y - e.clientY
        : start.current.size + e.clientX - start.current.x,
    );

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    onPreview(nextSize(e));
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    document.body.style.cursor = start.current.cursor;
    setDragging(false);
    onCommit(nextSize(e));
  };

  return (
    <div
      role="separator"
      aria-orientation={horizontal ? "horizontal" : "vertical"}
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={
        horizontal
          ? `group absolute inset-x-0 top-0 z-10 flex h-[5px] cursor-row-resize touch-none items-center justify-center ${className ?? ""}`
          : `group absolute inset-y-0 z-10 flex w-[5px] cursor-col-resize touch-none items-center justify-center ${className ?? ""}`
      }
    >
      <span
        className={`flex items-center ${horizontal ? "flex-row gap-[3px]" : "flex-col gap-[3px]"}`}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-[3px] w-[3px] rounded-full transition-colors ${
              dragging
                ? "bg-vscode-emphasis"
                : "bg-vscode-dim group-hover:bg-vscode-emphasis"
            }`}
          />
        ))}
      </span>
    </div>
  );
}
