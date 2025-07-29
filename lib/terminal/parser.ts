// lib/terminal/parser.ts — pure terminal command parser (DOC/10 §2-3).
// Zero React/DOM/store/fetch imports: parse(input, ctx) -> output + effects;
// the caller applies effects against the zustand store (and performs the one
// async effect, CURL, through /api/proxy). ANSI SGR codes are part of the
// output — xterm renders them with the Dark Modern ANSI palette.
// Deviation from DOC/10: `cd` reports the new cwd and `curl`/`open --preview`
// ride extra effect kinds; DOC/10 §2 is rewritten to as-built.
import type { LocalCommit, RealCommit } from "../localGit";

export type TerminalShell = "bash" | "pwsh";

export type TerminalCtx = {
  cwd: string; // display path: "~", "~/Projects/acme/site"
  shell: TerminalShell;
  vfs: string[]; // workspace-relative file paths (no "~")
  dirs: string[]; // workspace-relative directory paths (no "~")
  localEdits: Record<string, string>;
  localCommits: LocalCommit[];
  tmpFs: Record<string, string>;
  cached?: Record<string, string>; // blob cache (backend milestone)
  realCommits?: RealCommit[]; // /api/commits cache (backend milestone)
  branch?: string;
};

export type Effect =
  | { kind: "OPEN_TAB"; path: string }
  | { kind: "WRITE_EDIT"; path: string; content: string }
  | { kind: "WRITE_TMP"; path: string; content: string }
  | { kind: "DELETE"; path: string }
  | { kind: "COMMIT"; msg: string }
  | { kind: "DISCARD"; path?: string }
  | { kind: "SET_THEME"; mode: "dark" | "light" }
  | { kind: "CLEAR" }
  | { kind: "PREVIEW"; url: string }
  | { kind: "RELOAD_PREVIEW" }
  | { kind: "CURL"; url: string };

export type ParseResult = {
  output: string;
  effects: Effect[];
  cwd?: string; // present when `cd` moved the session
};

// ---------------------------------------------------------------------------
// ANSI (Dark Modern terminal palette: ansiGreen #0DBC79, ansiBlue #2472C8,
// brightBlue #3B8EEA, ansiRed #CD3131, brightRed #F14C4C, brightBlack #666666)
// ---------------------------------------------------------------------------
const ESC = "\x1b[";
const RESET = `${ESC}0m`;

export const SGR = {
  reset: RESET,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  red: `${ESC}91m`,
  green: `${ESC}32m`,
  brightGreen: `${ESC}92m`,
  yellow: `${ESC}33m`,
  blue: `${ESC}34m`,
  brightBlue: `${ESC}94m`,
  gray: `${ESC}90m`,
} as const;

function paint(text: string, ...style: string[]): string {
  return `${style.join("")}${text}${RESET}`;
}

const dim = (s: string) => paint(s, SGR.dim);
const blue = (s: string) => paint(s, SGR.brightBlue);
const green = (s: string) => paint(s, SGR.brightGreen);
const red = (s: string) => paint(s, SGR.red);
const amber = (s: string) => paint(s, SGR.yellow);

export function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

