"use client";

// Experience — the work narrative (DOC/04 §1, DOC/05 §11).
// Left: a sticky metadata rail per role (period, company, location, skills).
// Right: the authored `phases` narrative — Part 01 / Part 02 with a bold
// lead-in above every achievement card. Hovering a card dims its siblings
// (Focus Spotlight) and lights an accent glow; filtering by stack dims the
// non-matching cards in place instead of removing them.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useStore,
  type Experience,
  type ExperienceAchievement,
  type ExperiencePhase,
} from "@/lib/store";
import Codicon from "../Codicon";
import { PageSection, PageShell } from "./PageShell";

function tagsFor(
  achievement: ExperienceAchievement,
  phase: ExperiencePhase,
  job: Experience,
): string[] {
  return achievement.tags?.length
    ? achievement.tags
    : phase.tags?.length
      ? phase.tags
      : job.tags;
}

// Old rows (or the hackathons) only have `highlights`; wrap them in one phase
// so the page never depends on the richer column being filled.
function phasesFor(job: Experience): ExperiencePhase[] {
  if (job.phases?.length) return job.phases;
  if (job.highlights.length === 0) return [];
  return [
    {
      label: "Part 01",
      title: "Highlights",
      tags: job.tags,
      achievements: job.highlights.map((line) => ({
        lead: "",
        body: line,
        tags: job.tags,
      })),
    },
  ];
}

