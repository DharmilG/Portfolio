"use client";

// Explorer — folder tree from store (sections + allowlisted projects).
// Static workspace root ("Dharmil Gajjar") always on top with the view
// actions on its row; DB sections nest inside.
// Dirty/rename overlays are local-only (rule 03-local-only).
// See DOC/05 §5, skills vscode-tokens + local-git.
import { useState } from "react";
import { isDirty, useStore } from "@/lib/store";
import { fileIcon } from "@/lib/fileIcons";
import Codicon from "./Codicon";
import RenameInput from "./RenameInput";
import ViewActionButton from "./ViewActionButton";

type ExplorerProps = {
  onOpenFile?: (path: string) => void;
  onRename?: (path: string, name: string | null) => void;
  onAction?: (id: string) => void;
  filter?: string;
};

// Static workspace root — always present, never renamed, never dirty.
const ROOT_NAME = "Dharmil Gajjar";

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

export function resolveName(
  fullPath: string,
  renames: Record<string, string>,
  fallback: string,
): string {
  return renames[fullPath] ?? fallback;
}

type TmpNode = {
  name: string;
  path: string;
  file: boolean;
  children?: TmpNode[];
};

// tmpFs keys ("tmp/a", "tmp/New Folder/.gitkeep") -> nested rows for the
// tmp folder (folders first, then files, alphabetical per level).
function buildTmpTree(keys: string[]): TmpNode[] {
  const root: TmpNode[] = [];
  for (const key of keys) {
    const parts = key.split("/").slice(1);
    let level = root;
    let prefix = "tmp";
    parts.forEach((part, i) => {
      prefix = `${prefix}/${part}`;
      const last = i === parts.length - 1;
      let node = level.find((n) => n.name === part);
      if (!node) {
        node = { name: part, path: prefix, file: last };
        level.push(node);
      }
      if (node.file && !last) return; // can't nest under a file
      if (!last) {
        node.children = node.children ?? [];
        level = node.children;
      }
    });
  }
  const sortNodes = (nodes: TmpNode[]): TmpNode[] => {
    nodes.sort((a, b) =>
      a.file === b.file ? a.name.localeCompare(b.name) : a.file ? 1 : -1,
    );
    nodes.forEach((n) => n.children && sortNodes(n.children));
    return nodes;
  };
  return sortNodes(root);
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
  const [renaming, setRenaming] = useState<string | null>(null);

  const match = (name: string) =>
    filter.trim() === "" ||
    name.toLowerCase().includes(filter.trim().toLowerCase());

  const rootOpen = expanded[ROOT_NAME] ?? false;
  const showRoot =
    sections.length === 0 ||
    match(ROOT_NAME) ||
    sections.some((sec) => match(resolveName(sec.slug, renames, sec.title)));

  const tmpKeys = Object.keys(tmpFs);
  const hasTmp = tmpKeys.length > 0;
  const tmpNodes = buildTmpTree(tmpKeys);
  const hasTmpSection = sections.some((s) => s.slug === "tmp");

  // Rows for the tmp subtree (depth 0 = children of the tmp folder row).
  const renderTmpNodes = (nodes: TmpNode[], depth: number) =>
    nodes.map((n) => {
      const indent = depth === 0 ? "pl-10" : "pl-14";
      if (!n.file) {
        const open = expanded[n.path] ?? false;
        return (
          <div key={n.path}>
            <div
              className={`flex h-7 cursor-pointer items-center gap-1 pr-2 hover:bg-vscode-list-hover ${indent}`}
              onClick={() => toggleExpanded(n.path)}
            >
              <span className="flex w-4 shrink-0 items-center justify-center text-vscode-dim">
                <Codicon
                  name={open ? "chevron-down" : "chevron-right"}
                  className="translate-y-px"
                />
              </span>
              <span className="truncate">{n.name}</span>
            </div>
            {open ? renderTmpNodes(n.children ?? [], depth + 1) : null}
          </div>
        );
      }
      return (
        <div
          key={n.path}
          className={`flex h-7 cursor-pointer items-center gap-1 pr-2 hover:bg-vscode-list-hover ${indent}`}
          onClick={() => onOpenFile?.(n.path)}
        >
          <span className="text-vscode-dim">
            <Codicon name={fileIcon(n.name)} />
          </span>
          <span className="truncate">{n.name}</span>
          {isDirty(edits, n.path) ? (
            <span className="ml-auto text-[10px] font-semibold text-vscode-added">
              M
            </span>
          ) : null}
        </div>
      );
    });

  const commitRename = (fullPath: string, value: string) => {
    onRename?.(fullPath, value.trim() === "" ? null : value.trim());
    setRenaming(null);
  };

  return (
    <div className="py-1 text-[13px]">
      {showRoot ? (
        <div>
          <div
            className="flex h-7 cursor-pointer items-center gap-1 pl-2 pr-[4px] hover:bg-vscode-list-hover"
            onClick={() => toggleExpanded(ROOT_NAME)}
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
            <div className="ml-auto flex shrink-0 items-center">
              {EXPLORER_ACTIONS.map((a) => (
                <ViewActionButton
                  key={a.id}
                  icon={a.icon}
                  label={a.label}
                  onClick={() => onAction?.(a.id)}
                />
              ))}
            </div>
          </div>
          {rootOpen ? (
            sections.length === 0 && !hasTmp ? (
              <p className="py-1 pl-6 pr-2 text-xs text-vscode-dim">
                No folders yet — add rows in Supabase Studio.
              </p>
            ) : (
              sections.map((sec) => {
                const key = sec.slug;
                const open = expanded[key] ?? false;
                const title = resolveName(key, renames, sec.title);
                if (!match(title)) return null;
                return (
                  <div key={sec.id}>
                    <div
                      className="flex h-7 cursor-pointer items-center gap-1 pl-6 pr-2 hover:bg-vscode-list-hover"
                      onClick={() => toggleExpanded(key)}
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
                        <span
                          className={`truncate ${sec.slug === "tmp" ? "italic opacity-60" : ""}`}
                        >
                          {title}
                        </span>
                      )}
                    </div>
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
                          const tree = trees[repo];
                          const rkey = `Projects/${repo}`;
                          const ropen = expanded[rkey] ?? false;
                          return (
                            <div key={p.id}>
                              <div
                                className="flex h-7 cursor-pointer items-center gap-1 pl-10 pr-2 hover:bg-vscode-list-hover"
                                onClick={() => toggleExpanded(rkey)}
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
                              </div>
                              {ropen ? (
                                !tree ? (
                                  <p className="animate-pulse py-1 pl-14 pr-2 text-xs text-vscode-dim">
                                    Loading tree…
                                  </p>
                                ) : (
                                  tree
                                    .filter((e) => e.type === "blob")
                                    .map((e) => {
                                      const fkey = `${rkey}/${e.path}`;
                                      const fname = resolveName(
                                        fkey,
                                        renames,
                                        e.path.split("/").pop() ?? e.path,
                                      );
                                      if (!match(fname)) return null;
                                      const dirty = isDirty(edits, fkey);
                                      return (
                                        <div
                                          key={e.sha}
                                          className="flex h-7 cursor-pointer items-center gap-1 pl-14 pr-2 hover:bg-vscode-list-hover"
                                          onClick={() => onOpenFile?.(fkey)}
                                        >
                                          <span className="text-vscode-dim">
                                            <Codicon
                                              name={fileIcon(fname)}
                                            />
                                          </span>
                                          <span className="truncate">
                                            {fname}
                                          </span>
                                          {dirty ? (
                                            <span className="ml-auto text-[10px] font-semibold text-vscode-added">
                                              M
                                            </span>
                                          ) : null}
                                        </div>
                                      );
                                    })
                                )
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                    {open && sec.slug === "tmp"
                      ? renderTmpNodes(tmpNodes, 0)
                      : null}
                  </div>
                );
              })
            )
          ) : null}
          {rootOpen && hasTmp && !hasTmpSection ? (
            <div>
              <div
                className="flex h-7 cursor-pointer items-center gap-1 pl-6 pr-2 hover:bg-vscode-list-hover"
                onClick={() => toggleExpanded("tmp")}
              >
                <span className="flex w-4 shrink-0 items-center justify-center text-vscode-dim">
                  <Codicon
                    name={expanded.tmp ? "chevron-down" : "chevron-right"}
                    className="translate-y-px"
                  />
                </span>
                <span className="truncate italic opacity-60">tmp</span>
              </div>
              {expanded.tmp ? renderTmpNodes(tmpNodes, 0) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
