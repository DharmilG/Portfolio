"use client";

// StatusBar — the Dark Modern band, flush below the workbench (DOC/05 §8).
// Values from VS Code source: 22px tall, #181818 bg, #CCCCCC text, 1px top
// #3C3C3B hairline, item hover #F1F1F133 + white text. Left: the selected
// project + its branch (both are pickers — the VS Code status bar owns the
// repository/branch quick picks), the branch label gains `*` for
// working-tree changes (the saved-edits layer) and its icon flips to
// git-branch-changes, then sync (`$(sync) 0↓ k↑` — k = local commits awaiting
// push; icon-only at zero, exactly like core git) and problem counts. Right:
// caret Ln/Col (live from the store, pushed by FileViewer), indentation,
// encoding, EOL, the active file's language (file icon + name), and the
// notification bell (dummy center: "Cache warmed 2h ago"). Editor items hide
// when no code tab is open; the full toast stack lands with PV-UI-TOAST.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { fileIcon } from "@/lib/fileIcons";
import { langLabelFor } from "@/lib/langs";
import { dirtyCount, projectDescription, useStore, type BranchInfo } from "@/lib/store";
import Codicon from "./Codicon";

// One status-bar item: full height, real metrics (3px margins + 5px padding;
// the first/last items drop the margins and use 8px padding), hover =
// statusBarItem hover background + white text. Buttons are the clickable
// items (project, branch, bell); the rest are read-only spans.
function Item({
  edge = false,
  open = false,
  onClick,
  label,
  className = "",
  children,
}: {
  edge?: boolean;
  open?: boolean;
  onClick?: () => void;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const cls = `flex h-full cursor-pointer items-center gap-1 ${
    edge ? "px-2" : "mx-[3px] px-[5px]"
  } hover:bg-vscode-statusbar-hover hover:text-vscode-fg-active ${
    open ? "bg-vscode-statusbar-hover text-vscode-fg-active" : ""
  } ${className}`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={label} className={cls}>
        {children}
      </button>
    );
  }
  return <span className={cls}>{children}</span>;
}

