"use client";

// Education — the institution timeline (DOC/04 §1). Adani University first,
// then school; the score badge carries CGPA / percentile.
import { useStore } from "@/lib/store";
import Codicon from "../Codicon";
import { PageShell } from "./PageShell";

export default function EducationPage() {
  const content = useStore((s) => s.profile);
  const education = content?.education ?? [];

  return (
    <PageShell
      icon="mortar-board"
      title="Education"
      subtitle="Where I studied, what I studied and how it went."
      footer="Rows live in the `education` table."
    >
      {education.length === 0 ? (
        <p className="text-[13px] text-vscode-dim">
          No education rows yet.
        </p>
      ) : (
        <ol className="relative space-y-8 pl-6">
          <span
            aria-hidden
            className="absolute left-[7px] top-1 bottom-1 w-px bg-vscode-border"
          />
          {education.map((row) => (
            <li key={row.id} className="relative">
              <span
                aria-hidden
                className="absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-vscode-accent bg-vscode-editor"
              />
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[14px] font-medium text-vscode-fg-active">
                  {row.degree}
                </span>
                <span className="text-[13px] text-vscode-muted">
                  {row.institution}
                </span>
                <span className="ml-auto text-[11px] text-vscode-dim">
                  {row.period}
                </span>
              </div>
              {row.field ? (
                <div className="mt-1 text-[12px] text-vscode-muted">
                  {row.field}
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-vscode-dim">
                {row.location ? (
                  <span className="flex items-center gap-1">
                    <Codicon name="location" size={11} />
                    {row.location}
                  </span>
                ) : null}
                {row.score ? (
                  <span className="rounded-full border border-vscode-page-border bg-vscode-page-chip px-2 py-0.5 text-vscode-muted">
                    {row.score}
                  </span>
                ) : null}
              </div>
              {row.summary ? (
                <p className="mt-2 max-w-[70ch] text-[12px] leading-relaxed text-vscode-muted">
                  {row.summary}
                </p>
              ) : null}
              {row.url ? (
                <a
                  href={row.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-3 inline-flex items-center gap-1 text-[11px] text-vscode-quick-match hover:underline"
                >
                  <Codicon name="link-external" size={11} />
                  Visit
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </PageShell>
  );
}