// ---------------------------------------------------------------------------
// Paths — cwd is the display path with "~" for the workspace root; the store
// and vfs use workspace-relative paths without it.
// ---------------------------------------------------------------------------
function normalizeParts(s: string): string {
  const out: string[] = [];
  for (const part of s.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join("/");
}

export function resolvePath(cwd: string, arg?: string): string {
  const raw = (arg ?? "").trim();
  if (!raw || raw === "~") return "~";
  if (raw === "/") return "~";
  if (raw.startsWith("~/")) return `~/${normalizeParts(raw.slice(2))}`;
  if (raw.startsWith("/")) return `~/${normalizeParts(raw.slice(1))}`;
  const base = cwd === "~" ? "" : cwd.slice(2);
  return `~/${normalizeParts(base ? `${base}/${raw}` : raw)}`;
}

function workPath(display: string): string {
  return display === "~" ? "" : display.slice(2);
}

function displayPath(work: string): string {
  return work ? `~/${work}` : "~";
}

function under(path: string, base: string): boolean {
  if (!base) return true;
  return path === base || path.startsWith(`${base}/`);
}

function inTmp(work: string): boolean {
  return work === "tmp" || work.startsWith("tmp/");
}

function knownFiles(ctx: TerminalCtx): string[] {
  const set = new Set<string>([
    ...ctx.vfs,
    ...Object.keys(ctx.localEdits),
    ...Object.keys(ctx.tmpFs),
    ...Object.keys(ctx.cached ?? {}),
  ]);
  return [...set];
}

function existsFile(ctx: TerminalCtx, work: string): boolean {
  return knownFiles(ctx).includes(work);
}

function isDir(ctx: TerminalCtx, target: string): boolean {
  if (target === "~") return true;
  const work = workPath(target);
  if (!work) return true;
  if (ctx.dirs.includes(work)) return true;
  return knownFiles(ctx).some((f) => f.startsWith(`${work}/`));
}

type Entry = { name: string; dir: boolean; path: string };

function listEntries(ctx: TerminalCtx, dir: string): Entry[] {
  const base = workPath(dir);
  const entries = new Map<string, Entry>();
  const add = (path: string, isDirectory: boolean) => {
    if (!under(path, base)) return;
    const rest = base ? path.slice(base.length + 1) : path;
    if (!rest) return;
    const [name, ...tail] = rest.split("/");
    const dirFlag = isDirectory || tail.length > 0;
    const full = base ? `${base}/${name}` : name;
    const prev = entries.get(name);
    if (!prev || dirFlag) entries.set(name, { name, dir: dirFlag, path: full });
  };
  for (const d of ctx.dirs) add(d, true);
  for (const f of knownFiles(ctx)) add(f, false);
  return [...entries.values()].sort(
    (a, b) =>
      Number(b.dir) - Number(a.dir) ||
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

// ---------------------------------------------------------------------------
// Prompt (DOC/10 §1): green user@portfolio, blue cwd, main* when dirty.
// bash gets `$`, pwsh gets the `PS>` glyph.
// ---------------------------------------------------------------------------
export function renderPrompt(
  cwd: string,
  dirty: boolean,
  shell: TerminalShell = "bash",
): string {
  const user = paint("user@portfolio", SGR.brightGreen);
  const dir = paint(cwd, SGR.brightBlue);
  const flag = dirty ? ` ${paint("main*", "\x1b[38;2;229;186;125m")}` : "";
  if (shell === "pwsh") return `PS ${dir}${flag}> `;
  return `${user}:${dir}${flag}$ `;
}

// ---------------------------------------------------------------------------
// Tab completion (DOC/10 §1): commands, then vfs + tmpFs paths.
// ---------------------------------------------------------------------------
export const TERMINAL_COMMANDS = [
  "help",
  "ls",
  "pwd",
  "cd",
  "cat",
  "echo",
  "touch",
  "mkdir",
  "rm",
  "open",
  "status",
  "diff",
  "commit",
  "log",
  "branch",
  "checkout",
  "curl",
  "theme",
  "whoami",
  "date",
  "neofetch",
  "clear",
  "push",
  "pull",
] as const;

// `git <sub>` only accepts real git verbs (plus help); bare commands are the
// documented convenience form.
const GIT_SUBCOMMANDS = new Set([
  "help",
  "status",
  "diff",
  "commit",
  "log",
  "branch",
  "checkout",
  "push",
  "pull",
  "fetch",
]);

export function complete(
  input: string,
  ctx: TerminalCtx,
  cursor = input.length,
): { line: string; cursor: number; listing?: string } {
  const before = input.slice(0, cursor);
  const start = Math.max(before.lastIndexOf(" "), before.lastIndexOf("\t")) + 1;
  const token = before.slice(start);
  const atCommand = before.slice(0, start).trim() === "";

  let candidates: string[];
  if (atCommand) {
    candidates = TERMINAL_COMMANDS.filter((c) => c.startsWith(token));
  } else {
    const slash = token.lastIndexOf("/");
    const dirPart = slash >= 0 ? token.slice(0, slash + 1) : "";
    const namePart = slash >= 0 ? token.slice(slash + 1) : token;
    const dir = resolvePath(ctx.cwd, dirPart || ".");
    candidates = listEntries(ctx, dir)
      .filter((e) => e.name.toLowerCase().startsWith(namePart.toLowerCase()))
      .map((e) => `${dirPart}${e.name}${e.dir ? "/" : ""}`);
  }

  if (candidates.length === 0) return { line: input, cursor };
  if (candidates.length === 1) {
    const line = input.slice(0, start) + candidates[0] + input.slice(cursor);
    return { line, cursor: start + candidates[0].length };
  }

  // Longest common prefix, like readline's first Tab.
  let prefix = candidates[0];
  for (const c of candidates) {
    while (prefix && !c.toLowerCase().startsWith(prefix.toLowerCase())) {
      prefix = prefix.slice(0, -1);
    }
  }
  const line =
    prefix.length > token.length
      ? input.slice(0, start) + prefix + input.slice(cursor)
      : input;
  const listing = candidates
    .map((c) => (c.endsWith("/") ? blue(c) : c))
    .join("  ");
  return { line, cursor: start + (prefix.length > token.length ? prefix.length : token.length), listing };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
function err(msg: string): ParseResult {
  return { output: red(msg), effects: [] };
}

function ok(output: string, effects: Effect[] = []): ParseResult {
  return { output, effects };
}

function statusCmd(ctx: TerminalCtx): ParseResult {
  const branch = ctx.branch ?? "main";
  const files = Object.keys(ctx.localEdits);
  const lines: string[] = [`On branch ${paint(branch, SGR.green)}`, ""];

  if (files.length) {
    lines.push("Changes not staged for commit:");
    lines.push(dim(`  (use "checkout -- <file>..." to discard changes)`));
    for (const f of files.sort()) {
      lines.push(`        ${red("modified:")}   ${f}`);
    }
  } else {
    lines.push("nothing to commit, working tree clean");
  }

  if (ctx.localCommits.length) {
    lines.push("");
    lines.push(`Local commits ${dim("(not pushed)")}:`);
    for (const c of ctx.localCommits) {
      lines.push(
        `        ${amber(c.id)} ${c.msg} ${dim(`(${c.files.length} file${c.files.length === 1 ? "" : "s"})`)}`,
      );
    }
  }

  if (files.length) {
    lines.push("");
    lines.push(
      dim(`Hint: 'commit -m "message"' snapshots ${files.length === 1 ? "it" : "all of them"} in this browser.`),
    );
  }
  return ok(lines.join("\n"));
}

function lsCmd(ctx: TerminalCtx, args: string[]): ParseResult {
  const targetArg = args.filter((a) => !a.startsWith("-")).join(" ");
  const target = resolvePath(ctx.cwd, targetArg || ".");
  if (target !== "~" && !isDir(ctx, target) && !existsFile(ctx, workPath(target))) {
    return err(`ls: cannot access '${targetArg || "."}': No such file or directory`);
  }
  if (existsFile(ctx, workPath(target)) && target !== "~") {
    const work = workPath(target);
    const dirty = ctx.localEdits[work] !== undefined;
    const scratched = inTmp(work);
    return ok(`${dirty ? `${amber("M")} ` : ""}${scratched ? dim(work.split("/").pop() ?? work) : work.split("/").pop()}`);
  }

  const entries = listEntries(ctx, target);
  if (entries.length === 0) return ok("");
  return ok(
    entries
      .map((e) => {
        if (e.dir) {
          const label = `${e.name}/`;
          return inTmp(e.path) ? dim(label) : blue(label);
        }
        const dirty = ctx.localEdits[e.path] !== undefined;
        const name = inTmp(e.path) ? dim(e.name) : e.name;
        return dirty ? `${amber("M")} ${name}` : name;
      })
      .join("\n"),
  );
}

function cdCmd(ctx: TerminalCtx, args: string[]): ParseResult {
  const arg = args.filter((a) => !a.startsWith("-")).join(" ");
  const target = resolvePath(ctx.cwd, arg || "~");
  if (!isDir(ctx, target)) {
    return err(`cd: no such file or directory: ${arg || "~"}`);
  }
  return { output: "", effects: [], cwd: target };
}

const BINARY = /\.(png|jpe?g|gif|webp|ico|bmp|pdf|zip|gz|tar|woff2?|ttf|otf|eot|mp4|webm|mp3|wav|wasm)$/i;

function catCmd(ctx: TerminalCtx, args: string[]): ParseResult {
  if (!args.length) return err("cat: missing file operand");
  const target = resolvePath(ctx.cwd, args.join(" "));
  const work = workPath(target);
  const name = work.split("/").pop() ?? work;

  if (!existsFile(ctx, work)) {
    if (isDir(ctx, target)) return err(`cat: ${name}: Is a directory`);
    return err(`cat: ${name}: No such file or directory`);
  }
  if (BINARY.test(work)) return err(`binary file, use 'open'`);

  const content =
    ctx.localEdits[work] ?? ctx.tmpFs[work] ?? ctx.cached?.[work];
  if (content === undefined) {
    return ok(
      dim(`(no cached content for ${work} — the blob API lands with the backend)`),
    );
  }
  if (content.includes("\0")) return err(`binary file, use 'open'`);

  const lines = content.split("\n");
  const head = lines.slice(0, 100);
  const rest = lines.length - head.length;
  return ok(
    head.join("\n") + (rest > 0 ? `\n${dim(`... ${rest} more line${rest === 1 ? "" : "s"} (truncated)`)}` : ""),
  );
}

function unquote(s: string): string {
  const t = s.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}

function writeContent(
  ctx: TerminalCtx,
  target: string,
  content: string,
  append: boolean,
): ParseResult {
  const work = workPath(target);
  if (!work) return err("cannot write to the workspace root");
  if (inTmp(work)) {
    const prev = append ? (ctx.tmpFs[work] ?? "") : "";
    const joined = append && prev ? `${prev}\n${content}` : content;
    return ok("", [{ kind: "WRITE_TMP", path: work, content: joined }]);
  }
  if (!existsFile(ctx, work)) {
    return err(
      `permission denied: ${target} is a read-only snapshot — write under tmp/ instead`,
    );
  }
  const prev =
    append ? (ctx.localEdits[work] ?? ctx.tmpFs[work] ?? ctx.cached?.[work] ?? "") : "";
  const joined = append && prev ? `${prev}\n${content}` : content;
  return ok("", [{ kind: "WRITE_EDIT", path: work, content: joined }]);
}

function echoCmd(ctx: TerminalCtx, rest: string): ParseResult {
  const redirect = rest.match(/^(.*?)\s*(>>|>)\s*(\S+)\s*$/);
  if (redirect) {
    const text = unquote(redirect[1]);
    const target = resolvePath(ctx.cwd, unquote(redirect[3]));
    return writeContent(ctx, target, text, redirect[2] === ">>");
  }
  return ok(unquote(rest));
}

function touchCmd(ctx: TerminalCtx, args: string[]): ParseResult {
  if (!args.length) return err("touch: missing file operand");
  const target = resolvePath(ctx.cwd, args.join(" "));
  const work = workPath(target);
  if (!work) return err("touch: cannot touch the workspace root");
  if (inTmp(work)) {
    if (ctx.tmpFs[work] !== undefined) return ok("");
    return ok("", [{ kind: "WRITE_TMP", path: work, content: "" }]);
  }
  if (!existsFile(ctx, work)) {
    return err(`permission denied: ${target} is a read-only snapshot`);
  }
  if (ctx.localEdits[work] !== undefined) return ok("");
  if (ctx.cached?.[work] !== undefined) {
    return ok("", [{ kind: "WRITE_EDIT", path: work, content: ctx.cached[work] }]);
  }
  return ok(dim(`(no cached content for ${work} — nothing to touch yet)`));
}

function mkdirCmd(ctx: TerminalCtx, args: string[]): ParseResult {
  const arg = args.filter((a) => !a.startsWith("-")).join(" ");
  if (!arg) return err("mkdir: missing operand");
  const target = resolvePath(ctx.cwd, arg);
  const work = workPath(target);
  if (!inTmp(work)) {
    return err(`permission denied: ${target} is a read-only snapshot — mkdir is tmp/-only`);
  }
  if (isDir(ctx, target)) {
    return err(`mkdir: cannot create directory '${arg}': File exists`);
  }
  return ok("", [{ kind: "WRITE_TMP", path: `${work}/.gitkeep`, content: "" }]);
}

function rmCmd(ctx: TerminalCtx, args: string[]): ParseResult {
  const arg = args.filter((a) => !a.startsWith("-")).join(" ");
  if (!arg) return err("rm: missing operand");
  const target = resolvePath(ctx.cwd, arg);
  const work = workPath(target);
  if (!inTmp(work)) {
    return err(`permission denied: ${target} is a read-only snapshot — rm is tmp/-only`);
  }
  const keys = Object.keys(ctx.tmpFs);
  const files = keys.filter((k) => k === work);
  const nested = keys.filter((k) => k.startsWith(`${work}/`));
  if (!files.length && !nested.length) {
    return err(`rm: cannot remove '${arg}': No such file or directory`);
  }
  return ok(
    "",
    [...files, ...nested].map((path) => ({ kind: "DELETE" as const, path })),
  );
}

function openCmd(ctx: TerminalCtx, args: string[]): ParseResult {
  // `open --preview <url>` retargets the integrated browser tab (DOC/10 §4);
  // a plain `open <path>` opens a file tab. The URL is normalized by the
  // effect layer (the parser stays store-free).
  if (args[0] === "--preview" || args[0] === "-p") {
    const raw = args.slice(1).join(" ");
    if (!raw) return err("open: --preview requires a URL");
    return ok("", [{ kind: "PREVIEW", url: raw }]);
  }
  if (!args.length) return err("open: missing file operand");
  const target = resolvePath(ctx.cwd, args.join(" "));
  const work = workPath(target);
  if (isDir(ctx, target)) return err(`open: ${work || "~"}: Is a directory`);
  if (!existsFile(ctx, work)) return err(`open: ${work}: No such file or directory`);
  return ok("", [{ kind: "OPEN_TAB", path: work }]);
}

function diffLines(
  a: string[],
  b: string[],
): { op: " " | "-" | "+"; line: string }[] {
  const n = a.length;
  const m = b.length;
  if (n * m > 40000) {
    return [
      ...a.map((line) => ({ op: "-" as const, line })),
      ...b.map((line) => ({ op: "+" as const, line })),
    ];
  }
  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: { op: " " | "-" | "+"; line: string }[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ op: " ", line: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ op: "-", line: a[i] });
      i++;
    } else {
      out.push({ op: "+", line: b[j] });
      j++;
    }
  }
  while (i < n) out.push({ op: "-", line: a[i++] });
  while (j < m) out.push({ op: "+", line: b[j++] });
  return out;
}

function diffCmd(ctx: TerminalCtx, args: string[]): ParseResult {
  const arg = args.filter((a) => !a.startsWith("-")).join(" ");
  const files = arg
    ? [workPath(resolvePath(ctx.cwd, arg))]
    : Object.keys(ctx.localEdits);

  if (files.length === 0) return ok(dim("No local changes."));
  if (arg && ctx.localEdits[files[0]] === undefined) {
    return ok(dim(`No local changes for ${files[0]}.`));
  }

  const chunks: string[] = [];
  for (const work of files) {
    const next = ctx.localEdits[work];
    if (next === undefined) continue;
    const base = ctx.cached?.[work] ?? "";
    chunks.push(paint(`diff --local a/${work} b/${work}`, SGR.bold));
    if (!base) {
      chunks.push(dim("(cached snapshot unavailable — showing the saved local content)"));
    }
    const rows = diffLines(base ? base.split("\n") : [], next.split("\n"));
    const head = rows.slice(0, 40);
    for (const r of head) {
      if (r.op === "-") chunks.push(red(`-${r.line}`));
      else if (r.op === "+") chunks.push(green(`+${r.line}`));
      else chunks.push(dim(` ${r.line}`));
    }
    if (rows.length > head.length) {
      chunks.push(dim(`... ${rows.length - head.length} more line${rows.length - head.length === 1 ? "" : "s"} (truncated)`));
    }
  }
  return ok(chunks.join("\n"));
}

function logCmd(ctx: TerminalCtx): ParseResult {
  const local = ctx.localCommits.slice(0, 10);
  const real = (ctx.realCommits ?? []).slice(0, 10);
  if (!local.length && !real.length) {
    return ok(
      `No commits yet — make one with ${paint('commit -m "message"', SGR.brightBlue)}.`,
    );
  }
  const lines: string[] = [];
  for (const c of local) {
    lines.push(
      `${green("*")} ${amber(c.id)} ${c.msg} ${dim(`(${c.files.length} file${c.files.length === 1 ? "" : "s"}, local)`)}`,
    );
  }
  for (const c of real) {
    lines.push(
      `${dim("*")} ${dim(c.sha.slice(0, 7))} ${dim(c.message.split("\n")[0])} ${dim("(origin)")}`,
    );
  }
  return ok(lines.join("\n"));
}

function checkoutCmd(ctx: TerminalCtx, args: string[]): ParseResult {
  const clean = args.filter((a) => a !== "--" && !a.startsWith("-"));
  const arg = clean.join(" ");
  if (!arg || arg === ".") {
    if (!Object.keys(ctx.localEdits).length) return ok(dim("No local changes."));
    return ok("Discarded all local changes.", [{ kind: "DISCARD" }]);
  }
  const work = workPath(resolvePath(ctx.cwd, arg));
  if (ctx.localEdits[work] === undefined) {
    return err(`error: pathspec '${arg}' did not match any file(s) known to git`);
  }
  return ok(`Discarded local changes in ${work}.`, [
    { kind: "DISCARD", path: work },
  ]);
}

const CURL_NOOP_FLAGS = new Set([
  "-l",
  "--list-only",
  "-s",
  "--silent",
  "-S",
  "--show-error",
  "-L",
  "--location",
]);

function curlCmd(args: string[]): ParseResult {
  const urls: string[] = [];
  let options = true;
  for (const arg of args) {
    if (options && arg === "--") {
      options = false;
      continue;
    }
    if (options && arg.startsWith("-") && arg !== "-") {
      if (CURL_NOOP_FLAGS.has(arg)) continue;
      // Accept the common combined short flags we treat as no-ops (-sL).
      if (/^-[a-zA-Z]+$/.test(arg) && arg.length > 2) {
        const known = [...arg.slice(1)].every((ch) => "lsSL".includes(ch));
        if (known) continue;
      }
      return err(`curl: option ${arg}: is not supported here`);
    }
    urls.push(arg);
  }

  if (!urls.length) return err("curl: try 'curl <url>'");
  if (urls.length > 1) return err("curl: only one URL is supported here");

  const raw = urls[0].replace(/^\/\//, "");
  const scheme = raw.match(/^([a-z][a-z0-9+.-]*):/i);
  // `example.com:8080` is a host + port, not a scheme.
  const hostPort = scheme
    ? /^\d+(?:[/?#]|$)/.test(raw.slice(scheme[0].length))
    : false;
  const candidate = scheme && !hostPort ? raw : `https://${raw}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return err("curl: (3) URL rejected: Malformed input");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return err(
      `curl: (1) Protocol "${parsed.protocol.slice(0, -1)}" not supported`,
    );
  }
  if (!parsed.hostname || parsed.username || parsed.password) {
    return err("curl: (3) URL rejected: Malformed input");
  }
  return ok("", [{ kind: "CURL", url: parsed.href }]);
}

const HELP = [
  `${paint("Portfolio terminal", SGR.bold, SGR.brightBlue)} ${dim("— browser-only, local git")}`,
  "",
  paint("FILES", SGR.bold, SGR.brightBlue),
  `  ${blue("ls [path]".padEnd(22))}${dim("list files (M = locally edited)")}`,
  `  ${blue("pwd".padEnd(22))}${dim("print the working directory")}`,
  `  ${blue("cd <dir>".padEnd(22))}${dim("change directory")}`,
  `  ${blue("cat <file>".padEnd(22))}${dim("print a file (saved edits win)")}`,
  `  ${blue("echo <txt> > <file>".padEnd(22))}${dim("write tmp/ or an existing file")}`,
  `  ${blue("touch <file>".padEnd(22))}${dim("create an empty file (tmp/)")}`,
  `  ${blue("mkdir <dir>".padEnd(22))}${dim("create a folder (tmp/ only)")}`,
  `  ${blue("rm <path>".padEnd(22))}${dim("remove a file or folder (tmp/)")}`,
  `  ${blue("open <path>".padEnd(22))}${dim("open a file tab")}`,
  "",
  paint("GIT — LOCAL ONLY", SGR.bold, SGR.brightBlue),
  `  ${blue("status".padEnd(22))}${dim("working tree + local commits")}`,
  `  ${blue("diff [file]".padEnd(22))}${dim("show local changes")}`,
  `  ${blue('commit -m "msg"'.padEnd(22))}${dim("commit in this browser (never pushed)")}`,
  `  ${blue("log --graph".padEnd(22))}${dim("local + cached history")}`,
  `  ${blue("branch".padEnd(22))}${dim("current branch")}`,
  `  ${blue("checkout -- <file>".padEnd(22))}${dim("discard local changes")}`,
  "",
  paint("BROWSER — INTEGRATED", SGR.bold, SGR.brightBlue),
  `  ${blue("open --preview <url>".padEnd(22))}${dim("load a URL in the browser tab")}`,
  `  ${blue("reload".padEnd(22))}${dim("reload the browser tab")}`,
  "",
  paint("FUN", SGR.bold, SGR.brightBlue),
  `  ${blue("curl <url>".padEnd(22))}${dim("fetch text through /api/proxy (20 KB cap)")}`,
  `  ${blue("theme dark|light".padEnd(22))}${dim("switch the workbench palette")}`,
  `  ${blue("whoami · date · neofetch · clear".padEnd(22))}`,
].join("\n");

function neofetchCmd(ctx: TerminalCtx): ParseResult {
  const dirty = Object.keys(ctx.localEdits).length;
  const commits = ctx.localCommits.length;
  const art = [
    "        ▄▄▄▄▄▄▄        ",
    "      ▄█████████▄      ",
    "     ███▀     ▀███     ",
    "    ███   VS   ███    ",
    "    ███▄     ▄███     ",
    "      ▀█████████▀      ",
    "        ▀▀▀▀▀▀▀        ",
  ];
  const info = [
    `${paint("user@portfolio", SGR.brightGreen)}`,
    dim("────────────────"),
    `OS: PortfolioOS 2026`,
    `Shell: ${ctx.shell} (browser, no pty)`,
    `Theme: Dark Modern`,
    `Local commits: ${commits}`,
    `Dirty files: ${dirty}`,
  ];
  return ok(
    art
      .map((a, i) => `${blue(a)}${info[i] ?? ""}`)
      .concat(info.slice(art.length))
      .join("\n"),
  );
}

// ---------------------------------------------------------------------------
export function parse(input: string, ctx: TerminalCtx): ParseResult {
  const raw = input.trim();
  if (!raw) return ok("");

  const parts = raw.split(/\s+/);
  const original = parts[0];
  let cmd = original;
  let args = parts.slice(1);

  if (cmd === "git") {
    if (!args.length) {
      return ok(
        `usage: git <command> [<args>]\n${dim("commands: status, diff, commit, log, branch, checkout — all local")}`,
      );
    }
    const sub = args[0];
    if (!GIT_SUBCOMMANDS.has(sub)) {
      return err(`git: '${sub}' is not a git command. See 'git --help'.`);
    }
    cmd = sub;
    args = args.slice(1);
  }

  switch (cmd) {
    case "help":
      return ok(HELP);
    case "ls":
      return lsCmd(ctx, args);
    case "pwd":
      return ok(displayPath(workPath(ctx.cwd)));
    case "cd":
      return cdCmd(ctx, args);
    case "cat":
      return catCmd(ctx, args);
    case "echo":
      return echoCmd(ctx, raw.replace(/^echo\s*/, ""));
    case "touch":
      return touchCmd(ctx, args);
    case "mkdir":
      return mkdirCmd(ctx, args);
    case "rm":
      return rmCmd(ctx, args);
    case "open":
      return openCmd(ctx, args);
    case "reload":
      return ok("", [{ kind: "RELOAD_PREVIEW" }]);
    case "status":
      return statusCmd(ctx);
    case "diff":
      return diffCmd(ctx, args);
    case "commit": {
      const rest = args.join(" ");
      const m = rest.match(/^-m\s+(?:"([^"]*)"|'([^']*)'|(\S+))\s*$/);
      if (!m) {
        if (!rest) return err("error: switch 'm' requires a value");
        return err("error: pathspec '" + rest + "' did not match any file(s) known to git");
      }
      const msg = (m[1] ?? m[2] ?? m[3] ?? "").trim();
      if (!msg) return err("Please provide a commit message");
      const files = Object.keys(ctx.localEdits);
      if (!files.length) return ok("nothing to commit, working tree clean");
      if (msg.length > 200) return err("error: commit message too long (max 200)");
      return ok(
        `${green("✓")} Committed locally — ${paint(`"${msg}"`, SGR.bold)} ${dim(`(${files.length} file${files.length === 1 ? "" : "s"}, not pushed)`)}`,
        [{ kind: "COMMIT", msg }],
      );
    }
    case "log":
      return logCmd(ctx);
    case "branch": {
      const n = ctx.localCommits.length;
      return ok(
        `${green("*")} ${paint(ctx.branch ?? "main", SGR.green)}` +
          (n ? `\n${dim(`${n} local commit${n === 1 ? "" : "s"} not pushed`)}` : ""),
      );
    }
    case "checkout":
      return checkoutCmd(ctx, args);
    case "curl":
      return curlCmd(args);
    case "theme": {
      const mode = args[0];
      if (mode !== "dark" && mode !== "light") {
        return err("usage: theme dark|light");
      }
      return ok("", [{ kind: "SET_THEME", mode }]);
    }
    case "whoami":
      return ok("user");
    case "date":
      return ok(new Date().toString());
    case "neofetch":
      return neofetchCmd(ctx);
    case "clear":
      return ok("", [{ kind: "CLEAR" }]);
    case "push":
    case "pull":
    case "fetch":
      return ok(
        amber(
          "Nice try — this portfolio is read-only upstream 🦀. Your commits live in browser only.",
        ),
      );
    default:
      return err(`command not found: ${original} — try 'help'`);
  }
}
