"use client";

// ProjectDetail — the documentation-first project surface. Projects.tsx opens
// this dialog for "View More" (Overview) and "README.md" (Readme). The README
// is fetched lazily through the existing repo tree/blob routes and rendered
// read-only with the same Markdown surface as the editor preview. No file tree
// or editable code surface is exposed to the public project flow.
import dynamic from "next/dynamic";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { BrandIcon } from "@/lib/iconThemes";
import type { Project } from "@/lib/store";
import Codicon from "../Codicon";
import SkillIcon from "../SkillIcon";
import { PageChip } from "./PageShell";

export type ProjectDetailView = "overview" | "readme";

type ProjectDetailProps = {
  project: Project;
  initialView?: ProjectDetailView;
  onClose: () => void;
};

type RepoTreeEntry = {
  path: string;
  type: string;
  sha: string;
};

type ReadmeReady = {
  status: "ready";
  path: string;
  content: string;
};

type ReadmeEmpty = {
  status: "empty";
  path: string;
};

type ReadmeResult = ReadmeReady | ReadmeEmpty | { status: "missing" };

type ReadmeState =
  | ReadmeResult
  | { status: "loading" }
  | { status: "error"; message: string };

const readmeCache = new Map<string, ReadmeResult>();

const MarkdownPreview = dynamic(() => import("../MarkdownPreview"), {
  ssr: false,
  loading: () => (
    <ReadmeStatus
      icon="loading"
      spin
      title="Loading README.md"
      message="Preparing the Markdown preview…"
    />
  ),
});

function repoSlug(project: Project): string {
  return `${project.repo_owner}/${project.repo_name}`;
}

function githubRepoUrl(project: Project): string {
  return `https://github.com/${repoSlug(project)}`;
}

function isReadmePath(path: string): boolean {
  return /^readme(\.md)?$/i.test(path.split("/").pop() ?? "");
}

function responseError(
  data: { error?: unknown } | null,
  fallback: string,
): string {
  return typeof data?.error === "string" ? data.error : fallback;
}

async function fetchProjectReadme(
  project: Project,
  signal: AbortSignal,
): Promise<ReadmeResult> {
  const key = `${repoSlug(project)}@${project.branch}:${project.sha ?? ""}`;
  const cached = readmeCache.get(key);
  if (cached) return cached;

  const treeQuery = new URLSearchParams({
    owner: project.repo_owner,
    repo: project.repo_name,
    branch: project.branch,
  });
  const treeResponse = await fetch(`/api/repo/tree?${treeQuery.toString()}`, {
    signal,
  });
  const treeData = (await treeResponse.json().catch(() => null)) as {
    tree?: unknown;
    error?: unknown;
  } | null;

  if (!treeResponse.ok) {
    throw new Error(
      responseError(treeData, "Could not load this repository's files."),
    );
  }

  const entries = Array.isArray(treeData?.tree)
    ? (treeData.tree as RepoTreeEntry[])
    : [];
  // Prefer the root README over nested documentation READMEs.
  const readme = entries
    .filter(
      (entry) =>
        entry?.type === "blob" &&
        typeof entry.path === "string" &&
        isReadmePath(entry.path),
    )
    .sort((a, b) => {
      const depth = a.path.split("/").length - b.path.split("/").length;
      return depth !== 0 ? depth : a.path.localeCompare(b.path);
    })[0];

  if (!readme || typeof readme.sha !== "string") {
    const missing: ReadmeResult = { status: "missing" };
    readmeCache.set(key, missing);
    return missing;
  }

  const blobQuery = new URLSearchParams({
    owner: project.repo_owner,
    repo: project.repo_name,
    branch: project.branch,
    sha: readme.sha,
    path: readme.path,
  });
  const blobResponse = await fetch(`/api/repo/blob?${blobQuery.toString()}`, {
    signal,
  });
  const blobData = (await blobResponse.json().catch(() => null)) as {
    content?: unknown;
    error?: unknown;
  } | null;

  if (!blobResponse.ok) {
    throw new Error(
      blobResponse.status === 413
        ? "This README.md is too large to preview (max 512 KB)."
        : responseError(blobData, "Could not load README.md."),
    );
  }

  const content = typeof blobData?.content === "string" ? blobData.content : "";
  const result: ReadmeResult =
    content.trim().length === 0
      ? { status: "empty", path: readme.path }
      : { status: "ready", path: readme.path, content };

  readmeCache.set(key, result);
  return result;
}

