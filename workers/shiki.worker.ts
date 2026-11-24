/// <reference lib="webworker" />
// Shiki highlighting runs here so tokenization never blocks React rendering or
// typing in FileViewer. The highlighter is created once per worker lifetime.
import { createHighlighterCore, getTokenStyleObject } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import darkPlus from "shiki/themes/dark-plus.mjs";
import lightPlus from "shiki/themes/light-plus.mjs";
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
import type {
  HighlightRequest,
  HighlightResponse,
  WorkerToken,
} from "@/lib/shiki-types";

type Highlighter = Awaited<ReturnType<typeof createHighlighterCore>>;

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighterCore({
    themes: [darkPlus, lightPlus],
    langs: [
      ts,
      tsx,
      js,
      jsx,
      json,
      md,
      css,
      scss,
      html,
      yaml,
      py,
      sh,
      sql,
      dotenv,
    ],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });
  return highlighterPromise;
}

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<HighlightRequest>) => void) | null;
  postMessage: (message: HighlightResponse) => void;
};

function plainLines(content: string): WorkerToken[][] {
  return content.split("\n").map((line) => [{ content: line, style: {} }]);
}

ctx.onmessage = async (event) => {
  const { id, content, lang, theme } = event.data;
  // Plain text and unsupported grammar ids stay unhighlighted; that is a
  // normal editor state, not a worker failure.
  if (lang === "text") {
    ctx.postMessage({ id, ok: true, fg: "", lines: plainLines(content) });
    return;
  }
  try {
    const highlighter = await getHighlighter();
    const result = highlighter.codeToTokens(content, { lang, theme });
    const lines: WorkerToken[][] = result.tokens.map((line) =>
      line.map((token) => {
        const style = getTokenStyleObject(token);
        return {
          content: token.content,
          style: {
            color: style.color,
            backgroundColor: style["background-color"],
            fontStyle: style["font-style"],
            fontWeight: style["font-weight"],
            textDecoration: style["text-decoration"],
          },
        };
      }),
    );
    ctx.postMessage({ id, ok: true, fg: result.fg ?? "", lines });
  } catch {
    ctx.postMessage({ id, ok: true, fg: "", lines: plainLines(content) });
  }
};
