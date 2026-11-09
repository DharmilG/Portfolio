"use client";

// Projects — visual projects showcase grid for recruiters & hiring managers.
// Each card is summary-first: title, repo, description, stack, and a single
// action row with README.md + View More. The GitHub icon stays as a direct
// repository link; the live-preview icon appears only when the DB has a URL.
// Repository code and file-tree browsing stay out of the public project flow.
import { useState } from "react";
import { BrandIcon } from "@/lib/iconThemes";
import { useStore, type Project } from "@/lib/store";
import Codicon from "../Codicon";
import SkillIcon from "../SkillIcon";
import ProjectDetail, {
  type ProjectDetailView,
} from "./ProjectDetail";
import { PageShell } from "./PageShell";

type DetailState = {
  project: Project;
  view: ProjectDetailView;
};

function ProjectCard({
  project,
  onOpen,
}: {
  project: Project;
  onOpen: (project: Project, view: ProjectDetailView) => void;
}) {
  const title = project.title_override ?? project.repo_name;
  const description = project.description_override ?? project.description;
  const githubUrl = `https://github.com/${project.repo_owner}/${project.repo_name}`;

  return (
    <article className="group flex h-full flex-col rounded-control border border-vscode-page-border bg-vscode-page-card p-5 transition-colors hover:border-vscode-accent/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-page-lead font-bold text-vscode-fg-active">
            {title}
          </h3>
          <p className="truncate font-mono text-page-micro text-vscode-dim">
            {project.repo_owner}/{project.repo_name}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="View on GitHub"
            aria-label={`View ${title} on GitHub`}
            className="flex h-7 w-7 items-center justify-center rounded-control border border-vscode-page-border bg-vscode-page-chip text-vscode-dim transition-colors hover:border-vscode-accent/60 hover:text-white"
          >
            <BrandIcon name="github" size={14} />
          </a>
          {project.preview_url ? (
            <a
              href={project.preview_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open live preview"
              aria-label={`Open ${title} live preview`}
              className="flex h-7 w-7 items-center justify-center rounded-control border border-vscode-page-border bg-vscode-page-chip text-vscode-dim transition-colors hover:border-vscode-accent/60 hover:text-vscode-quick-match"
            >
              <Codicon name="link-external" size={13} />
            </a>
          ) : null}
        </div>
      </div>

      {description ? (
        <p className="mt-3 line-clamp-3 text-page-meta leading-relaxed text-vscode-muted">
          {description}
        </p>
      ) : null}

      {project.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-control border border-vscode-page-border bg-vscode-page-chip px-2 py-0.5 text-page-micro font-medium text-vscode-muted"
            >
              <SkillIcon name={tag} size={12} />
              <span>{tag}</span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-auto pt-4">
        <div className="flex items-center gap-2 border-t border-vscode-border/40 pt-3">
          <button
            type="button"
            onClick={() => onOpen(project, "readme")}
            className="inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-control border border-vscode-page-border bg-vscode-page-chip px-2.5 text-page-micro font-medium text-vscode-muted transition-colors hover:border-vscode-accent/60 hover:text-vscode-fg-active focus-visible:outline focus-visible:outline-1 focus-visible:outline-vscode-accent"
          >
            <Codicon name="markdown" size={13} className="text-[#60a5fa]" />
            <span className="whitespace-nowrap">README.md</span>
          </button>
          <button
            type="button"
            onClick={() => onOpen(project, "overview")}
            className="inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-control bg-vscode-accent px-2.5 text-page-micro font-medium text-vscode-badge-fg transition-colors hover:bg-vscode-accent-hover focus-visible:outline focus-visible:outline-1 focus-visible:outline-vscode-accent"
          >
            <span className="whitespace-nowrap">View More</span>
            <Codicon name="arrow-right" size={13} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function ProjectsPage() {
  const projects = useStore((s) => s.projects);
  const projectGroups = useStore((s) => s.projectGroups);
  const [detail, setDetail] = useState<DetailState | null>(null);

  const openDetail = (project: Project, view: ProjectDetailView) => {
    setDetail({ project, view });
  };

  return (
    <PageShell
      icon="folder-opened"
      iconClassName="text-[#e5ba7d]"
      title="Projects"
      width="wide"
    >
      {projects.length === 0 ? (
        <p className="text-page-body text-vscode-dim">Loading projects…</p>
      ) : (
        <div className="space-y-10">
          {projectGroups.map((group) => {
            const groupProjects = projects.filter(
              (p) => p.group_slug === group.slug,
            );
            if (groupProjects.length === 0) return null;

            return (
              <section key={group.id} className="space-y-4">
                <div className="flex items-center gap-2.5 border-b border-vscode-border/50 pb-2.5">
                  <Codicon
                    name={group.icon || "folder"}
                    size={16}
                    className="text-[#e5ba7d]"
                  />
                  <h2 className="text-page-body font-bold text-vscode-fg-active">
                    {group.title}
                  </h2>
                  {group.description ? (
                    <span className="text-page-micro text-vscode-dim">
                      · {group.description}
                    </span>
                  ) : null}
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {groupProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={openDetail}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {/* Any ungrouped projects */}
          {projects.filter((p) => !p.group_slug).length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {projects
                .filter((p) => !p.group_slug)
                .map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onOpen={openDetail}
                  />
                ))}
            </div>
          ) : null}
        </div>
      )}

      {detail ? (
        <ProjectDetail
          key={detail.project.id}
          project={detail.project}
          initialView={detail.view}
          onClose={() => setDetail(null)}
        />
      ) : null}
    </PageShell>
  );
}