function errorText(cause: unknown): string {
  if (cause instanceof Error && cause.message) return cause.message;
  return "Could not load README.md.";
}

function DetailSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-7 first:mt-0">
      <div className="flex items-baseline gap-2">
        <h3 className="text-page-meta font-semibold uppercase tracking-wide text-vscode-emphasis">
          {title}
        </h3>
        {hint ? (
          <span className="text-page-micro text-vscode-dim">{hint}</span>
        ) : null}
      </div>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

function ReadmeStatus({
  icon,
  title,
  message,
  spin = false,
  children,
}: {
  icon: string;
  title: string;
  message: string;
  spin?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-vscode-editor px-6 py-12">
      <div className="max-w-[420px] text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-control bg-vscode-activity-active-bg text-vscode-dim">
          <Codicon
            name={icon}
            size={20}
            className={spin ? "codicon-modifier-spin" : undefined}
          />
        </span>
        <p className="mt-4 text-page-body font-semibold text-vscode-fg-active">
          {title}
        </p>
        <p className="mt-1.5 text-page-meta leading-relaxed text-vscode-muted">
          {message}
        </p>
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </div>
  );
}

function ReadmeFallback({
  icon,
  title,
  message,
  project,
}: {
  icon: string;
  title: string;
  message: string;
  project: Project;
}) {
  return (
    <ReadmeStatus icon={icon} title={title} message={message}>
      <a
        href={githubRepoUrl(project)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-7 items-center gap-1.5 rounded-control border border-vscode-page-border bg-vscode-page-chip px-2.5 text-page-micro font-medium text-vscode-muted transition-colors hover:border-vscode-accent/60 hover:text-vscode-fg-active"
      >
        <BrandIcon name="github" size={13} />
        <span>View repository on GitHub</span>
        <Codicon name="link-external" size={11} />
      </a>
    </ReadmeStatus>
  );
}

function ReadmePanel({ project }: { project: Project }) {
  const [state, setState] = useState<ReadmeState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setState({ status: "loading" });

    fetchProjectReadme(project, controller.signal)
      .then((result) => {
        if (active) setState(result);
      })
      .catch((cause: unknown) => {
        if (!active || controller.signal.aborted) return;
        setState({ status: "error", message: errorText(cause) });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [project, attempt]);

  if (state.status === "loading") {
    return (
      <ReadmeStatus
        icon="loading"
        spin
        title="Loading README.md"
        message="Fetching the project documentation from GitHub."
      />
    );
  }

  if (state.status === "missing") {
    return (
      <ReadmeFallback
        icon="markdown"
        title="No README.md found"
        message="This repository does not include a README yet."
        project={project}
      />
    );
  }

  if (state.status === "empty") {
    return (
      <ReadmeFallback
        icon="markdown"
        title="README.md is empty"
        message="The repository has a README, but there is no written documentation in it yet."
        project={project}
      />
    );
  }

  if (state.status === "error") {
    return (
      <ReadmeStatus
        icon="warning"
        title="Could not load README.md"
        message={state.message}
      >
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="inline-flex h-7 items-center gap-1.5 rounded-control bg-vscode-accent px-3 text-page-micro font-medium text-vscode-badge-fg transition-colors hover:bg-vscode-accent-hover focus-visible:outline focus-visible:outline-1 focus-visible:outline-vscode-accent"
        >
          <Codicon name="refresh" size={12} />
          <span>Retry</span>
        </button>
      </ReadmeStatus>
    );
  }

  const readmeDir = state.path.includes("/")
    ? state.path.slice(0, state.path.lastIndexOf("/") + 1)
    : "";
  const encodedBranch = encodeURI(project.branch);
  const encodedDir = readmeDir
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  const dirSuffix = encodedDir ? `${encodedDir}/` : "";
  const githubBlobUrl = `${githubRepoUrl(project)}/blob/${encodedBranch}/${state.path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  const linkBaseUrl = `${githubRepoUrl(project)}/blob/${encodedBranch}/${dirSuffix}`;
  const imageBaseUrl = `https://raw.githubusercontent.com/${repoSlug(
    project,
  )}/${encodedBranch}/${dirSuffix}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-vscode-border bg-vscode-side px-3 sm:px-4">
        <Codicon name="markdown" size={14} className="text-[#60a5fa]" />
        <span className="min-w-0 truncate font-mono text-[11px] text-vscode-muted">
          {state.path}
        </span>
        <span className="hidden text-[11px] text-vscode-dim sm:inline">
          · read-only preview
        </span>
        <a
          href={githubBlobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex h-6 shrink-0 items-center gap-1 rounded-control px-1.5 text-[11px] text-vscode-dim transition-colors hover:bg-vscode-list-hover hover:text-vscode-fg"
        >
          <span className="hidden sm:inline">Open on GitHub</span>
          <Codicon name="link-external" size={11} />
        </a>
      </div>
      <div className="flex min-h-0 flex-1">
        <MarkdownPreview
          path={`Projects/${repoSlug(project)}/${state.path}`}
          content={state.content}
          dirty={null}
          linkBaseUrl={linkBaseUrl}
          imageBaseUrl={imageBaseUrl}
        />
      </div>
    </div>
  );
}

