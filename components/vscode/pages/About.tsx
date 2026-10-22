"use client";

// About — the portfolio's front page and the personal side of the resume.
// The sticky identity rail is the person; the right column is the story. Full
// experience, education and project detail stays one click away on its own page.
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { parseAbout, type AboutNow } from "@/lib/about";
import { resumeDownloadUrl } from "@/lib/resume";
import Codicon from "../Codicon";
import { PageCard, PageChip, PageShell } from "./PageShell";

const JUMP_LINKS = [
  { id: "story", label: "Story" },
  { id: "now", label: "Now" },
  { id: "principles", label: "How I work" },
  { id: "path", label: "Path" },
  { id: "work", label: "Work" },
  { id: "toolbox", label: "Toolbox" },
  { id: "beyond", label: "Beyond" },
] as const;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function SectionHeading({
  index,
  title,
  hint,
}: {
  index: string;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-vscode-code text-page-micro text-vscode-quick-match">
        {index}
      </span>
      <h2 className="shrink-0 text-page-meta font-semibold uppercase tracking-wide text-vscode-emphasis">
        {title}
      </h2>
      <span aria-hidden className="h-px flex-1 bg-vscode-border" />
      {hint ? (
        <span className="hidden text-page-micro text-vscode-dim @md:inline">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

type PathEntry = {
  period: string;
  title: string;
  meta: string;
  body: string | null;
  page: string | null;
  pageLabel: string | null;
};

export default function AboutPage() {
  const content = useStore((s) => s.profile);
  const projects = useStore((s) => s.projects);
  const projectGroups = useStore((s) => s.projectGroups);
  const revealPath = useStore((s) => s.revealPath);
  const showView = useStore((s) => s.showView);
  const openTab = useStore((s) => s.openTab);

  const [active, setActive] = useState("story");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const setSection = (id: string) => (node: HTMLElement | null) => {
    sectionRefs.current[id] = node;
  };

  useEffect(() => {
    const first = sectionRefs.current.story;
    if (!first) return;

    let root: HTMLElement | null = first.parentElement;
    while (root) {
      const style = getComputedStyle(root);
      if (
        (style.overflowY === "auto" || style.overflowY === "scroll") &&
        root.scrollHeight > root.clientHeight
      ) {
        break;
      }
      root = root.parentElement;
    }
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).dataset.section;
          if (id) setActive(id);
        }
      },
      { root, rootMargin: "-12% 0px -72% 0px", threshold: 0 },
    );

    for (const node of Object.values(sectionRefs.current)) {
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [content]);

  if (!content) {
    return (
      <PageShell icon="person" title="About" width="wide">
        <p className="text-page-body text-vscode-dim">Loading your profile…</p>
      </PageShell>
    );
  }

  const profile = content.profile;
  const data = profile?.data ?? {};
  const about = parseAbout(profile?.about);
  const name = profile?.name ?? "Your name";
  const role = String(data.role ?? "Developer");
  const summary = String(data.summary ?? "");
  const availability = String(data.availability ?? "");
  const focus = String(data.focus ?? "");
  const email = String(data.email ?? "");
  const topEducation = content.education[0];
  const educationYear =
    topEducation?.period.split("—").pop()?.trim() ?? topEducation?.period ?? "";
  const educationTile = topEducation
    ? `${topEducation.degree} · ${educationYear}`
    : "—";
  const resumeHref = resumeDownloadUrl(content.settings?.resume);

  const story =
    about.story.length > 0
      ? about.story
      : [profile?.bio, focus].filter(
          (line): line is string => Boolean(line && line.trim()),
        );
  const headline = about.headline || summary || role;
  const available = data.hireable !== false;
  const availabilityLabel =
    data.hireable === false ? "Not looking" : availability || "Open to work";

  const fallbackNow: AboutNow[] = [
    focus
      ? { label: "Focus", value: focus, detail: null }
      : null,
    topEducation
      ? {
          label: "Studying",
          value: educationTile,
          detail: topEducation.institution,
        }
      : null,
    availability
      ? { label: "Looking for", value: availability, detail: null }
      : null,
  ].filter((item): item is AboutNow => item !== null);
  const nowItems = about.now.length > 0 ? about.now : fallbackNow;

  const featuredGroup = projectGroups.find((group) => group.featured);
  const groupChildren = featuredGroup
    ? projects.filter((project) => project.group_slug === featuredGroup.slug)
    : [];
  const selectedProjects = projects
    .filter((project) => project.featured)
    .filter(
      (project) => project.highlights.length > 0,
    )
    .slice(0, 2);

  const work = content.experiences.filter(
    (experience) => experience.kind === "work",
  );
  const hackathons = content.experiences.filter(
    (experience) => experience.kind === "hackathon",
  );
  const topJob = work[0];
  const topHackathon = hackathons[0];

  const pathEntries: PathEntry[] = [];
  if (topEducation) {
    pathEntries.push({
      period: topEducation.period,
      title: `${topEducation.degree}${
        topEducation.field ? `, ${topEducation.field}` : ""
      }`,
      meta: [topEducation.institution, topEducation.location]
        .filter(Boolean)
        .join(" · "),
      body: topEducation.summary,
      page: "education",
      pageLabel: "Education",
    });
  }
  if (topHackathon) {
    pathEntries.push({
      period: topHackathon.period,
      title: topHackathon.role,
      meta: [topHackathon.company, topHackathon.location]
        .filter(Boolean)
        .join(" · "),
      body: topHackathon.summary,
      page: "hackathons",
      pageLabel: "Hackathons",
    });
  }
  if (topJob) {
    pathEntries.push({
      period: topJob.period,
      title: topJob.role,
      meta: [topJob.company, topJob.location].filter(Boolean).join(" · "),
      body: topJob.summary,
      page: "experience",
      pageLabel: "Experience",
    });
  }
  const openPage = (slug: string) =>
    openTab({ kind: "page", path: slug, sha: null });
  const reveal = (path: string) => {
    showView("explorer");
    revealPath(path);
  };
  const jump = (id: string) => {
    const node = sectionRefs.current[id];
    if (!node) return;
    setActive(id);
    node.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  const avatar = profile?.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={profile.avatar_url}
      alt={name}
      className="h-20 w-20 rounded-full border border-vscode-page-border object-cover @2xl:h-24 @2xl:w-24"
    />
  ) : (
    <span className="flex h-20 w-20 items-center justify-center rounded-full border border-vscode-page-border bg-vscode-page-card text-2xl font-semibold tracking-wide text-vscode-fg-active @2xl:h-24 @2xl:w-24">
      {initials(name)}
    </span>
  );

  return (
    <PageShell
      icon="person"
      title="About"
      subtitle={headline}
      width="wide"
      footer={
        <>
          This portfolio is a VS Code clone — every project, commit and file in
          it is real. The pages read from Supabase; the code reads from GitHub.
        </>
      }
    >
      <div className="@container">
        <div className="grid gap-10 @2xl:grid-cols-[240px_minmax(0,1fr)] @2xl:gap-10 @4xl:grid-cols-[280px_minmax(0,1fr)] @4xl:gap-14">
          <aside
            aria-label="Profile"
            className="border-b border-vscode-border pb-8 @2xl:sticky @2xl:top-8 @2xl:self-start @2xl:border-b-0 @2xl:border-r @2xl:pb-0 @2xl:pr-8"
          >
            <div className="flex items-center gap-4 @2xl:block">
              <div className="relative w-fit shrink-0">
                {avatar}
                <span
                  aria-hidden
                  className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-vscode-editor ${
                    available ? "bg-vscode-added" : "bg-vscode-page-border"
                  }`}
                />
              </div>
              <div className="min-w-0 @2xl:mt-4">
                <h2 className="text-page-display font-semibold tracking-tight text-vscode-fg-active">
                  {name}
                </h2>
                <p className="mt-0.5 text-page-body text-vscode-muted">{role}</p>
                <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-vscode-page-border bg-vscode-page-chip px-2.5 py-1 text-page-micro leading-snug text-vscode-muted">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    {available ? (
                      <span className="absolute inline-flex h-full w-full rounded-full bg-vscode-added opacity-60 motion-safe:animate-ping" />
                    ) : null}
                    <span
                      className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                        available ? "bg-vscode-added" : "bg-vscode-page-border"
                      }`}
                    />
                  </span>
                  {availabilityLabel}
                </div>
              </div>
            </div>

            {profile?.location ? (
              <div className="mt-4 flex items-center gap-1.5 text-page-meta text-vscode-dim">
                <Codicon name="location" size={12} />
                {profile.location}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {email ? (
                <a
                  href={`mailto:${email}`}
                  aria-label="Email"
                  title="Email"
                  className="flex h-7 w-7 items-center justify-center rounded-control border border-vscode-page-border bg-vscode-page-card text-vscode-muted hover:border-vscode-accent/60 hover:text-vscode-fg"
                >
                  <Codicon name="mail" size={14} />
                </a>
              ) : null}
              {content.socials.map((social) => (
                <a
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={social.label}
                  title={social.label}
                  className="flex h-7 w-7 items-center justify-center rounded-control border border-vscode-page-border bg-vscode-page-card text-vscode-muted hover:border-vscode-accent/60 hover:text-vscode-fg"
                >
                  <Codicon name={social.icon} size={14} />
                </a>
              ))}
            </div>

            {resumeHref ? (
              <a
                href={resumeHref}
                className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-control bg-vscode-accent px-3 text-page-meta text-vscode-badge-fg hover:bg-vscode-accent-hover"
              >
                <Codicon name="cloud-download" size={13} />
                Download resume
              </a>
            ) : (
              <button
                type="button"
                onClick={() => openPage("resume")}
                className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-control border border-vscode-page-border bg-vscode-page-card px-3 text-page-meta text-vscode-fg hover:border-vscode-accent/60"
              >
                <Codicon name="file-pdf" size={13} />
                Resume page
              </button>
            )}

            <nav
              aria-label="About sections"
              className="mt-6 hidden border-t border-vscode-border pt-4 @2xl:block"
            >
              <div className="text-page-micro uppercase tracking-wide text-vscode-dim">
                Jump to
              </div>
              <div className="mt-2">
                {JUMP_LINKS.map((link) => {
                  const isActive = active === link.id;
                  return (
                    <button
                      key={link.id}
                      type="button"
                      onClick={() => jump(link.id)}
                      aria-current={isActive ? "location" : undefined}
                      className="group flex w-full items-center gap-2 rounded-control px-1.5 py-1 text-left"
                    >
                      <span
                        aria-hidden
                        className={`h-px w-3 shrink-0 transition-colors ${
                          isActive
                            ? "bg-vscode-accent"
                            : "bg-vscode-border group-hover:bg-vscode-dim"
                        }`}
                      />
                      <span
                        className={`text-page-meta transition-colors ${
                          isActive
                            ? "text-vscode-fg"
                            : "text-vscode-dim group-hover:text-vscode-fg"
                        }`}
                      >
                        {link.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </aside>

          <div className="min-w-0">
            <div className="space-y-12">
              {story.length > 0 ? (
                <section
                  ref={setSection("story")}
                  data-section="story"
                  className="scroll-mt-8"
                >
                  <SectionHeading
                    index="01"
                    title="Story"
                    hint="the short version"
                  />
                  <p className="mt-4 max-w-[68ch] text-page-lead leading-relaxed text-vscode-fg">
                    {story[0]}
                  </p>
                  {story.slice(1).map((paragraph, index) => (
                    <p
                      key={`${index}-${paragraph.slice(0, 18)}`}
                      className="mt-4 max-w-[68ch] text-page-body leading-relaxed text-vscode-muted"
                    >
                      {paragraph}
                    </p>
                  ))}
                  {about.quote ? (
                    <blockquote className="mt-6 max-w-[62ch] border-l-2 border-vscode-accent/60 pl-4 text-page-lead leading-relaxed text-vscode-fg">
                      {about.quote}
                    </blockquote>
                  ) : null}
                </section>
              ) : null}

              {nowItems.length > 0 ? (
                <section
                  ref={setSection("now")}
                  data-section="now"
                  className="scroll-mt-8"
                >
                  <SectionHeading index="02" title="Now" hint="right now" />
                  <div className="mt-4 divide-y divide-vscode-border border-y border-vscode-border">
                    {nowItems.map((item) => (
                      <div
                        key={item.label}
                        className="grid gap-1 py-3 @sm:grid-cols-[110px_minmax(0,1fr)] @sm:gap-4"
                      >
                        <div className="text-page-micro uppercase tracking-wide text-vscode-dim">
                          {item.label}
                        </div>
                        <div>
                          <div className="text-page-body font-medium text-vscode-fg">
                            {item.value}
                          </div>
                          {item.detail ? (
                            <p className="mt-0.5 text-page-meta leading-relaxed text-vscode-muted">
                              {item.detail}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {about.principles.length > 0 ? (
                <section
                  ref={setSection("principles")}
                  data-section="principles"
                  className="scroll-mt-8"
                >
                  <SectionHeading
                    index="03"
                    title="How I work"
                    hint="three things I keep coming back to"
                  />
                  <div className="mt-4 grid gap-3 @xl:grid-cols-3">
                    {about.principles.map((principle, index) => (
                      <div
                        key={principle.title}
                        className="rounded-control border border-vscode-page-border bg-vscode-page-card p-4 transition-colors hover:border-vscode-accent/50 hover:bg-vscode-page-card-hover"
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex h-7 w-7 items-center justify-center rounded-control bg-vscode-page-chip text-vscode-quick-match">
                            <Codicon
                              name={principle.icon ?? "lightbulb"}
                              size={14}
                            />
                          </span>
                          <span className="font-vscode-code text-page-micro text-vscode-dim">
                            0{index + 1}
                          </span>
                        </div>
                        <h3 className="mt-3 text-page-body font-semibold text-vscode-fg">
                          {principle.title}
                        </h3>
                        <p className="mt-1 text-page-meta leading-relaxed text-vscode-muted">
                          {principle.body}
                        </p>
                        {principle.note ? (
                          <div className="mt-3 border-t border-vscode-border pt-2 text-page-micro text-vscode-dim">
                            {principle.note}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {pathEntries.length > 0 ? (
                <section
                  ref={setSection("path")}
                  data-section="path"
                  className="scroll-mt-8"
                >
                  <SectionHeading
                    index="04"
                    title="Path"
                    hint="where I've been"
                  />
                  <div className="relative mt-4">
                    <span
                      aria-hidden
                      className="absolute left-[5px] top-1.5 bottom-2 w-px bg-vscode-border"
                    />
                    <div>
                      {pathEntries.map((entry) => (
                        <div
                          key={`${entry.period}-${entry.title}`}
                          className="relative grid grid-cols-[12px_minmax(0,1fr)] gap-3 pb-5 last:pb-0"
                        >
                          <span
                            aria-hidden
                            className="relative mt-1.5 h-2.5 w-2.5 rounded-full border border-vscode-page-border bg-vscode-page-card"
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                              <span className="text-page-micro text-vscode-dim">
                                {entry.period}
                              </span>
                              <h3 className="text-page-body font-medium text-vscode-fg">
                                {entry.title}
                              </h3>
                            </div>
                            <div className="mt-0.5 text-page-meta text-vscode-muted">
                              {entry.meta}
                            </div>
                            {entry.body ? (
                              <p className="mt-1 text-page-meta leading-relaxed text-vscode-muted">
                                {entry.body}
                              </p>
                            ) : null}
                            {entry.page && entry.pageLabel ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (entry.page) openPage(entry.page);
                                }}
                                className="mt-1.5 inline-flex items-center gap-1 text-page-micro text-vscode-quick-match hover:underline"
                              >
                                {entry.pageLabel}
                                <Codicon name="arrow-right" size={10} />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}

              {featuredGroup || selectedProjects.length > 0 ? (
                <section
                  ref={setSection("work")}
                  data-section="work"
                  className="scroll-mt-8"
                >
                  <SectionHeading
                    index="05"
                    title="Selected work"
                    hint="a few things I've built"
                  />
                  {featuredGroup ? (
                    <PageCard
                      onClick={() => reveal(`Projects/${featuredGroup.slug}`)}
                      className="mt-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Codicon
                          name={featuredGroup.icon}
                          size={14}
                          className="text-vscode-dim"
                        />
                        <span className="text-page-lead font-semibold text-vscode-fg">
                          {featuredGroup.title}
                        </span>
                        <span className="ml-auto shrink-0 rounded-full bg-vscode-page-chip px-2 py-0.5 text-page-micro text-vscode-dim">
                          {groupChildren.length} repos
                        </span>
                      </div>
                      {featuredGroup.description ? (
                        <p className="mt-2 max-w-[72ch] text-page-meta leading-relaxed text-vscode-muted">
                          {featuredGroup.description}
                        </p>
                      ) : null}
                      {featuredGroup.highlights.length > 0 ? (
                        <ul className="mt-3 grid gap-1.5 @xl:grid-cols-2">
                          {featuredGroup.highlights.slice(0, 2).map((line) => (
                            <li
                              key={line}
                              className="flex gap-1.5 text-page-micro leading-relaxed text-vscode-dim"
                            >
                              <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-vscode-accent/60" />
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {groupChildren.slice(0, 4).map((child) => (
                          <PageChip key={child.id}>
                            {child.title_override ?? child.repo_name}
                          </PageChip>
                        ))}
                      </div>
                    </PageCard>
                  ) : null}

                  {selectedProjects.length > 0 ? (
                    <div className="mt-3 grid gap-3 @xl:grid-cols-2">
                      {selectedProjects.map((project) => (
                        <PageCard
                          key={project.id}
                          onClick={() =>
                            reveal(
                              `Projects/${project.repo_owner}/${project.repo_name}`,
                            )
                          }
                          className="flex h-full flex-col"
                        >
                          <div className="flex items-center gap-2">
                            <Codicon
                              name="repo"
                              size={13}
                              className="shrink-0 text-vscode-dim"
                            />
                            <span className="truncate text-page-body font-medium text-vscode-fg">
                              {project.title_override ?? project.repo_name}
                            </span>
                          </div>
                          {project.description ? (
                            <p className="mt-2 line-clamp-3 text-page-meta leading-relaxed text-vscode-muted">
                              {project.description}
                            </p>
                          ) : null}
                          {project.highlights[0] ? (
                            <p className="mt-2 flex gap-1.5 text-page-micro leading-relaxed text-vscode-dim">
                              <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-vscode-accent/60" />
                              <span className="line-clamp-2">
                                {project.highlights[0]}
                              </span>
                            </p>
                          ) : null}
                          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                            {project.tags.slice(0, 3).map((tag) => (
                              <PageChip key={tag}>{tag}</PageChip>
                            ))}
                            <span className="ml-auto text-page-micro text-vscode-dim">
                              {project.branch}
                            </span>
                          </div>
                        </PageCard>
                      ))}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => reveal("Projects")}
                    className="mt-4 inline-flex items-center gap-1 text-page-micro text-vscode-quick-match hover:underline"
                  >
                    View all {projects.length} repositories
                    <Codicon name="arrow-right" size={10} />
                  </button>
                </section>
              ) : null}

              {content.skills.length > 0 ? (
                <section
                  ref={setSection("toolbox")}
                  data-section="toolbox"
                  className="scroll-mt-8"
                >
                  <SectionHeading
                    index="06"
                    title="Toolbox"
                    hint="what I reach for"
                  />
                  <div className="mt-4 grid gap-x-8 gap-y-4 @lg:grid-cols-2">
                    {content.skills.map((group) => (
                      <div key={group.id}>
                        <div className="text-page-micro font-medium uppercase tracking-wide text-vscode-dim">
                          {group.category}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {group.items.slice(0, 5).map((item) => (
                            <PageChip key={item}>{item}</PageChip>
                          ))}
                          {group.items.length > 5 ? (
                            <PageChip>+{group.items.length - 5}</PageChip>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => openPage("skills")}
                    className="mt-4 inline-flex items-center gap-1 text-page-micro text-vscode-quick-match hover:underline"
                  >
                    All skills
                    <Codicon name="arrow-right" size={10} />
                  </button>
                </section>
              ) : null}

              {about.beyond.length > 0 ? (
                <section
                  ref={setSection("beyond")}
                  data-section="beyond"
                  className="scroll-mt-8"
                >
                  <SectionHeading
                    index="07"
                    title="Beyond the editor"
                    hint="threads I keep pulling"
                  />
                  <div className="mt-4 grid gap-4 @xl:grid-cols-3">
                    {about.beyond.map((item) => (
                      <div
                        key={item.title}
                        className="border-t border-vscode-border pt-3"
                      >
                        <div className="flex items-center gap-2">
                          <Codicon
                            name={item.icon ?? "lightbulb"}
                            size={14}
                            className="text-vscode-quick-match"
                          />
                          <h3 className="text-page-body font-medium text-vscode-fg">
                            {item.title}
                          </h3>
                        </div>
                        <p className="mt-1.5 text-page-meta leading-relaxed text-vscode-muted">
                          {item.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <section className="mt-12 rounded-control border border-vscode-page-border bg-vscode-page-card p-5">
              <div className="flex flex-col gap-4 @lg:flex-row @lg:items-center @lg:justify-between">
                <div>
                  <div className="text-page-micro uppercase tracking-wide text-vscode-dim">
                    Next
                  </div>
                  <h2 className="mt-1 text-page-lead font-semibold text-vscode-fg-active">
                    Let&apos;s build something that works.
                  </h2>
                  <p className="mt-1 text-page-meta text-vscode-muted">
                    {availabilityLabel}
                    {profile?.location ? ` · ${profile.location}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {email ? (
                    <a
                      href={`mailto:${email}`}
                      className="flex h-7 items-center gap-1.5 rounded-control bg-vscode-accent px-3 text-page-meta text-vscode-badge-fg hover:bg-vscode-accent-hover"
                    >
                      <Codicon name="mail" size={13} />
                      Email
                    </a>
                  ) : null}
                  {resumeHref ? (
                    <a
                      href={resumeHref}
                      className="flex h-7 items-center gap-1.5 rounded-control border border-vscode-page-border bg-vscode-page-card px-3 text-page-meta text-vscode-fg hover:border-vscode-accent/60"
                    >
                      <Codicon name="cloud-download" size={13} />
                      Resume
                    </a>
                  ) : null}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
