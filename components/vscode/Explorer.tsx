"use client";

// Explorer — folder tree from store (sections + allowlisted projects).
// Static workspace root ("Dharmil Gajjar") always on top; its row carries the
// view actions right-aligned, hidden at rest and revealed whenever the
// sidebar pane is hovered (group/pane lives on SideBar's aside — VS Code
// `.pane:hover > .pane-header > .actions`, paneview.css).
// Rows are shared TreeRows: selection follows autoReveal (openTab/setActiveTab
// in lib/store), ancestors expand + the view scrolls to revealed rows via
// revealNonce; selection renders blue only while the tree has focus.
// File decorations follow git conventions: amber name + M badge once edits
// are saved; new tmp files tint green (untracked). Rename/edits overlays are
// local-only (rule 03-local-only).
// See DOC/05 §5, skills vscode-tokens + local-git.
import { useEffect, useRef, useState } from "react";
import { fileIcon } from "@/lib/fileIcons";
import { readmeDescription } from "@/lib/readme";
import {
  isDirty,
  projectDescription,
  repoTreeKey,
  ROOT_NAME,
  useStore,
  type TreeEntry,
} from "@/lib/store";
import Codicon from "./Codicon";
import RenameInput from "./RenameInput";
import Tooltip from "./Tooltip";
import TreeRow from "./TreeRow";
import ViewActionButton from "./ViewActionButton";

type ExplorerProps = {
  onOpenFile?: (path: string, sha?: string | null) => void;
  onRename?: (path: string, name: string | null) => void;
  onAction?: (id: string) => void;
  filter?: string;
};

type ViewAction = {
  id: string;
  icon: string;
  label: string;
};

// Root-row view actions (VS Code tooltips; behavior owned by the page).
const EXPLORER_ACTIONS: ViewAction[] = [
  { id: "new-file", icon: "new-file", label: "New File..." },
  { id: "new-folder", icon: "new-folder", label: "New Folder..." },
  { id: "refresh", icon: "refresh", label: "Refresh Explorer" },
  { id: "collapse", icon: "collapse-all", label: "Collapse Folders in View" },
];

// Nested repo folders are built from GitHub's recursive tree, so the Explorer
// does not need one request per directory. Indents stay static Tailwind
// classes (computed class names would not be emitted by the compiler).
const REPO_INDENTS = [
  "pl-14",
  "pl-[3.5rem]",
  "pl-[4.5rem]",
  "pl-[5.5rem]",
  "pl-[6.5rem]",
  "pl-[7.5rem]",
  "pl-[8.5rem]",
];

type VfsNode = {
  name: string;
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  children: VfsNode[];
};

function buildVfs(entries: TreeEntry[]): VfsNode[] {
  const root: VfsNode[] = [];
  const dirs = new Map<string, VfsNode>();

  const ensureDir = (path: string): VfsNode => {
    const existing = dirs.get(path);
    if (existing) return existing;
    const slash = path.lastIndexOf("/");
    const node: VfsNode = {
      name: slash < 0 ? path : path.slice(slash + 1),
      path,
      type: "tree",
      sha: "",
      children: [],
    };
    dirs.set(path, node);
    if (slash < 0) root.push(node);
    else ensureDir(path.slice(0, slash)).children.push(node);
    return node;
  };

  for (const entry of entries) {
    if (entry.type === "tree") {
      ensureDir(entry.path).sha = entry.sha;
      continue;
    }
    const slash = entry.path.lastIndexOf("/");
    const node: VfsNode = {
      name: slash < 0 ? entry.path : entry.path.slice(slash + 1),
      path: entry.path,
      type: "blob",
      sha: entry.sha,
      size: entry.size,
      children: [],
    };
    const parent = slash < 0 ? null : ensureDir(entry.path.slice(0, slash));
    (parent ? parent.children : root).push(node);
  }

  const sort = (nodes: VfsNode[]) => {
    nodes.sort((a, b) =>
      a.type === b.type
        ? a.name.localeCompare(b.name)
        : a.type === "tree"
          ? -1
          : 1,
    );
    nodes.forEach((node) => sort(node.children));
  };
  sort(root);
  return root;
}

