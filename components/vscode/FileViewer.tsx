"use client";

// FileViewer — editor viewport for code tabs (DOC/05 §6, skill shiki-readonly).
// Seamless single surface (no read/edit modes): the Shiki-highlighted layer
// (fine-grained core bundle + JS regex engine — no wasm/bundler config; theme
// dark-plus) with a sticky 48px number gutter sits below a transparent-text
// textarea that owns all input — colors stay while typing and the native
// caret lands exactly where you click. The active line (caret line) gets
// --color-vscode-line-highlight and its gutter number brightens. Keystrokes
// land in the store as an unsaved buffer (drafts[path] — the tab dot shows
// live); Ctrl+S promotes the buffer into the saved-edits layer (M badge).
// Zero server calls (09 §8). Content: drafts[path] ?? edits[path] ??
// tmpFs[path] ?? blob cache — the cache arrives with /api/repo/blob (dim
// placeholder until then).
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { useStore } from "@/lib/store";

type Highlighter = Awaited<ReturnType<typeof createHighlighterCore>>;

const LANG_BY_EXT: Record<string, string> = {
  ts: "ts",
  tsx: "tsx",
  js: "js",
  jsx: "jsx",
  mjs: "js",
  cjs: "js",
  json: "json",
  md: "md",
  css: "css",
  scss: "scss",
  html: "html",
  yml: "yml",
  yaml: "yml",
  py: "py",
  sh: "sh",
  bash: "sh",
  zsh: "sh",
  sql: "sql",
  env: "dotenv",
};

function langFor(path: string): string {
  const name = path.split("/").pop() ?? "";
  if (name.startsWith(".env")) return "dotenv";
  const dot = name.lastIndexOf(".");
  if (dot < 1) return "text";
  return LANG_BY_EXT[name.slice(dot + 1).toLowerCase()] ?? "text";
}

// One highlighter for the tab lifetime; grammars/themes are static imports so
// the bundler ships exactly this set (the full `shiki` entry would ship all).
let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighterCore({
    themes: [darkPlus],
    langs: [ts, tsx, js, jsx, json, md, css, scss, html, yaml, py, sh, sql, dotenv],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });
  return highlighterPromise;
}

export default function FileViewer() {
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const edits = useStore((s) => s.edits);
  const tmpFs = useStore((s) => s.tmpFs);
  const drafts = useStore((s) => s.drafts);
  const setDraft = useStore((s) => s.setDraft);
  const saveDraft = useStore((s) => s.saveDraft);

  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
  const [caretLine, setCaretLine] = useState(0);
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

  // Switching tabs resets the active-line highlight.
  useEffect(() => {
    setCaretLine(0);
  }, [path]);

  // Unsaved buffer first (it persists until Ctrl+S), then the saved-edits
  // layer, then tmp scratch, then the repo blob cache — the cache is always
  // undefined until /api/repo/blob lands (placeholder shows instead).
  const cached: string | undefined = undefined;
  const content =
    path === null
      ? undefined
      : (drafts[path] ??
        edits[path] ??
        (path.startsWith("tmp/") ? tmpFs[path] : cached));

  const tokens = useMemo(() => {
    if (!highlighter || path === null || content === undefined) return null;
    return highlighter.codeToTokens(content, {
      lang: langFor(path),
      theme: "dark-plus",
    });
  }, [highlighter, path, content]);

  const plainLines =
    tokens === null && content !== undefined ? content.split("\n") : null;

  // Caret line for the active-line highlight — synced on caret moves.
  const syncCaretLine = () => {
    const el = textareaRef.current;
    if (!el) return;
    let line = 0;
    for (let i = 0; i < el.selectionStart; i++) {
      if (el.value[i] === "\n") line++;
    }
    setCaretLine(line);
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
  }, [content]);

  if (path === null) return null;

  const lineRow = (key: number, body: ReactNode) => {
    const activeLine = key === caretLine;
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

  return (
    <div className="flex min-h-0 flex-1">
      <div
        ref={scrollRef}
        className="min-h-0 min-w-0 flex-1 overflow-auto font-code selection:bg-vscode-selection"
      >
        {content === undefined ? (
          <p className="px-12 py-6 text-xs text-vscode-dim">
            Repo content arrives with the blob API (backend milestone).
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
                        <span key={j} style={getTokenStyleObject(t)}>
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
                syncCaretLine();
              }}
              onSelect={syncCaretLine}
              onClick={syncCaretLine}
              className="col-start-1 row-start-1 w-full resize-none overflow-hidden bg-transparent py-0 pl-12 pr-4 text-transparent caret-vscode-accent selection:bg-vscode-selection focus:outline-none"
            />
          </div>
        )}
      </div>
      <div
        aria-hidden
        className="pointer-events-none w-20 shrink-0 bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent"
      />
    </div>
  );
}
