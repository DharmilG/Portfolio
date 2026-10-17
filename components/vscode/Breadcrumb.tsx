"use client";

// Breadcrumb — 22px path strip in the editor card, under the tab strip.
// Crumbs follow the Explorer hierarchy (Projects/<owner>/<repo> collapses to
// the repo row's label; tmp scratch mirrors its tree) with the same rename
// keys. Clicking a folder crumb opens a quick-pick-style Menu of that
// folder's children — drill-in like VS Code, picking a file opens it. The
// file crumb's symbols picker waits for a symbol provider (lands with/after
// FileViewer). See DOC/05 §6.
import { Fragment, useEffect, useRef, useState } from "react";
import { fileIcon } from "@/lib/fileIcons";
import {
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

// One level of picker children for a crumb key — dirs first, alphabetical.
// null = nothing to pick (empty folder / no client tree) → click is a no-op.
function childrenOf(
  path: string,
  projects: Project[],
  trees: Record<string, TreeEntry[]>,
  tmpFs: Record<string, string>,
  renames: Record<string, string>,
): PickerItem[] | null {
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
    const tree = trees[repo];
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

export default function Breadcrumb({ onOpenFile }: BreadcrumbProps) {
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const sections = useStore((s) => s.sections);
  const projects = useStore((s) => s.projects);
  const trees = useStore((s) => s.trees);
  const tmpFs = useStore((s) => s.tmpFs);
  const renames = useStore((s) => s.renames);

  const [picker, setPicker] = useState<{ crumb: string; path: string } | null>(
    null,
  );
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

  const tab = tabs.find((t) => t.id === activeTabId);
  // Browser tabs hold URLs (previews) — no crumb surface for those.
  if (!tab || tab.kind === "browser") return null;

  const crumbs = crumbsFor(tab.path, sections, projects, renames);
  const children = picker
    ? childrenOf(picker.path, projects, trees, tmpFs, renames)
    : null;

  const togglePicker = (crumbKey: string) => {
    if (picker?.crumb === crumbKey) {
      setPicker(null);
      return;
    }
    // No children (empty folder / non-tree section) = no-op, like VS Code.
    if (!childrenOf(crumbKey, projects, trees, tmpFs, renames)) return;
    setPicker({ crumb: crumbKey, path: crumbKey });
  };

  const pick = (id: string) => {
    const child = children?.find((c) => c.key === id);
    if (!child) return;
    if (child.folder) {
      setPicker((p) => (p ? { ...p, path: id } : p));
      return;
    }
    onOpenFile?.(child.key);
    setPicker(null);
  };

  const items: MenuItem[] = (children ?? []).map((c) => ({
    id: c.key,
    label: c.label,
    icon: c.icon,
  }));

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
            aria-haspopup={c.file ? undefined : "menu"}
            aria-expanded={open || undefined}
            onClick={c.file ? undefined : () => togglePicker(c.key)}
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
              {open && children ? (
                <Menu
                  items={items}
                  onAction={pick}
                  density="menu"
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
