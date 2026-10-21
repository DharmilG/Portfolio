"use client";

// Hackathons — events + the thing we built (DOC/04 §1). Rows are
// `experiences` with kind = 'hackathon'; the stack chips and bullets come from
// the same row.
import { useStore } from "@/lib/store";
import Codicon from "../Codicon";
import { PageCard, PageChip, PageShell } from "./PageShell";

export default function HackathonsPage() {
  const content = useStore((s) => s.profile);
  const events = (content?.experiences ?? []).filter(
    (e) => e.kind === "hackathon",
  );

  return (
    <PageShell
      icon="flame"
      title="Hackathons"
      subtitle="Two-day builds: what we made, what it did and what I learned."
      footer="Rows live in `experiences` with `kind = 'hackathon'`."
    >
      {events.length === 0 ? (
        <p className="text-[13px] text-vscode-dim">No hackathons listed yet.</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {events.map((event) => (
            <PageCard key={event.id}>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-vscode-activity-active-bg text-vscode-fg">
                  <Codicon name="flame" size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-vscode-fg">
                    {event.role}
                  </div>
                  <div className="mt-0.5 text-[12px] text-vscode-muted">
                    {event.company}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-vscode-dim">
                    <span>{event.period}</span>
                    {event.location ? <span>· {event.location}</span> : null}
                  </div>
                </div>
              </div>
              {event.summary ? (
                <p className="mt-3 text-[12px] leading-relaxed text-vscode-muted">
                  {event.summary}
                </p>
              ) : null}
              {event.highlights.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {event.highlights.map((line) => (
                    <li
                      key={line}
                      className="flex gap-1.5 text-[11px] leading-relaxed text-vscode-dim"
                    >
                      <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-vscode-accent/60" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {event.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  {event.tags.map((tag) => (
                    <PageChip key={tag}>{tag}</PageChip>
                  ))}
                </div>
              ) : null}
              {event.url ? (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-3 inline-flex items-center gap-1 text-[11px] text-vscode-quick-match hover:underline"
                >
                  <Codicon name="link-external" size={11} />
                  Visit
                </a>
              ) : null}
            </PageCard>
          ))}
        </div>
      )}
    </PageShell>
  );
}
