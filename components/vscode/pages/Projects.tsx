"use client";

// Projects — visual projects showcase grid for recruiters & hiring managers.
// Displays project cards with descriptions, stack tags, direct GitHub links,
// live preview buttons, and a one-click "Browse Code" action that jumps to the
// repository's file tree in the Explorer sidebar.
import { BrandIcon } from "@/lib/iconThemes";
import { useStore, type Project } from "@/lib/store";
import Codicon from "../Codicon";
import SkillIcon from "../SkillIcon";
import { PageShell } from "./PageShell";

export default function ProjectsPage() {
  const projects = useStore((s) => s.projects);
  const projectGroups = useStore((s) => s.projectGroups);
  const showView = useStore((s) => s.showView);
  const revealPath = useStore((s) => s.revealPath);
  const toggleExpanded = useStore((s) => s.toggleExpanded);
  const expanded = useStore((s) => s.expanded);

  const handleBrowseRepo = (p: Project) => {
    const rkey = `Projects/${p.repo_owner}/${p.repo_name}`;
    showView("explorer");
    if (!expanded["projects"]) toggleExpanded("projects");
    if (p.group_slug && !expanded[`Projects/${p.group_slug}`]) {
      toggleExpanded(`Projects/${p.group_slug}`);
    }
    if (!expanded[rkey]) toggleExpanded(rkey);
    revealPath(rkey);
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
                  <Codicon name={group.icon || "folder"} size={16} className="text-[#e5ba7d]" />
                  <h2 className="text-page-body font-bold text-vscode-fg-active">
                    {group.title}
                  </h2>
                  {group.description ? (
                    <span className="text-page-micro text-vscode-dim">
                      · {group.description}
                    </span>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                  {groupProjects.map((p) => {
                    const title = p.title_override ?? p.repo_name;
                    const desc = p.description_override ?? p.description;
                    const githubUrl = `https://github.com/${p.repo_owner}/${p.repo_name}`;

                    return (
                      <div
                        key={p.id}
                        className="flex flex-col justify-between rounded-control border border-vscode-page-border bg-vscode-page-card p-5 transition-colors hover:border-vscode-accent/50"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-page-lead font-bold text-vscode-fg-active">
                                {title}
                              </h3>
                              <p className="font-mono text-page-micro text-vscode-dim">
                                {p.repo_owner}/{p.repo_name}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View on GitHub"
                                className="flex h-7 w-7 items-center justify-center rounded-control border border-vscode-page-border bg-vscode-page-chip text-vscode-dim transition-colors hover:border-vscode-accent/60 hover:text-white"
                              >
                                <BrandIcon name="github" size={14} />
                              </a>
                              {p.preview_url ? (
                                <a
                                  href={p.preview_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Open live preview"
                                  className="flex h-7 w-7 items-center justify-center rounded-control border border-vscode-page-border bg-vscode-page-chip text-vscode-dim transition-colors hover:border-vscode-accent/60 hover:text-vscode-quick-match"
                                >
                                  <Codicon name="link-external" size={13} />
                                </a>
                              ) : null}
                            </div>
                          </div>

                          {desc ? (
                            <p className="mt-3 text-page-meta leading-relaxed text-vscode-muted">
                              {desc}
                            </p>
                          ) : null}

                          {p.highlights && p.highlights.length > 0 ? (
                            <ul className="mt-3 space-y-1.5 text-page-micro text-vscode-dim">
                              {p.highlights.map((h) => (
                                <li key={h} className="flex items-start gap-2">
                                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-vscode-accent" />
                                  <span>{h}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>

                        <div className="mt-5 pt-3 border-t border-vscode-border/40">
                          {p.tags && p.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {p.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 rounded-control border border-vscode-page-border bg-[#141516] px-2 py-0.5 text-page-micro font-medium text-vscode-muted"
                                >
                                  <SkillIcon name={tag} size={12} />
                                  <span>{tag}</span>
                                </span>
                              ))}
                            </div>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleBrowseRepo(p)}
                            className="inline-flex items-center gap-1.5 text-page-micro font-medium text-vscode-quick-match transition-colors hover:underline"
                          >
                            <Codicon name="folder-opened" size={13} />
                            <span>Browse repository files in Explorer →</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* Any ungrouped projects */}
          {projects.filter((p) => !p.group_slug).length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {projects
                .filter((p) => !p.group_slug)
                .map((p) => {
                  const title = p.title_override ?? p.repo_name;
                  const desc = p.description_override ?? p.description;
                  const githubUrl = `https://github.com/${p.repo_owner}/${p.repo_name}`;

                  return (
                    <div
                      key={p.id}
                      className="flex flex-col justify-between rounded-control border border-vscode-page-border bg-vscode-page-card p-5 transition-colors hover:border-vscode-accent/50"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-page-lead font-bold text-vscode-fg-active">
                              {title}
                            </h3>
                            <p className="font-mono text-page-micro text-vscode-dim">
                              {p.repo_owner}/{p.repo_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View on GitHub"
                              className="flex h-7 w-7 items-center justify-center rounded-control border border-vscode-page-border bg-vscode-page-chip text-vscode-dim transition-colors hover:border-vscode-accent/60 hover:text-white"
                            >
                              <BrandIcon name="github" size={14} />
                            </a>
                            {p.preview_url ? (
                              <a
                                href={p.preview_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open live preview"
                                className="flex h-7 w-7 items-center justify-center rounded-control border border-vscode-page-border bg-vscode-page-chip text-vscode-dim transition-colors hover:border-vscode-accent/60 hover:text-vscode-quick-match"
                              >
                                <Codicon name="link-external" size={13} />
                              </a>
                            ) : null}
                          </div>
                        </div>
                        {desc ? (
                          <p className="mt-3 text-page-meta leading-relaxed text-vscode-muted">
                            {desc}
                          </p>
                        ) : null}
                      </div>

                      <div className="mt-5 pt-3 border-t border-vscode-border/40">
                        {p.tags && p.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {p.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 rounded-control border border-vscode-page-border bg-[#141516] px-2 py-0.5 text-page-micro font-medium text-vscode-muted"
                              >
                                <SkillIcon name={tag} size={12} />
                                <span>{tag}</span>
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleBrowseRepo(p)}
                          className="inline-flex items-center gap-1.5 text-page-micro font-medium text-vscode-quick-match transition-colors hover:underline"
                        >
                          <Codicon name="folder-opened" size={13} />
                          <span>Browse repository files in Explorer →</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : null}
        </div>
      )}
    </PageShell>
  );
}

