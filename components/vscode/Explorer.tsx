"use client";

// Explorer — folder tree from store (sections + allowlisted projects).
// Static workspace root ("Dharmil Gajjar") always on top with the view
// actions on its row; DB sections + pinned tmp scratch nest inside.
// Rows are shared TreeRows: selection follows autoReveal (openTab/setActiveTab
// in lib/store), ancestors expand + the view scrolls to revealed rows via
// revealNonce; selection renders blue only while the tree has focus.
// Dirty/rename overlays are local-only (rule 03-local-only).
// See DOC/05 §5, skills vscode-tokens + local-git.
import { useEffect, useRef, useState } from "react";
import { fileIcon } from "@/lib/fileIcons";
import { isDirty, ROOT_NAME, useStore } from "@/lib/store";
import Codicon from "./Codicon";
import RenameInput from "./RenameInput";
import TreeRow from "./TreeRow";
import ViewActionButton from "./ViewActionButton";

type ExplorerProps = {
  onOpenFile?: (path: string) => void;
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
  const [renaming, setRenaming] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
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

  const rootOpen = expanded[ROOT_NAME] ?? false;
  const showRoot =
    sections.length === 0 ||
    match(ROOT_NAME) ||
    sections.some((sec) => match(resolveName(sec.slug, renames, sec.title)));

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
    const dirty = isDirty(edits, k);
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
        <span className="truncate">{fname}</span>
        {dirty ? (
          <span className="ml-auto text-[10px] font-semibold text-vscode-added">
            M
          </span>
        ) : null}
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
                          const tree = trees[repo];
                          const rkey = `Projects/${repo}`;
                          const ropen = expanded[rkey] ?? false;
                          return (
                            <div key={p.id}>
                              <TreeRow
                                path={rkey}
                                indent="pl-10"
                                selected={selectedPath === rkey}
                                focused={focused}
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
                                        <TreeRow
                                          key={e.sha}
                                          path={fkey}
                                          indent="pl-14"
                                          selected={selectedPath === fkey}
                                          focused={focused}
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
                                        </TreeRow>
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
              })
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
