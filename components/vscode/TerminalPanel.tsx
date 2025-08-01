"use client";

// TerminalPanel — bottom Panel card hosting xterm (DOC/10 §1-3).
// Source-true chrome: 35px panel title (11px uppercase TERMINAL tab + 1px
// accent underline), 22px terminal tab strip (1px accent left border on the
// active tab), toolbar hover #5a5d5e50, #181818 surface. One xterm instance
// per session keeps scrollback across tab switches and panel hides.
// Input is a line editor on top of xterm (no pty): the pure parser returns
// output + effects; this component applies them to the zustand store and
// performs the single async effect (curl via /api/proxy).
import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef, useState } from "react";
import type { Terminal as XTerm } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import Codicon from "./Codicon";
import Menu, { type MenuItem } from "./Menu";
import Sash from "./Sash";
import Tooltip from "./Tooltip";
import {
  normalizeBrowserUrl,
  useStore,
  type TerminalSession,
} from "@/lib/store";
import {
  SGR,
  complete,
  parse,
  renderPrompt,
  type Effect,
  type TerminalCtx,
} from "@/lib/terminal/parser";

type XtermLibs = {
  Terminal: typeof import("@xterm/xterm").Terminal;
  FitAddon: typeof import("@xterm/addon-fit").FitAddon;
};

type Handle = {
  term: XTerm;
  fit: FitAddon;
  host: HTMLDivElement;
  sessionId: string;
};

type LineState = {
  line: string;
  cursor: number;
  histIndex: number;
  draft: string;
  busy: boolean;
};

// Dark Modern terminal palette — terminalColorRegistry.ts (DOC/10 §1).
const TERM_THEME = {
  background: "#181818",
  foreground: "#CCCCCC",
  cursor: "#CCCCCC",
  cursorAccent: "#181818",
  selectionBackground: "#264F78",
  black: "#000000",
  red: "#cd3131",
  green: "#0DBC79",
  yellow: "#e5e510",
  blue: "#2472c8",
  magenta: "#bc3fbc",
  cyan: "#11a8cd",
  white: "#e5e5e5",
  brightBlack: "#666666",
  brightRed: "#f14c4c",
  brightGreen: "#23d18b",
  brightYellow: "#f5f543",
  brightBlue: "#3b8eea",
  brightMagenta: "#d670d6",
  brightCyan: "#29b8db",
  brightWhite: "#e5e5e5",
} as const;

const WELCOME =
  "\x1b[2mType \x1b[0m\x1b[94mhelp\x1b[0m\x1b[2m for commands.\x1b[0m";

const PROMPT_DIRTY = (cwd: string, dirty: boolean, shell: TerminalSession["shell"]) =>
  renderPrompt(cwd, dirty, shell);

function toCRLF(s: string): string {
  return s.replace(/\r?\n/g, "\r\n");
}

function termLabel(session: TerminalSession): string {
  return session.name ?? (session.shell === "pwsh" ? "pwsh" : "bash");
}

function termIcon(session: TerminalSession): string {
  return session.shell === "pwsh" ? "terminal-powershell" : "terminal-bash";
}

function capOutput(s: string): string {
  if (s.length <= 20000) return s;
  return `${s.slice(0, 20000)}\r\n\x1b[2m... output truncated at 20 KB\x1b[0m`;
}

// --- Virtual FS context -----------------------------------------------------
// Sections map to folders (the `projects` slug is the capitalised Projects
// namespace), project trees become Projects/<owner>/<repo>/..., and saved
// edits + tmp scratch overlay on top (DOC/10 §3).
function buildCtx(session: TerminalSession): TerminalCtx {
  const st = useStore.getState();
  const vfs = new Set<string>();
  const dirs = new Set<string>();
  // Canonical namespaces exist even before data loads (the terminal's `ls`
  // never looks broken on a fresh session).
  dirs.add("Projects");
  dirs.add("tmp");

  for (const sec of st.sections) {
    if (sec.slug === "tmp") continue;
    dirs.add(sec.slug === "projects" ? "Projects" : sec.slug);
  }
  for (const p of st.projects) {
    const repo = `${p.repo_owner}/${p.repo_name}`;
    const base = `Projects/${repo}`;
    dirs.add(base);
    for (const entry of st.trees[repo] ?? []) {
      if (entry.type === "blob") vfs.add(`${base}/${entry.path}`);
      else dirs.add(`${base}/${entry.path}`);
    }
  }
  for (const path of Object.keys(st.edits)) vfs.add(path);
  for (const path of Object.keys(st.tmpFs)) {
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join("/"));
  }

  return {
    cwd: session.cwd,
    shell: session.shell,
    vfs: [...vfs],
    dirs: [...dirs],
    localEdits: st.edits,
    localCommits: st.commits,
    tmpFs: st.tmpFs,
    cached: {},
    realCommits: [],
    branch: "main",
  };
}

