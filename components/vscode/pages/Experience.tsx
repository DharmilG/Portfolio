"use client";

// Experience — the timeline (DOC/04 §1). A vertical rail with a dot per
// role, the same shape as the Source Control graph rail.
import { useStore } from "@/lib/store";
import { PageSection, PageShell } from "./PageShell";

export default function ExperiencePage() {
  const content = useStore((s) => s.profile);
  const experiences = content?.experiences ?? [];

  return (
    <PageShell
      icon="briefcase"
      title="Experience"
      subtitle="Where I worked, what I built and what I owned."
      footer="Rows live in the `experiences` table."
    >
      {experiences.length === 0 ? (
        <p className="text-[13px] text-vscode-dim">No roles listed yet.</p>
      ) : (
        <ol className="relative space-y-6 pl-6">
          <span
            aria-hidden
            className="absolute left-[7px] top-1 bottom-1 w-px bg-vscode-border"
          />
          {experiences.map((exp) => (
            <li key={exp.id} className="relative">
              <span
                aria-hidden
                className="absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-vscode-accent bg-vscode-editor"
              />
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[14px] font-medium text-vscode-fg-active">
                  {exp.role}
                </span>
                <span className="text-[13px] text-vscode-muted">
                  {exp.company}
                </span>
                <span className="ml-auto text-[11px] text-vscode-dim">
                  {exp.period}
                </span>
              </div>
              {exp.summary ? (
                <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-vscode-muted">
                  {exp.summary}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      <PageSection title="Also">
        <p className="text-[13px] leading-relaxed text-vscode-muted">
          The terminal in the bottom panel answers{" "}
          <code className="rounded bg-vscode-page-chip px-1 font-code text-[12px]">
            help
          </code>{" "}
          — it lists the same experience rows the way the command line would.
        </p>
      </PageSection>
    </PageShell>
  );
}
