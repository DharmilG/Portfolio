"use client";

// About — visual profile hero, core capability pillars, and quick navigation.
// Exclusively consumes global font tokens (--text-page-*).
import { resumeDownloadUrl } from "@/lib/resume";
import { useStore } from "@/lib/store";
import Codicon from "../Codicon";
import { PageShell } from "./PageShell";

export default function AboutPage() {
  const content = useStore((s) => s.profile);
  const openTab = useStore((s) => s.openTab);
  const showView = useStore((s) => s.showView);
  const revealPath = useStore((s) => s.revealPath);

  const resumeHref = resumeDownloadUrl(content?.settings?.resume);

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
              {resumeHref ? (
                <a
                  href={resumeHref}
                  download
                  className="inline-flex items-center gap-2 rounded-control bg-vscode-accent px-4 py-1.5 text-page-meta font-medium text-white transition-colors hover:bg-vscode-accent-hover"
                >
                  <Codicon name="file-pdf" size={15} />
                  <span>Resume</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => openTab({ kind: "page", path: "resume", sha: null })}
                  className="inline-flex items-center gap-2 rounded-control bg-vscode-accent px-4 py-1.5 text-page-meta font-medium text-white transition-colors hover:bg-vscode-accent-hover"
                >
                  <Codicon name="file-pdf" size={15} />
                  <span>Resume</span>
                </button>
              )}

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

          {/* 3 Core Capability Cards with Distinct Colored Icons */}
          <div className="mt-7 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-control border border-vscode-page-border bg-[#141516] p-4.5 transition-colors hover:border-vscode-border">
              <div className="flex items-center gap-2.5">
                <Codicon
                  name="server-process"
                  size={18}
                  className="text-[#38bdf8]"
                />
                <h3 className="text-page-body font-semibold text-vscode-fg-active">
                  Backend & Distributed Systems
                </h3>
              </div>
              <p className="mt-2 text-page-meta leading-relaxed text-vscode-muted">
                Building high-throughput services in Go & Node.js with
                PostgreSQL, Redis caching, and AWS queues.
              </p>
            </div>

            <div className="rounded-control border border-vscode-page-border bg-[#141516] p-4.5 transition-colors hover:border-vscode-border">
              <div className="flex items-center gap-2.5">
                <Codicon
                  name="verified"
                  size={18}
                  className="text-[#4ade80]"
                />
                <h3 className="text-page-body font-semibold text-vscode-fg-active">
                  I Test What I Ship
                </h3>
              </div>
              <p className="mt-2 text-page-meta leading-relaxed text-vscode-muted">
                End-to-end ownership across functional, integration, and
                hardware-level BLE/Wi-Fi verification.
              </p>
            </div>

            <div className="rounded-control border border-vscode-page-border bg-[#141516] p-4.5 transition-colors hover:border-vscode-border sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5">
                <Codicon
                  name="zap"
                  size={18}
                  className="text-[#fb923c]"
                />
                <h3 className="text-page-body font-semibold text-vscode-fg-active">
                  Product-Minded Full-Stack
                </h3>
              </div>
              <p className="mt-2 text-page-meta leading-relaxed text-vscode-muted">
                Turning complex admin & storefront workflows into clean
                Next.js, React, and Odoo 19 interfaces.
              </p>
            </div>
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
              <span className="text-page-body font-mono text-vscode-dim transition-transform group-hover:translate-x-1">
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
              <span className="text-page-body font-mono text-vscode-dim transition-transform group-hover:translate-x-1">
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
              <span className="text-page-body font-mono text-vscode-dim transition-transform group-hover:translate-x-1">
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
            onClick={handleOpenPreviews}
            className="group flex flex-col justify-between rounded-control border border-vscode-page-border bg-vscode-page-card p-4 text-left transition-all hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover"
          >
            <div className="flex items-center justify-between">
              <Codicon
                name="globe"
                size={18}
                className="text-[#38bdf8]"
              />
              <span className="text-page-body font-mono text-vscode-dim transition-transform group-hover:translate-x-1">
                →
              </span>
            </div>
            <div className="mt-3">
              <div className="text-page-body font-semibold text-vscode-fg-active">
                Live Previews
              </div>
              <div className="mt-0.5 text-page-meta text-vscode-muted">
                Open integrated browser
              </div>
            </div>
          </button>
        </div>
      </div>
    </PageShell>
  );
}