// --- Prompt / line editor ---------------------------------------------------
function drawPrompt(h: Handle, ed: LineState): void {
  const st = useStore.getState();
  const session = st.sessions.find((s) => s.id === h.sessionId);
  if (!session) return;
  const dirty = Object.keys(st.edits).length > 0;
  h.term.write(`\r\x1b[2K${PROMPT_DIRTY(session.cwd, dirty, session.shell)}${ed.line}`);
  const back = ed.line.length - ed.cursor;
  if (back > 0) h.term.write(`\x1b[${back}D`);
}

function resetLine(ed: LineState): void {
  ed.line = "";
  ed.cursor = 0;
  ed.histIndex = -1;
  ed.draft = "";
}

function cancelLine(h: Handle, ed: LineState): void {
  if (h.term.hasSelection()) {
    const selection = h.term.getSelection();
    if (selection) void navigator.clipboard?.writeText(selection).catch(() => {});
    h.term.clearSelection();
    return;
  }
  resetLine(ed);
  h.term.write("^C\r\n");
  drawPrompt(h, ed);
}

function doComplete(h: Handle, ed: LineState): void {
  const session = useStore.getState().sessions.find((s) => s.id === h.sessionId);
  if (!session) return;
  const result = complete(ed.line, buildCtx(session), ed.cursor);
  if (result.listing) {
    h.term.write(`\r\n${toCRLF(result.listing)}\r\n`);
    ed.line = result.line;
    ed.cursor = result.cursor;
    drawPrompt(h, ed);
    return;
  }
  if (result.line !== ed.line || result.cursor !== ed.cursor) {
    ed.line = result.line;
    ed.cursor = result.cursor;
    drawPrompt(h, ed);
  }
}

function historyPrev(h: Handle, ed: LineState): void {
  const session = useStore.getState().sessions.find((s) => s.id === h.sessionId);
  if (!session || session.hist.length === 0) return;
  if (ed.histIndex === -1) {
    ed.draft = ed.line;
    ed.histIndex = session.hist.length;
  }
  if (ed.histIndex > 0) {
    ed.histIndex -= 1;
    ed.line = session.hist[ed.histIndex] ?? "";
    ed.cursor = ed.line.length;
    drawPrompt(h, ed);
  }
}

function historyNext(h: Handle, ed: LineState): void {
  const session = useStore.getState().sessions.find((s) => s.id === h.sessionId);
  if (!session || ed.histIndex === -1) return;
  if (ed.histIndex < session.hist.length - 1) {
    ed.histIndex += 1;
    ed.line = session.hist[ed.histIndex] ?? "";
  } else {
    ed.histIndex = -1;
    ed.line = ed.draft;
  }
  ed.cursor = ed.line.length;
  drawPrompt(h, ed);
}

// --- Effects ----------------------------------------------------------------
async function runCurl(term: XTerm, url: string): Promise<void> {
  term.write(`\x1b[2mGET ${url}\x1b[0m\r\n`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
    });
    if (!res.ok) {
      // Only trust the body for errors this proxy generated; an upstream 404
      // may be a whole HTML page, not a useful one-line message.
      const detail =
        res.headers.get("x-proxy-error") === "1"
          ? (await res.text()).replace(/\s+/g, " ").trim().slice(0, 200)
          : "";
      term.write(
        `\x1b[91mcurl: (HTTP ${res.status}) ${detail || "proxy unavailable"}\x1b[0m\r\n`,
      );
      return;
    }
    const raw = await res.text();
    // Text only: drop ANSI/control sequences from the remote body.
    const text = raw
      .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "")
      .replace(/\x1b/g, "")
      .replace(/\r\n?/g, "\n");
    if (!text) {
      term.write("\x1b[2mcurl: (empty response)\x1b[0m\r\n");
      return;
    }
    const capped =
      res.headers.get("x-proxy-truncated") === "1" || text.length > 20000;
    term.write(toCRLF(text.slice(0, 20000)) + "\r\n");
    if (capped) term.write("\x1b[2m... truncated at 20 KB\x1b[0m\r\n");
  } catch (e) {
    const aborted = e instanceof DOMException && e.name === "AbortError";
    term.write(
      `\x1b[91mcurl: ${aborted ? "timed out after 8s" : "proxy unavailable"}\x1b[0m\r\n`,
    );
  } finally {
    clearTimeout(timer);
  }
}

// The browser instance a terminal effect should hit: the active browser tab,
// else the first one (null = no browser tab open yet).
function browserTargetId(): string | null {
  const st = useStore.getState();
  const active = st.tabs.find((t) => t.id === st.activeTabId);
  if (active?.kind === "browser") return active.id;
  return st.tabs.find((t) => t.kind === "browser")?.id ?? null;
}

