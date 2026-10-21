"use client";

// About — the portfolio's front page, now sourced from the resume (DOC/04 §5).
// Hero, status strip, current focus, the full stack, selected work (the
// e-commerce platform + the flagship repos), experience, education, hackathons
// and contact. Every value comes from GET /api/profile or /api/projects.
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import { resumeDownloadUrl } from "@/lib/resume";
import Codicon from "../Codicon";
import { PageCard, PageChip, PageSection, PageShell } from "./PageShell";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function PageLink({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-[11px] text-vscode-quick-match hover:underline"
    >
      {children}
      <Codicon name="arrow-right" size={11} />
    </button>
  );
}

export default function AboutPage() {
  const content = useStore((s) => s.profile);
  const projects = useStore((s) => s.projects);
  const projectGroups = useStore((s) => s.projectGroups);
  const revealPath = useStore((s) => s.revealPath);
  const showView = useStore((s) => s.showView);
  const openTab = useStore((s) => s.openTab);

  if (!content) {
    return (
      <PageShell icon="person" title="About">
        <p className="text-[13px] text-vscode-dim">Loading your profile…</p>
      </PageShell>
    );
  }

  const profile = content.profile;
  const data = profile?.data ?? {};
  const name = profile?.name ?? "Your name";
  const role = String(data.role ?? "Developer");
  const summary = String(data.summary ?? "");
  const availability = String(data.availability ?? "");
  const focus = String(data.focus ?? "");
  const email = String(data.email ?? "");
  const phone = String(data.phone ?? "");
  const topEducation = content.education[0];
  const educationTile = topEducation
    ? `${topEducation.degree} · ${
        topEducation.period.split("—").pop()?.trim() ?? topEducation.period
      }`
    : "—";
  const resumeHref = resumeDownloadUrl(content.settings?.resume);

  const featuredGroups = projectGroups.filter((g) => g.featured);
  const featuredProjects = projects.filter((p) => p.featured);
  const moreProjects = projects.filter((p) => !p.featured && !p.group_slug);
  const work = content.experiences.filter((e) => e.kind === "work");
  const hackathons = content.experiences.filter((e) => e.kind === "hackathon");

  const openPage = (slug: string) =>
    openTab({ kind: "page", path: slug, sha: null });
  const reveal = (path: string) => {
    showView("explorer");
    revealPath(path);
  };

  return (
    <PageShell
      icon="person"
      title="About"
      subtitle={summary || profile?.bio || undefined}
      footer={
        <>
          This portfolio is a VS Code clone — every project, commit and file in
          it is real. The pages read from Supabase; the code reads from GitHub.
        </>
      }
    >
      {/* Hero */}
      <div className="flex flex-wrap items-start gap-5">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={name}
            className="h-20 w-20 rounded-full border border-vscode-page-border object-cover"
          />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full border border-vscode-page-border bg-vscode-page-card text-2xl font-semibold text-vscode-fg">
            {initials(name)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-vscode-fg-active">
            {name}
          </h2>
          <p className="text-[13px] text-vscode-muted">{role}</p>
          {profile?.bio ? (
            <p className="mt-3 max-w-[64ch] text-[13px] leading-relaxed text-vscode-muted">
              {profile.bio}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {email ? (
              <a
                href={`mailto:${email}`}
                className="flex h-7 items-center gap-1.5 rounded-control bg-vscode-accent px-3 text-[12px] text-vscode-badge-fg hover:bg-vscode-accent-hover"
              >
                <Codicon name="mail" size={13} />
                Email
              </a>
            ) : null}
            {content.socials.map((social) => (
              <a
                key={social.id}
                href={social.url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex h-7 items-center gap-1.5 rounded-control border border-vscode-page-border bg-vscode-page-card px-3 text-[12px] text-vscode-fg hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover"
              >
                <Codicon name={social.icon} size={13} />
                {social.label}
              </a>
            ))}
            {resumeHref ? (
              <a
                href={resumeHref}
                className="flex h-7 items-center gap-1.5 rounded-control border border-vscode-page-border bg-vscode-page-card px-3 text-[12px] text-vscode-fg hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover"
              >
                <Codicon name="cloud-download" size={13} />
                Resume
              </a>
            ) : (
              <button
                type="button"
                onClick={() => openPage("resume")}
                className="flex h-7 items-center gap-1.5 rounded-control border border-vscode-page-border bg-vscode-page-card px-3 text-[12px] text-vscode-fg hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover"
              >
                <Codicon name="file-pdf" size={13} />
                Resume
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status strip */}
      <div className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: "Availability",
            value:
              data.hireable === false
                ? "Not looking"
                : availability
                  ? "Open to work"
                  : "—",
            icon: availability ? "pass" : "circle-outline",
          },
          { label: "Education", value: educationTile, icon: "mortar-board" },
          {
            label: "Repositories",
            value: `${projects.length}`,
            icon: "repo",
          },
          {
            label: "Location",
            value: profile?.location || "Remote",
            icon: "location",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-control border border-vscode-page-border bg-vscode-page-card px-4 py-3"
          >
            <div className="flex items-center gap-1.5 text-[11px] text-vscode-dim">
              <Codicon name={stat.icon} size={12} />
              {stat.label}
            </div>
            <div className="mt-1 truncate text-[13px] font-medium text-vscode-fg" title={stat.value}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {focus ? (
        <PageSection title="Currently">
          <p className="text-[13px] leading-relaxed text-vscode-muted">
            {focus}
          </p>
        </PageSection>
      ) : null}

      {/* Stack */}
      {content.skills.length > 0 ? (
        <PageSection
          title="Stack"
          hint="what I work with"
          action={<PageLink onClick={() => openPage("skills")}>All skills</PageLink>}
        >
          <div className="grid gap-3 lg:grid-cols-2">
            {content.skills.map((group) => (
              <div
                key={group.id}
                className="rounded-control border border-vscode-page-border bg-vscode-page-card px-4 py-3"
              >
                <div className="text-[11px] font-medium uppercase tracking-wide text-vscode-dim">
                  {group.category}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {group.items.slice(0, 6).map((item) => (
                    <PageChip key={item}>{item}</PageChip>
                  ))}
                  {group.items.length > 6 ? (
                    <PageChip>+{group.items.length - 6}</PageChip>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </PageSection>
      ) : null}

      {/* Selected work */}
      {featuredGroups.length + featuredProjects.length > 0 ? (
        <PageSection
          title="Selected work"
          hint="every project is a live GitHub repository"
        >
          <div className="grid gap-3 lg:grid-cols-2">
            {featuredGroups.map((group) => {
              const children = projects.filter(
                (p) => p.group_slug === group.slug,
              );
              return (
                <PageCard
                  key={group.id}
                  onClick={() => reveal(`Projects/${group.slug}`)}
                >
                  <div className="flex items-center gap-2">
                    <Codicon
                      name={group.icon}
                      size={14}
                      className="text-vscode-dim"
                    />
                    <span className="truncate text-[13px] font-medium text-vscode-fg">
                      {group.title}
                    </span>
                    <span className="ml-auto shrink-0 rounded-full bg-vscode-page-chip px-2 py-0.5 text-[10px] text-vscode-dim">
                      {children.length} repos
                    </span>
                  </div>
                  {group.description ? (
                    <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-vscode-muted">
                      {group.description}
                    </p>
                  ) : null}
                  {group.highlights.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {group.highlights.slice(0, 2).map((line) => (
                        <li
                          key={line}
                          className="flex gap-1.5 text-[11px] leading-relaxed text-vscode-dim"
                        >
                          <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-vscode-accent/60" />
                          <span className="line-clamp-2">{line}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {children.slice(0, 3).map((child) => (
                      <PageChip key={child.id}>
                        {child.title_override ?? child.repo_name}
                      </PageChip>
                    ))}
                  </div>
                </PageCard>
              );
            })}
            {featuredProjects.map((project) => (
              <PageCard
                key={project.id}
                onClick={() =>
                  reveal(`Projects/${project.repo_owner}/${project.repo_name}`)
                }
              >
                <div className="flex items-center gap-2">
                  <Codicon
                    name="repo"
                    size={14}
                    className="text-vscode-dim"
                  />
                  <span className="truncate text-[13px] font-medium text-vscode-fg">
                    {project.title_override ?? project.repo_name}
                  </span>
                  {project.stars > 0 ? (
                    <span className="ml-auto flex items-center gap-1 text-[11px] text-vscode-dim">
                      <Codicon name="star-full" size={11} />
                      {project.stars}
                    </span>
                  ) : null}
                </div>
                {project.description ? (
                  <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-vscode-muted">
                    {project.description}
                  </p>
                ) : null}
                {project.highlights.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {project.highlights.slice(0, 2).map((line) => (
                      <li
                        key={line}
                        className="flex gap-1.5 text-[11px] leading-relaxed text-vscode-dim"
                      >
                        <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-vscode-accent/60" />
                        <span className="line-clamp-2">{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {project.tags.slice(0, 4).map((tag) => (
                    <PageChip key={tag}>{tag}</PageChip>
                  ))}
                  <span className="ml-auto text-[11px] text-vscode-dim">
                    {project.branch}
                  </span>
                </div>
              </PageCard>
            ))}
          </div>
        </PageSection>
      ) : null}

      {/* More repositories */}
      {moreProjects.length > 0 ? (
        <PageSection title="More repositories" hint="the rest of the workshop">
          <div className="divide-y divide-vscode-border overflow-hidden rounded-control border border-vscode-page-border bg-vscode-page-card">
            {moreProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() =>
                  reveal(`Projects/${project.repo_owner}/${project.repo_name}`)
                }
                className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-vscode-page-card-hover"
              >
                <Codicon
                  name="repo"
                  size={13}
                  className="shrink-0 text-vscode-dim"
                />
                <span className="truncate text-[12px] text-vscode-fg">
                  {project.title_override ?? project.repo_name}
                </span>
                {project.description ? (
                  <span className="hidden min-w-0 flex-1 truncate text-[11px] text-vscode-dim xl:block">
                    {project.description}
                  </span>
                ) : (
                  <span className="flex-1" />
                )}
                {project.language ? (
                  <span className="shrink-0 text-[11px] text-vscode-dim">
                    {project.language}
                  </span>
                ) : null}
                {project.stars > 0 ? (
                  <span className="flex shrink-0 items-center gap-1 text-[11px] text-vscode-dim">
                    <Codicon name="star-full" size={10} />
                    {project.stars}
                  </span>
                ) : null}
                <Codicon
                  name="chevron-right"
                  size={12}
                  className="shrink-0 text-vscode-dim"
                />
              </button>
            ))}
          </div>
        </PageSection>
      ) : null}

      {/* Experience */}
      {work.length > 0 ? (
        <PageSection
          title="Experience"
          action={<PageLink onClick={() => openPage("experience")}>Open</PageLink>}
        >
          <div className="space-y-4">
            {work.map((job) => (
              <div
                key={job.id}
                className="border-l-2 border-vscode-accent/40 pl-4"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[13px] font-medium text-vscode-fg">
                    {job.role}
                  </span>
                  <span className="text-[12px] text-vscode-muted">
                    {job.company}
                  </span>
                  <span className="ml-auto text-[11px] text-vscode-dim">
                    {job.period}
                  </span>
                </div>
                {job.summary ? (
                  <p className="mt-1 max-w-[70ch] text-[12px] leading-relaxed text-vscode-muted">
                    {job.summary}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1">
                  {job.tags.slice(0, 5).map((tag) => (
                    <PageChip key={tag}>{tag}</PageChip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </PageSection>
      ) : null}

      {/* Education */}
      {content.education.length > 0 ? (
        <PageSection
          title="Education"
          action={<PageLink onClick={() => openPage("education")}>Open</PageLink>}
        >
          <div className="space-y-2">
            {content.education.map((row) => (
              <div
                key={row.id}
                className="rounded-control border border-vscode-page-border bg-vscode-page-card px-4 py-3"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[13px] font-medium text-vscode-fg">
                    {row.institution}
                  </span>
                  <span className="text-[12px] text-vscode-muted">
                    {row.degree}
                  </span>
                  <span className="ml-auto text-[11px] text-vscode-dim">
                    {row.period}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-vscode-dim">
                  {row.field ? <span>{row.field}</span> : null}
                  {row.location ? <span>· {row.location}</span> : null}
                  {row.score ? (
                    <span className="rounded-full bg-vscode-page-chip px-2 py-0.5 text-vscode-muted">
                      {row.score}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </PageSection>
      ) : null}

      {/* Hackathons */}
      {hackathons.length > 0 ? (
        <PageSection
          title="Hackathons"
          action={<PageLink onClick={() => openPage("hackathons")}>Open</PageLink>}
        >
          <div className="grid gap-3 lg:grid-cols-2">
            {hackathons.map((event) => (
              <PageCard key={event.id}>
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-medium text-vscode-fg">
                    {event.role}
                  </span>
                  <span className="ml-auto text-[11px] text-vscode-dim">
                    {event.period}
                  </span>
                </div>
                <div className="mt-0.5 text-[12px] text-vscode-muted">
                  {event.company}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {event.tags.slice(0, 4).map((tag) => (
                    <PageChip key={tag}>{tag}</PageChip>
                  ))}
                </div>
              </PageCard>
            ))}
          </div>
        </PageSection>
      ) : null}

      {/* Contact */}
      <PageSection title="Get in touch">
        <div className="flex flex-wrap items-center gap-2">
          {email ? (
            <a
              href={`mailto:${email}`}
              className="rounded-control border border-vscode-page-border bg-vscode-page-card px-3 py-1.5 text-[12px] text-vscode-fg hover:border-vscode-accent/60"
            >
              {email}
            </a>
          ) : (
            <span className="text-[12px] text-vscode-dim">
              Add your email to the profile to show it here.
            </span>
          )}
          {phone ? (
            <a
              href={`tel:${phone.replace(/\s+/g, "")}`}
              className="rounded-control border border-vscode-page-border bg-vscode-page-card px-3 py-1.5 text-[12px] text-vscode-fg hover:border-vscode-accent/60"
            >
              {phone}
            </a>
          ) : null}
          {content.socials.map((social) => (
            <a
              key={social.id}
              href={social.url}
              target="_blank"
              rel="noreferrer noopener"
              className="flex h-7 items-center gap-1.5 rounded-control border border-vscode-page-border bg-vscode-page-card px-3 text-[12px] text-vscode-fg hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover"
            >
              <Codicon name={social.icon} size={13} />
              {social.label}
            </a>
          ))}
        </div>
      </PageSection>
    </PageShell>
  );
}
