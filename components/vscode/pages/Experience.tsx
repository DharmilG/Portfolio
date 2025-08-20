"use client";

// Experience — the work timeline (DOC/04 §1). Roles carry the resume bullets;
// hackathons live on their own page and are linked from here.
import { useStore } from "@/lib/store";
import Codicon from "../Codicon";
import { PageChip, PageSection, PageShell } from "./PageShell";

export default function ExperiencePage() {
  const content = useStore((s) => s.profile);
  const openTab = useStore((s) => s.openTab);
  const work = (content?.experiences ?? []).filter((e) => e.kind === "work");
  const hackathons = (content?.experiences ?? []).filter(
    (e) => e.kind === "hackathon",
  );

  return (
    <PageShell
      icon="briefcase"
      title="Experience"
      subtitle="Where I worked, what I built and what I owned."
      footer="Rows live in the `experiences` table — `kind` splits work from hackathons."
    >
      {work.length === 0 ? (
        <p className="text-[13px] text-vscode-dim">No roles listed yet.</p>
      ) : (
        <ol className="relative space-y-8 pl-6">
          <span
            aria-hidden
            className="absolute left-[7px] top-1 bottom-1 w-px bg-vscode-border"
          />
          {work.map((job) => (
            <li key={job.id} className="relative">
              <span
                aria-hidden
                className="absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-vscode-accent bg-vscode-editor"
              />
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[14px] font-medium text-vscode-fg-active">
                  {job.role}
                </span>
                <span className="text-[13px] text-vscode-muted">
                  {job.company}
                </span>
                <span className="ml-auto text-[11px] text-vscode-dim">
                  {job.period}
                </span>
              </div>
              {job.location ? (
                <div className="mt-1 flex items-center gap-1 text-[11px] text-vscode-dim">
                  <Codicon name="location" size={11} />
                  {job.location}
                </div>
              ) : null}
              {job.summary ? (
                <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-vscode-muted">
                  {job.summary}
                </p>
              ) : null}
              {job.highlights.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {job.highlights.map((line) => (
                    <li
                      key={line}
                      className="flex max-w-[76ch] gap-2 text-[12px] leading-relaxed text-vscode-muted"
                    >
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-vscode-accent/60" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {job.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  {job.tags.map((tag) => (
                    <PageChip key={tag}>{tag}</PageChip>
                  ))}
                </div>
              ) : null}
              {job.url ? (
                <a
                  href={job.url}
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

      {hackathons.length > 0 ? (
        <PageSection title="Hackathons" hint="two-day builds, real teams">
          <div className="space-y-2">
            {hackathons.map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-baseline gap-2 rounded-control border border-vscode-page-border bg-vscode-page-card px-4 py-2.5"
              >
                <span className="text-[12px] font-medium text-vscode-fg">
                  {event.role}
                </span>
                <span className="text-[11px] text-vscode-muted">
                  {event.company}
                </span>
                <span className="ml-auto text-[11px] text-vscode-dim">
                  {event.period}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              openTab({ kind: "page", path: "hackathons", sha: null })
            }
            className="mt-3 flex items-center gap-1 text-[11px] text-vscode-quick-match hover:underline"
          >
            Open Hackathons
            <Codicon name="arrow-right" size={11} />
          </button>
        </PageSection>
      ) : null}
    </PageShell>
  );
}
