// components/vscode/SkillIcon.tsx — Authentic branded tech logos with semantic colors.
// Maps technical skills from database/seed to official SVG logos from react-icons and Codicons.
import type { ReactNode } from "react";
import {
  SiGo,
  SiTypescript,
  SiJavascript,
  SiPython,
  SiPostgresql,
  SiHtml5,
  SiReact,
  SiNextdotjs,
  SiTailwindcss,
  SiNodedotjs,
  SiExpress,
  SiNestjs,
  SiFastapi,
  SiMongodb,
  SiRedis,
  SiDocker,
  SiNginx,
  SiGit,
  SiGithubactions,
  SiPandas,
  SiOptuna,
  SiFirebase,
  SiSocketdotio,
} from "react-icons/si";
import { FaAws, FaGithub, FaCss3Alt, FaDatabase } from "react-icons/fa6";
import Codicon from "./Codicon";

export default function SkillIcon({
  name,
  size = 16,
}: {
  name: string;
  size?: number;
}): ReactNode {
  const norm = name.toLowerCase().trim();

  // Languages
  if (norm === "go" || norm.startsWith("go ") || norm === "go (golang)") {
    return <SiGo size={size} className="shrink-0 text-[#00add8]" aria-hidden="true" />;
  }
  if (norm === "typescript" || norm === "ts") {
    return <SiTypescript size={size} className="shrink-0 text-[#3178c6]" aria-hidden="true" />;
  }
  if (norm === "javascript" || norm === "js") {
    return <SiJavascript size={size} className="shrink-0 text-[#f7df1e]" aria-hidden="true" />;
  }
  if (norm === "python" || norm === "py") {
    return <SiPython size={size} className="shrink-0 text-[#3776ab]" aria-hidden="true" />;
  }
  if (norm === "sql") {
    return <FaDatabase size={size} className="shrink-0 text-[#336791]" aria-hidden="true" />;
  }

  // Frontend
  if (norm === "html" || norm === "html5") {
    return <SiHtml5 size={size} className="shrink-0 text-[#e34f26]" aria-hidden="true" />;
  }
  if (norm === "css" || norm === "css3") {
    return <FaCss3Alt size={size} className="shrink-0 text-[#1572b6]" aria-hidden="true" />;
  }
  if (norm === "react" || norm.includes("react native") || norm.includes("react")) {
    return <SiReact size={size} className="shrink-0 text-[#61dafb]" aria-hidden="true" />;
  }
  if (norm === "next.js" || norm === "nextjs" || norm === "next") {
    return <SiNextdotjs size={size} className="shrink-0 text-white" aria-hidden="true" />;
  }
  if (norm === "tailwind css" || norm === "tailwind") {
    return <SiTailwindcss size={size} className="shrink-0 text-[#06b6d4]" aria-hidden="true" />;
  }

  // Backend
  if (norm === "node.js" || norm === "nodejs" || norm === "node") {
    return <SiNodedotjs size={size} className="shrink-0 text-[#5fa04e]" aria-hidden="true" />;
  }
  if (norm === "express.js" || norm === "express") {
    return <SiExpress size={size} className="shrink-0 text-white" aria-hidden="true" />;
  }
  if (norm === "nestjs" || norm === "nest") {
    return <SiNestjs size={size} className="shrink-0 text-[#ea2845]" aria-hidden="true" />;
  }
  if (norm === "fastapi") {
    return <SiFastapi size={size} className="shrink-0 text-[#05998b]" aria-hidden="true" />;
  }
  if (norm === "rest apis" || norm === "rest api" || norm === "rest") {
    return <Codicon name="cloud" size={size} className="shrink-0 text-[#38bdf8]" />;
  }
  if (norm === "microservices") {
    return <Codicon name="layers" size={size} className="shrink-0 text-[#38bdf8]" />;
  }
  if (norm.includes("event-driven") || norm.includes("event")) {
    return <Codicon name="link" size={size} className="shrink-0 text-[#38bdf8]" />;
  }
  if (norm === "socket.io" || norm === "socketio" || norm === "socket") {
    return <SiSocketdotio size={size} className="shrink-0 text-white" aria-hidden="true" />;
  }
  if (norm === "firebase") {
    return <SiFirebase size={size} className="shrink-0 text-[#ffca28]" aria-hidden="true" />;
  }
  if (norm.includes("genkit")) {
    return <Codicon name="sparkle" size={size} className="shrink-0 text-[#38bdf8]" />;
  }

  // Databases
  if (norm === "postgresql" || norm === "postgres") {
    return <SiPostgresql size={size} className="shrink-0 text-[#336791]" aria-hidden="true" />;
  }
  if (norm === "mongodb" || norm === "mongo") {
    return <SiMongodb size={size} className="shrink-0 text-[#47a248]" aria-hidden="true" />;
  }
  if (norm === "redis") {
    return <SiRedis size={size} className="shrink-0 text-[#dc382d]" aria-hidden="true" />;
  }

  // Cloud & DevOps
  if (norm.includes("aws")) {
    return <FaAws size={size} className="shrink-0 text-[#ff9900]" aria-hidden="true" />;
  }
  if (norm === "docker") {
    return <SiDocker size={size} className="shrink-0 text-[#2496ed]" aria-hidden="true" />;
  }
  if (norm === "nginx") {
    return <SiNginx size={size} className="shrink-0 text-[#009639]" aria-hidden="true" />;
  }
  if (norm === "git") {
    return <SiGit size={size} className="shrink-0 text-[#f05032]" aria-hidden="true" />;
  }
  if (norm === "github") {
    return <FaGithub size={size} className="shrink-0 text-white" aria-hidden="true" />;
  }
  if (norm === "github actions") {
    return <SiGithubactions size={size} className="shrink-0 text-[#2088ff]" aria-hidden="true" />;
  }

  // Platforms
  if (norm.includes("odoo")) {
    return <Codicon name="layers" size={size} className="shrink-0 text-[#38bdf8]" />;
  }
  if (norm.includes("theme")) {
    return <Codicon name="paintcan" size={size} className="shrink-0 text-[#38bdf8]" />;
  }
  if (norm.includes("website editor") || norm.includes("editor")) {
    return <Codicon name="layout" size={size} className="shrink-0 text-[#38bdf8]" />;
  }
  if (norm.includes("backend view") || norm.includes("view")) {
    return <Codicon name="table" size={size} className="shrink-0 text-[#38bdf8]" />;
  }

  // Testing & QA
  if (norm.includes("functional")) {
    return <Codicon name="check" size={size} className="shrink-0 text-[#38bdf8]" />;
  }
  if (norm.includes("integration")) {
    return <Codicon name="git-pull-request" size={size} className="shrink-0 text-[#38bdf8]" />;
  }
  if (norm.includes("manual")) {
    return <Codicon name="pass" size={size} className="shrink-0 text-[#38bdf8]" />;
  }
  if (norm.includes("bug") || norm.includes("defect") || norm.includes("reproduction")) {
    return <Codicon name="bug" size={size} className="shrink-0 text-[#38bdf8]" />;
  }
  if (norm.includes("ble") || norm.includes("wi-fi") || norm.includes("device")) {
    return <Codicon name="broadcast" size={size} className="shrink-0 text-[#38bdf8]" />;
  }

  // Data & ML
  if (norm.includes("pandas")) {
    return <SiPandas size={size} className="shrink-0 text-[#38bdf8]" aria-hidden="true" />;
  }
  if (norm.includes("optuna")) {
    return <SiOptuna size={size} className="shrink-0 text-[#06b6d4]" aria-hidden="true" />;
  }
  if (norm.includes("machine learning") || norm.includes("ml")) {
    return <Codicon name="sparkle" size={size} className="shrink-0 text-[#a855f7]" />;
  }
  if (norm.includes("lightgbm")) {
    return <Codicon name="zap" size={size} className="shrink-0 text-[#eab308]" />;
  }
  if (norm.includes("classification")) {
    return <Codicon name="git-branch" size={size} className="shrink-0 text-[#a855f7]" />;
  }
  if (norm.includes("shap")) {
    return <Codicon name="graph" size={size} className="shrink-0 text-[#ec4899]" />;
  }
  if (norm.includes("data process") || norm.includes("processing")) {
    return <Codicon name="server-process" size={size} className="shrink-0 text-[#3b82f6]" />;
  }

  // Default fallback
  return <Codicon name="symbol-misc" size={size} className="shrink-0 text-vscode-dim" />;
}