async function applyEffects(effects: Effect[], term: XTerm): Promise<void> {
  const st = useStore.getState();
  for (const fx of effects) {
    switch (fx.kind) {
      case "OPEN_TAB": {
        // Markdown opens as a normal source tab; the side preview is a bound
        // split (DOC/10 §5), not a tab kind, so it never duplicates tabs.
        st.openTab({ kind: "code", path: fx.path, sha: null });
        break;
      }
      case "WRITE_EDIT":
        st.saveEdit(fx.path, fx.content);
        break;
      case "WRITE_TMP":
        st.writeTmp(fx.path, fx.content);
        break;
      case "DELETE":
        st.deleteTmp(fx.path);
        break;
      case "COMMIT":
        st.commitLocal(fx.msg);
        break;
      case "DISCARD":
        st.discardEdit(fx.path);
        break;
      case "SET_THEME":
        st.setMode(fx.mode);
        if (fx.mode === "light") {
          term.write(
            "\x1b[2m(light palette lands with Appearance — staying Dark Modern for now)\x1b[0m\r\n",
          );
        }
        break;
      case "CLEAR":
        term.clear();
        break;
      case "PREVIEW": {
        // `open --preview <url>` (DOC/10 §4): retarget the browser tab when
        // one is open (the dev-preview workflow), else open a new instance.
        const url = normalizeBrowserUrl(fx.url);
        if (!url) {
          term.write(
            "\x1b[91mopen: not a URL — try 'open --preview <url>'\x1b[0m\r\n",
          );
          break;
        }
        const target = browserTargetId();
        if (target) st.navigateBrowser(target, url);
        else st.openBrowser(url);
        break;
      }
      case "RELOAD_PREVIEW": {
        const target = browserTargetId();
        if (target) st.reloadBrowser(target);
        else term.write("\x1b[2m(no browser tab to reload)\x1b[0m\r\n");
        break;
      }
      case "CURL":
        await runCurl(term, fx.url);
        break;
    }
  }
}

async function submit(h: Handle, ed: LineState): Promise<void> {
  if (ed.busy) return;
  const line = ed.line;
  resetLine(ed);
  h.term.write("\r\n");

  if (!line.trim()) {
    drawPrompt(h, ed);
    return;
  }

  const st = useStore.getState();
  st.pushHist(h.sessionId, line);
  const session = useStore.getState().sessions.find((s) => s.id === h.sessionId);
  if (!session) return;

  const result = parse(line, buildCtx(session));
  if (result.output) {
    h.term.write(toCRLF(capOutput(result.output)) + "\r\n");
  }
  if (result.cwd) st.setCwd(h.sessionId, result.cwd);

  ed.busy = true;
  try {
    await applyEffects(result.effects, h.term);
  } finally {
    ed.busy = false;
    drawPrompt(h, ed);
    h.term.scrollToBottom();
  }
}

function handleData(h: Handle, ed: LineState, data: string): void {
  if (ed.busy) return;
  const clean = data.replace(/\x1b\[20[01]~/g, "");
  let i = 0;

  while (i < clean.length) {
    const ch = clean[i];

    if (ch === "\x1b") {
      const rest = clean.slice(i);
      if (rest.startsWith("\x1b[A")) {
        historyPrev(h, ed);
        i += 3;
      } else if (rest.startsWith("\x1b[B")) {
        historyNext(h, ed);
        i += 3;
      } else if (rest.startsWith("\x1b[C")) {
        if (ed.cursor < ed.line.length) ed.cursor += 1;
        drawPrompt(h, ed);
        i += 3;
      } else if (rest.startsWith("\x1b[D")) {
        if (ed.cursor > 0) ed.cursor -= 1;
        drawPrompt(h, ed);
        i += 3;
      } else if (
        rest.startsWith("\x1b[H") ||
        rest.startsWith("\x1bOH") ||
        rest.startsWith("\x1b[1~") ||
        rest.startsWith("\x1b[7~")
      ) {
        ed.cursor = 0;
        drawPrompt(h, ed);
        i += rest.startsWith("\x1b[1~") || rest.startsWith("\x1b[7~") ? 4 : 3;
      } else if (
        rest.startsWith("\x1b[F") ||
        rest.startsWith("\x1bOF") ||
        rest.startsWith("\x1b[4~") ||
        rest.startsWith("\x1b[8~")
      ) {
        ed.cursor = ed.line.length;
        drawPrompt(h, ed);
        i += rest.startsWith("\x1b[4~") || rest.startsWith("\x1b[8~") ? 4 : 3;
      } else if (rest.startsWith("\x1b[3~")) {
        if (ed.cursor < ed.line.length) {
          ed.line = ed.line.slice(0, ed.cursor) + ed.line.slice(ed.cursor + 1);
          drawPrompt(h, ed);
        }
        i += 4;
      } else {
        const seq = rest.match(/^\x1b\[[0-9;]*[A-Za-z~]/);
        i += seq ? seq[0].length : 1;
      }
      continue;
    }

    if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && clean[i + 1] === "\n") i += 1;
      void submit(h, ed);
      i += 1;
      continue;
    }

    if (ch === "\x7f" || ch === "\b") {
      if (ed.cursor > 0) {
        ed.line =
          ed.line.slice(0, ed.cursor - 1) + ed.line.slice(ed.cursor);
        ed.cursor -= 1;
        drawPrompt(h, ed);
      }
      i += 1;
      continue;
    }

    if (ch === "\t") {
      doComplete(h, ed);
      i += 1;
      continue;
    }

    if (ch === "\x03") {
      cancelLine(h, ed);
      i += 1;
      continue;
    }

    if (ch === "\x0c" || ch === "\x0b") {
      h.term.clear();
      resetLine(ed);
      drawPrompt(h, ed);
      i += 1;
      continue;
    }

    if (ch === "\x01") {
      ed.cursor = 0;
      drawPrompt(h, ed);
      i += 1;
      continue;
    }

    if (ch === "\x05") {
      ed.cursor = ed.line.length;
      drawPrompt(h, ed);
      i += 1;
      continue;
    }

    if (ch === "\x15") {
      ed.line = ed.line.slice(ed.cursor);
      ed.cursor = 0;
      drawPrompt(h, ed);
      i += 1;
      continue;
    }

    if (ch === "\x17") {
      const left = ed.line.slice(0, ed.cursor).replace(/\S+\s*$/, "");
      ed.line = left + ed.line.slice(ed.cursor);
      ed.cursor = left.length;
      drawPrompt(h, ed);
      i += 1;
      continue;
    }

    if (ch === "\x04") {
      if (!ed.line) useStore.getState().killSession(h.sessionId);
      i += 1;
      continue;
    }

    if (ch === "\x1b" || ch.charCodeAt(0) < 32) {
      i += 1;
      continue;
    }

    // Printable run: insert once, then redraw (cleaner for paste + IME).
    let end = i;
    while (end < clean.length) {
      const code = clean.charCodeAt(end);
      if (code < 32 || code === 127) break;
      end += 1;
    }
    ed.line = ed.line.slice(0, ed.cursor) + clean.slice(i, end) + ed.line.slice(ed.cursor);
    ed.cursor += end - i;
    drawPrompt(h, ed);
    i = end;
  }
}