export function resolveName(
  fullPath: string,
  renames: Record<string, string>,
  fallback: string,
): string {
  return renames[fullPath] ?? fallback;
}

export default function Explorer({
  onOpenFile,
  onRename,
  onAction,
  filter = "",
}: ExplorerProps) {
  const sections = useStore((s) => s.sections);
  const projects = useStore((s) => s.projects);
  const trees = useStore((s) => s.trees);
  const renames = useStore((s) => s.renames);
  const edits = useStore((s) => s.edits);
  const tmpFs = useStore((s) => s.tmpFs);
  const expanded = useStore((s) => s.expanded);
  const toggleExpanded = useStore((s) => s.toggleExpanded);
  const selectedPath = useStore((s) => s.selectedPath);
  const revealNonce = useStore((s) => s.revealNonce);
  const selectPath = useStore((s) => s.selectPath);
  const setTree = useStore((s) => s.setTree);
  const setTreeBranch = useStore((s) => s.setTreeBranch);
  const setReadme = useStore((s) => s.setReadme);
  const readmes = useStore((s) => s.readmes);
  const repoMeta = useStore((s) => s.repoMeta);
  const branchByRepo = useStore((s) => s.branchByRepo);
  const treeBranch = useStore((s) => s.treeBranch);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [treeLoading, setTreeLoading] = useState<Record<string, boolean>>({});
  const [treeErrors, setTreeErrors] = useState<Record<string, string>>({});
  const requested = useRef(new Set<string>());
  const readmeRequested = useRef(new Set<string>());
  const treeRef = useRef<HTMLDivElement>(null);

  // autoReveal scroll: openTab/setActiveTab bump revealNonce; bring the
  // selected row into view (rows carry data-path).
  useEffect(() => {
    const tree = treeRef.current;
    if (!tree || !selectedPath) return;
    let row: HTMLElement | undefined;
    tree.querySelectorAll<HTMLElement>("[data-path]").forEach((n) => {
      if (n.dataset.path === selectedPath) row = n;
    });
    row?.scrollIntoView({ block: "nearest" });
  }, [revealNonce, selectedPath]);

  const match = (name: string) =>
    filter.trim() === "" ||
    name.toLowerCase().includes(filter.trim().toLowerCase());

  // The README of a project is its description (DOC/05 §5): fetch the blob
  // once per commit SHA, keep the opening paragraph and open the file in a
  // background tab.
  const loadReadme = async (
    project: { repo_owner: string; repo_name: string },
    entries: TreeEntry[],
  ) => {
    const repo = `${project.repo_owner}/${project.repo_name}`;
    const readme = entries.find(
      (e) =>
        e.type === "blob" &&
        /^readme(\.md)?$/i.test(e.path.split("/").pop() ?? ""),
    );
    if (!readme || readmeRequested.current.has(readme.sha)) return;
    readmeRequested.current.add(readme.sha);
    try {
      const query = new URLSearchParams({
        owner: project.repo_owner,
        repo: project.repo_name,
        sha: readme.sha,
        path: readme.path,
      });
      const res = await fetch(`/api/repo/blob?${query.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data: { content?: string } = await res.json();
      const text = readmeDescription(data.content ?? "");
      if (text) setReadme(repo, text);
      // Auto-open the README in the background (the editor keeps its file).
      useStore.getState().openTab(
        {
          kind: "code",
          path: `Projects/${repo}/${readme.path}`,
          sha: readme.sha,
        },
        false,
      );
    } catch {
      // The description is optional — the tree still works without it.
    }
  };

  const requestTree = (project: {
    repo_owner: string;
    repo_name: string;
  }) => {
    const repo = `${project.repo_owner}/${project.repo_name}`;
    // A branch picked in the status bar wins; without one the route falls
    // back to the repository's default branch and tells us which it used.
    const branch = branchByRepo[repo];
    const key = repoTreeKey(repo, branch ?? treeBranch[repo]);
    if (requested.current.has(key) || trees[key]) return;
    requested.current.add(key);
    setTreeLoading((prev) => ({ ...prev, [key]: true }));
    const query = new URLSearchParams({
      owner: project.repo_owner,
      repo: project.repo_name,
    });
    if (branch) query.set("branch", branch);
    fetch(`/api/repo/tree?${query.toString()}`, { cache: "no-store" })
      .then(async (res) => {
        const data: {
          tree?: TreeEntry[];
          branch?: string;
          error?: string;
        } = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load files");
        const loaded = data.branch ?? branch ?? "";
        const entries = Array.isArray(data.tree) ? data.tree : [];
        setTree(repo, loaded, entries);
        setTreeBranch(repo, loaded);
        void loadReadme(project, entries);
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Could not load files";
        setTreeErrors((prev) => ({ ...prev, [key]: message }));
      })
      .finally(() => {
        requested.current.delete(key);
        setTreeLoading((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      });
  };

  // Fetch once per project + branch when the folder is opened; the tree is
  // session-cached in the store (per branch). A failed request stays put
  // until the Retry row is clicked.
  useEffect(() => {
    for (const project of projects) {
      const repo = `${project.repo_owner}/${project.repo_name}`;
      const key = `Projects/${repo}`;
      const branch = branchByRepo[repo] ?? treeBranch[repo];
      const treeKey = repoTreeKey(repo, branch);
      if (
        !expanded[key] ||
        trees[treeKey] ||
        treeLoading[treeKey] ||
        treeErrors[treeKey]
      ) {
        continue;
      }
      requestTree(project);
    }
  }, [expanded, projects, treeErrors, treeLoading, trees, branchByRepo, treeBranch]);

  const rootOpen = expanded[ROOT_NAME] ?? false;
  const showRoot =
    sections.length === 0 ||
    match(ROOT_NAME) ||
    sections.some((sec) => match(resolveName(sec.slug, renames, sec.title)));

  const nodeMatches = (node: VfsNode, repoKey: string): boolean => {
    const key = `${repoKey}/${node.path}`;
    if (match(resolveName(key, renames, node.name))) return true;
    return node.type === "tree" && node.children.some((child) => nodeMatches(child, repoKey));
  };

  const renderRepoNodes = (
    nodes: VfsNode[],
    repoKey: string,
    depth: number,
  ) =>
    nodes.map((node) => {
      if (!nodeMatches(node, repoKey)) return null;
      const key = `${repoKey}/${node.path}`;
      const name = resolveName(key, renames, node.name);
      const indent = REPO_INDENTS[Math.min(depth, REPO_INDENTS.length - 1)];

      if (node.type === "tree") {
        const open = expanded[key] ?? false;
        return (
          <div key={key}>
            <TreeRow
              path={key}
              indent={indent}
              selected={selectedPath === key}
              focused={focused}
              onClick={() => {
                selectPath(key);
                toggleExpanded(key);
              }}
            >
              <span className="flex w-4 shrink-0 items-center justify-center text-vscode-dim">
                <Codicon
                  name={open ? "chevron-down" : "chevron-right"}
                  className="translate-y-px"
                />
              </span>
              <span className="text-vscode-dim">
                <Codicon name="folder" />
              </span>
              <span className="truncate">{name}</span>
            </TreeRow>
            {open ? renderRepoNodes(node.children, repoKey, depth + 1) : null}
          </div>
        );
      }

      const dirty = isDirty(edits, key);
      return (
        <TreeRow
          key={key}
          path={key}
          indent={indent}
          selected={selectedPath === key}
          focused={focused}
          onClick={() => onOpenFile?.(key, node.sha)}
        >
          <span className="text-vscode-dim">
            <Codicon name={fileIcon(name)} />
          </span>
          <span
            className={`truncate ${dirty ? "text-vscode-modified" : ""}`}
          >
            {name}
          </span>
          {dirty ? (
            <span className="ml-auto text-[10px] font-semibold text-vscode-modified">
              M
            </span>
          ) : null}
        </TreeRow>
      );
    });

  // Pinned tmp scratch (local-only) — appears when tmpFs has entries.
  const tmpKeys = Object.keys(tmpFs).filter((k) => k.startsWith("tmp/"));
  const tmpDirs = [
    ...new Set(
      tmpKeys
        .filter((k) => k.slice(4).includes("/"))
        .map((k) => k.slice(4).split("/")[0]),
    ),
  ].sort();
  const tmpFiles = tmpKeys.filter((k) => !k.slice(4).includes("/")).sort();
  const tmpOpen = expanded["tmp"] ?? false;

  const commitRename = (fullPath: string, value: string) => {
    onRename?.(fullPath, value.trim() === "" ? null : value.trim());
    setRenaming(null);
  };

  const tmpFileRow = (k: string, indent: string) => {
    const fname = resolveName(k, renames, k.split("/").pop() ?? k);
    return (
      <TreeRow
        key={k}
        path={k}
        indent={indent}
        selected={selectedPath === k}
        focused={focused}
        onClick={() => onOpenFile?.(k)}
      >
        <span className="text-vscode-dim">
          <Codicon name={fileIcon(fname)} />
        </span>
        <span className="truncate text-vscode-added">{fname}</span>
      </TreeRow>
    );
  };

  return (
    <div
      ref={treeRef}
      tabIndex={-1}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onMouseDownCapture={() => treeRef.current?.focus({ preventScroll: true })}
      className="py-1 text-[13px] focus:outline-none"
    >
      {showRoot ? (
        <div>
          <TreeRow
            path={ROOT_NAME}
            indent="pl-2"
            right="pr-[4px]"
            selected={selectedPath === ROOT_NAME}
            focused={focused}
            onClick={() => {
              selectPath(ROOT_NAME);
              toggleExpanded(ROOT_NAME);
            }}
          >
            <span className="flex w-4 shrink-0 items-center justify-center text-vscode-dim">
              <Codicon
                name={rootOpen ? "chevron-down" : "chevron-right"}
                className="translate-y-px"
              />
            </span>
            <span className="min-w-0 flex-1 truncate text-vscode-emphasis">
              {ROOT_NAME}
            </span>
            <div className="ml-auto hidden shrink-0 items-center group-hover/pane:flex">
              {EXPLORER_ACTIONS.map((a) => (
                <ViewActionButton
                  key={a.id}
                  icon={a.icon}
                  label={a.label}
                  onClick={() => onAction?.(a.id)}
                />
              ))}
            </div>
          </TreeRow>
          {rootOpen && tmpKeys.length > 0 ? (
            <div>
              <TreeRow
                path="tmp"
                indent="pl-6"
                selected={selectedPath === "tmp"}
                focused={focused}
                onClick={() => {
                  selectPath("tmp");
                  toggleExpanded("tmp");
                }}
              >
                <span className="flex w-4 shrink-0 items-center justify-center text-vscode-dim">
                  <Codicon
                    name={tmpOpen ? "chevron-down" : "chevron-right"}
                    className="translate-y-px"
                  />
                </span>
                <span className="truncate italic opacity-60">tmp</span>
              </TreeRow>
              {tmpOpen ? (
                <div>
                  {tmpDirs.map((dir) => {
                    const dkey = `tmp/${dir}`;
                    const dopen = expanded[dkey] ?? false;
                    return (
                      <div key={dkey}>
                        <TreeRow
                          path={dkey}
                          indent="pl-10"
                          selected={selectedPath === dkey}
                          focused={focused}
                          onClick={() => {
                            selectPath(dkey);
                            toggleExpanded(dkey);
                          }}
                        >
                          <span className="flex w-4 shrink-0 items-center justify-center text-vscode-dim">
                            <Codicon
                              name={dopen ? "chevron-down" : "chevron-right"}
                              className="translate-y-px"
                            />
                          </span>
                          <span className="truncate">{dir}</span>
                        </TreeRow>
                        {dopen
                          ? tmpKeys
                              .filter((k) => k.startsWith(`${dkey}/`))
                              .map((k) => tmpFileRow(k, "pl-14"))
                          : null}
                      </div>
                    );
                  })}
                  {tmpFiles.map((k) => tmpFileRow(k, "pl-10"))}
                </div>
              ) : null}
            </div>
          ) : null}
          {rootOpen ? (
            sections.length === 0 ? (
              <p className="py-1 pl-6 pr-2 text-xs text-vscode-dim">
                No folders yet — add rows in Supabase Studio.
              </p>
            ) : (
              sections.filter((sec) => sec.slug !== "tmp").map((sec) => {
                const key = sec.slug;
                const open = expanded[key] ?? false;
                const title = resolveName(key, renames, sec.title);
                if (!match(title)) return null;
                return (
                  <div key={sec.id}>
                    <TreeRow
                      path={key}
                      indent="pl-6"
                      selected={selectedPath === key}
                      focused={focused}
                      onClick={() => {
                        selectPath(key);
                        toggleExpanded(key);
                      }}
                      onDoubleClick={() => setRenaming(key)}
                    >
                      <span className="flex w-4 shrink-0 items-center justify-center text-vscode-dim">
                        <Codicon
                          name={open ? "chevron-down" : "chevron-right"}
                          className="translate-y-px"
                        />
                      </span>
                      {renaming === key ? (
                        <RenameInput
                          defaultValue={title}
                          label="Rename folder"
                          onCommit={(v) => commitRename(key, v ?? "")}
                          onCancel={() => setRenaming(null)}
                        />
                      ) : (
                        <span className="truncate">{title}</span>
                      )}
                    </TreeRow>
                    {open && sec.slug === "projects" ? (
                      <div>
                        {projects.map((p) => {
                          const repo = `${p.repo_owner}/${p.repo_name}`;
                          const name = resolveName(
                            `Projects/${repo}`,
                            renames,
                            p.title_override ?? p.repo_name,
                          );
                          if (!match(name)) return null;
                          const branch = branchByRepo[repo] ?? treeBranch[repo];
                          const treeKey = repoTreeKey(repo, branch);
                          const tree = trees[treeKey];
                          const rkey = `Projects/${repo}`;
                          const ropen = expanded[rkey] ?? false;
                          return (
                            <div key={p.id}>
                              <TreeRow
                                path={rkey}
                                indent="pl-10"
                                selected={selectedPath === rkey}
                                focused={focused}
                                title={
                                  readmes[repo] ??
                                  p.description ??
                                  repoMeta[repo]?.description ??
                                  undefined
                                }
                                onClick={() => {
                                  selectPath(rkey);
                                  toggleExpanded(rkey);
                                }}
                                onDoubleClick={() => setRenaming(rkey)}
                              >
                                <span className="flex w-4 shrink-0 items-center justify-center text-vscode-dim">
                                  <Codicon
                                    name={
                                      ropen ? "chevron-down" : "chevron-right"
                                    }
                                    className="translate-y-px"
                                  />
                                </span>
                                {renaming === rkey ? (
                                  <RenameInput
                                    defaultValue={name}
                                    label="Rename project"
                                    onCommit={(v) => commitRename(rkey, v ?? "")}
                                    onCancel={() => setRenaming(null)}
                                  />
                                ) : (
                                  <span className="truncate">{name}</span>
                                )}
                              </TreeRow>
                              {ropen ? (
                                treeErrors[treeKey] ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTreeErrors((prev) => {
                                        const next = { ...prev };
                                        delete next[treeKey];
                                        return next;
                                      });
                                      requestTree(p);
                                    }}
                                    className="w-full py-1 pl-14 pr-2 text-left text-xs text-vscode-dim hover:text-vscode-fg"
                                  >
                                    Could not load files · Retry
                                  </button>
                                ) : !tree ? (
                                  <p className="animate-pulse py-1 pl-14 pr-2 text-xs text-vscode-dim">
                                    Loading files…
                                  </p>
                                ) : tree.length === 0 ? (
                                  <p className="py-1 pl-14 pr-2 text-xs text-vscode-dim">
                                    No files
                                  </p>
                                ) : (
                                  renderRepoNodes(buildVfs(tree), rkey, 0)
                                )
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
