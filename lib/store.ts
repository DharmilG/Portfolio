// lib/store.ts — single zustand store for the workbench.
// Orchestration lives here; computation delegates to lib/localGit.ts (dumb-depth).
// Only edits/commits/renames/tmpFs/mode/sidebarWidth persist (localStorage
// vscode-local-v1); drafts/expanded/selection/view/sidebar/palette stay
// session-only (VS Code buffers).
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
import type { TerminalShell } from "./terminal/parser";

export type TabKind = "code" | "markdown" | "browser";

// Activity views (ActivityBar icons) — the page, palette and commands share
// this union (ActivityBar re-exports it for its props).
export type ActivityId = "explorer" | "search" | "scm" | "run" | "extensions";

// Command palette mode; the palette's `>` prefix maps to "commands".
export type PaletteMode = "files" | "commands";

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
  shell: TerminalShell;
};

// Terminal history survives reloads on its own key (DOC/10 §1); the panel and
// sessions themselves are session-only, like VS Code buffers.
const TERM_HIST_KEY = "vscode-term-hist";

function readTermHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TERM_HIST_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string").slice(-100)
      : [];
  } catch {
    return [];
  }
}

function writeTermHistory(hist: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      TERM_HIST_KEY,
      JSON.stringify(hist.slice(-100)),
    );
  } catch {
    // Private mode / quota — history is a convenience, never fatal.
  }
}

type State = {
  sections: Section[];
  projects: Project[];
  trees: Record<string, TreeEntry[]>;
  explorerLoading: boolean;
  setSections: (s: Section[]) => void;
  setProjects: (p: Project[]) => void;
  setTree: (repo: string, tree: TreeEntry[]) => void;
  setExplorerLoading: (b: boolean) => void;

  sidebarWidth: number; // layout pref (sash, DOC/05 §3/§5) — persisted
  sidebarPreview: number | null; // live sash drag width — session-only
  setSidebarWidth: (w: number) => void;
  setSidebarPreview: (w: number | null) => void;

  // UI shell (session-only): active activity view + primary-sidebar
  // visibility (ActivityBar icon, Ctrl+B, View menu, palette commands) and
  // the command palette (paletteMode doubles as the open flag; null = closed).
  view: ActivityId;
  showSidebar: boolean;
  paletteMode: PaletteMode | null;
  selectView: (id: ActivityId) => void;
  showView: (id: ActivityId) => void;
  toggleSidebar: () => void;
  openPalette: (mode?: PaletteMode) => void;
  closePalette: () => void;
  setPaletteMode: (mode: PaletteMode) => void;

  tabs: EditorTab[];
  activeTabId: string | null;
  openTab: (t: Omit<EditorTab, "id">) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string | null) => void;

  caret: { line: number; col: number }; // editor Ln/Col, 0-based — session-only
  setCaret: (line: number, col: number) => void;

  expanded: Record<string, boolean>;
  toggleExpanded: (key: string) => void;
  collapseAll: () => void;

  selectedPath: string | null;
  revealNonce: number;
  selectPath: (path: string | null) => void;
  revealPath: (path: string) => void;

  edits: Record<string, string>;
  commits: LocalCommit[];
  renames: Record<string, string>;
  tmpFs: Record<string, string>;
  commitMsg: string; // SCM message box — session-only, survives view switches
  setCommitMsg: (msg: string) => void;
  drafts: Record<string, string>; // unsaved editor buffers (session-only)
  saveEdit: (path: string, content: string) => void;
  setDraft: (path: string, content: string) => void;
  saveDraft: (path: string) => void;
  discardDraft: (path: string) => void;
  commitLocal: (msg: string) => LocalCommit | null;
  discardEdit: (path?: string) => void;
  rename: (path: string, name: string | null) => void;
  writeTmp: (path: string, content: string) => void;
  deleteTmp: (path: string) => void;

  sessions: TerminalSession[];
  activeSessionId: string | null;
  initTerminal: () => void;
  setActiveSession: (id: string) => void;
  spawnSession: (shell?: TerminalShell) => void;
  killSession: (id: string) => void;
  pushHist: (id: string, line: string) => void;
  setCwd: (id: string, cwd: string) => void;

  // Bottom panel (terminal today, preview group later). Session-only: closed
  // by default like VS Code; 280px tall, maximize toggles 60vh (DOC/10 §1).
  panelOpen: boolean;
  panelHeight: number;
  panelPreview: number | null;
  panelMaximized: boolean;
  togglePanel: () => void;
  closePanel: () => void;
  setPanelHeight: (h: number) => void;
  setPanelPreview: (h: number | null) => void;
  togglePanelMaximized: () => void;
  termClearNonce: number;
  clearTerminal: () => void;

  previewUrl: string | null;
  previewHist: string[];
  openPreview: (url: string) => void;

  mode: "dark" | "light";
  setMode: (m: "dark" | "light") => void;
};

