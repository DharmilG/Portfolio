"use client";

// Breadcrumb — 22px path strip in the editor card, under the tab strip.
// Crumbs follow the Explorer hierarchy (Projects/<owner>/<repo> collapses to
// the repo row's label; tmp scratch mirrors its tree) with the same rename
// keys. Clicking any crumb opens a quick-pick tree of that level's siblings
// (VS Code: "dropdown with that level's siblings"): the clicked node
// auto-expands in place, folder rows toggle like the Explorer (▸/▾ chevrons,
// file glyphs — an icon on every row), the focused row carries the accent
// outline. Picking a file opens it + the Explorer auto-reveals/selects it
// (lib/store autoReveal). The file crumb's symbols picker waits for a symbol
// provider (lands with/after FileViewer). See DOC/05 §6.
import { Fragment, useEffect, useRef, useState } from "react";
import { fileIcon } from "@/lib/fileIcons";
import {
  repoTreeKey,
  useStore,
  type Project,
  type Section,
  type TreeEntry,
} from "@/lib/store";
import Codicon from "./Codicon";
import { resolveName } from "./Explorer";
import Menu, { type MenuItem } from "./Menu";
import Tooltip from "./Tooltip";

type BreadcrumbProps = {
  onOpenFile?: (path: string) => void;
};

type Crumb = {
  key: string; // cumulative path — rename key + picker/drill key
  label: string;
  file: boolean;
};

type PickerItem = {
  key: string;
  label: string;
  folder: boolean;
  icon?: string;
};

// Crumb list for a tab path — same rows/rename keys the Explorer renders.
function crumbsFor(
  path: string,
  sections: Section[],
  projects: Project[],
  renames: Record<string, string>,
): Crumb[] {
  const parts = path.split("/");
  const crumbs: Crumb[] = [];

  // Projects › <repo row> › …repo-relative segments (owner/repo collapse to
  // the single repo node, exactly like the tree).
  if (parts[0] === "Projects" && parts.length >= 3) {
    const title =
      sections.find((s) => s.slug === "projects")?.title ?? "Projects";
    crumbs.push({
      key: "projects",
      label: resolveName("projects", renames, title),
      file: false,
    });
    const rkey = `Projects/${parts[1]}/${parts[2]}`;
    const p = projects.find(
      (x) => x.repo_owner === parts[1] && x.repo_name === parts[2],
    );
    crumbs.push({
      key: rkey,
      label: resolveName(
        rkey,
        renames,
        p?.title_override ?? p?.repo_name ?? parts[2],
      ),
      file: false,
    });
    for (let i = 3; i < parts.length; i++) {
      const key = `${rkey}/${parts.slice(3, i + 1).join("/")}`;
      crumbs.push({
        key,
        label: resolveName(key, renames, parts[i]),
        file: i === parts.length - 1,
      });
    }
    return crumbs;
  }

  // tmp scratch (local-only): tmp › [dir] › file.
  if (parts[0] === "tmp") {
    crumbs.push({ key: "tmp", label: "tmp", file: parts.length === 1 });
    for (let i = 1; i < parts.length; i++) {
      const key = parts.slice(0, i + 1).join("/");
      crumbs.push({
        key,
        label: resolveName(key, renames, parts[i]),
        file: i === parts.length - 1,
      });
    }
    return crumbs;
  }

  // Generic: plain segments, the first resolved against section titles.
  for (let i = 0; i < parts.length; i++) {
    const key = parts.slice(0, i + 1).join("/");
    const title =
      i === 0 ? sections.find((s) => s.slug === parts[0])?.title : undefined;
    crumbs.push({
      key,
      label: resolveName(key, renames, title ?? parts[i]),
      file: i === parts.length - 1,
    });
  }
  return crumbs;
}

