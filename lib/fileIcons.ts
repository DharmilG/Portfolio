// lib/fileIcons.ts — filename → codicon map, shared by Explorer / Tabs / breadcrumb / palette.
// Pure module (no "use client"): safe to import anywhere, incl. server components.
// Rules: exact basenames first (Dockerfile family, .env.* variants), then
// lowercase extension lookup, then "file" fallback (never a missing glyph).

export const FILE_ICONS: Record<string, string> = {
  md: "markdown",
  mdx: "markdown",
  json: "json",
  jsonc: "json",
  ts: "file-code",
  tsx: "file-code",
  mts: "file-code",
  cts: "file-code",
  js: "file-code",
  jsx: "file-code",
  mjs: "file-code",
  cjs: "file-code",
  css: "file-code",
  scss: "file-code",
  less: "file-code",
  html: "file-code",
  htm: "file-code",
  xml: "file-code",
  py: "file-code",
  sh: "file-code",
  bash: "file-code",
  yml: "file-code",
  yaml: "file-code",
  toml: "file-code",
  env: "gear",
  conf: "gear",
  config: "gear",
  ini: "gear",
  cfg: "gear",
  prettierrc: "paintcan",
  gitignore: "exclude",
  gitkeep: "exclude",
  gitattributes: "exclude",
  gitmodules: "exclude",
  dockerignore: "package",
  txt: "file-text",
  text: "file-text",
  log: "file-text",
  csv: "file-text",
  sql: "database",
  db: "database",
  sqlite: "database",
  sqlite3: "database",
  svg: "file-media",
  png: "file-media",
  jpg: "file-media",
  jpeg: "file-media",
  gif: "file-media",
  webp: "file-media",
  ico: "file-media",
  avif: "file-media",
  zip: "file-zip",
  tar: "file-zip",
  gz: "file-zip",
  rar: "file-zip",
  "7z": "file-zip",
  pdf: "file-pdf",
};

export function extOf(path: string): string {
  const i = path.lastIndexOf(".");
  return i < 0 ? "" : path.slice(i + 1);
}

export function fileIcon(name: string): string {
  const base = name.split("/").pop() ?? name;
  if (base === "Dockerfile" || base.startsWith("Dockerfile."))
    return "package";
  if (base.startsWith(".env.")) return "gear";
  return FILE_ICONS[extOf(base).toLowerCase()] ?? "file";
}