function Role({ job, index }: { job: Experience; index: number }) {
  const phases = useMemo(() => phasesFor(job), [job]);
  const allTags = useMemo(() => {
    const seen = new Set<string>();
    for (const phase of phases) {
      for (const achievement of phase.achievements) {
        for (const tag of tagsFor(achievement, phase, job)) seen.add(tag);
      }
    }
    return [...seen];
  }, [phases, job]);
  const [active, setActive] = useState<string[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const firstMatchRef = useRef<HTMLLIElement | null>(null);

  const activeSet = new Set(active);
  const isMatch = (achievement: ExperienceAchievement, phase: ExperiencePhase) =>
    active.length === 0 ||
    tagsFor(achievement, phase, job).some((tag) => activeSet.has(tag));

  // The first card that matches the current filter; its ref is used to keep the
  // result in view when a filter is applied.
  let firstMatchId: string | null = null;
  if (active.length > 0) {
    for (let phaseIndex = 0; phaseIndex < phases.length; phaseIndex += 1) {
      const phase = phases[phaseIndex];
      for (
        let achievementIndex = 0;
        achievementIndex < phase.achievements.length;
        achievementIndex += 1
      ) {
        if (isMatch(phase.achievements[achievementIndex], phase)) {
          firstMatchId = `${job.id}-${phaseIndex}-${achievementIndex}`;
          break;
        }
      }
      if (firstMatchId) break;
    }
  }

  const total = phases.reduce((n, phase) => n + phase.achievements.length, 0);
  const shown = phases.reduce(
    (n, phase) =>
      n + phase.achievements.filter((a) => isMatch(a, phase)).length,
    0,
  );

  const toggle = (tag: string) =>
    setActive((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

  // Keep the first match in view when a filter is applied — QA lives in Part 02,
  // so without this the page would look empty until the reader scrolls.
  useEffect(() => {
    if (active.length === 0) return;
    firstMatchRef.current?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [active]);

  return (
    <section className="grid border-b border-vscode-border pb-14 last:border-b-0 last:pb-0 @2xl/experience:grid-cols-[220px_minmax(0,1fr)] @2xl/experience:gap-10 @4xl/experience:grid-cols-[280px_minmax(0,1fr)] @4xl/experience:gap-14">
      {/* Sticky company rail — stays with the reader through the narrative. */}
      <aside className="relative self-start border-b border-vscode-border pb-6 @2xl/experience:sticky @2xl/experience:top-8 @2xl/experience:border-b-0 @2xl/experience:border-r @2xl/experience:pb-0 @2xl/experience:pr-8 @4xl/experience:pr-10">
        <span
          aria-hidden
          className="absolute -right-[3px] top-1 hidden h-[5px] w-[5px] rounded-full bg-vscode-accent ring-4 ring-vscode-editor @2xl/experience:block"
        />
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-vscode-code text-page-micro uppercase tracking-[0.08em] text-vscode-dim">
          <span className="text-vscode-quick-match">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span aria-hidden className="h-px w-5 bg-vscode-border" />
          <span className="whitespace-nowrap">{job.period}</span>
        </div>
        <h2 className="mt-4 text-page-title font-semibold tracking-[-0.02em] text-vscode-fg-active @2xl/experience:text-page-display">
          {job.company}
        </h2>
        <div className="mt-2 text-page-body text-vscode-muted">{job.role}</div>
        {job.location ? (
          <div className="mt-1.5 flex items-center gap-1.5 text-page-meta text-vscode-dim">
            <Codicon name="location" size={12} />
            {job.location}
          </div>
        ) : null}
        {job.url ? (
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-3 inline-flex items-center gap-1 text-page-micro text-vscode-quick-match hover:underline"
          >
            <Codicon name="link-external" size={11} />
            Visit
          </a>
        ) : null}

        {allTags.length > 0 ? (
          <div className="mt-6 border-t border-vscode-border pt-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-page-micro font-medium uppercase tracking-[0.14em] text-vscode-dim">
                Filter by stack
              </span>
              {active.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setActive([])}
                  className="text-page-micro text-vscode-quick-match hover:underline"
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div
              className="mt-2.5 flex flex-wrap gap-1.5"
              role="group"
              aria-label={`Filter ${job.company} highlights by stack`}
            >
              {allTags.map((tag) => {
                const on = active.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(tag)}
                    className={`flex h-7 items-center gap-1 rounded-control border px-2.5 text-page-micro transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-vscode-accent ${
                      on
                        ? "border-vscode-quick-match/50 bg-vscode-quick-match/10 text-vscode-fg-active"
                        : "border-vscode-page-border bg-vscode-page-chip/60 text-vscode-muted hover:border-vscode-accent/50 hover:text-vscode-fg"
                    }`}
                  >
                    {on ? <Codicon name="check" size={11} /> : null}
                    {tag}
                  </button>
                );
              })}
            </div>
            <div
              className="mt-2.5 text-page-micro text-vscode-dim"
              aria-live="polite"
            >
              {active.length > 0
                ? `${shown} of ${total} shown`
                : `${total} highlights`}
            </div>
          </div>
        ) : null}
      </aside>

      {/* Narrative */}
      <div className="min-w-0 pt-6 @2xl/experience:pt-0">
        {job.summary ? (
          <p className="max-w-[68ch] text-page-body text-vscode-muted">
            {job.summary}
          </p>
        ) : null}

        <div className="mt-7 space-y-9">
          {phases.map((phase, phaseIndex) => {
            const phaseShown = phase.achievements.filter((a) =>
              isMatch(a, phase),
            ).length;
            return (
              <section key={`${phase.label}-${phaseIndex}`}>
                <div
                  className={`transition-opacity duration-200 ${
                    active.length > 0 && phaseShown === 0 ? "opacity-40" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-vscode-code text-page-micro uppercase tracking-[0.16em] text-vscode-quick-match">
                      {phase.label || `Part 0${phaseIndex + 1}`}
                    </span>
                    <span aria-hidden className="h-px flex-1 bg-vscode-border" />
                  </div>
                  <h3 className="mt-2 text-page-lead font-semibold text-vscode-fg-active">
                    {phase.title}
                  </h3>
                  {phase.summary ? (
                    <p className="mt-1 max-w-[70ch] text-page-meta text-vscode-dim">
                      {phase.summary}
                    </p>
                  ) : null}
                </div>

                <ul className="mt-3 space-y-2.5">
                  {phase.achievements.map((achievement, achievementIndex) => {
                    const id = `${job.id}-${phaseIndex}-${achievementIndex}`;
                    const match = isMatch(achievement, phase);
                    const hot = match && hovered === id;
                    const opacity = !match
                      ? 0.28
                      : hovered !== null && hovered !== id
                        ? 0.42
                        : 1;
                    const tags = tagsFor(achievement, phase, job);
                    return (
                      <li
                        key={id}
                        ref={id === firstMatchId ? firstMatchRef : undefined}
                        onMouseEnter={() => {
                          if (match) setHovered(id);
                        }}
                        onMouseLeave={() =>
                          setHovered((current) => (current === id ? null : current))
                        }
                        style={{ opacity }}
                        className={`group relative overflow-hidden rounded-control border bg-vscode-page-card px-4 py-3.5 pl-5 transition-[opacity,border-color,background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none ${
                          hot
                            ? "border-vscode-accent/45 bg-vscode-page-card-hover shadow-page-glow"
                            : "border-vscode-page-border"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_0%_0%,rgba(0,120,212,0.12),transparent_60%)] transition-opacity duration-200 motion-reduce:transition-none ${
                            hot ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <span
                          aria-hidden
                          className={`absolute inset-y-3 left-0 w-[2px] rounded-full bg-vscode-accent transition-opacity duration-200 motion-reduce:transition-none ${
                            hot ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <div className="relative">
                          {achievement.lead ? (
                            <div className="text-page-body font-semibold leading-snug text-vscode-fg-active">
                              {achievement.lead}
                            </div>
                          ) : null}
                          <p
                            className={`${
                              achievement.lead ? "mt-1" : ""
                            } max-w-[68ch] text-page-body text-vscode-muted`}
                          >
                            {achievement.body}
                          </p>
                          {tags.length > 0 ? (
                            <div className="mt-2.5 flex flex-wrap gap-1">
                              {tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-vscode-page-border bg-vscode-page-chip px-2 py-0.5 text-page-micro text-vscode-dim"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}

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
      footer="Rows live in the `experiences` table — `phases` carries the Part 01/02 narrative, `kind` splits work from hackathons."
      width="wide"
    >
      {work.length === 0 ? (
        <p className="text-page-body text-vscode-dim">No roles listed yet.</p>
      ) : (
        <div className="@container/experience -mt-1 space-y-14">
          {work.map((job, index) => (
            <Role key={job.id} job={job} index={index} />
          ))}
        </div>
      )}

      {hackathons.length > 0 ? (
        <PageSection title="Hackathons" hint="two-day builds, real teams">
          <div className="grid gap-2 lg:grid-cols-2">
            {hackathons.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() =>
                  openTab({ kind: "page", path: "hackathons", sha: null })
                }
                className="rounded-control border border-vscode-page-border bg-vscode-page-card px-4 py-3 text-left transition-colors hover:border-vscode-accent/50 hover:bg-vscode-page-card-hover"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-page-body font-medium text-vscode-fg">
                    {event.role}
                  </span>
                  <span className="ml-auto text-page-micro text-vscode-dim">
                    {event.period}
                  </span>
                </div>
                <div className="mt-0.5 text-page-meta text-vscode-muted">
                  {event.company}
                </div>
                {event.summary ? (
                  <p className="mt-1.5 line-clamp-2 text-page-meta text-vscode-dim">
                    {event.summary}
                  </p>
                ) : null}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              openTab({ kind: "page", path: "hackathons", sha: null })
            }
            className="mt-3 flex items-center gap-1 text-page-micro text-vscode-quick-match hover:underline"
          >
            Open Hackathons
            <Codicon name="arrow-right" size={11} />
          </button>
        </PageSection>
      ) : null}
    </PageShell>
  );
}
