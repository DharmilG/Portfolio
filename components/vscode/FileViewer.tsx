"use client";

// FileViewer — editor viewport for code tabs (DOC/05 §6, skill shiki-readonly).
// Seamless single surface (no read/edit modes): the Shiki-highlighted layer
// (fine-grained core bundle + JS regex engine — no wasm/bundler config; theme
// dark-plus) with a sticky 48px number gutter sits below a transparent-text
// textarea that owns all input — colors stay while typing and the native
// caret lands exactly where you click. The active line (caret line) gets
// --color-vscode-line-highlight and its gutter number brightens; the caret
// (line+col) is pushed to the store for the StatusBar. Keystrokes land in
// the store as an unsaved buffer (drafts[path] — the tab dot shows live);
// Ctrl+S promotes the buffer into the saved-edits layer (M badge).
// Edits stay local (09 §8). Content: drafts[path] ?? edits[path] ??
// tmpFs[path] ?? repo blob loaded lazily from /api/repo/blob.
// Markdown opens in preview and toggles to this source surface in the same tab
// (Ctrl+Shift+V / the tab action); there is no split preview group.
import dynamic from "next/dynamic";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createHighlighterCore, getTokenStyleObject } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import darkPlus from "shiki/themes/dark-plus.mjs";
import ts from "shiki/langs/typescript.mjs";
import tsx from "shiki/langs/tsx.mjs";
import js from "shiki/langs/javascript.mjs";
import jsx from "shiki/langs/jsx.mjs";
import json from "shiki/langs/json.mjs";
import md from "shiki/langs/markdown.mjs";
import css from "shiki/langs/css.mjs";
import scss from "shiki/langs/scss.mjs";
import html from "shiki/langs/html.mjs";
import yaml from "shiki/langs/yaml.mjs";
import py from "shiki/langs/python.mjs";
import sh from "shiki/langs/shellscript.mjs";
import sql from "shiki/langs/sql.mjs";
import dotenv from "shiki/langs/dotenv.mjs";
import { isMarkdownPath, langFor } from "@/lib/langs";
import { useStore } from "@/lib/store";

const MarkdownPreview = dynamic(() => import("./MarkdownPreview"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center bg-vscode-editor text-xs text-vscode-dim">
      Loading preview…
    </div>
  ),
});

type Highlighter = Awaited<ReturnType<typeof createHighlighterCore>>;

// One highlighter for the tab lifetime; grammars/themes are static imports so
// the bundler ships exactly this set (the full `shiki` entry would ship all).
let highlighterPromise: Promise<Highlighter> | null = null;

// Immutable blob content keyed by GitHub SHA. Session-only, like tab buffers;
// switching tabs does not refetch a file the visitor already opened.
const repoBlobCache = new Map<string, string>();

type RepoBlob = {
  path: string;
  content?: string;
  error?: string;
};

function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighterCore({
    themes: [darkPlus],
    langs: [ts, tsx, js, jsx, json, md, css, scss, html, yaml, py, sh, sql, dotenv],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });
  return highlighterPromise;
}

// Shiki returns CSS-style keys ("font-weight", "background-color"). React's
// style prop needs the camelCase equivalents; passing the raw object throws
// at runtime for any token with bold/italic/underline/bg styling.
function tokenStyle(
  token: Parameters<typeof getTokenStyleObject>[0],
): CSSProperties {
  const styles = getTokenStyleObject(token);
  return {
    color: styles.color,
    backgroundColor: styles["background-color"],
    fontStyle: styles["font-style"] as CSSProperties["fontStyle"],
    fontWeight: styles["font-weight"] as CSSProperties["fontWeight"],
    textDecoration: styles["text-decoration"],
  };
}

