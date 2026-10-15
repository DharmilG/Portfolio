"use client";

// Explorer — folder tree from store (sections + allowlisted projects).
// Dirty/rename overlays are local-only (rule 03-local-only).
// See DOC/05 §5, skills vscode-tokens + local-git.
import { useState } from "react";
import { isDirty, useStore } from "@/lib/store";

type ExplorerProps = {
  onOpenFile?: (path: string) => void;
  onRename?: (path: string, name: string | null) => void;
};

function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path d={open ? "M1 4l1-2h4l1.5 2H13v7H1z" : "M1 4h5l1.5 2H13v5H1z"} />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path d="M3 1h5l3 3v9H3zM8 1v3h3" />
    </svg>
  );
}

function extOf(path: string): string {
  const i = path.lastIndexOf(".");
  return i < 0 ? "" : path.slice(i + 1);
}

export function resolveName(
  fullPath: string,
  renames: Record<string, string>,
  fallback: string,
): string {
  return renames[fullPath] ?? fallback;
}

export default function Explorer({ onOpenFile, onRename }: ExplorerProps) {
  const sections = useStore((s) => s.sections);
  const projects = useStore((s) => s.projects);
  const trees = useStore((s) => s.trees);
  const renames = useStore((s) => s.renames);
  const edits = useStore((s) => s.edits);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Projects: true,
  });
  const [filter, setFilter] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);

  const toggle = (key: string) =>
    setExpanded((e) => ({ ...e, [key]: !e[key] }));

  const match = (name: string) =>
    filter.trim() === "" ||
    name.toLowerCase().includes(filter.trim().toLowerCase());

  const commitRename = (fullPath: string, value: string) => {
    onRename?.(fullPath, value.trim() === "" ? null : value.trim());
    setRenaming(null);
  };

  return (
    <div className="py-1 text-[13px]">
      <div className="px-3 pb-1">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter explorer"
          aria-label="Filter explorer"
          className="h-7 w-full rounded bg-vscode-input-bg px-2 text-xs text-vscode-fg placeholder:text-vscode-dim focus:outline-none focus:ring-1 focus:ring-vscode-accent"
        />
      </div>
      {sections.length === 0 ? (
        <p className="px-4 py-2 text-xs text-vscode-dim">
          No folders yet — add rows in Supabase Studio.
        </p>
      ) : null}
      {sections.map((sec) => {
        const key = sec.slug;
        const open = expanded[key] ?? false;
        const title = resolveName(key, renames, sec.title);
        if (!match(title)) return null;
        return (
          <div key={sec.id}>
            <div
              className="flex h-7 cursor-pointer items-center gap-1 px-2 hover:bg-vscode-list-hover"
              onClick={() => toggle(key)}
              onDoubleClick={() => setRenaming(key)}
            >
              <span className="w-3 text-[10px] text-vscode-dim">
                {open ? "▾" : "▸"}
              </span>
              <span className="text-vscode-dim">
                <FolderIcon open={open} />
              </span>
              {renaming === key ? (
                <input
                  autoFocus
                  defaultValue={title}
                  aria-label="Rename folder"
                  onBlur={(e) => commitRename(key, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(key, e.currentTarget.value);
                    if (e.key === "Escape") setRenaming(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="h-5 w-full rounded bg-vscode-input-bg px-1 text-xs text-vscode-fg focus:outline-none focus:ring-1 focus:ring-vscode-accent"
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
                        className="flex h-7 cursor-pointer items-center gap-1 pl-6 pr-2 hover:bg-vscode-list-hover"
                        onClick={() => toggle(rkey)}
                        onDoubleClick={() => setRenaming(rkey)}
                      >
                        <span className="w-3 text-[10px] text-vscode-dim">
                          {ropen ? "▾" : "▸"}
                        </span>
                        <span className="text-vscode-dim">
                          <FolderIcon open={ropen} />
                        </span>
                        {renaming === rkey ? (
                          <input
                            autoFocus
                            defaultValue={name}
                            aria-label="Rename project"
                            onBlur={(e) => commitRename(rkey, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename(rkey, e.currentTarget.value);
                              if (e.key === "Escape") setRenaming(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-5 w-full rounded bg-vscode-input-bg px-1 text-xs text-vscode-fg focus:outline-none focus:ring-1 focus:ring-vscode-accent"
                          />
                        ) : (
                          <span className="truncate">{name}</span>
                        )}
                      </div>
                      {ropen ? (
                        !tree ? (
                          <p className="animate-pulse py-1 pl-12 pr-2 text-xs text-vscode-dim">
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
                                  className="flex h-7 cursor-pointer items-center gap-1 pl-12 pr-2 hover:bg-vscode-list-hover"
                                  onClick={() => onOpenFile?.(fkey)}
                                >
                                  <span className="text-vscode-dim">
                                    <FileIcon />
                                  </span>
                                  <span className="truncate">{fname}</span>
                                  <span className="ml-auto flex items-center gap-1 text-[10px] text-vscode-dim">
                                    {extOf(fname) ? <span>{extOf(fname)}</span> : null}
                                    {dirty ? (
                                      <span className="font-semibold text-vscode-added">
                                        M
                                      </span>
                                    ) : null}
                                  </span>
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
          </div>
        );
      })}
    </div>
  );
}
