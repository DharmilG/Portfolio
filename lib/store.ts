// lib/store.ts — single zustand store for the workbench.
// Orchestration lives here; computation delegates to lib/localGit.ts (dumb-depth).
// Only edits/commits/renames/tmpFs/mode persist (localStorage vscode-local-v1).
// See DOC/03 (state), rule 03-local-only, skill local-git.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  LocalCommit,
  RealCommit,
  ViewCommit,
  isEdited,
  makeLocalCommit,
  mergeCommits,
  resolveContent,
} from "./localGit";

export type TabKind = "code" | "markdown" | "browser";

export type EditorTab = {
  id: string;
  path: string;
  sha: string | null;
  kind: TabKind;
};

export type Section = {
  id: string;
  slug: string;
  title: string;
  icon: string;
  orders: number;
};

export type Project = {
  id: string;
  repo_owner: string;
  repo_name: string;
  title_override: string | null;
  preview_url: string | null;
  preview_embeddable: boolean;
  orders: number;
  featured: boolean;
};

export type TreeEntry = {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
};

export type TerminalSession = {
  id: string;
  hist: string[];
  cwd: string;
};

type State = {
  sections: Section[];
  projects: Project[];
  trees: Record<string, TreeEntry[]>;
  explorerLoading: boolean;
  setSections: (s: Section[]) => void;
  setProjects: (p: Project[]) => void;
  setTree: (repo: string, tree: TreeEntry[]) => void;
  setExplorerLoading: (b: boolean) => void;

  tabs: EditorTab[];
  activeTabId: string | null;
  openTab: (t: Omit<EditorTab, "id">) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string | null) => void;

  expanded: Record<string, boolean>;
  toggleExpanded: (key: string) => void;
  collapseAll: () => void;

  edits: Record<string, string>;
  commits: LocalCommit[];
  renames: Record<string, string>;
  tmpFs: Record<string, string>;
  saveEdit: (path: string, content: string) => void;
  commitLocal: (msg: string) => LocalCommit | null;
  discardEdit: (path?: string) => void;
  rename: (path: string, name: string | null) => void;
  writeTmp: (path: string, content: string) => void;
  deleteTmp: (path: string) => void;

  sessions: TerminalSession[];
  activeSessionId: string | null;
  spawnSession: () => void;
  killSession: (id: string) => void;
  pushHist: (id: string, line: string) => void;
  setCwd: (id: string, cwd: string) => void;

  previewUrl: string | null;
  previewHist: string[];
  openPreview: (url: string) => void;

  mode: "dark" | "light";
  setMode: (m: "dark" | "light") => void;
};

export const useStore = create<State>()(
  persist(
    (set) => ({
      sections: [],
      projects: [],
      trees: {},
      explorerLoading: false,
      setSections: (sections) => set({ sections }),
      setProjects: (projects) => set({ projects }),
      setTree: (repo, tree) =>
        set((s) => ({ trees: { ...s.trees, [repo]: tree } })),
      setExplorerLoading: (explorerLoading) => set({ explorerLoading }),

      tabs: [],
      activeTabId: null,
      // Default-open roots (mirrors Explorer ROOT_NAME). Session-only:
      // expanded is intentionally absent from persist partialize below.
      expanded: { "Dharmil Gajjar": true, Projects: true, tmp: true },
      openTab: (t) =>
        set((s) => {
          const id = `${t.kind}:${t.path}`;
          const tab = { ...t, id };
          if (s.tabs.some((x) => x.id === id)) {
            return { activeTabId: id };
          }
          return { tabs: [...s.tabs, tab], activeTabId: id };
        }),
      closeTab: (id) =>
        set((s) => {
          const tabs = s.tabs.filter((x) => x.id !== id);
          const activeTabId =
            s.activeTabId === id
              ? (tabs[tabs.length - 1]?.id ?? null)
              : s.activeTabId;
          return { tabs, activeTabId };
        }),
      setActiveTab: (activeTabId) => set({ activeTabId }),
      toggleExpanded: (key) =>
        set((s) => ({
          expanded: { ...s.expanded, [key]: !s.expanded[key] },
        })),
      collapseAll: () => set({ expanded: {} }),

      edits: {},
      commits: [],
      renames: {},
      tmpFs: {},
      saveEdit: (path, content) =>
        set((s) => ({
          edits: { ...s.edits, [path]: content },
        })),
      commitLocal: (msg) => {
        const files = Object.keys(useStore.getState().edits);
        if (files.length === 0) return null;
        const commit = makeLocalCommit(msg, files);
        const edits = { ...useStore.getState().edits };
        files.forEach((f) => delete edits[f]);
        set((s) => ({ commits: [commit, ...s.commits], edits }));
        return commit;
      },
      discardEdit: (path) =>
        set((s) => {
          if (!path) return { edits: {} };
          const edits = { ...s.edits };
          delete edits[path];
          return { edits };
        }),
      rename: (path, name) =>
        set((s) => {
          const renames = { ...s.renames };
          if (name) renames[path] = name;
          else delete renames[path];
          return { renames };
        }),
      writeTmp: (path, content) =>
        set((s) => ({ tmpFs: { ...s.tmpFs, [path]: content } })),
      deleteTmp: (path) =>
        set((s) => {
          const tmpFs = { ...s.tmpFs };
          delete tmpFs[path];
          return { tmpFs };
        }),

      sessions: [],
      activeSessionId: null,
      spawnSession: () =>
        set((s) => {
          const id = `term-${Date.now()}-${s.sessions.length}`;
          return {
            sessions: [...s.sessions, { id, hist: [], cwd: "~" }],
            activeSessionId: id,
          };
        }),
      killSession: (id) =>
        set((s) => {
          const sessions = s.sessions.filter((x) => x.id !== id);
          return {
            sessions,
            activeSessionId:
              s.activeSessionId === id
                ? (sessions[sessions.length - 1]?.id ?? null)
                : s.activeSessionId,
          };
        }),
      pushHist: (id, line) =>
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id === id ? { ...x, hist: [...x.hist, line].slice(-100) } : x,
          ),
        })),
      setCwd: (id, cwd) =>
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id === id ? { ...x, cwd } : x,
          ),
        })),

      previewUrl: null,
      previewHist: [],
      openPreview: (previewUrl) =>
        set((s) => ({
          previewUrl,
          previewHist: [...s.previewHist, previewUrl].slice(-20),
        })),

      mode: "dark",
      setMode: (mode) => set({ mode }),
    }),
    {
      name: "vscode-local-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        edits: s.edits,
        commits: s.commits,
        renames: s.renames,
        tmpFs: s.tmpFs,
        mode: s.mode,
      }),
      skipHydration: true,
    },
  ),
);

// Pure selectors (delegate to localGit).
export const isDirty = (
  edits: Record<string, string>,
  path: string,
): boolean => isEdited(path, edits);

export const displayContent = (
  path: string,
  edits: Record<string, string>,
  cached: string,
): string => resolveContent(path, edits, cached);

export const dirtyCount = (edits: Record<string, string>): number =>
  Object.keys(edits).length;

export const viewCommits = (
  local: LocalCommit[],
  real: RealCommit[],
): ViewCommit[] => mergeCommits(local, real);