// One level of picker items for a browsing key — "" is the root level
// (pinned tmp + sections, the same order the tree renders), dirs first.
// null = nothing to pick (empty folder / no client tree) → click is a no-op.
function childrenOf(
  path: string,
  sections: Section[],
  projects: Project[],
  trees: Record<string, TreeEntry[]>,
  branchByRepo: Record<string, string>,
  treeBranch: Record<string, string>,
  tmpFs: Record<string, string>,
  renames: Record<string, string>,
): PickerItem[] | null {
  if (path === "") {
    const items: PickerItem[] = [];
    if (Object.keys(tmpFs).some((k) => k.startsWith("tmp/"))) {
      items.push({ key: "tmp", label: "tmp", folder: true });
    }
    for (const sec of sections.filter((s) => s.slug !== "tmp")) {
      items.push({
        key: sec.slug,
        label: resolveName(sec.slug, renames, sec.title),
        folder: true,
      });
    }
    return items.length > 0 ? items : null;
  }

  if (path === "projects") {
    if (projects.length === 0) return null;
    return projects.map((p) => {
      const key = `Projects/${p.repo_owner}/${p.repo_name}`;
      return {
        key,
        label: resolveName(key, renames, p.title_override ?? p.repo_name),
        folder: true,
      };
    });
  }

  // tmp scratch: straight from tmpFs (same rows as the tree).
  if (path === "tmp" || path.startsWith("tmp/")) {
    const prefix = path === "tmp" ? "tmp/" : `${path}/`;
    const rels = Object.keys(tmpFs)
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length));
    const dirs = [
      ...new Set(
        rels.filter((r) => r.includes("/")).map((r) => r.split("/")[0]),
      ),
    ].sort();
    const dirItems: PickerItem[] = dirs.map((d) => ({
      key: `${path}/${d}`,
      label: resolveName(`${path}/${d}`, renames, d),
      folder: true,
    }));
    const fileItems: PickerItem[] = rels
      .filter((r) => !r.includes("/"))
      .sort()
      .map((r) => ({
        key: `${path}/${r}`,
        label: resolveName(`${path}/${r}`, renames, r),
        folder: false,
        icon: fileIcon(r),
      }));
    const items = [...dirItems, ...fileItems];
    return items.length > 0 ? items : null;
  }

  // Repo tree: children = next path segment under the crumb's path.
  if (path.startsWith("Projects/")) {
    const parts = path.split("/");
    if (parts.length < 3) return null;
    const repo = `${parts[1]}/${parts[2]}`;
    const tree = trees[repoTreeKey(repo, branchByRepo[repo] ?? treeBranch[repo])];
    if (!tree) return null;
    const repoKey = `Projects/${repo}`;
    const rest = parts.slice(3).join("/");
    const prefix = rest === "" ? "" : `${rest}/`;
    const dirs = new Set<string>();
    const files: PickerItem[] = [];
    for (const e of tree) {
      const rel =
        prefix === ""
          ? e.path
          : e.path.startsWith(prefix)
            ? e.path.slice(prefix.length)
            : null;
      if (!rel) continue;
      if (e.type === "tree" || rel.includes("/")) {
        dirs.add(rel.split("/")[0]);
      } else {
        const key = `${repoKey}${rest === "" ? "" : `/${rest}`}/${rel}`;
        files.push({
          key,
          label: resolveName(key, renames, rel),
          folder: false,
          icon: fileIcon(rel),
        });
      }
    }
    const dirItems: PickerItem[] = [...dirs].sort().map((d) => {
      const key = `${repoKey}${rest === "" ? "" : `/${rest}`}/${d}`;
      return { key, label: resolveName(key, renames, d), folder: true };
    });
    const items = [
      ...dirItems,
      ...files.sort((a, b) => a.label.localeCompare(b.label)),
    ];
    return items.length > 0 ? items : null;
  }

  return null;
}

type PickerRow = PickerItem & { depth: number };

// Flatten the browsed level into tree rows — expanded folders inline their
// children right below (Explorer-style); depth drives the row indent.
function rowsFor(
  level: string,
  expanded: Record<string, boolean>,
  sections: Section[],
  projects: Project[],
  trees: Record<string, TreeEntry[]>,
  branchByRepo: Record<string, string>,
  treeBranch: Record<string, string>,
  tmpFs: Record<string, string>,
  renames: Record<string, string>,
): PickerRow[] {
  const rows: PickerRow[] = [];
  const walk = (items: PickerItem[], depth: number) => {
    for (const item of items) {
      rows.push({ ...item, depth });
      if (item.folder && expanded[item.key]) {
        const children = childrenOf(
          item.key,
          sections,
          projects,
          trees,
          branchByRepo,
          treeBranch,
          tmpFs,
          renames,
        );
        if (children) walk(children, depth + 1);
      }
    }
  };
  walk(
    childrenOf(
      level,
      sections,
      projects,
      trees,
      branchByRepo,
      treeBranch,
      tmpFs,
      renames,
    ) ?? [],
    0,
  );
  return rows;
}