function OverviewPanel({ project }: { project: Project }) {
  const title = project.title_override ?? project.repo_name;
  const description = project.description_override ?? project.description;
  const githubUrl = githubRepoUrl(project);
  const hasPreview = Boolean(
    project.preview_url && project.preview_embeddable,
  );

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-[860px] px-5 py-6 sm:px-7">
        {description ? (
          <DetailSection title="Overview">
            <p className="text-page-body leading-relaxed text-vscode-muted">
              {description}
            </p>
          </DetailSection>
        ) : null}

        {hasPreview ? (
          <DetailSection title="Preview" hint="Live project">
            <div className="overflow-hidden rounded-control border border-vscode-page-border bg-vscode-editor">
              <div className="flex h-9 items-center gap-2 border-b border-vscode-border bg-vscode-side px-3">
                <span className="flex items-center gap-1.5" aria-hidden>
                  <span className="h-2 w-2 rounded-full bg-vscode-error/70" />
                  <span className="h-2 w-2 rounded-full bg-vscode-warning/70" />
                  <span className="h-2 w-2 rounded-full bg-vscode-added/70" />
                </span>
                <span className="min-w-0 flex-1 truncate rounded-control bg-vscode-editor px-2 py-1 font-mono text-[11px] text-vscode-dim">
                  {project.preview_url}
                </span>
                <a
                  href={project.preview_url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${title} live demo`}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control text-vscode-dim transition-colors hover:bg-vscode-list-hover hover:text-vscode-fg"
                >
                  <Codicon name="link-external" size={12} />
                </a>
              </div>
              <iframe
                src={project.preview_url ?? undefined}
                title={`${title} live preview`}
                loading="lazy"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                className="h-[360px] w-full border-0 bg-white"
              />
            </div>
          </DetailSection>
        ) : null}

        {project.highlights.length > 0 ? (
          <DetailSection title="What I built">
            <ul className="space-y-2">
              {project.highlights.map((highlight) => (
                <li
                  key={highlight}
                  className="flex items-start gap-2.5 text-page-meta leading-relaxed text-vscode-muted"
                >
                  <Codicon
                    name="check"
                    size={14}
                    className="mt-1 shrink-0 text-vscode-added"
                  />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </DetailSection>
        ) : null}

        {project.tags.length > 0 ? (
          <DetailSection title="Tech stack" hint="What I used">
            <div className="flex flex-wrap gap-1.5">
              {project.tags.map((tag) => (
                <PageChip key={tag}>
                  <SkillIcon name={tag} size={12} />
                  <span>{tag}</span>
                </PageChip>
              ))}
            </div>
          </DetailSection>
        ) : null}

        <DetailSection title="Links">
          <div className="flex flex-wrap gap-2">
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-control border border-vscode-page-border bg-vscode-page-chip px-3 text-page-micro font-medium text-vscode-muted transition-colors hover:border-vscode-accent/60 hover:text-vscode-fg-active"
            >
              <BrandIcon name="github" size={14} />
              <span>View source on GitHub</span>
              <Codicon name="link-external" size={11} />
            </a>
            {project.preview_url ? (
              <a
                href={project.preview_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-control bg-vscode-accent px-3 text-page-micro font-medium text-vscode-badge-fg transition-colors hover:bg-vscode-accent-hover"
              >
                <Codicon name="link-external" size={12} />
                <span>Open live demo</span>
              </a>
            ) : null}
          </div>
        </DetailSection>
      </div>
    </div>
  );
}

export default function ProjectDetail({
  project,
  initialView = "overview",
  onClose,
}: ProjectDetailProps) {
  const [view, setView] = useState<ProjectDetailView>(initialView);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const title = project.title_override ?? project.repo_name;
  const githubUrl = githubRepoUrl(project);
  const titleId = `project-detail-title-${project.id}`;
  const overviewTabId = `project-overview-tab-${project.id}`;
  const readmeTabId = `project-readme-tab-${project.id}`;
  const panelId = `project-detail-panel-${project.id}`;

  useEffect(() => {
    setView(initialView);
  }, [initialView, project.id]);

  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeRef.current?.focus();
    return () => previous?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const root = dialogRef.current;
    if (!root) return;
    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-2 backdrop-blur-[2px] sm:p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onDialogKeyDown}
        className="flex h-[calc(100dvh-1rem)] w-full max-w-[980px] flex-col overflow-hidden rounded-section border border-vscode-widget-border bg-vscode-widget-bg text-vscode-fg shadow-vscode sm:h-[calc(100dvh-2rem)] sm:max-h-[820px]"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-vscode-border bg-vscode-titlebar px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-vscode-activity-active-bg text-[#e5ba7d]">
              <Codicon name="folder-opened" size={18} />
            </span>
            <div className="min-w-0">
              <h2
                id={titleId}
                className="truncate text-page-lead font-bold text-vscode-fg-active"
              >
                {title}
              </h2>
              <p className="truncate font-mono text-page-micro text-vscode-dim">
                {repoSlug(project)}
              </p>
            </div>
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
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close project details"
              className="ml-1 flex h-7 w-7 items-center justify-center rounded-control text-vscode-dim transition-colors hover:bg-vscode-list-hover hover:text-vscode-fg-active focus-visible:outline focus-visible:outline-1 focus-visible:outline-vscode-accent"
            >
              <Codicon name="close" size={14} />
            </button>
          </div>
        </header>

        <div
          role="tablist"
          aria-label="Project details"
          className="flex shrink-0 items-center gap-1 border-b border-vscode-border bg-vscode-side px-3"
        >
          <button
            type="button"
            role="tab"
            id={overviewTabId}
            aria-selected={view === "overview"}
            aria-controls={panelId}
            onClick={() => setView("overview")}
            className={`-mb-px inline-flex h-9 items-center gap-1.5 border-b-2 px-3 text-page-micro font-medium transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-vscode-accent ${
              view === "overview"
                ? "border-vscode-accent text-vscode-fg-active"
                : "border-transparent text-vscode-muted hover:text-vscode-fg"
            }`}
          >
            <Codicon name="info" size={13} />
            <span>Overview</span>
          </button>
          <button
            type="button"
            role="tab"
            id={readmeTabId}
            aria-selected={view === "readme"}
            aria-controls={panelId}
            onClick={() => setView("readme")}
            className={`-mb-px inline-flex h-9 items-center gap-1.5 border-b-2 px-3 text-page-micro font-medium transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-vscode-accent ${
              view === "readme"
                ? "border-vscode-accent text-vscode-fg-active"
                : "border-transparent text-vscode-muted hover:text-vscode-fg"
            }`}
          >
            <Codicon name="markdown" size={13} className="text-[#60a5fa]" />
            <span>README.md</span>
          </button>
        </div>

        <div
          role="tabpanel"
          id={panelId}
          aria-labelledby={view === "overview" ? overviewTabId : readmeTabId}
          className="flex min-h-0 flex-1 flex-col"
        >
          {view === "overview" ? (
            <OverviewPanel project={project} />
          ) : (
            <ReadmePanel project={project} />
          )}
        </div>

        <footer className="flex h-8 shrink-0 items-center justify-end border-t border-vscode-border bg-vscode-side px-4 text-[11px] text-vscode-dim">
          Press Esc to close
        </footer>
      </div>
    </div>
  );
}
