"use client";

// PageShell — the shared chrome of the portfolio pages (About, Resume,
// Certificates, Experience, Skills, Contact). Every page is a designed
// surface in the editor: a header (glyph + title + subtitle), the body and
// a quiet footer. All colors come from the theme tokens.
import type { ReactNode } from "react";
import Codicon from "../Codicon";

export function PageShell({
  icon,
  title,
  subtitle,
  footer,
  children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto bg-vscode-editor">
      <div className="mx-auto w-full max-w-[900px] px-8 py-10 sm:px-12">
        <header className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-vscode-activity-active-bg text-vscode-fg">
            <Codicon name={icon} size={18} />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-vscode-fg-active">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-[13px] leading-relaxed text-vscode-muted">
                {subtitle}
              </p>
            ) : null}
          </div>
        </header>
        <div className="mt-8">{children}</div>
        {footer ? (
          <p className="mt-12 border-t border-vscode-border pt-4 text-[11px] leading-relaxed text-vscode-dim">
            {footer}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// A titled block inside a page.
export function PageSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-9 first:mt-0">
      <div className="flex items-baseline gap-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-vscode-emphasis">
          {title}
        </h2>
        {hint ? <span className="text-[11px] text-vscode-dim">{hint}</span> : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

// A small pill (skill, tag, status).
export function PageChip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "success";
}) {
  const toneClass =
    tone === "accent"
      ? "text-vscode-quick-match border-vscode-accent/50"
      : tone === "success"
        ? "text-vscode-added border-vscode-added/40"
        : "text-vscode-muted border-vscode-page-border";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border bg-vscode-page-chip px-2.5 py-0.5 text-[11px] ${toneClass}`}
    >
      {children}
    </span>
  );
}

// A card surface (project, certificate, ...).
export function PageCard({
  onClick,
  children,
  className = "",
}: {
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-control border border-vscode-page-border bg-vscode-page-card p-4 transition-colors ${
        onClick ? "cursor-pointer hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
