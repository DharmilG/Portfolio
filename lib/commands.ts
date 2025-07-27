// lib/commands.ts — command registry for the Command Palette (DOC/05 §9),
// shared with the title-bar menus: ids match TitleBar MENU_ITEMS where both
// exist, so clicking a menu item runs the same command. Components stay dumb
// (they emit ids); effects live here + in the store.
// Flags: `keepOpen` = palette mode switch (Go to File… / Show All Commands)
// that flips the palette mode without closing it; `confirm` raises the shared
// Modal (the palette owns the dialog); `keybinding` renders as a chip and
// mirrors a binding we actually handle; disabled entries show `hint`.
import { isMarkdownPath } from "./langs";
import { useStore } from "./store";

export type Command = {
  id: string;
  label: string;
  keybinding?: string;
  hint?: string;
  disabled?: boolean;
  keepOpen?: boolean;
  confirm?: { message: string; confirmLabel: string };
  run: () => void;
};

// First free tmp name: `first`, else the numbered fallback (moved from the
// page; shared by the File menu + palette).
export function nextFreeKey(
  tmpFs: Record<string, string>,
  first: string,
  numbered: (n: number) => string,
): string {
  if (!tmpFs[first]) return first;
  let n = 2;
  while (tmpFs[numbered(n)]) n += 1;
  return numbered(n);
}

// File: New Text File — create + reveal + open an empty tmp scratch buffer.
export function newTextFile(): void {
  const st = useStore.getState();
  const path = nextFreeKey(st.tmpFs, "tmp/untitled-1", (n) => `tmp/untitled-${n}`);
  st.writeTmp(path, "");
  if (!st.expanded["tmp"]) st.toggleExpanded("tmp");
  st.openTab({ kind: "code", path, sha: null });
}

export const COMMANDS: Command[] = [
  // Meta (VS Code: workbench.action.quickOpen / workbench.action.showCommands).
  {
    id: "quick-open",
    label: "Go to File…",
    keybinding: "Ctrl+P",
    keepOpen: true,
    run: () => useStore.getState().setPaletteMode("files"),
  },
  {
    id: "palette",
    label: "Show All Commands",
    keybinding: "Ctrl+Shift+P",
    keepOpen: true,
    run: () => useStore.getState().setPaletteMode("commands"),
  },

  // File
  { id: "new-tmp-file", label: "File: New Text File", run: newTextFile },
  {
    id: "save-local",
    label: "File: Save (local)",
    keybinding: "Ctrl+S",
    run: () => {
      const st = useStore.getState();
      const tab = st.tabs.find((t) => t.id === st.activeTabId);
      if (tab && tab.kind === "code" && st.drafts[tab.path] !== undefined) {
        st.saveDraft(tab.path);
      }
    },
  },

  // Markdown (DOC/10 §5) — the source tab stays put; the preview is a bound
  // split beside it, so the same command opens or closes depending on state.
  {
    id: "markdown-preview",
    label: "Markdown: Open Preview to the Side",
    keybinding: "Ctrl+Shift+V",
    run: () => {
      const st = useStore.getState();
      const tab = st.tabs.find((t) => t.id === st.activeTabId);
      if (tab && tab.kind === "code" && isMarkdownPath(tab.path)) {
        st.toggleMdPreview(tab.path);
      }
    },
  },
  {
    id: "markdown-close-preview",
    label: "Markdown: Close Preview",
    run: () => useStore.getState().closeMdPreview(),
  },

  // View
  {
    id: "view-explorer",
    label: "View: Explorer",
    run: () => useStore.getState().showView("explorer"),
  },
  {
    id: "view-search",
    label: "View: Search",
    run: () => useStore.getState().showView("search"),
  },
  {
    id: "view-scm",
    label: "View: Source Control",
    run: () => useStore.getState().showView("scm"),
  },
  {
    id: "view-run",
    label: "View: Run",
    run: () => useStore.getState().showView("run"),
  },
  {
    id: "view-extensions",
    label: "View: Extensions",
    run: () => useStore.getState().showView("extensions"),
  },
  {
    id: "toggle-sidebar",
    label: "View: Toggle Primary Side Bar",
    keybinding: "Ctrl+B",
    run: () => useStore.getState().toggleSidebar(),
  },
  {
    id: "toggle-panel",
    label: "View: Toggle Panel",
    keybinding: "Ctrl+J",
    run: () => useStore.getState().togglePanel(),
  },
  {
    id: "toggle-terminal",
    label: "View: Toggle Terminal",
    keybinding: "Ctrl+`",
    run: () => useStore.getState().togglePanel(),
  },
  {
    id: "collapse",
    label: "View: Collapse Folders in Explorer",
    run: () => useStore.getState().collapseAll(),
  },

  // Terminal (the panel's active terminal; local parser + xterm)
  {
    id: "new-terminal",
    label: "Terminal: New Terminal",
    run: () => useStore.getState().spawnSession("bash"),
  },
  {
    id: "clear-terminal",
    label: "Terminal: Clear",
    run: () => useStore.getState().clearTerminal(),
  },

  // Edits (the local edits layer; destructive — the palette confirms first).
  {
    id: "discard-edits",
    label: "Edits: Discard All Local Edits",
    confirm: {
      message:
        "Are you sure you want to discard all local edits? This cannot be undone.",
      confirmLabel: "Discard All",
    },
    run: () => useStore.getState().discardEdit(),
  },

  // Developer
  {
    id: "reload-window",
    label: "Developer: Reload Window",
    run: () => window.location.reload(),
  },

  // Land with their features (disabled + hint, like the menus) — run no-ops.
  {
    id: "open-preview",
    label: "Open Browser Preview",
    disabled: true,
    hint: "Available when the browser preview lands",
    run: () => undefined,
  },
  {
    id: "toggle-theme",
    label: "Toggle Theme",
    disabled: true,
    hint: "Available when Appearance lands",
    run: () => undefined,
  },
];
