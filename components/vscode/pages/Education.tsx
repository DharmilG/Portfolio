"use client";

// Education — the institution timeline.
// Matches the reference design: timeline track on the left with circular blue nodes,
// cards containing degree, institution, period, field, location, score pill, and summary.
import { useStore } from "@/lib/store";
import Codicon from "../Codicon";
import { PageShell } from "./PageShell";

export default function EducationPage() {
  const content = useStore((s) => s.profile);
  const education = content?.education ?? [];

  return (
    <PageShell
      icon="mortar-board"
      iconClassName="text-[#c084fc]"
      title="Education"
    >
      {education.length === 0 ? (
        <p className="text-page-body text-vscode-dim">
          No education rows yet.
        </p>
      ) : (
        <div className="relative pl-8 sm:pl-10">
          {/* Vertical timeline connector */}
          <div
            aria-hidden
            className="absolute left-[5px] sm:left-[7px] top-6 bottom-6 w-[2px] bg-vscode-border"
          />
          <div className="space-y-6">
            {education.map((row) => (
              <div key={row.id} className="relative">
                {/* Blue timeline node */}
                <span
                  aria-hidden
                  className="absolute -left-[33px] sm:-left-[39px] top-6 h-3 w-3 rounded-full border-2 border-vscode-accent bg-vscode-editor ring-4 ring-vscode-editor"
                />

                {/* Education Card */}
                <div className="rounded-section border border-vscode-page-border bg-vscode-page-card p-5 sm:p-6 transition-colors hover:border-vscode-accent/40">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-page-body font-bold text-vscode-fg-active">
                        {row.degree}
                      </span>
                      <span className="text-page-body text-vscode-muted">
                        {row.institution}
                      </span>
                    </div>
                    <span className="font-mono text-page-meta text-vscode-dim">
                      {row.period}
                    </span>
                  </div>

                  {row.field ? (
                    <div className="mt-2 text-page-meta font-medium text-vscode-fg">
                      {row.field}
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-page-micro">
                    {row.location ? (
                      <span className="flex items-center gap-1.5 text-vscode-dim">
                        <Codicon name="location" size={13} className="text-vscode-dim" />
                        <span>{row.location}</span>
                      </span>
                    ) : null}
                    {row.score ? (
                      <span className="rounded-control border border-vscode-page-border bg-vscode-page-chip px-2.5 py-0.5 font-medium text-vscode-fg">
                        {row.score}
                      </span>
                    ) : null}
                  </div>

                  {row.summary ? (
                    <p className="mt-3 max-w-[75ch] text-page-meta leading-relaxed text-vscode-muted">
                      {row.summary}
                    </p>
                  ) : null}

                  {row.url ? (
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-3.5 inline-flex items-center gap-1 text-page-micro text-vscode-quick-match hover:underline"
                    >
                      <Codicon name="link-external" size={12} />
                      <span>Visit</span>
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