// Static workspace root — always present, never renamed, never dirty.
export const ROOT_NAME = "Dharmil Gajjar";

// autoReveal (DOC/05 §5) — ancestor expansion keys for a file path:
// root → section → repo/tmp dirs. Repo-dir keys are emitted ahead of nested
// rows (PV-UI-REPOTREE) so reveal works unchanged when they land.
function ancestorKeys(path: string): string[] {
  const parts = path.split("/");
  const keys = [ROOT_NAME];
  if (parts[0] === "Projects" && parts.length >= 3) {
    keys.push("projects", `Projects/${parts[1]}/${parts[2]}`);
    for (let i = 4; i < parts.length; i++) {
      keys.push(
        `Projects/${parts[1]}/${parts[2]}/${parts.slice(3, i).join("/")}`,
      );
    }
  } else if (parts[0] === "tmp") {
    keys.push("tmp");
    if (parts.length >= 3) keys.push(`tmp/${parts[1]}`);
  } else if (parts.length >= 2) {
    keys.push(parts[0]);
  }
  return keys;
}

// One set() per action: merge ancestor expansion + selection + scroll nonce.
function revealed(
  s: { expanded: Record<string, boolean>; revealNonce: number },
  path: string,
): {
  expanded: Record<string, boolean>;
  selectedPath: string;
  revealNonce: number;
} {
  const expanded = { ...s.expanded };
  for (const k of ancestorKeys(path)) expanded[k] = true;
  return { expanded, selectedPath: path, revealNonce: s.revealNonce + 1 };
}

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

      sidebarWidth: 280,
      sidebarPreview: null, // not in partialize: the drag preview never persists
      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
      setSidebarPreview: (sidebarPreview) => set({ sidebarPreview }),

      // UI shell defaults; none of these persist (absent from partialize).
      view: "explorer",
      showSidebar: true,
      paletteMode: null,
      // Icon semantics: the active icon toggles the sidebar, others switch + show.
      selectView: (id) =>
        set((s) =>
          id === s.view
            ? { showSidebar: !s.showSidebar }
            : { view: id, showSidebar: true },
        ),
      showView: (id) => set({ view: id, showSidebar: true }),
      toggleSidebar: () => set((s) => ({ showSidebar: !s.showSidebar })),
      openPalette: (mode = "files") => set({ paletteMode: mode }),
      closePalette: () => set({ paletteMode: null }),
      setPaletteMode: (paletteMode) => set({ paletteMode }),

      tabs: [],
      activeTabId: null,
      // Default-open roots (mirrors Explorer ROOT_NAME) + tmp scratch.
      // Session-only: expanded is intentionally absent from persist
      // partialize below.
      expanded: { "Dharmil Gajjar": true, Projects: true, tmp: true },
      openTab: (t) =>
        set((s) => {
          const id = `${t.kind}:${t.path}`;
          const tab = { ...t, id };
          // autoReveal: opening a file reveals + selects it in the Explorer
          // (browser previews hold URLs — nothing to reveal).
          const reveal = t.kind === "browser" ? {} : revealed(s, t.path);
          if (s.tabs.some((x) => x.id === id)) {
            return { activeTabId: id, ...reveal };
          }
          return { tabs: [...s.tabs, tab], activeTabId: id, ...reveal };
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
      setActiveTab: (activeTabId) =>
        set((s) => {
          const tab = s.tabs.find((x) => x.id === activeTabId);
          return {
            activeTabId,
            // Tab clicks reveal too (VS Code autoReveal on active change).
            ...(tab && tab.kind !== "browser" ? revealed(s, tab.path) : {}),
          };
        }),
      caret: { line: 0, col: 0 }, // absent from partialize: session-only
      setCaret: (line, col) => set({ caret: { line, col } }),
      toggleExpanded: (key) =>
        set((s) => ({
          expanded: { ...s.expanded, [key]: !s.expanded[key] },
        })),
      collapseAll: () => set({ expanded: {} }),

      // Explorer selection + autoReveal scroll trigger (session-only, like
      // expanded — intentionally absent from persist partialize).
      selectedPath: null,
      revealNonce: 0,
      selectPath: (selectedPath) => set({ selectedPath }),
      // Full reveal (tab menu "Reveal in Explorer"): expand ancestors + select
      // + scroll trigger, without touching tabs.
      revealPath: (path) => set((s) => revealed(s, path)),

      edits: {},
      commits: [],
      renames: {},
      tmpFs: {},
      commitMsg: "",
      setCommitMsg: (commitMsg) => set({ commitMsg }),
      saveEdit: (path, content) =>
        set((s) => ({
          edits: { ...s.edits, [path]: content },
        })),
      drafts: {},
      setDraft: (path, content) =>
        set((s) => ({ drafts: { ...s.drafts, [path]: content } })),
      // Ctrl+S: promote the buffer into the saved-edits layer; buffer clears.
      saveDraft: (path) =>
        set((s) => {
          const content = s.drafts[path];
          const drafts = { ...s.drafts };
          delete drafts[path];
          if (content === undefined) return { drafts };
          return { edits: { ...s.edits, [path]: content }, drafts };
        }),
      discardDraft: (path) =>
        set((s) => {
          const drafts = { ...s.drafts };
          delete drafts[path];
          return { drafts };
        }),
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
      // Mount seed: pwsh first, bash active (DOC/10 §1), history replayed from
      // the flat vscode-term-hist array. StrictMode-safe: only seeds once.
      initTerminal: () =>
        set((s) => {
          if (s.sessions.length) return {};
          const hist = readTermHistory();
          const pwsh: TerminalSession = {
            id: "term-pwsh",
            hist: [],
            cwd: "~",
            shell: "pwsh",
          };
          const bash: TerminalSession = {
            id: "term-bash",
            hist,
            cwd: "~",
            shell: "bash",
          };
          return { sessions: [pwsh, bash], activeSessionId: bash.id };
        }),
      setActiveSession: (activeSessionId) => set({ activeSessionId }),
      spawnSession: (shell = "bash") =>
        set((s) => {
          const id = `term-${Date.now()}-${s.sessions.length}`;
          return {
            sessions: [
              ...s.sessions,
              { id, hist: readTermHistory(), cwd: "~", shell },
            ],
            activeSessionId: id,
            panelOpen: true,
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
            // Killing the last shell closes the panel (DOC/10 §1).
            ...(sessions.length === 0 ? { panelOpen: false } : {}),
          };
        }),
      pushHist: (id, line) => {
        const session = useStore.getState().sessions.find((x) => x.id === id);
        if (!session) return;
        const hist = [...session.hist, line].slice(-100);
        writeTermHistory(hist);
        set((s) => ({
          sessions: s.sessions.map((x) => (x.id === id ? { ...x, hist } : x)),
        }));
      },
      setCwd: (id, cwd) =>
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.id === id ? { ...x, cwd } : x,
          ),
        })),

      panelOpen: false,
      panelHeight: 280,
      panelPreview: null,
      panelMaximized: false,
      togglePanel: () =>
        set((s) => {
          if (s.panelOpen) return { panelOpen: false };
          // Reopen after the last shell was trashed: bash comes back.
          if (s.sessions.length) return { panelOpen: true };
          const id = `term-${Date.now()}`;
          return {
            panelOpen: true,
            sessions: [
              { id, hist: readTermHistory(), cwd: "~", shell: "bash" },
            ],
            activeSessionId: id,
          };
        }),
      closePanel: () => set({ panelOpen: false }),
      setPanelHeight: (panelHeight) => set({ panelHeight }),
      setPanelPreview: (panelPreview) => set({ panelPreview }),
      togglePanelMaximized: () =>
        set((s) => ({
          panelMaximized: !s.panelMaximized,
          panelPreview: null,
        })),
      termClearNonce: 0,
      clearTerminal: () =>
        set((s) => ({ termClearNonce: s.termClearNonce + 1 })),

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
        sidebarWidth: s.sidebarWidth,
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

// Changes = unsaved buffer (drafts) or locally-saved edits — drives the tab
// dot and the Explorer decorations (DOC/05 §5/§6).
export const hasChanges = (
  path: string,
  edits: Record<string, string>,
  drafts: Record<string, string>,
): boolean => edits[path] !== undefined || drafts[path] !== undefined;

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
