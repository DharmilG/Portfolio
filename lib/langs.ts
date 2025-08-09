// Language map — single source for the editor (shiki language ids) and the
// chrome (StatusBar display labels). Keep the two in one place so they can
// never disagree about a path.

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

// StatusBar display names (VS Code-style wording).
const LABEL_BY_LANG: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript React",
  js: "JavaScript",
  jsx: "JavaScript React",
  json: "JSON",
  md: "Markdown",
  css: "CSS",
  scss: "SCSS",
  html: "HTML",
  yml: "YAML",
  py: "Python",
  sh: "Shell Script",
  sql: "SQL",
  dotenv: "Dotenv",
  text: "Plain Text",
};

// shiki language id for a workspace path ("text" = plain/unhighlighted).
export function langFor(path: string): string {
  const name = path.split("/").pop() ?? "";
  if (name.startsWith(".env")) return "dotenv";
  const dot = name.lastIndexOf(".");
  if (dot < 1) return "text";
  return LANG_BY_EXT[name.slice(dot + 1).toLowerCase()] ?? "text";
}

// Human label for the StatusBar (never empty).
export function langLabelFor(path: string): string {
  return LABEL_BY_LANG[langFor(path)] ?? "Plain Text";
}

// Markdown-family source files open in preview mode (DOC/10 §5).
export function isMarkdownPath(path: string): boolean {
  const name = path.split("/").pop() ?? "";
  const dot = name.lastIndexOf(".");
  if (dot < 1) return false;
  const ext = name.slice(dot + 1).toLowerCase();
  return ext === "md" || ext === "mdx";
}
