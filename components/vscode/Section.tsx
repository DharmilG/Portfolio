// Section — rounded workbench card (2026-10 refresh: floating sections).
// One Section per major region; the grid supplies gutters (gap + padding on
// bg-vscode-titlebar). overflow-hidden clips inner square corners to the round.
// Reused by: PrimarySideBar, editor region; later TerminalPanel.
import type { ReactNode } from "react";

type SectionProps = {
  orientation?: "row" | "col";
  label?: string;
  className?: string;
  children?: ReactNode;
};

export default function Section({
  orientation = "col",
  label,
  className = "",
  children,
}: SectionProps) {
  return (
    <section
      aria-label={label}
      className={`flex min-h-0 min-w-0 ${orientation === "row" ? "flex-row" : "flex-col"} overflow-hidden rounded-section border border-vscode-border ${className}`}
    >
      {children}
    </section>
  );
}
