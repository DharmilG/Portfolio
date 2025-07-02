"use client";

// Sash — drag grip between workbench regions (DOC/05 §3/§5). The 5px gutter
// between two floating cards carries an always-visible ⋮ grip (three 3px dots,
// new VS Code UI); drag left/right to resize the neighbour region — the dots
// brighten on hover and keep that emphasis through the drag (no accent state).
// Live width goes to onPreview (cheap re-render), the released width to
// onCommit (caller persists). Panel + secondary bar reuse this.
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type SashProps = {
  value: number;
  min: number;
  max: number;
  onPreview: (width: number) => void;
  onCommit: (width: number) => void;
  label?: string;
  className?: string;
};

export default function Sash({
  value,
  min,
  max,
  onPreview,
  onCommit,
  label = "Resize",
  className,
}: SashProps) {
  const [dragging, setDragging] = useState(false);
  const start = useRef({ x: 0, width: 0, cursor: "" });

  const clamp = (w: number) => Math.min(Math.max(Math.round(w), min), max);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = {
      x: e.clientX,
      width: value,
      cursor: document.body.style.cursor,
    };
    // Cursor follows hit-testing, not pointer capture — pin it for the drag.
    document.body.style.cursor = "col-resize";
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    onPreview(clamp(start.current.width + e.clientX - start.current.x));
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    document.body.style.cursor = start.current.cursor;
    setDragging(false);
    onCommit(clamp(start.current.width + e.clientX - start.current.x));
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={`group absolute inset-y-0 z-10 flex w-[5px] cursor-col-resize touch-none items-center justify-center ${className ?? ""}`}
    >
      <span className="flex flex-col items-center gap-[3px]">
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
