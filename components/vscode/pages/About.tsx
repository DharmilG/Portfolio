"use client";

// About — the portfolio's front page as a single terminal surface. The first
// prompt answers `whoami`; every section (story, now, principles, experience,
// education, projects, skills, contact, resume) is one command or link away.
// The long-form editorial copy stays in profiles.about and is rendered by the
// terminal, never as a wall of page sections.
import { useMemo } from "react";
import { buildAboutTerminalData } from "@/lib/about-terminal";
import { resumeDownloadUrl } from "@/lib/resume";
import { useStore } from "@/lib/store";
import AboutTerminal from "./AboutTerminal";
import { PageShell } from "./PageShell";

export default function AboutPage() {
  const content = useStore((s) => s.profile);
  const projects = useStore((s) => s.projects);
  const projectGroups = useStore((s) => s.projectGroups);
  const resumeHref = resumeDownloadUrl(content?.settings?.resume);

  const data = useMemo(
    () => buildAboutTerminalData(content, projects, projectGroups, resumeHref),
    [content, projects, projectGroups, resumeHref],
  );

  if (!content || !data) {
    return (
      <PageShell icon="person" title="About">
        <p className="text-page-body text-vscode-dim">Loading your profile…</p>
      </PageShell>
    );
  }

  return (
    <PageShell icon="person" title="About">
      <AboutTerminal data={data} />
    </PageShell>
  );
}