export default function Breadcrumb({ onOpenFile }: BreadcrumbProps) {
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const sections = useStore((s) => s.sections);
  const projects = useStore((s) => s.projects);
  const trees = useStore((s) => s.trees);
  const branchByRepo = useStore((s) => s.branchByRepo);
  const treeBranch = useStore((s) => s.treeBranch);
  const tmpFs = useStore((s) => s.tmpFs);
  const renames = useStore((s) => s.renames);

  // Open picker: list = level browsed ("" = root), crumb anchors the dropdown,
  // focus = outlined row, expanded = in-place open folders (tree rows).
  const [picker, setPicker] = useState<{
    crumb: string;
    list: string;
    focus: string;
    expanded: Record<string, boolean>;
  } | null>(null);
  const stripRef = useRef<HTMLElement>(null);

  // Tab switch swaps the path — any open picker's crumbs are gone.
  useEffect(() => {
    setPicker(null);
  }, [activeTabId]);

  // Outside-click + Escape close — same pattern as the TitleBar menus.
  useEffect(() => {
    if (!picker) return;
    const close = (e: MouseEvent) => {
      if (!stripRef.current?.contains(e.target as Node)) setPicker(null);
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

  // Bring the focused row into view when a picker opens (deep repo files).
  useEffect(() => {
    stripRef.current
      ?.querySelector("[data-active]")
      ?.scrollIntoView({ block: "nearest" });
  }, [picker?.crumb]);

  const tab = tabs.find((t) => t.id === activeTabId);
  // Browser tabs hold URLs (previews) — no crumb surface for those.
  if (!tab || tab.kind === "browser") return null;

  const crumbs = crumbsFor(tab.path, sections, projects, renames);
  const rows = picker
    ? rowsFor(
        picker.list,
        picker.expanded,
        sections,
        projects,
        trees,
        branchByRepo,
        treeBranch,
        tmpFs,
        renames,
      )
    : [];

  const togglePicker = (crumbKey: string, list: string) => {
    if (picker?.crumb === crumbKey) {
      setPicker(null);
      return;
    }
    // No children (empty folder / non-tree section) = no-op, like VS Code.
    if (
      !childrenOf(
        list,
        sections,
        projects,
        trees,
        branchByRepo,
        treeBranch,
        tmpFs,
        renames,
      )
    ) {
      return;
    }
    // The clicked node becomes the focused row and auto-expands (folder).
    const expandable =
      childrenOf(
        crumbKey,
        sections,
        projects,
        trees,
        branchByRepo,
        treeBranch,
        tmpFs,
        renames,
      ) !== null;
    setPicker({
      crumb: crumbKey,
      list,
      focus: crumbKey,
      expanded: expandable ? { [crumbKey]: true } : {},
    });
  };

  const pick = (id: string) => {
    const row = rows.find((r) => r.key === id);
    if (!row) return;
    if (row.folder) {
      // In-place expand/collapse like the Explorer; childless folders just
      // take focus.
      const expandable =
        childrenOf(
          id,
          sections,
          projects,
          trees,
          branchByRepo,
          treeBranch,
          tmpFs,
          renames,
        ) !== null;
      setPicker((p) =>
        p
          ? {
              ...p,
              focus: id,
              expanded: expandable
                ? { ...p.expanded, [id]: !p.expanded[id] }
                : p.expanded,
            }
          : p,
      );
      return;
    }
    onOpenFile?.(row.key);
    setPicker(null);
  };

  const items: MenuItem[] = picker
    ? rows.map((r) => ({
        id: r.key,
        label: r.label,
        icon: r.folder
          ? picker.expanded[r.key]
            ? "chevron-down"
            : "chevron-right"
          : r.icon,
        active: r.key === picker.focus,
        depth: r.depth,
      }))
    : [];

  return (
    <nav
      ref={stripRef}
      aria-label="Breadcrumb"
      className="flex h-[22px] shrink-0 items-center px-2 text-xs"
    >
      {crumbs.map((c, i) => {
        const open = picker?.crumb === c.key;
        const button = (
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open || undefined}
            onClick={() => togglePicker(c.key, i === 0 ? "" : crumbs[i - 1].key)}
            className={`flex h-[18px] max-w-full min-w-0 items-center gap-1 rounded-control px-1 ${
              c.file ? "text-vscode-fg" : "text-vscode-muted"
            } hover:bg-vscode-list-hover hover:text-vscode-fg-active`}
          >
            {c.file ? (
              <Codicon
                name={fileIcon(c.label)}
                className="shrink-0 text-vscode-dim"
              />
            ) : null}
            <span className="truncate">{c.label}</span>
          </button>
        );
        return (
          <Fragment key={c.key}>
            {i > 0 ? (
              <Codicon
                name="chevron-right"
                className="shrink-0 text-vscode-muted"
              />
            ) : null}
            <div
              className={`relative min-w-0 ${
                c.file ? "max-w-[60%] shrink-0" : ""
              }`}
            >
              {open ? (
                button
              ) : (
                <Tooltip
                  text={c.key}
                  position="bottom"
                  align="start"
                  className="min-w-0 max-w-full"
                >
                  {button}
                </Tooltip>
              )}
              {open ? (
                <Menu
                  items={items}
                  onAction={pick}
                  density="tree"
                  label="Breadcrumb picker"
                  className="absolute left-0 top-full z-20 max-h-[60vh] min-w-44 overflow-y-auto"
                />
              ) : null}
            </div>
          </Fragment>
        );
      })}
    </nav>
  );
}
