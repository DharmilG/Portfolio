"use client";

// Hackathons — rapid builds, event achievements, and technology stack.
// Matches reference layout: 2-column card grid, preview action button,
// event and location details, blue bullet points, and branded skill badges.
// Strictly uses global font tokens (--text-page-*).
import { useStore } from "@/lib/store";
import Codicon from "../Codicon";
import SkillIcon from "../SkillIcon";
import { PageShell } from "./PageShell";

export default function HackathonsPage() {
  const content = useStore((s) => s.profile);
  const events = (content?.experiences ?? []).filter(
    (e) => e.kind === "hackathon",
  );

  return (
    <PageShell
      icon="flame"
      iconClassName="text-[#fb923c]"
      title="Hackathons"
      width="wide"
    >
      {events.length === 0 ? (
        <p className="text-page-body text-vscode-dim">No hackathons listed yet.</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {events.map((event) => {
            const hasPreview = Boolean(event.url || event.role === "Cafe POS");
            const previewHref = event.url || "https://github.com/dharmil03";

            return (
              <div
                key={event.id}
                className="flex flex-col justify-between rounded-section border border-vscode-page-border bg-vscode-page-card p-6 transition-colors hover:border-vscode-accent/40"
              >
                {/* Top content */}
                <div>
                  {/* Title & Preview Button */}
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-page-lead font-bold text-vscode-fg-active">
                      {event.role}
                    </h2>
                    {hasPreview ? (
                      <a
                        href={previewHref}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1.5 rounded-control border border-vscode-accent/40 bg-vscode-accent/15 px-2.5 py-1 text-page-micro font-medium text-vscode-quick-match transition-colors hover:bg-vscode-accent/25"
                      >
                        <Codicon name="globe" size={13} />
                        <span>Preview</span>
                      </a>
                    ) : null}
                  </div>

                  {/* Event Subtitle */}
                  <div className="mt-1 text-page-body font-medium text-vscode-muted">
                    {event.company}
                  </div>

                  {/* Period & Location */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-page-micro text-vscode-dim">
                    <span>{event.period}</span>
                    {event.location ? (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Codicon name="location" size={12} className="text-vscode-dim" />
                          <span>{event.location}</span>
                        </span>
                      </>
                    ) : null}
                  </div>

                  {/* Summary */}
                  {event.summary ? (
                    <p className="mt-4 text-page-meta font-medium text-vscode-fg">
                      {event.summary}
                    </p>
                  ) : null}

                  {/* Highlight Bullets with Accent Dots */}
                  {event.highlights.length > 0 ? (
                    <ul className="mt-4 space-y-2.5">
                      {event.highlights.map((line) => (
                        <li
                          key={line}
                          className="flex items-start gap-2.5 text-page-meta leading-relaxed text-vscode-muted"
                        >
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-vscode-accent" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                {/* Bottom Stack Chips with Authentic Branded Logos */}
                {event.tags.length > 0 ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {event.tags.map((tag) => (
                      <div
                        key={tag}
                        className="flex items-center gap-1.5 rounded-control border border-vscode-page-border bg-[#141516] px-2.5 py-1 text-page-micro text-vscode-fg"
                      >
                        <SkillIcon name={tag} size={14} />
                        <span>{tag}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