export default function FileViewer() {
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const edits = useStore((s) => s.edits);
  const tmpFs = useStore((s) => s.tmpFs);
  const drafts = useStore((s) => s.drafts);
  const setDraft = useStore((s) => s.setDraft);
  const saveDraft = useStore((s) => s.saveDraft);
  const caret = useStore((s) => s.caret);
  const setCaret = useStore((s) => s.setCaret);

  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let alive = true;
    getHighlighter().then((hl) => {
      if (alive) setHighlighter(hl);
    });
    return () => {
      alive = false;
    };
  }, []);

  const tab = tabs.find((t) => t.id === activeTabId);
  const path = tab?.kind === "code" ? tab.path : null;
  const sha = tab?.kind === "code" ? tab.sha : null;
  const mdViewMode = useStore((s) =>
    path ? (s.mdViewMode[path] ?? "preview") : "preview",
  );
  const previewing =
    path !== null && isMarkdownPath(path) && mdViewMode === "preview";
  const [loaded, setLoaded] = useState<RepoBlob | null>(null);

  // Switching tabs resets the caret (active-line highlight + StatusBar Ln/Col).
  useEffect(() => {
    setCaret(0, 0);
  }, [path, setCaret]);

  // Repo files open from the Explorer with the blob SHA from /api/repo/tree.
  // Fetch lazily; tmp files never hit this route.
  useEffect(() => {
    if (!path || !path.startsWith("Projects/") || !sha) {
      setLoaded(null);
      return;
    }
    const hit = repoBlobCache.get(sha);
    if (hit !== undefined) {
      setLoaded({ path, content: hit });
      return;
    }
    const parts = path.split("/");
    if (parts.length < 4) {
      setLoaded(null);
      return;
    }
    const owner = parts[1];
    const repo = parts[2];
    const rel = parts.slice(3).join("/");
    // The blob route verifies the SHA against the cached tree of this
    // repository — it needs to know which branch the file came from.
    const state = useStore.getState();
    const repoKey = `${owner}/${repo}`;
    const branch = state.branchByRepo[repoKey] ?? state.treeBranch[repoKey];
    const query = new URLSearchParams({
      owner,
      repo,
      sha,
      path: rel,
    });
    if (branch) query.set("branch", branch);
    const controller = new AbortController();
    setLoaded(null);
    fetch(`/api/repo/blob?${query.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        const data: {
          content?: string;
          binary?: boolean;
          error?: string;
        } = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load file");
        if (data.binary) throw new Error("Binary preview is not supported");
        const content = data.content ?? "";
        repoBlobCache.set(sha, content);
        setLoaded({ path, content });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setLoaded({
          path,
          error: error instanceof Error ? error.message : "Could not load file",
        });
      });
    return () => controller.abort();
  }, [path, sha]);

  // Unsaved buffer first (it persists until Ctrl+S), then the saved-edits
  // layer, then tmp scratch, then the immutable repo blob cache.
  const loadedForPath = loaded?.path === path ? loaded : null;
  const cached = loadedForPath?.error
    ? undefined
    : loadedForPath?.content;
  const content =
    path === null
      ? undefined
      : (drafts[path] ??
        edits[path] ??
        (path.startsWith("tmp/") ? tmpFs[path] : cached));
  const dirty =
    path === null
      ? null
      : drafts[path] !== undefined
        ? "unsaved"
        : edits[path] !== undefined
          ? "saved"
          : null;

  const tokens = useMemo(() => {
    if (!highlighter || path === null || content === undefined || previewing) {
      return null;
    }
    return highlighter.codeToTokens(content, {
      lang: langFor(path),
      theme: "dark-plus",
    });
  }, [highlighter, path, content, previewing]);

  const plainLines =
    tokens === null && content !== undefined ? content.split("\n") : null;

  // Caret (line + col) for the active-line highlight and the StatusBar —
  // synced on caret moves (typing, clicks, arrows).
  const syncCaret = () => {
    const el = textareaRef.current;
    if (!el) return;
    const pos = el.selectionStart;
    let line = 0;
    let lineStart = 0;
    for (let i = 0; i < pos; i++) {
      if (el.value[i] === "\n") {
        line++;
        lineStart = i + 1;
      }
    }
    setCaret(line, pos - lineStart);
  };

  // Ctrl+S promotes the buffer into the saved-edits layer. Keystrokes aimed
  // at other fields (rename, menus) are left alone; a dialog (close
  // confirmation) owns the keyboard while it is up.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (path === null) return;
      if (document.querySelector('[role="dialog"]')) return;
      const target = e.target as HTMLElement | null;
      const foreign =
        target instanceof HTMLInputElement ||
        (target instanceof HTMLTextAreaElement && target !== textareaRef.current);
      if (foreign) return;
      const mod = e.ctrlKey && !e.shiftKey && !e.altKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (drafts[path] !== undefined) saveDraft(path);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [path, drafts, saveDraft]);

  // Auto-grow the textarea to the content height; the floor (viewport minus
  // the wrapper's py-2) keeps short files filling the editor (the outer box
  // scrolls both stacked layers together).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el || content === undefined) return;
    el.style.height = "auto";
    const floor = Math.max((scrollRef.current?.clientHeight ?? 0) - 16, 0);
    el.style.height = `${Math.max(el.scrollHeight, floor)}px`;
  }, [content, previewing]);

  if (path === null) return null;

  const lineRow = (key: number, body: ReactNode) => {
    const activeLine = key === caret.line;
    return (
      <div
        key={key}
        className={`flex ${activeLine ? "bg-vscode-line-highlight" : ""}`}
      >
        <span
          className={`sticky left-0 z-10 w-12 shrink-0 select-none pr-3 text-right ${
            activeLine
              ? "bg-vscode-line-highlight text-vscode-fg"
              : "bg-vscode-editor text-vscode-dim"
          }`}
        >
          {key + 1}
        </span>
        <span className="whitespace-pre">{body}</span>
      </div>
    );
  };

  const previewStatus = loadedForPath?.error
    ? loadedForPath.error
    : content === undefined
      ? path.startsWith("Projects/") && sha
        ? "Loading file…"
        : "File content is not available for this tab."
      : null;

  return (
    <div className="flex min-h-0 flex-1">
      {previewing ? (
        previewStatus ? (
          <div className="flex min-h-0 min-w-0 flex-1 items-start overflow-auto bg-vscode-editor">
            <p className="px-12 py-6 text-xs text-vscode-dim">
              {previewStatus}
            </p>
          </div>
        ) : (
          <MarkdownPreview
            key={path}
            path={path}
            content={content}
            dirty={dirty}
          />
        )
      ) : (
        <>
          <div
            ref={scrollRef}
            className="min-h-0 min-w-0 flex-1 overflow-auto font-code selection:bg-vscode-selection"
          >
            {loadedForPath?.error ? (
              <p className="px-12 py-6 text-xs text-vscode-dim">
                {loadedForPath.error}
              </p>
            ) : content === undefined ? (
              <p className="px-12 py-6 text-xs text-vscode-dim">
                {path.startsWith("Projects/") && sha
                  ? "Loading file…"
                  : "File content is not available for this tab."}
              </p>
            ) : (
              <div className="grid w-max min-w-full py-2 pr-4">
                {/* Painted first; the transparent textarea below-in-DOM sits on
                    top and owns pointer/keyboard input. */}
                <div
                  aria-hidden
                  className="pointer-events-none col-start-1 row-start-1 select-none"
                  style={{ color: tokens?.fg }}
                >
                  {tokens
                    ? tokens.tokens.map((line, i) =>
                        lineRow(
                          i,
                          line.map((t, j) => (
                            <span key={j} style={tokenStyle(t)}>
                              {t.content}
                            </span>
                          )),
                        ),
                      )
                    : plainLines?.map((line, i) => lineRow(i, line))}
                </div>
                <textarea
                  ref={textareaRef}
                  wrap="off"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  value={content}
                  aria-label={`Edit ${path}`}
                  onChange={(e) => {
                    setDraft(path, e.target.value);
                    syncCaret();
                  }}
                  onSelect={syncCaret}
                  onClick={syncCaret}
                  className="col-start-1 row-start-1 w-full resize-none overflow-hidden bg-transparent py-0 pl-12 pr-4 text-transparent caret-vscode-accent selection:bg-vscode-selection focus:outline-none"
                />
              </div>
            )}
          </div>
          <div
            aria-hidden
            className="pointer-events-none w-20 shrink-0 bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent"
          />
        </>
      )}
    </div>
  );
}
