// lib/iconThemes.tsx — Centralized icon colors, identity mappings, and brand icons.
// Uses explicit Tailwind classes and design tokens declared in app/globals.css (@theme)
// and react-icons for brand glyphs.
import type { ReactNode } from "react";
import { FaGithub, FaLinkedin, FaFilePdf } from "react-icons/fa6";
import { SiGo, SiPython } from "react-icons/si";

export const FILE_COLOR_MAP: Record<string, string> = {
  ts: "text-[#3178c6]",
  tsx: "text-[#3178c6]",
  mts: "text-[#3178c6]",
  cts: "text-[#3178c6]",
  js: "text-[#f7df1e]",
  jsx: "text-[#f7df1e]",
  mjs: "text-[#f7df1e]",
  cjs: "text-[#f7df1e]",
  go: "text-[#00add8]",
  py: "text-[#38bdf8]",
  json: "text-[#f59e0b]",
  jsonc: "text-[#f59e0b]",
  md: "text-[#60a5fa]",
  mdx: "text-[#60a5fa]",
  css: "text-[#38bdf8]",
  scss: "text-[#38bdf8]",
  less: "text-[#38bdf8]",
  html: "text-[#f97316]",
  htm: "text-[#f97316]",
  pdf: "text-[#ef4444]",
  sql: "text-[#ec4899]",
  db: "text-[#ec4899]",
  sqlite: "text-[#ec4899]",
  sqlite3: "text-[#ec4899]",
  env: "text-[#94a3b8]",
  conf: "text-[#94a3b8]",
  config: "text-[#94a3b8]",
  gitignore: "text-[#858585]",
};

export const SECTION_COLOR_MAP: Record<string, string> = {
  about: "text-[#38bdf8]",
  experience: "text-[#60a5fa]",
  skills: "text-[#4ade80]",
  hackathons: "text-[#fb923c]",
  education: "text-[#c084fc]",
  certificates: "text-[#2dd4bf]",
  contact: "text-[#facc15]",
  resume: "text-[#f87171]",
  projects: "text-[#e5ba7d]",
  books: "text-[#e5ba7d]",
  previews: "text-[#38bdf8]",
  "live-previews": "text-[#38bdf8]",
};

export function getFileExt(filename: string): string {
  const slash = filename.lastIndexOf("/");
  const base = slash >= 0 ? filename.slice(slash + 1) : filename;
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";
}

export function getFileIconColor(filename: string): string {
  const ext = getFileExt(filename);
  if (filename.includes(".env")) return "text-[#94a3b8]";
  return FILE_COLOR_MAP[ext] ?? "text-vscode-dim";
}

export function getSectionIconColor(slug: string): string {
  const key = slug.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return SECTION_COLOR_MAP[key] ?? "text-vscode-dim";
}

export function BrandIcon({
  name,
  className = "",
  size = 16,
}: {
  name: "github" | "linkedin" | "go" | "python" | "pdf";
  className?: string;
  size?: number;
}): ReactNode {
  switch (name) {
    case "github":
      return <FaGithub size={size} className={`shrink-0 text-vscode-fg-active ${className}`} aria-hidden="true" />;
    case "linkedin":
      return <FaLinkedin size={size} className={`shrink-0 text-[#0a66c2] ${className}`} aria-hidden="true" />;
    case "go":
      return <SiGo size={size} className={`shrink-0 text-[#00add8] ${className}`} aria-hidden="true" />;
    case "python":
      return <SiPython size={size} className={`shrink-0 text-[#3776ab] ${className}`} aria-hidden="true" />;
    case "pdf":
      return <FaFilePdf size={size} className={`shrink-0 text-[#ef4444] ${className}`} aria-hidden="true" />;
  }
}
