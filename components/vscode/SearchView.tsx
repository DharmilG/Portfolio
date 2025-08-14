"use client";

// SearchView — the Search pane (DOC/05 §10). Filters the loaded repo trees
// and the tmp scratch files client-side (no GitHub request) and marks the
// term inside the opened file (FileViewer highlights the occurrences).
// VS Code-shaped: a search field on top, a result list below, a count line.
import { useMemo, useRef, useState } from "react";
import { fileIcon } from "@/lib/fileIcons";
import { repoTreeKey, useStore } from "@/lib/store";
import Codicon from "./Codicon";

type SearchFile = {
  path: string;
  sha: string | null;
};

type SearchViewProps = {
  onOpenFile?: (path: string, sha?: string | null) => void;
};

// Split a name around every case-insensitive occurrence of the term.
function segments(text: string, term: string): { text: string; hit: boolean }[] {
  if (!term) return [{ text, hit: false }];
  const lower = text.toLowerCase();
  const needle = term.toLowerCase();
  const out: { text: string; hit: boolean }[] = [];
  let at = 0;
  for (;;) {
    const found = lower.indexOf(needle, at);
    if (found === -1) break;
    if (found > at) out.push({ text: text.slice(at, found), hit: false });
    out.push({ text: text.slice(found, found + needle.length), hit: true });
    at = found + needle.length;
  }
  if (at < text.length) out.push({ text: text.slice(at), hit: false });
  return out.length > 0 ? out : [{ text, hit: false }];
}

export default function SearchView({ onOpenFile }: SearchViewProps) {
  const projects = useStore((s) => s.projects);
  const trees = useStore((s) => s.trees);
  const tmpFs = useStore((s) => s.tmpFs);
  const branchByRepo = useStore((s) => s.branchByRepo);
  const treeBranch = useStore((s) => s.treeBranch);
  const searchQuery = useStore((s) => s.searchQuery);
  const setSearchQuery = useStore((s) => s.setSearchQuery);
  const openTab = useStore((s) => s.openTab);
  const inputRef = useRef<HTMLInputElement>(null);
  const [local, setLocal] = useState(searchQuery);

  // Every file the workbench already knows about (loaded trees + tmp).
  const files = useMemo<SearchFile[]>(() => {
    const out: SearchFile[] = [];
    for (const project of projects) {
      const repo = `${project.repo_owner}/${project.repo_name}`;
      const branch = branchByRepo[repo] ?? treeBranch[repo];
      for (const entry of trees[repoTreeKey(repo, branch)] ?? []) {
        if (entry.type !== "blob") continue;
        out.push({
          path: `Projects/${repo}/${entry.path}`,
          sha: entry.sha,
        });
      }
    }
    for (const path of Object.keys(tmpFs)) out.push({ path, sha: null });
    return out;
  }, [projects, trees, tmpFs, branchByRepo, treeBranch]);

  const needle = local.trim();
  const results = useMemo(() => {
    if (!needle) return [];
    const lower = needle.toLowerCase();
    return files.filter((f) => f.path.toLowerCase().includes(lower));
  }, [files, needle]);

  const open = (file: SearchFile) => {
    // The term stays in the store, so the viewer marks its occurrences.
    setSearchQuery(needle);
    onOpenFile?.(file.path, file.sha);
    openTab({ kind: "code", path: file.path, sha: file.sha });
  };

  return (
    <div className="flex min-h-0 flex-col text-[13px]">
      <div className="px-3 pb-2 pt-3">
        <div className="flex h-7 items-center gap-1 rounded-[4px] border border-vscode-quick-input-border bg-vscode-quick-input-bg px-2 focus-within:outline focus-within:outline-1 focus-within:outline-vscode-accent focus-within:outline-offset-[-1px]">
          <Codicon name="search" size={14} className="shrink-0 text-vscode-dim" />
          <input
            ref={inputRef}
            value={local}
            onChange={(e) => {
              setLocal(e.target.value);
              setSearchQuery(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) open(results[0]);
              if (e.key === "Escape") {
                setLocal("");
                setSearchQuery("");
                inputRef.current?.blur();
              }
            }}
            placeholder="Search"
            aria-label="Search files"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-vscode-fg placeholder:text-vscode-quick-placeholder focus:outline-none"
          />
          {needle ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setLocal("");
                setSearchQuery("");
              }}
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-control text-vscode-dim hover:bg-vscode-list-hover hover:text-vscode-fg"
            >
              <Codicon name="close" size={12} />
            </button>
          ) : null}
        </div>
      </div>

      {needle ? (
        <p className="px-4 pb-1 text-[11px] text-vscode-dim">
          {results.length === 0
            ? "No results in the loaded files"
            : `${results.length} result${results.length === 1 ? "" : "s"}`}
        </p>
      ) : null}

      {files.length === 0 ? (
        <p className="px-4 py-2 text-[11px] leading-relaxed text-vscode-dim">
          No files loaded yet — expand a project in the Explorer to search it.
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {results.map((file) => {
          const name = file.path.split("/").pop() ?? file.path;
          const dir = file.path.slice(0, Math.max(0, file.path.length - name.length - 1));
          return (
            <div
              key={file.path}
              data-path={file.path}
              onClick={() => open(file)}
              className="group/row flex h-7 cursor-pointer items-center gap-1 pl-4 pr-2 hover:bg-vscode-list-hover"
            >
              <span className="shrink-0 text-vscode-dim">
                <Codicon name={fileIcon(name)} />
              </span>
              <span className="min-w-0 truncate">
                {segments(name, needle).map((seg, i) => (
                  <span
                    key={i}
                    className={seg.hit ? "text-vscode-quick-match" : undefined}
                  >
                    {seg.text}
                  </span>
                ))}
              </span>
              {dir ? (
                <span className="min-w-0 flex-1 truncate text-[11px] text-vscode-dim">
                  {dir}
                </span>
              ) : (
                <span className="min-w-0 flex-1" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
