"use client";

// About — visual profile hero, core capability pillars, and quick navigation.
// Exclusively consumes global font tokens (--text-page-*).
import { resumeDownloadUrl, resumeUrl } from "@/lib/resume";
import { useStore } from "@/lib/store";
import Codicon from "../Codicon";
import { PageShell } from "./PageShell";

export default function AboutPage() {
  const content = useStore((s) => s.profile);
  const openTab = useStore((s) => s.openTab);
  const showView = useStore((s) => s.showView);
  const revealPath = useStore((s) => s.revealPath);

  const resumeHref = resumeUrl(content?.settings?.resume) || "/Dharmil_Gajjar_Resume.pdf";

  if (!content) {
    return (
      <PageShell icon="person" iconClassName="text-[#38bdf8]" title="About">
        <p className="text-page-body text-vscode-dim">Loading profile…</p>
      </PageShell>
    );
  }

  const profile = content.profile;
  const name = profile?.name || "Dharmil Gajjar";
  const role = profile?.bio || "Full-Stack & Backend Engineer";
  const location = profile?.location || "Ahmedabad, Gujarat, India";
  const profileData = profile?.data ?? {};
  const availability = String(profileData.availability ?? "Open to full-stack / backend roles");

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleOpenPreviews = () => {
    showView("explorer");
    revealPath("Projects");
  };

  return (
    <PageShell
      icon="person"
      iconClassName="text-[#38bdf8]"
      title="About"
      width="wide"
      headerRight={
        availability ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/60 bg-emerald-950/40 px-3.5 py-1 text-page-micro font-medium text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>{availability}</span>
          </div>
        ) : null
      }
    >
      <div className="space-y-6">
        {/* 1. Profile Hero Card */}
        <section
          aria-label="Profile overview"
          className="rounded-control border border-vscode-page-border bg-vscode-page-card p-6 shadow-sm sm:p-7"
        >
          {/* Header: Avatar, Name, Location & Quick Action Buttons */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-vscode-accent text-page-lead font-bold tracking-tight text-white shadow-sm">
                {initials}
              </div>
              <div>
                <h2 className="text-page-title font-bold tracking-tight text-vscode-fg-active">
                  {name}
                </h2>
                <p className="mt-0.5 text-page-meta text-vscode-muted">
                  {role} : {location}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <a
                href={resumeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-control bg-vscode-accent px-4 py-1.5 text-page-meta font-medium text-white transition-colors hover:bg-vscode-accent-hover"
              >
                <Codicon name="file-pdf" size={15} />
                <span>Resume</span>
              </a>

              <button
                type="button"
                onClick={() => openTab({ kind: "page", path: "contact", sha: null })}
                className="inline-flex items-center gap-2 rounded-control border border-vscode-page-border bg-vscode-page-chip px-4 py-1.5 text-page-meta font-medium text-vscode-fg transition-colors hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover"
              >
                <Codicon name="mail" size={15} />
                <span>Contact</span>
              </button>
            </div>
          </div>

          {/* Narrative Story / Intro in 2 paragraphs */}
          <div className="mt-6 space-y-4 border-t border-vscode-border/50 pt-5 text-page-body leading-relaxed text-vscode-fg">
            <p>
              I am Dharmil Gajjar, a final year ICT student at Adani University
              who enjoys building reliable software with Go, TypeScript, Python,
              and Next.js. Recently at Northstar Innovations, I developed a
              customizable Odoo 19 theme with reusable components for perfume
              shops and verified Bluetooth and WiFi workflows for a React
              Native IoT app.
            </p>
            <p>
              Working across both development and testing taught me to care
              about edge cases and how products behave in the real world. When
              I step away from my development environment, you will usually find
              me reading a good book, queuing up music, or out on the pitch
              playing and watching football.
            </p>
          </div>
        </section>

        {/* 2. 4 Quick Navigation Cards */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            onClick={() => openTab({ kind: "page", path: "experience", sha: null })}
            className="group flex flex-col justify-between rounded-control border border-vscode-page-border bg-vscode-page-card p-4 text-left transition-all hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover"
          >
            <div className="flex items-center justify-between">
              <Codicon
                name="briefcase"
                size={18}
                className="text-[#60a5fa]"
              />
              <span className="text-base font-semibold font-mono text-vscode-dim transition-transform group-hover:translate-x-1">
                →
              </span>
            </div>
            <div className="mt-3">
              <div className="text-page-body font-semibold text-vscode-fg-active">
                Experience
              </div>
              <div className="mt-0.5 text-page-meta text-vscode-muted">
                Northstar Innovations
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openTab({ kind: "page", path: "skills", sha: null })}
            className="group flex flex-col justify-between rounded-control border border-vscode-page-border bg-vscode-page-card p-4 text-left transition-all hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover"
          >
            <div className="flex items-center justify-between">
              <Codicon name="code" size={18} className="text-[#4ade80]" />
              <span className="text-base font-semibold font-mono text-vscode-dim transition-transform group-hover:translate-x-1">
                →
              </span>
            </div>
            <div className="mt-3">
              <div className="text-page-body font-semibold text-vscode-fg-active">
                Skills & Stack
              </div>
              <div className="mt-0.5 text-page-meta text-vscode-muted">
                Go, TS, React, AWS, QA
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openTab({ kind: "page", path: "hackathons", sha: null })}
            className="group flex flex-col justify-between rounded-control border border-vscode-page-border bg-vscode-page-card p-4 text-left transition-all hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover"
          >
            <div className="flex items-center justify-between">
              <Codicon
                name="flame"
                size={18}
                className="text-[#fb923c]"
              />
              <span className="text-base font-semibold font-mono text-vscode-dim transition-transform group-hover:translate-x-1">
                →
              </span>
            </div>
            <div className="mt-3">
              <div className="text-page-body font-semibold text-vscode-fg-active">
                Hackathons
              </div>
              <div className="mt-0.5 text-page-meta text-vscode-muted">
                participated in 2 hackathons
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => openTab({ kind: "page", path: "projects", sha: null })}
            className="group flex flex-col justify-between rounded-control border border-vscode-page-border bg-vscode-page-card p-4 text-left transition-all hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover"
          >
            <div className="flex items-center justify-between">
              <Codicon
                name="repo"
                size={18}
                className="text-[#e5ba7d]"
              />
              <span className="text-base font-semibold font-mono text-vscode-dim transition-transform group-hover:translate-x-1">
                →
              </span>
            </div>
            <div className="mt-3">
              <div className="text-page-body font-semibold text-vscode-fg-active">
                Projects
              </div>
              <div className="mt-0.5 text-page-meta text-vscode-muted">
                Explore full builds & repos
              </div>
            </div>
          </button>
        </div>
      </div>
    </PageShell>
  );
}
