"use client";

// Explorer — portfolio sections only. Repository files are intentionally not
// listed here; project cards open the documentation-first Projects page.
// The static workspace root stays on top and carries the view actions, hidden
// at rest and revealed on pane hover (VS Code paneview.css convention).
// See DOC/05 §5, skills vscode-tokens.
import { useEffect, useMemo, useRef, useState } from "react";
import { getSectionIconColor } from "@/lib/iconThemes";
import { ROOT_NAME, useStore } from "@/lib/store";
import Codicon from "./Codicon";
import RenameInput from "./RenameInput";
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

const UNIFIED_SECTIONS = new Set([
  "about",
  "experience",
  "education",
  "skills",
  "hackathons",
  "contact",
]);

const SECTION_ORDER = [
  "about",
  "experience",
  "education",
  "skills",
  "hackathons",
  "contact",
  "projects",
  "books",
];

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
  onRename,
  onAction,
  filter = "",
}: ExplorerProps) {
  const storeSections = useStore((s) => s.sections);
  const renames = useStore((s) => s.renames);
  const expanded = useStore((s) => s.expanded);
  const toggleExpanded = useStore((s) => s.toggleExpanded);
  const selectedPath = useStore((s) => s.selectedPath);
  const revealNonce = useStore((s) => s.revealNonce);
  const selectPath = useStore((s) => s.selectPath);
  const openTab = useStore((s) => s.openTab);
  const activeTabId = useStore((s) => s.activeTabId);
  const activeSection = useStore((s) => s.activeSection);
  const setActiveSection = useStore((s) => s.setActiveSection);
  const setScrollTargetSection = useStore((s) => s.setScrollTargetSection);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const treeRef = useRef<HTMLDivElement>(null);

  // Production's sections check constraint does not yet allow "books", so the
  // row cannot be stored there. Keep the section visible from a local fallback
  // until the production schema is updated.
  const sections = useMemo(() => {
    if (storeSections.some((sec) => sec.slug === "books")) return storeSections;
    return [
      ...storeSections,
      {
        id: "books-fallback",
        slug: "books",
        title: "Books",
        icon: "book",
        orders: 85,
      },
    ];
  }, [storeSections]);

  useEffect(() => {
    const tree = treeRef.current;
    if (!tree || !selectedPath) return;
    if (
      UNIFIED_SECTIONS.has(selectedPath) ||
      selectedPath === ROOT_NAME ||
      selectedPath === "books" ||
      selectedPath === "projects"
    ) {
      return;
    }
    let row: HTMLElement | undefined;
    tree.querySelectorAll<HTMLElement>("[data-path]").forEach((node) => {
      if (node.dataset.path === selectedPath) row = node;
    });
    row?.scrollIntoView({ block: "nearest" });
  }, [revealNonce, selectedPath]);

  const match = (name: string) =>
    filter.trim() === "" ||
    name.toLowerCase().includes(filter.trim().toLowerCase());

  const commitRename = (fullPath: string, value: string) => {
    onRename?.(fullPath, value.trim() === "" ? null : value.trim());
    setRenaming(null);
  };

  const rootOpen = expanded[ROOT_NAME] ?? false;
  const showRoot =
    sections.length === 0 ||
    match(ROOT_NAME) ||
    sections.some((sec) => match(resolveName(sec.slug, renames, sec.title)));

  const isUnifiedTabActive =
    activeTabId === "page:about" ||
    activeTabId === "page:experience" ||
    activeTabId === "page:education" ||
    activeTabId === "page:skills" ||
    activeTabId === "page:hackathons" ||
    activeTabId === "page:contact";

  return (
    <div
      ref={treeRef}
      tabIndex={-1}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onMouseDownCapture={() => treeRef.current?.focus({ preventScroll: true })}
      className="py-[5px] text-[14px] focus:outline-none"
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
            <span className="flex w-5 shrink-0 items-center justify-center text-vscode-dim">
              <Codicon
                name={rootOpen ? "chevron-down" : "chevron-right"}
                size={18}
                className="translate-y-px"
              />
            </span>
            <span className="min-w-0 flex-1 truncate text-vscode-emphasis">
              {ROOT_NAME}
            </span>
            <div className="ml-auto hidden shrink-0 items-center group-hover/pane:flex">
              {EXPLORER_ACTIONS.map((action) => (
                <ViewActionButton
                  key={action.id}
                  icon={action.icon}
                  label={action.label}
                  onClick={() => onAction?.(action.id)}
                />
              ))}
            </div>
          </TreeRow>

          {rootOpen ? (
            sections.length === 0 ? (
              <p className="py-1 pl-6 pr-2 text-xs text-vscode-dim">
                No folders yet — add rows in Supabase Studio.
              </p>
            ) : (
              [...sections]
                .filter(
                  (sec) =>
                    sec.slug !== "tmp" &&
                    sec.slug !== "resume" &&
                    sec.slug !== "certificates",
                )
                .sort((a, b) => {
                  const iA = SECTION_ORDER.indexOf(a.slug);
                  const iB = SECTION_ORDER.indexOf(b.slug);
                  if (iA !== -1 && iB !== -1) return iA - iB;
                  if (iA !== -1) return -1;
                  if (iB !== -1) return 1;
                  return (a.orders ?? 0) - (b.orders ?? 0);
                })
                .map((sec) => {
                  const key = sec.slug;
                  const title = resolveName(key, renames, sec.title);
                  if (!match(title)) return null;

                  const isUnified = UNIFIED_SECTIONS.has(sec.slug);
                  const isCurrent = isUnified
                    ? isUnifiedTabActive && activeSection === sec.slug
                    : activeTabId === `page:${sec.slug}`;

                  return (
                    <TreeRow
                      key={sec.id}
                      path={key}
                      indent="pl-5"
                      selected={isCurrent || selectedPath === key}
                      focused={focused}
                      activeIndicator={isCurrent}
                      onClick={() => {
                        selectPath(key);
                        if (isUnified) {
                          openTab({ kind: "page", path: "about", sha: null });
                          setActiveSection(sec.slug);
                          setScrollTargetSection(sec.slug);
                          return;
                        }
                        openTab({ kind: "page", path: key, sha: null });
                      }}
                      onDoubleClick={() => setRenaming(key)}
                    >
                      <span className="flex w-5 shrink-0 items-center justify-center">
                        <Codicon
                          name={sec.icon}
                          size={18}
                          className={getSectionIconColor(sec.slug)}
                        />
                      </span>
                      {renaming === key ? (
                        <RenameInput
                          defaultValue={title}
                          label="Rename folder"
                          onCommit={(value) => commitRename(key, value ?? "")}
                          onCancel={() => setRenaming(null)}
                        />
                      ) : (
                        <span className="truncate">{title}</span>
                      )}
                    </TreeRow>
                  );
                })
              )
            ) : null}
        </div>
      ) : null}
    </div>
  );
}
