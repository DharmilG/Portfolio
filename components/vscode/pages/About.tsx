"use client";

// About — the portfolio's front page (DOC/04 §5). Everything on it comes
// from the database: the profile hero, the status strip, the skill groups,
// the selected work, the experience timeline and the contact row.
import { useStore } from "@/lib/store";
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

export default function AboutPage() {
  const content = useStore((s) => s.profile);
  const projects = useStore((s) => s.projects);
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
  const role = String(data.role ?? "Developer");
  const availability = String(data.availability ?? "");
  const years = Number(data.years ?? 0);
  const focus = String(data.focus ?? "");
  const summary = String(data.summary ?? "");
  const email = String(data.email ?? "");
  const name = profile?.name ?? "Your name";
  const selected = projects.slice(0, 6);

  const openProject = (owner: string, repo: string) => {
    showView("explorer");
    revealPath(`Projects/${owner}/${repo}`);
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
            <p className="mt-3 max-w-[62ch] text-[13px] leading-relaxed text-vscode-muted">
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
            {content.socials.map((s) => (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex h-7 items-center gap-1.5 rounded-control border border-vscode-page-border bg-vscode-page-card px-3 text-[12px] text-vscode-fg hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover"
              >
                <Codicon name={s.icon} size={13} />
                {s.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => openTab({ kind: "page", path: "resume", sha: null })}
              className="flex h-7 items-center gap-1.5 rounded-control border border-vscode-page-border bg-vscode-page-card px-3 text-[12px] text-vscode-fg hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover"
            >
              <Codicon name="file-pdf" size={13} />
              Resume
            </button>
          </div>
        </div>
      </div>

      {/* Status strip */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Availability",
            value: availability || "Open to work",
            icon: availability ? "pass" : "circle-outline",
          },
          { label: "Experience", value: `${years}+ years`, icon: "history" },
          {
            label: "Projects",
            value: `${projects.length} shipped`,
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
            <div className="mt-1 truncate text-[13px] font-medium text-vscode-fg">
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
        <PageSection title="Stack" hint="what I work with daily">
          <div className="space-y-3">
            {content.skills.map((group) => (
              <div key={group.id} className="flex flex-wrap items-center gap-2">
                <span className="w-28 shrink-0 text-[12px] text-vscode-dim">
                  {group.category}
                </span>
                {group.items.map((item) => (
                  <PageChip key={item}>{item}</PageChip>
                ))}
              </div>
            ))}
          </div>
        </PageSection>
      ) : null}

      {/* Selected work */}
      {selected.length > 0 ? (
        <PageSection
          title="Selected work"
          hint="every project is a live GitHub repository"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {selected.map((project) => (
              <PageCard
                key={project.id}
                onClick={() =>
                  openProject(project.repo_owner, project.repo_name)
                }
              >
                <div className="flex items-center gap-2">
                  <Codicon name="repo" size={14} className="text-vscode-dim" />
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

      {/* Experience */}
      {content.experiences.length > 0 ? (
        <PageSection title="Experience">
          <ol className="space-y-4">
            {content.experiences.map((exp) => (
              <li
                key={exp.id}
                className="border-l-2 border-vscode-accent/40 pl-4"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[13px] font-medium text-vscode-fg">
                    {exp.role}
                  </span>
                  <span className="text-[12px] text-vscode-muted">
                    {exp.company}
                  </span>
                  <span className="ml-auto text-[11px] text-vscode-dim">
                    {exp.period}
                  </span>
                </div>
                {exp.summary ? (
                  <p className="mt-1 max-w-[70ch] text-[12px] leading-relaxed text-vscode-muted">
                    {exp.summary}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </PageSection>
      ) : null}

      {/* Contact */}
      <PageSection title="Get in touch">
        <div className="flex flex-wrap items-center gap-2">
          {email ? (
            <span className="rounded-control border border-vscode-page-border bg-vscode-page-card px-3 py-1.5 text-[12px] text-vscode-fg">
              {email}
            </span>
          ) : (
            <span className="text-[12px] text-vscode-dim">
              Add your email to the profile to show it here.
            </span>
          )}
          {content.socials.map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noreferrer noopener"
              className="flex h-7 items-center gap-1.5 rounded-control border border-vscode-page-border bg-vscode-page-card px-3 text-[12px] text-vscode-fg hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover"
            >
              <Codicon name={s.icon} size={13} />
              {s.label}
            </a>
          ))}
        </div>
      </PageSection>
    </PageShell>
  );
}
