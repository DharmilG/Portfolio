"use client";

// About — visual profile hero, core capability pillars, quick navigation,
// recommended books, and embedded interactive terminal (Dark Modern aesthetic).
// Exclusively consumes global font tokens (--text-page-*).
import { useMemo } from "react";
import { buildAboutTerminalData } from "@/lib/about-terminal";
import { resumeDownloadUrl } from "@/lib/resume";
import { useStore } from "@/lib/store";
import Codicon from "../Codicon";
import AboutTerminal from "./AboutTerminal";
import { PageShell } from "./PageShell";

const FEATURED_BOOKS = [
  {
    title: "Designing Data-Intensive Applications",
    tag: "Distributed Systems",
    author: "Martin Kleppmann",
    borderClass: "border-l-[#3b8eea]",
    tagClass: "text-[#3b8eea] border-[#3b8eea]/30 bg-[#3b8eea]/10",
    description:
      "Shaped how I think about replication, indexing, idempotency, and event-driven consistency in Go backends.",
  },
  {
    title: "Let Us Go / Concurrency in Go",
    tag: "Backend & Go",
    author: "Katherine Cox-Buday",
    borderClass: "border-l-[#00c7d4]",
    tagClass: "text-[#00c7d4] border-[#00c7d4]/30 bg-[#00c7d4]/10",
    description:
      "Taught me clean goroutine lifecycles, worker pools, and backpressure patterns without race conditions.",
  },
  {
    title: "The Pragmatic Programmer",
    tag: "Engineering Craft",
    author: "Andrew Hunt & David Thomas",
    borderClass: "border-l-[#23d18b]",
    tagClass: "text-[#23d18b] border-[#23d18b]/30 bg-[#23d18b]/10",
    description:
      'Where my habit of "testing what I ship" and owning end-to-end reliability from DB to UI comes from.',
  },
  {
    title: "Atomic Habits",
    tag: "Mindset",
    author: "James Clear",
    borderClass: "border-l-[#e5ba7d]",
    tagClass: "text-[#e5ba7d] border-[#e5ba7d]/30 bg-[#e5ba7d]/10",
    description:
      "Small daily compounding: writing one clean module, fixing one edge case, and shipping consistently.",
  },
];

export default function AboutPage() {
  const content = useStore((s) => s.profile);
  const projects = useStore((s) => s.projects);
  const projectGroups = useStore((s) => s.projectGroups);
  const openTab = useStore((s) => s.openTab);
  const showView = useStore((s) => s.showView);
  const revealPath = useStore((s) => s.revealPath);

  const resumeHref = resumeDownloadUrl(content?.settings?.resume);

  const data = useMemo(
    () => buildAboutTerminalData(content, projects, projectGroups, resumeHref),
    [content, projects, projectGroups, resumeHref],
  );

  if (!content || !data) {
    return (
      <PageShell icon="person" iconClassName="text-[#38bdf8]" title="About">
        <p className="text-page-body text-vscode-dim">Loading your profile…</p>
      </PageShell>
    );
  }

  const initials = data.name
    ? data.name
        .split(" ")
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "DG";

  const handleOpenBooks = () => {
    const el = document.getElementById("about-terminal-container");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

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
        data.availability ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/60 bg-emerald-950/40 px-3.5 py-1 text-page-micro font-medium text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>{data.availability}</span>
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
                  {data.name || "Dharmil Gajjar"}
                </h2>
                <p className="mt-0.5 text-page-meta text-vscode-muted">
                  {data.role || "Full-Stack & Backend Engineer"}
                  {data.location ? ` · ${data.location}` : ""}
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

          {/* Narrative Story / Intro */}
          <div className="mt-6 space-y-4 border-t border-vscode-border/50 pt-5 text-page-body leading-relaxed text-vscode-fg">
            <p>
              I&apos;m a final-year Information & Communication Technology student at{" "}
              <strong className="font-semibold text-vscode-fg-active">
                Adani University
              </strong>{" "}
              who loves building software from the database schema all the way to
              the user interface. My sweet spot is{" "}
              <strong className="font-semibold text-vscode-fg-active">
                backend engineering in Go, TypeScript, and Python
              </strong>{" "}
              — designing clean APIs, event-driven workflows, and systems that
              stay fast under real load.
            </p>
            <p>
              What sets how I work apart is simple:{" "}
              <strong className="font-semibold text-vscode-fg-active">
                I test what I ship.
              </strong>{" "}
              Whether I&apos;m architecting a custom Odoo 19 e-commerce storefront
              or verifying BLE and Wi-Fi hardware signals across a React Native
              IoT app at{" "}
              <strong className="font-semibold text-vscode-fg-active">
                Northstar Innovations
              </strong>
              , I care deeply about edge cases, reliability, and making products
              effortless for real people to use.
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
              <span className="text-page-meta text-vscode-dim transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                ↗
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
              <span className="text-page-meta text-vscode-dim transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                ↗
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
              <span className="text-page-meta text-vscode-dim transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                ↗
              </span>
            </div>
            <div className="mt-3">
              <div className="text-page-body font-semibold text-vscode-fg-active">
                Hackathons
              </div>
              <div className="mt-0.5 text-page-meta text-vscode-muted">
                2-day rapid team builds
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
              <span className="text-page-meta text-vscode-dim transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                ↗
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

        {/* 3. Books I've Read Section */}
        <section aria-label="Books I've read" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Codicon name="book" size={16} className="text-[#38bdf8]" />
              <h3 className="text-page-meta font-semibold uppercase tracking-wider text-vscode-emphasis">
                Books I&apos;ve Read
              </h3>
            </div>
            <button
              type="button"
              onClick={handleOpenBooks}
              className="text-page-micro text-vscode-markdown-link hover:underline"
            >
              Open full bookshelf →
            </button>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            {FEATURED_BOOKS.map((book) => (
              <div
                key={book.title}
                className={`rounded-control border-y border-r border-l-4 border-vscode-page-border bg-vscode-page-card p-4.5 transition-colors hover:bg-vscode-page-card-hover ${book.borderClass}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-page-body font-semibold text-vscode-fg-active">
                    {book.title}
                  </h4>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-page-micro font-medium ${book.tagClass}`}
                  >
                    {book.tag}
                  </span>
                </div>
                <div className="mt-1 text-page-meta text-vscode-muted">
                  {book.author}
                </div>
                <p className="mt-2.5 text-page-meta leading-relaxed text-vscode-dim">
                  {book.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Embedded Interactive Terminal */}
        <div id="about-terminal-container" className="pt-2">
          <AboutTerminal data={data} />
        </div>
      </div>
    </PageShell>
  );
}