// --- Chrome helpers ---------------------------------------------------------
function PanelAction({
  icon,
  label,
  onClick,
  compact = false,
  align = "center",
  disabled = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  compact?: boolean;
  align?: "center" | "start" | "end";
  disabled?: boolean;
}) {
  return (
    <Tooltip text={label} position="top" align={align}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`flex items-center justify-center text-vscode-muted transition-colors hover:bg-vscode-toolbar-hover hover:text-vscode-fg disabled:pointer-events-none disabled:opacity-40 ${
          compact
            ? "h-[22px] w-[22px] rounded-control"
            : "h-7 w-7 rounded-none"
        }`}
      >
        <Codicon name={icon} size={16} />
      </button>
    </Tooltip>
  );
}

export default function TerminalPanel() {
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const splitSessionId = useStore((s) => s.splitSessionId);
  const focusedPane = useStore((s) => s.focusedPane);
  const splitRatio = useStore((s) => s.splitRatio);
  const panelOpen = useStore((s) => s.panelOpen);
  const panelMaximized = useStore((s) => s.panelMaximized);
  const setActiveSession = useStore((s) => s.setActiveSession);
  const setFocusedPane = useStore((s) => s.setFocusedPane);
  const spawnSession = useStore((s) => s.spawnSession);
  const splitTerminal = useStore((s) => s.splitTerminal);
  const unsplitTerminal = useStore((s) => s.unsplitTerminal);
  const renameSession = useStore((s) => s.renameSession);
  const setSplitRatio = useStore((s) => s.setSplitRatio);
  const killSession = useStore((s) => s.killSession);
  const closePanel = useStore((s) => s.closePanel);
  const togglePanelMaximized = useStore((s) => s.togglePanelMaximized);
  const clearTerminal = useStore((s) => s.clearTerminal);
  const initTerminal = useStore((s) => s.initTerminal);
  const clearNonce = useStore((s) => s.termClearNonce);

  const leftHostRef = useRef<HTMLDivElement>(null);
  const rightHostRef = useRef<HTMLDivElement>(null);
  const panesRef = useRef<HTMLDivElement>(null);
  const libsRef = useRef<XtermLibs | null>(null);
  const handles = useRef(new Map<string, Handle>());
  const editors = useRef(new Map<string, LineState>());
  const lastClear = useRef(0);
  const renameCancelled = useRef(false);
  const [ready, setReady] = useState(false);
  const [menu, setMenu] = useState<{
    kind: "profile" | "overflow";
    x: number;
    y: number;
  } | null>(null);
  const [context, setContext] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [previewLeft, setPreviewLeft] = useState<number | null>(null);
  const [panesWidth, setPanesWidth] = useState(0);

  // Seed pwsh + bash once (history replays from vscode-term-hist).
  useEffect(() => {
    initTerminal();
  }, [initTerminal]);

  // xterm is client-only: dynamic import keeps SSR clean (Next 16 docs).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [xterm, fit] = await Promise.all([
          import("@xterm/xterm"),
          import("@xterm/addon-fit"),
        ]);
        if (!alive) return;
        libsRef.current = { Terminal: xterm.Terminal, FitAddon: fit.FitAddon };
        setReady(true);
      } catch (err) {
        console.error("xterm failed to load", err);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const sessionKey = sessions.map((s) => `${s.id}:${s.shell}`).join("|");

  // Create/dispose one xterm per session; move its layer into the pane that
  // currently shows it. Panes share the tab pool, so a session can move
  // between left/right without losing scrollback.
  useEffect(() => {
    const libs = libsRef.current;
    const left = leftHostRef.current;
    if (!ready || !libs || !left) return;
    const right = splitSessionId ? rightHostRef.current : null;

    const live = new Set(useStore.getState().sessions.map((s) => s.id));
    for (const [id, h] of handles.current) {
      if (!live.has(id)) {
        h.term.dispose();
        h.host.remove();
        handles.current.delete(id);
        editors.current.delete(id);
      }
    }

    for (const session of useStore.getState().sessions) {
      if (handles.current.has(session.id)) continue;
      const el = document.createElement("div");
      el.className = "absolute inset-0 overflow-hidden";
      el.style.display = "none";
      left.appendChild(el);

      const term = new libs.Terminal({
        theme: TERM_THEME,
        fontFamily: '"Fira Code", "Cascadia Code", Consolas, "Courier New", monospace',
        fontSize: 13,
        lineHeight: 1,
        cursorBlink: true,
        cursorStyle: "block",
        scrollback: 1000,
        allowProposedApi: false,
        convertEol: false,
      });
      const fit = new libs.FitAddon();
      term.loadAddon(fit);
      term.open(el);

      const ed: LineState = {
        line: "",
        cursor: 0,
        histIndex: -1,
        draft: "",
        busy: false,
      };
      const h: Handle = { term, fit, host: el, sessionId: session.id };
      editors.current.set(session.id, ed);
      handles.current.set(session.id, h);

      term.attachCustomKeyEventHandler((e) => {
        if (e.type !== "keydown") return true;
        // Workbench chords stay with the window handler: xterm would otherwise
        // consume Ctrl+J as LF / Ctrl+B as ^B and swallow the toggle. The
        // split/new-terminal chords are panel commands, not shell input.
        if (e.ctrlKey && !e.altKey) {
          if (
            !e.shiftKey &&
            (e.code === "KeyJ" || e.code === "KeyB" || e.code === "Backquote")
          ) {
            return false;
          }
          if (e.shiftKey && (e.code === "Backquote" || e.code === "Digit5")) {
            return false;
          }
        }
        if (e.ctrlKey && e.shiftKey && e.code === "KeyC") {
          if (term.hasSelection()) {
            void navigator.clipboard?.writeText(term.getSelection()).catch(() => {});
            return false;
          }
          return true;
        }
        // Ctrl+C copies a selection instead of cancelling the line (VS Code's
        // terminal copySelection binding); without a selection xterm emits \x03.
        if (
          e.ctrlKey &&
          !e.shiftKey &&
          !e.altKey &&
          e.code === "KeyC" &&
          term.hasSelection()
        ) {
          void navigator.clipboard?.writeText(term.getSelection()).catch(() => {});
          return false;
        }
        if (e.ctrlKey && e.shiftKey && e.code === "KeyV") {
          void navigator.clipboard
            ?.readText()
            .then((text) => {
              if (text) handleData(h, ed, text);
            })
            .catch(() => {});
          return false;
        }
        // Ctrl+Enter: submit explicitly (xterm otherwise flattens it to \r;
        // same commit behavior, but this keeps the intent explicit).
        if (e.ctrlKey && !e.shiftKey && !e.altKey && e.key === "Enter") {
          void submit(h, ed);
          return false;
        }
        return true;
      });

      term.onData((data) => handleData(h, ed, data));

      term.writeln(WELCOME);
      term.writeln("");
      term.write(
        PROMPT_DIRTY(
          session.cwd,
          Object.keys(useStore.getState().edits).length > 0,
          session.shell,
        ),
      );
    }

    // Attach each visible session to its pane; hide the rest (tabs keep the
    // xterm buffer alive, exactly like switching tabs did before).
    for (const [id, h] of handles.current) {
      const pane =
        id === activeSessionId
          ? left
          : splitSessionId && id === splitSessionId
            ? right
            : null;
      if (pane) {
        if (h.host.parentElement !== pane) pane.appendChild(h.host);
        h.host.style.display = "block";
      } else {
        h.host.style.display = "none";
      }
    }

    const visible = [
      ...new Set(
        [activeSessionId, splitSessionId].filter(
          (id): id is string => id !== null,
        ),
      ),
    ];
    const focusId =
      focusedPane === "right" && splitSessionId
        ? splitSessionId
        : activeSessionId;
    const raf = requestAnimationFrame(() => {
      for (const id of visible) {
        const h = handles.current.get(id);
        if (!h || !h.host.isConnected) continue;
        if (h.host.clientWidth < 10 || h.host.clientHeight < 10) continue;
        try {
          h.fit.fit();
        } catch {
          // zero-size while hidden — ResizeObserver refits on open
        }
      }
      if (panelOpen && focusId) handles.current.get(focusId)?.term.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [
    ready,
    sessionKey,
    activeSessionId,
    splitSessionId,
    focusedPane,
    panelOpen,
  ]);

  // Refit both panes on panel/split/sash/viewport resize. Observing the pane
  // hosts (not just the panel) keeps the split live while the sash moves.
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    const refit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const st = useStore.getState();
        const ids = new Set(
          [st.activeSessionId, st.splitSessionId].filter(
            (id): id is string => id !== null,
          ),
        );
        for (const id of ids) {
          const h = handles.current.get(id);
          if (!h || !h.host.isConnected) continue;
          if (h.host.clientWidth < 10 || h.host.clientHeight < 10) continue;
          try {
            h.fit.fit();
          } catch {
            // ignore transient zero-size layouts
          }
        }
      });
    };
    const ro = new ResizeObserver(refit);
    if (leftHostRef.current) ro.observe(leftHostRef.current);
    if (rightHostRef.current) ro.observe(rightHostRef.current);
    window.addEventListener("resize", refit);
    // Fira Code may settle after first paint; refit once fonts are ready.
    void document.fonts?.ready.then(refit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", refit);
      cancelAnimationFrame(raf);
    };
  }, [ready, splitSessionId, panelOpen]);

  // Split geometry (left fraction persisted for the session). The sash needs
  // pixel widths; while unsplit there is no second pane to measure.
  useEffect(() => {
    if (!splitSessionId) {
      setPanesWidth(0);
      setPreviewLeft(null);
      return;
    }
    const el = panesRef.current;
    if (!el) return;
    const measure = () => setPanesWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [splitSessionId, panelOpen]);

  // Menus close on an outside press or Esc.
  useEffect(() => {
    if (!menu && !context) return;
    const dismiss = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-term-menu]")) return;
      setMenu(null);
      setContext(null);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(null);
      setContext(null);
    };
    window.addEventListener("mousedown", dismiss);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", dismiss);
      window.removeEventListener("keydown", esc);
    };
  }, [menu, context]);

  // Terminal: Clear (menu command) → clear the focused pane's session.
  useEffect(() => {
    if (clearNonce === lastClear.current) return;
    lastClear.current = clearNonce;
    const st = useStore.getState();
    const id =
      st.focusedPane === "right" && st.splitSessionId
        ? st.splitSessionId
        : st.activeSessionId;
    const h = id ? handles.current.get(id) : null;
    const ed = id ? editors.current.get(id) : null;
    if (!h || !ed) return;
    h.term.clear();
    resetLine(ed);
    drawPrompt(h, ed);
  }, [clearNonce]);

  // Dispose every xterm on unmount.
  useEffect(
    () => () => {
      for (const h of handles.current.values()) h.term.dispose();
      handles.current.clear();
      editors.current.clear();
    },
    [],
  );

  const active = sessions.find((s) => s.id === activeSessionId);
  const focusedSessionId =
    focusedPane === "right" && splitSessionId
      ? splitSessionId
      : activeSessionId;
  const focusedSession = sessions.find((s) => s.id === focusedSessionId);
  const leftWidth =
    previewLeft ?? (panesWidth ? Math.round(panesWidth * splitRatio) : null);

  const focusSession = (id: string) => {
    setActiveSession(id);
    requestAnimationFrame(() => handles.current.get(id)?.term.focus());
  };

  const beginRename = (session: TerminalSession) => {
    renameCancelled.current = false;
    setRenamingId(session.id);
    setRenameValue(session.name ?? termLabel(session));
    setMenu(null);
    setContext(null);
  };

  const finishRename = (id: string, save: boolean, refocus = false) => {
    renameCancelled.current = true;
    if (save) renameSession(id, renameValue);
    setRenamingId(null);
    if (!refocus) return;
    requestAnimationFrame(() => {
      const st = useStore.getState();
      if (id === st.activeSessionId || id === st.splitSessionId) {
        handles.current.get(id)?.term.focus();
      }
    });
  };

  const profileItems: MenuItem[] = [
    { id: "bash", label: "bash", icon: "terminal-bash" },
    { id: "pwsh", label: "PowerShell", icon: "terminal-powershell" },
    { separator: true },
    {
      id: "split",
      label: "Split Terminal",
      icon: "split-horizontal",
      disabled: !!splitSessionId,
    },
  ];

  const overflowItems: MenuItem[] = [
    { id: "new", label: "New Terminal", icon: "add" },
    {
      id: "split",
      label: "Split Terminal",
      icon: "split-horizontal",
      disabled: !!splitSessionId,
    },
    {
      id: "unsplit",
      label: "Unsplit Terminal",
      icon: "collapse-all",
      disabled: !splitSessionId,
    },
    { separator: true },
    {
      id: "rename",
      label: "Rename…",
      icon: "edit",
      disabled: !focusedSession,
    },
    { id: "clear", label: "Clear", icon: "clear-all", disabled: !focusedSession },
    {
      id: "kill",
      label: "Kill Terminal",
      icon: "trash",
      disabled: !focusedSession,
    },
  ];

  const contextItems: MenuItem[] = [
    { id: "rename", label: "Rename…", icon: "edit" },
    {
      id: "split",
      label: "Split Terminal",
      icon: "split-horizontal",
      disabled: !!splitSessionId,
    },
    { separator: true },
    { id: "kill", label: "Kill Terminal", icon: "trash" },
  ];

  const onProfileAction = (id: string) => {
    setMenu(null);
    if (id === "bash" || id === "pwsh") spawnSession(id);
    else if (id === "split") splitTerminal("bash");
  };

  const onOverflowAction = (id: string) => {
    setMenu(null);
    if (id === "new") spawnSession("bash");
    else if (id === "split") splitTerminal("bash");
    else if (id === "unsplit") unsplitTerminal();
    else if (id === "rename" && focusedSession) beginRename(focusedSession);
    else if (id === "clear") clearTerminal();
    else if (id === "kill" && focusedSessionId) killSession(focusedSessionId);
  };

  const onContextAction = (id: string) => {
    const target = context
      ? sessions.find((session) => session.id === context.id)
      : null;
    setContext(null);
    if (!target) return;
    if (id === "rename") beginRename(target);
    else if (id === "split") splitTerminal("bash");
    else if (id === "kill") killSession(target.id);
  };

  return (
    <section
      aria-label="Terminal"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-section border border-vscode-border bg-vscode-panel-bg"
    >
      {/* Panel title — 35px, composite tab + title actions */}
      <div className="flex h-[35px] shrink-0 items-center justify-between border-b border-vscode-panel-tab-border pl-1 pr-1">
        <div
          role="tablist"
          aria-label="Panel views"
          className="flex h-full items-stretch"
        >
          <button
            type="button"
            role="tab"
            aria-selected="true"
            className="relative flex items-center gap-2 px-3 text-[11px] uppercase tracking-[0.01em] text-vscode-panel-tab-active"
          >
            <Codicon name="terminal" size={16} />
            <span>Terminal</span>
            <span className="absolute inset-x-[2px] bottom-0 h-px bg-vscode-accent" />
          </button>
        </div>
        <div className="flex items-center gap-[2px]">
          <PanelAction
            icon={panelMaximized ? "chevron-down" : "chevron-up"}
            label={panelMaximized ? "Restore Panel Size" : "Maximize Panel Size"}
            onClick={togglePanelMaximized}
            align="end"
          />
          <PanelAction
            icon="close"
            label="Close Panel"
            onClick={closePanel}
            align="end"
          />
        </div>
      </div>

      {/* Terminal instance tabs — 22px; the same tab pool feeds both panes */}
      <div
        role="tablist"
        aria-label="Terminal sessions"
        className="flex h-[22px] shrink-0 items-stretch border-b border-vscode-panel-tab-border bg-vscode-panel-bg"
      >
        <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
          {sessions.map((session) => {
            const shownLeft = session.id === activeSessionId;
            const shownRight = !!splitSessionId && session.id === splitSessionId;
            const isActive = shownLeft || shownRight;
            const label = termLabel(session);
            return (
              <div
                key={session.id}
                role="tab"
                tabIndex={0}
                aria-selected={isActive}
                onClick={() => focusSession(session.id)}
                onDoubleClick={() => beginRename(session)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu(null);
                  setContext({
                    id: session.id,
                    x: e.clientX,
                    y: e.clientY,
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    focusSession(session.id);
                  }
                }}
                title={`${label}${shownRight ? " — split pane" : ""}`}
                className={`relative flex h-full max-w-[180px] min-w-[88px] cursor-default items-center gap-[6px] border-r border-vscode-panel-tab-border px-[10px] text-[12px] transition-colors hover:bg-vscode-toolbar-hover ${
                  isActive
                    ? "text-vscode-panel-tab-active"
                    : "text-vscode-panel-tab-inactive"
                }`}
              >
                {renamingId === session.id ? (
                  <input
                    autoFocus
                    aria-label="Terminal name"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.currentTarget.select()}
                    onBlur={() => {
                      if (renameCancelled.current) {
                        renameCancelled.current = false;
                        setRenamingId(null);
                        return;
                      }
                      finishRename(session.id, true);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") {
                        e.preventDefault();
                        finishRename(session.id, true, true);
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        finishRename(session.id, false, true);
                      }
                    }}
                    className="h-[18px] w-full min-w-0 rounded-[2px] border border-vscode-accent bg-vscode-input-bg px-1 text-[12px] text-vscode-fg outline-none"
                  />
                ) : (
                  <>
                    {isActive ? (
                      <span className="absolute inset-y-0 left-0 w-px bg-vscode-terminal-tab-border" />
                    ) : null}
                    <Codicon
                      name={termIcon(session)}
                      size={14}
                      className="shrink-0"
                    />
                    <span className="truncate">{label}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div
          data-term-menu
          className="relative flex shrink-0 items-center gap-[1px] pr-1"
        >
          <PanelAction
            icon="add"
            label="New Terminal"
            onClick={() => {
              setMenu(null);
              spawnSession("bash");
            }}
            compact
            align="end"
          />
          <Tooltip text="Select Default Profile" position="top" align="end">
            <button
              type="button"
              aria-label="Select Default Profile"
              onClick={(e) => {
                if (menu?.kind === "profile") {
                  setMenu(null);
                  return;
                }
                const r = e.currentTarget.getBoundingClientRect();
                setMenu({ kind: "profile", x: r.right, y: r.bottom });
              }}
              className="-ml-[3px] flex h-[22px] w-[14px] items-center justify-center text-vscode-muted transition-colors hover:bg-vscode-toolbar-hover hover:text-vscode-fg"
            >
              <Codicon name="chevron-down" size={12} />
            </button>
          </Tooltip>
          <PanelAction
            icon="split-horizontal"
            label="Split Terminal"
            onClick={() => {
              setMenu(null);
              splitTerminal("bash");
            }}
            compact
            align="end"
            disabled={!!splitSessionId}
          />
          <PanelAction
            icon="trash"
            label="Kill Terminal"
            onClick={() => {
              setMenu(null);
              if (focusedSessionId) killSession(focusedSessionId);
            }}
            compact
            align="end"
            disabled={!focusedSessionId}
          />
          <Tooltip text="More Actions..." position="top" align="end">
            <button
              type="button"
              aria-label="More Actions..."
              onClick={(e) => {
                if (menu?.kind === "overflow") {
                  setMenu(null);
                  return;
                }
                const r = e.currentTarget.getBoundingClientRect();
                setMenu({ kind: "overflow", x: r.right, y: r.bottom });
              }}
              className="flex h-[22px] w-[22px] items-center justify-center rounded-control text-vscode-muted transition-colors hover:bg-vscode-toolbar-hover hover:text-vscode-fg"
            >
              <Codicon name="more" size={16} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* xterm panes — one absolute session layer per shell; the sash is only
          mounted while split so single-pane widths stay pixel-identical. */}
      <div ref={panesRef} className="relative flex min-h-0 flex-1">
        <div
          ref={leftHostRef}
          className={`terminal-xterm relative min-h-0 min-w-0 overflow-hidden bg-vscode-panel-bg ${
            splitSessionId ? "shrink-0" : "flex-1"
          }`}
          style={
            splitSessionId
              ? leftWidth !== null
                ? { width: leftWidth }
                : { width: `${splitRatio * 100}%` }
              : undefined
          }
          onMouseDown={() => setFocusedPane("left")}
        />
        {splitSessionId ? (
          <>
            <div className="relative w-[5px] shrink-0 bg-vscode-panel-bg">
              <Sash
                orientation="vertical"
                label="Resize terminal split"
                value={leftWidth ?? Math.round((panesWidth || 800) * splitRatio)}
                min={120}
                max={Math.max(121, panesWidth - 125)}
                onPreview={setPreviewLeft}
                onCommit={(width) => {
                  if (panesWidth > 0) setSplitRatio(width / panesWidth);
                  setPreviewLeft(null);
                }}
                className="inset-x-0"
              />
            </div>
            <div
              ref={rightHostRef}
              className="terminal-xterm relative min-h-0 min-w-0 flex-1 overflow-hidden bg-vscode-panel-bg"
              onMouseDown={() => setFocusedPane("right")}
            />
          </>
        ) : null}
        {!ready && active ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-vscode-dim">
            Loading terminal…
          </div>
        ) : null}
      </div>

      {menu ? (
        <div
          data-term-menu
          className="fixed z-50"
          style={{
            left: Math.max(
              8,
              Math.min(
                menu.x - (menu.kind === "overflow" ? 210 : 190),
                window.innerWidth - (menu.kind === "overflow" ? 218 : 198),
              ),
            ),
            top: Math.max(
              8,
              Math.min(
                menu.y + 1,
                window.innerHeight - (menu.kind === "overflow" ? 240 : 160),
              ),
            ),
          }}
        >
          <Menu
            density="compact"
            label={
              menu.kind === "profile"
                ? "Terminal profiles"
                : "Terminal actions"
            }
            className={menu.kind === "overflow" ? "w-[210px]" : "w-[190px]"}
            items={menu.kind === "profile" ? profileItems : overflowItems}
            onAction={
              menu.kind === "profile" ? onProfileAction : onOverflowAction
            }
          />
        </div>
      ) : null}

      {context ? (
        <div
          data-term-menu
          className="fixed z-50"
          style={{
            left: Math.max(8, Math.min(context.x, window.innerWidth - 210)),
            top: Math.max(8, Math.min(context.y, window.innerHeight - 160)),
          }}
        >
          <Menu
            density="compact"
            label="Terminal tab actions"
            className="w-[190px]"
            items={contextItems}
            onAction={onContextAction}
          />
        </div>
      ) : null}
    </section>
  );
}
