"use client";

// FileViewer — editor viewport for code tabs (DOC/05 §6, skill shiki-readonly).
// Read: Shiki-highlighted lines (fine-grained core bundle + JS regex engine —
// no wasm/bundler config; theme dark-plus) with a sticky 48px number gutter,
// per-line hover highlight (--color-vscode-line-highlight, number brightens)
// and a decorative minimap column. Edit: dblclick / Ctrl+E swaps an auto-grown
// textarea in (same font metrics, wrap=off), gutter stays aligned; Ctrl+S saves
// locally (saveEdit -> dirty M in tab + Explorer), Esc returns to view.
// Zero server calls (09 §8). Content: edits[path] ?? tmpFs[path] ?? blob cache
// — the cache arrives with /api/repo/blob (dim placeholder until then).
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
  const saveEdit = useStore((s) => s.saveEdit);

  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
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

  // Switching tabs leaves edit mode (re-entering is one dblclick away).
  useEffect(() => {
    setEditing(false);
  }, [path]);

  // Local overlay wins, then tmp scratch, then the repo blob cache — the cache
  // is always undefined until /api/repo/blob lands (placeholder shows instead).
  const cached: string | undefined = undefined;
  const content =
    path === null
      ? undefined
      : (edits[path] ?? (path.startsWith("tmp/") ? tmpFs[path] : cached));

  const tokens = useMemo(() => {
    if (!highlighter || path === null || content === undefined) return null;
    return highlighter.codeToTokens(content, {
      lang: langFor(path),
      theme: "dark-plus",
    });
  }, [highlighter, path, content]);

  const plainLines =
    tokens === null && content !== undefined ? content.split("\n") : null;

  const enterEdit = () => {
    if (content === undefined) return;
    setDraft(content);
    setEditing(true);
  };

  // Ctrl+E toggles edit, Esc leaves it, Ctrl+S saves the draft locally.
  // Keystrokes aimed at other fields (rename, menus) are left alone.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (path === null) return;
      const target = e.target as HTMLElement | null;
      const foreign =
        target instanceof HTMLInputElement ||
        (target instanceof HTMLTextAreaElement && target !== textareaRef.current);
      if (foreign) return;
      const mod = e.ctrlKey && !e.shiftKey && !e.altKey;
      const key = e.key.toLowerCase();
      if (mod && key === "e") {
        e.preventDefault();
        if (editing) setEditing(false);
        else if (content !== undefined) {
          setDraft(content);
          setEditing(true);
        }
        return;
      }
      if (mod && key === "s") {
        e.preventDefault();
        if (editing) saveEdit(path, draft);
        return;
      }
      if (e.key === "Escape" && editing) setEditing(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [path, editing, draft, content, saveEdit]);

  // Focus the field, caret at end, when edit mode opens.
  useEffect(() => {
    if (!editing) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);

  // Auto-grow the textarea; the floor keeps short files filling the viewport.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el || !editing) return;
    el.style.height = "auto";
    const floor = scrollRef.current?.clientHeight ?? 0;
    el.style.height = `${Math.max(el.scrollHeight, floor)}px`;
  }, [editing, draft]);

  if (path === null) return null;

  const lineRow = (key: number, body: ReactNode) => (
    <div key={key} className="group flex hover:bg-vscode-line-highlight">
      <span className="sticky left-0 z-10 w-12 shrink-0 select-none bg-vscode-editor pr-3 text-right text-vscode-dim group-hover:bg-vscode-line-highlight group-hover:text-vscode-fg">
        {key + 1}
      </span>
      <span className="whitespace-pre">{body}</span>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {editing ? (
        <div className="flex h-7 shrink-0 items-center justify-between border-b border-vscode-border bg-vscode-side px-3">
          <span className="text-xs text-vscode-dim">
            Editing locally — not pushed
          </span>
          <span className="text-xs text-vscode-dim">Esc to view</span>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-auto font-code selection:bg-vscode-selection"
        >
          {content === undefined ? (
            <p className="px-12 py-6 text-xs text-vscode-dim">
              Repo content arrives with the blob API (backend milestone).
            </p>
          ) : editing ? (
            <div className="flex min-h-full w-full">
              <div className="sticky left-0 z-10 w-12 shrink-0 select-none bg-vscode-editor pr-3 pt-2 text-right text-vscode-dim">
                {draft.split("\n").map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                wrap="off"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="flex-1 resize-none overflow-x-auto overflow-y-hidden bg-transparent pt-2 pb-2 font-code text-vscode-fg caret-vscode-accent selection:bg-vscode-selection focus:outline-none"
              />
            </div>
          ) : (
            <div
              className="w-max min-w-full py-2 pr-4"
              style={{ color: tokens?.fg }}
              onDoubleClick={enterEdit}
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
          )}
        </div>
        <div
          aria-hidden
          className="pointer-events-none w-20 shrink-0 bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-transparent"
        />
      </div>
    </div>
  );
}