// Quick-pick row inside the status-bar popover.
function PickRow({
  label,
  hint,
  detail,
  active,
  onClick,
}: {
  label: string;
  hint?: string;
  detail?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-2 px-3 py-1 text-left text-xs hover:bg-vscode-list-hover ${
        active ? "bg-vscode-list-inactive text-vscode-fg" : "text-vscode-fg"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate">{label}</span>
        {detail ? (
          <span className="block truncate text-[11px] text-vscode-dim">
            {detail}
          </span>
        ) : null}
      </span>
      {hint ? (
        <span className="shrink-0 pt-px text-[11px] text-vscode-dim">{hint}</span>
      ) : null}
    </button>
  );
}

export default function StatusBar() {
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const dirty = useStore((s) => dirtyCount(s.edits) > 0);
  const localCommits = useStore((s) => s.commits.length);
  const caret = useStore((s) => s.caret);
  const projects = useStore((s) => s.projects);
  const activeRepo = useStore((s) => s.activeRepo);
  const branchByRepo = useStore((s) => s.branchByRepo);
  const branchInfo = useStore((s) => s.branchInfo);
  const treeBranch = useStore((s) => s.treeBranch);
  const readmes = useStore((s) => s.readmes);
  const repoMeta = useStore((s) => s.repoMeta);
  const setActiveRepo = useStore((s) => s.setActiveRepo);
  const setBranch = useStore((s) => s.setBranch);
  const setBranchInfo = useStore((s) => s.setBranchInfo);
  const setRepoMeta = useStore((s) => s.setRepoMeta);

  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLSpanElement>(null);
  const [picker, setPicker] = useState<"project" | "branch" | null>(null);
  const pickerRef = useRef<HTMLSpanElement>(null);
  const loadingBranches = useRef(new Set<string>());

  // Branches are fetched the first time a project is picked (2 GitHub reads);
  // the list is cached in the store for the session.
  const loadBranches = async (repo: string) => {
    if (branchInfo[repo] || loadingBranches.current.has(repo)) return;
    const [owner, name] = repo.split("/");
    if (!owner || !name) return;
    loadingBranches.current.add(repo);
    try {
      const res = await fetch(
        `/api/repo/branches?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(name)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as BranchInfo & {
        description?: string | null;
      };
      setBranchInfo(repo, data);
      setRepoMeta(repo, { description: data.description ?? null });
      // Until the visitor picks one, the repository's default branch is the
      // selected one.
      if (!branchByRepo[repo] && !treeBranch[repo]) {
        setBranch(repo, data.default_branch);
      }
    } catch {
      // The picker shows its empty state; the tree still works.
    } finally {
      loadingBranches.current.delete(repo);
    }
  };

  // The active project's branch list loads up front so the label and the
  // picker are correct before the visitor clicks.
  useEffect(() => {
    if (activeRepo) void loadBranches(activeRepo);
  }, [activeRepo]);

  // Click-away + Esc close (same pattern as the TitleBar menus).
  useEffect(() => {
    if (!bellOpen) return;
    const close = (e: MouseEvent) => {
      if (!bellRef.current?.contains(e.target as Node)) setBellOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBellOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [bellOpen]);

  useEffect(() => {
    if (!picker) return;
    const close = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPicker(null);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPicker(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [picker]);

  const tab = tabs.find((t) => t.id === activeTabId);
  const codeTab = tab?.kind === "code" ? tab : null;

  const activeProject =
    projects.find(
      (p) => `${p.repo_owner}/${p.repo_name}` === activeRepo,
    ) ?? null;
  const projectTitle = activeProject
    ? (activeProject.title_override ?? activeProject.repo_name)
    : "No project";
  const branch =
    branchByRepo[activeRepo ?? ""] ??
    treeBranch[activeRepo ?? ""] ??
    branchInfo[activeRepo ?? ""]?.default_branch ??
    "main";
  const branches = branchInfo[activeRepo ?? ""]?.branches ?? [];

  const openPicker = (kind: "project" | "branch") => {
    setBellOpen(false);
    setPicker((p) => (p === kind ? null : kind));
    if (kind === "branch" && activeRepo) void loadBranches(activeRepo);
  };

  const pickProject = (repo: string) => {
    setActiveRepo(repo);
    setPicker(null);
    void loadBranches(repo);
  };

  const pickBranch = (name: string) => {
    if (activeRepo) setBranch(activeRepo, name);
    setPicker(null);
  };

  return (
    <footer
      aria-label="Status bar"
      className="flex h-[22px] shrink-0 select-none items-center justify-between border-t border-vscode-border bg-vscode-statusbar text-xs text-vscode-fg tabular-nums"
    >
      <div className="flex h-full items-center">
        <span ref={pickerRef} className="relative flex h-full items-center">
          <Item
            onClick={() => openPicker("project")}
            label="Select a project"
            open={picker === "project"}
          >
            <Codicon name="repo" />
            <span className="max-w-[140px] truncate">{projectTitle}</span>
          </Item>
          <Item
            onClick={() => openPicker("branch")}
            label="Select a branch"
            open={picker === "branch"}
          >
            <Codicon name={dirty ? "git-branch-changes" : "git-branch"} />
            <span>{branch}{dirty ? "*" : ""}</span>
          </Item>
          {picker ? (
            <div className="absolute bottom-full left-0 z-20 mb-1 max-h-72 w-60 overflow-auto rounded-control border border-vscode-border bg-vscode-widget-bg py-1 shadow-vscode">
              {picker === "project" ? (
                projects.length === 0 ? (
                  <p className="px-3 py-1.5 text-xs text-vscode-dim">
                    No projects yet
                  </p>
                ) : (
                  projects.map((p) => {
                    const repo = `${p.repo_owner}/${p.repo_name}`;
                    return (
                      <PickRow
                        key={p.id}
                        label={p.title_override ?? p.repo_name}
                        detail={
                          readmes[repo] ??
                          p.description ??
                          repoMeta[repo]?.description ??
                          undefined
                        }
                        hint={repo === activeRepo ? "active" : undefined}
                        active={repo === activeRepo}
                        onClick={() => pickProject(repo)}
                      />
                    );
                  })
                )
              ) : branches.length === 0 ? (
                <p className="px-3 py-1.5 text-xs text-vscode-dim">
                  {activeRepo ? "No branches" : "No project selected"}
                </p>
              ) : (
                branches.map((b) => (
                  <PickRow
                    key={b.name}
                    label={b.name}
                    hint={b.name === branch ? "active" : undefined}
                    active={b.name === branch}
                    onClick={() => pickBranch(b.name)}
                  />
                ))
              )}
            </div>
          ) : null}
        </span>
        <Item className="max-sm:hidden">
          <Codicon name="sync" />
          {localCommits > 0 ? <span>0↓ {localCommits}↑</span> : null}
        </Item>
        <Item>
          <Codicon name="error" />0
          <Codicon name="warning" />0
        </Item>
      </div>
      <div className="flex h-full items-center">
        {codeTab ? (
          <>
            <Item className="max-sm:hidden">
              Ln {caret.line + 1}, Col {caret.col + 1}
            </Item>
            <Item className="max-md:hidden">Spaces: 2</Item>
            <Item className="max-md:hidden">UTF-8</Item>
            <Item className="max-md:hidden">LF</Item>
            <Item className="max-sm:hidden">
              <Codicon name={fileIcon(codeTab.path)} />
              {langLabelFor(codeTab.path)}
            </Item>
          </>
        ) : null}
        <span ref={bellRef} className="relative flex h-full">
          <Item
            edge
            open={bellOpen}
            onClick={() => setBellOpen((v) => !v)}
            label="Notifications"
          >
            <Codicon name="bell" />
          </Item>
          {bellOpen ? (
            <div className="absolute bottom-full right-0 z-20 mb-1 w-72 rounded-control border border-vscode-border bg-vscode-widget-bg text-vscode-fg shadow-vscode">
              <div className="border-b border-vscode-border px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-vscode-emphasis">
                Notifications
              </div>
              <div className="flex items-start gap-2 px-3 py-2 text-xs">
                <Codicon name="info" size={14} className="mt-0.5 shrink-0" />
                <span>Cache warmed 2h ago</span>
              </div>
            </div>
          ) : null}
        </span>
      </div>
    </footer>
  );
}
