"use client";

// UnifiedResume — continuous single-page scroll resume canvas.
// Integrates About, Resume, Experience, Education, Skills, Hackathons, and Contact
// into one continuous-scroll editor surface (max-width: 860px, padding: 40px 36px 72px,
// space-y-16 with subtle #232323 horizontal dividers).
// Synchronizes scroll-spy with the Explorer sidebar and handles smooth cubic easing.
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandIcon } from "@/lib/iconThemes";
import { resumeDownloadUrl, resumeSetting, resumeUrl } from "@/lib/resume";
import { smoothScrollTo } from "@/lib/scroll";
import {
  useStore,
  type ExperienceAchievement,
  type ExperiencePhase,
} from "@/lib/store";
import Codicon from "../Codicon";
import SkillIcon from "../SkillIcon";
import Tooltip from "../Tooltip";

type SectionItem = {
  id: string;
  slug: string;
  title: string;
  icon: string;
  iconColor: string;
};

const SECTIONS: SectionItem[] = [
  { id: "sec-about", slug: "about", title: "About", icon: "person", iconColor: "text-[#38bdf8]" },
  { id: "sec-experience", slug: "experience", title: "Experience", icon: "briefcase", iconColor: "text-[#60a5fa]" },
  { id: "sec-education", slug: "education", title: "Education", icon: "mortar-board", iconColor: "text-[#c084fc]" },
  { id: "sec-skills", slug: "skills", title: "Skills", icon: "code", iconColor: "text-[#4ade80]" },
  { id: "sec-hackathons", slug: "hackathons", title: "Hackathons", icon: "flame", iconColor: "text-[#fb923c]" },
  { id: "sec-contact", slug: "contact", title: "Contact", icon: "mail", iconColor: "text-[#facc15]" },
];

export default function UnifiedResume() {
  const content = useStore((s) => s.profile);
  const openTab = useStore((s) => s.openTab);
  const activeSection = useStore((s) => s.activeSection);
  const setActiveSection = useStore((s) => s.setActiveSection);
  const scrollTargetSection = useStore((s) => s.scrollTargetSection);
  const setScrollTargetSection = useStore((s) => s.setScrollTargetSection);
  const pushToast = useStore((s) => s.pushToast);
  const openBrowser = useStore((s) => s.openBrowser);
  const showView = useStore((s) => s.showView);
  const revealPath = useStore((s) => s.revealPath);

  const containerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);
  const scrollCancelRef = useRef<(() => void) | null>(null);

  // Experience filter state
  const [expFilter, setExpFilter] = useState<string>("All");
  // Contact copy states
  const [copiedKind, setCopiedKind] = useState<"email" | "phone" | null>(null);

  // Resume data
  const resumeDownload = resumeDownloadUrl(content?.settings?.resume);
  const resumeHref = resumeUrl(content?.settings?.resume);
  const resumeSet = resumeSetting(content?.settings?.resume);

  // Work experience
  const workExp = (content?.experiences ?? []).find((e) => e.kind === "work");
  const hackathons = (content?.experiences ?? []).filter((e) => e.kind === "hackathon");
  const education = content?.education ?? [];
  const skillGroups = content?.skills ?? [];
  const profileData = content?.profile?.data ?? {};
  const email = String(profileData.email ?? "");
  const phone = String(profileData.phone ?? "");
  const location = content?.profile?.location ?? "Ahmedabad, Gujarat, India";
  const availability = String(profileData.availability ?? "Open to full-stack / backend roles");
  const socials = content?.socials ?? [];

  // Extract all 7 deliverables from Northstar Innovations phases
  const deliverables = useMemo(() => {
    if (!workExp?.phases) return [];
    const items: Array<{
      id: string;
      lead: string;
      body: string;
      tags: string[];
    }> = [];

    workExp.phases.forEach((phase: ExperiencePhase, phaseIdx: number) => {
      phase.achievements.forEach((ach: ExperienceAchievement, achIdx: number) => {
        items.push({
          id: `${workExp.id}-${phaseIdx}-${achIdx}`,
          lead: ach.lead,
          body: ach.body,
          tags: ach.tags && ach.tags.length > 0 ? ach.tags : phase.tags ?? [],
        });
      });
    });
    return items;
  }, [workExp]);

  // Programmatic scroll handler to smoothly scroll to a section anchor
  const scrollToAnchor = (slug: string) => {
    const container = containerRef.current;
    if (!container) return;

    // Cancel any active animation
    if (scrollCancelRef.current) scrollCancelRef.current();

    isProgrammaticScroll.current = true;
    setActiveSection(slug);
    useStore.getState().selectPath(slug);

    if (slug === "about") {
      scrollCancelRef.current = smoothScrollTo(container, 0, 550, () => {
        isProgrammaticScroll.current = false;
        setScrollTargetSection(null);
        scrollCancelRef.current = null;
      });
      return;
    }

    const targetEl = document.getElementById(`sec-${slug}`);
    if (!targetEl) {
      isProgrammaticScroll.current = false;
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const currentRelativeTop = targetRect.top - containerRect.top;
    // Keep 20px padding above the section heading so it remains comfortably in view
    const targetTop = Math.max(0, container.scrollTop + currentRelativeTop - 20);

    scrollCancelRef.current = smoothScrollTo(container, targetTop, 550, () => {
      isProgrammaticScroll.current = false;
      setScrollTargetSection(null);
      scrollCancelRef.current = null;
    });
  };

  // Consume scrollTargetSection from external triggers (Explorer sidebar, etc.)
  useEffect(() => {
    if (scrollTargetSection) {
      scrollToAnchor(scrollTargetSection);
    }
  }, [scrollTargetSection]);

  // Scroll-spy listener: calculates active section during manual user scrolling
  const handleScroll = () => {
    if (isProgrammaticScroll.current) return;
    const container = containerRef.current;
    if (!container) return;

    // When scrolled to or very near the bottom of the scrollable container, lock to the last section
    const isAtBottom =
      container.scrollTop + container.clientHeight >= container.scrollHeight - 40;

    if (isAtBottom) {
      const lastSection = SECTIONS[SECTIONS.length - 1];
      if (lastSection && activeSection !== lastSection.slug) {
        setActiveSection(lastSection.slug);
        useStore.getState().selectPath(lastSection.slug);
      }
      return;
    }

    const containerRect = container.getBoundingClientRect();
    let currentSlug = SECTIONS[0].slug;

    for (const sec of SECTIONS) {
      const el = document.getElementById(sec.id);
      if (el) {
        const topRelativeToContainer = el.getBoundingClientRect().top - containerRect.top;
        if (topRelativeToContainer <= 100) {
          currentSlug = sec.slug;
        }
      }
    }

    if (currentSlug !== activeSection) {
      setActiveSection(currentSlug);
      useStore.getState().selectPath(currentSlug);
    }
  };

  const copyToClipboard = async (value: string, kind: "email" | "phone") => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKind(kind);
      pushToast(
        `${kind === "email" ? "Email" : "Phone number"} ${value} copied to clipboard`,
        "success",
      );
      setTimeout(() => setCopiedKind(null), 2000);
    } catch {
      pushToast(`Could not copy the ${kind}`, "warning");
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="relative min-h-0 flex-1 overflow-y-auto bg-vscode-editor selection:bg-vscode-quick-match/30"
    >
      <div className="mx-auto w-full max-w-[860px] px-6 py-10 pb-20 sm:px-9 space-y-16">
        {/* ================================================================= */}
        {/* 1. ABOUT SECTION                                                  */}
        {/* ================================================================= */}
        <section id="sec-about" className="scroll-mt-6 space-y-6">
          {/* Section Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-vscode-activity-active-bg text-[#38bdf8]">
                <Codicon name="person" size={18} />
              </span>
              <h1 className="text-page-title font-semibold text-vscode-fg-active">
                About
              </h1>
            </div>

            {availability ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/60 bg-emerald-950/40 px-3.5 py-1 text-page-micro font-medium text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>{availability}</span>
              </div>
            ) : null}
          </div>

          {/* Profile Hero Card */}
          <div className="rounded-control border border-vscode-page-border bg-vscode-page-card p-6 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-vscode-accent text-page-lead font-bold tracking-tight text-white shadow-sm">
                  DG
                </div>
                <div>
                  <h2 className="text-page-title font-bold tracking-tight text-vscode-fg-active">
                    Dharmil Gajjar
                  </h2>
                  <p className="mt-0.5 text-page-meta text-vscode-muted">
                    Full-Stack & Backend Engineer · {location}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <a
                  href={resumeHref || "/Dharmil_Gajjar_Resume.pdf"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-control bg-vscode-accent px-4 py-1.5 text-page-meta font-medium text-white transition-colors hover:bg-vscode-accent-hover"
                >
                  <Codicon name="file-pdf" size={15} />
                  <span>Resume</span>
                </a>

                <button
                  type="button"
                  onClick={() => scrollToAnchor("contact")}
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
          </div>

          {/* 4 Quick Navigation Cards */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => scrollToAnchor("experience")}
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
              onClick={() => scrollToAnchor("skills")}
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
              onClick={() => scrollToAnchor("hackathons")}
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
        </section>

        {/* Subtle Horizontal Divider */}
        <div className="h-px w-full bg-[#232323]" />

        {/* ================================================================= */}
        {/* 2. EXPERIENCE SECTION                                             */}
        {/* ================================================================= */}
        <section id="sec-experience" className="scroll-mt-6 space-y-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-vscode-activity-active-bg text-[#60a5fa]">
              <Codicon name="briefcase" size={18} />
            </span>
            <h2 className="text-page-title font-semibold text-vscode-fg-active">
              Experience
            </h2>
          </div>

          {/* Northstar Innovations Company Card + Filter Pills */}
          <div className="rounded-control border border-vscode-page-border bg-vscode-page-card p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h3 className="text-page-lead font-bold text-vscode-fg-active">
                  {workExp?.company || "Northstar Innovations"}
                </h3>
                <p className="mt-0.5 text-page-meta text-vscode-muted">
                  {workExp?.role || "Full-Stack Developer & QA Engineer"} · {workExp?.period || "Jan 2026 – Present"}
                </p>
              </div>

              {workExp?.location ? (
                <div className="flex items-center gap-1.5 text-page-micro text-vscode-dim">
                  <Codicon name="location" size={13} />
                  <span>{workExp.location}</span>
                </div>
              ) : null}
            </div>

            {/* Interactive Stack Filter Pills Bar */}
            <div className="mt-5 border-t border-vscode-border/50 pt-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-page-micro font-medium uppercase tracking-wider text-vscode-dim">
                  Filter Deliverables by Stack
                </span>
                {expFilter !== "All" ? (
                  <button
                    type="button"
                    onClick={() => setExpFilter("All")}
                    className="text-page-micro text-vscode-quick-match hover:underline"
                  >
                    Reset Filter
                  </button>
                ) : null}
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {["All", "Odoo 19", "JavaScript", "Python", "React Native", "QA"].map((pill) => {
                  const active = expFilter === pill;
                  return (
                    <button
                      key={pill}
                      type="button"
                      onClick={() => setExpFilter(pill)}
                      className={`flex h-7 items-center gap-1.5 rounded-control border px-3 text-page-micro font-medium transition-colors ${active
                          ? "border-vscode-accent bg-vscode-accent/20 text-white"
                          : "border-vscode-page-border bg-vscode-page-chip text-vscode-muted hover:border-vscode-accent/50 hover:text-vscode-fg"
                        }`}
                    >
                      {active && pill !== "All" ? <Codicon name="check" size={11} /> : null}
                      <span>{pill}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 7 Deliverables in a Clean 2-Column Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {deliverables.map((item) => {
              const matches =
                expFilter === "All" ||
                item.tags.some((t) => t.toLowerCase().includes(expFilter.toLowerCase()));

              return (
                <div
                  key={item.id}
                  className={`group relative flex flex-col justify-between rounded-control border bg-vscode-page-card p-4.5 transition-all duration-200 ${matches
                      ? "border-vscode-page-border opacity-100 hover:border-vscode-accent/50 hover:bg-vscode-page-card-hover"
                      : "border-vscode-page-border/50 opacity-30 pointer-events-none"
                    }`}
                >
                  <div>
                    {item.lead ? (
                      <h4 className="text-page-body font-bold text-vscode-fg-active">
                        {item.lead}
                      </h4>
                    ) : null}
                    <p className="mt-1.5 text-page-meta leading-relaxed text-vscode-muted">
                      {item.body}
                    </p>
                  </div>

                  {item.tags.length > 0 ? (
                    <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-vscode-border/30 pt-2.5">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-control border border-vscode-page-border bg-[#141516] px-2 py-0.5 text-page-micro font-medium text-vscode-dim"
                        >
                          <SkillIcon name={tag} size={12} />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        {/* Subtle Horizontal Divider */}
        <div className="h-px w-full bg-[#232323]" />

        {/* ================================================================= */}
        {/* 3. EDUCATION SECTION                                              */}
        {/* ================================================================= */}
        <section id="sec-education" className="scroll-mt-6 space-y-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-vscode-activity-active-bg text-[#c084fc]">
              <Codicon name="mortar-board" size={18} />
            </span>
            <h2 className="text-page-title font-semibold text-vscode-fg-active">
              Education
            </h2>
          </div>

          <div className="relative pl-8 sm:pl-10">
            {/* Vertical timeline track */}
            <div
              aria-hidden
              className="absolute left-[5px] sm:left-[7px] top-6 bottom-6 w-[2px] bg-vscode-border"
            />
            <div className="space-y-6">
              {education.map((row) => (
                <div key={row.id} className="relative">
                  {/* Circular blue timeline node */}
                  <span
                    aria-hidden
                    className="absolute -left-[33px] sm:-left-[39px] top-6 h-3 w-3 rounded-full border-2 border-vscode-accent bg-vscode-editor ring-4 ring-vscode-editor"
                  />

                  {/* Education Card */}
                  <div className="rounded-control border border-vscode-page-border bg-vscode-page-card p-5 sm:p-6 transition-colors hover:border-vscode-accent/40">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-page-body font-bold text-vscode-fg-active">
                          {row.degree}
                        </span>
                        <span className="text-page-body text-vscode-muted">
                          {row.institution}
                        </span>
                      </div>
                      <span className="font-mono text-page-meta text-vscode-dim">
                        {row.period}
                      </span>
                    </div>

                    {row.field ? (
                      <div className="mt-2 text-page-meta font-medium text-vscode-fg">
                        {row.field}
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-page-micro">
                      {row.location ? (
                        <span className="flex items-center gap-1.5 text-vscode-dim">
                          <Codicon name="location" size={13} className="text-vscode-dim" />
                          <span>{row.location}</span>
                        </span>
                      ) : null}
                      {row.score ? (
                        <span className="rounded-control border border-vscode-page-border bg-vscode-page-chip px-2.5 py-0.5 font-medium text-vscode-fg">
                          {row.score}
                        </span>
                      ) : null}
                    </div>

                    {row.summary ? (
                      <p className="mt-3 max-w-[75ch] text-page-meta leading-relaxed text-vscode-muted">
                        {row.summary}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Subtle Horizontal Divider */}
        <div className="h-px w-full bg-[#232323]" />

        {/* ================================================================= */}
        {/* 4. SKILLS SECTION                                                 */}
        {/* ================================================================= */}
        <section id="sec-skills" className="scroll-mt-6 space-y-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-vscode-activity-active-bg text-[#4ade80]">
              <Codicon name="code" size={18} />
            </span>
            <h2 className="text-page-title font-semibold text-vscode-fg-active">
              Skills
            </h2>
          </div>

          <div className="space-y-4">
            {skillGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-control border border-vscode-page-border bg-vscode-page-card p-5"
              >
                <div className="mb-3.5 flex items-center justify-between">
                  <h3 className="text-page-body font-semibold text-vscode-fg-active">
                    {group.category}
                  </h3>
                  <span className="font-mono text-page-micro text-vscode-dim">
                    {group.items.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
                  {group.items.map((item) => (
                    <Tooltip key={item} text={item} position="top" delay={true} className="w-full">
                      <div className="flex w-full items-center gap-2.5 rounded-control border border-vscode-page-border bg-[#141516] px-3.5 py-2.5 transition-colors hover:border-vscode-accent/50 hover:bg-vscode-page-card-hover">
                        <SkillIcon name={item} size={16} />
                        <span className="truncate text-page-meta font-medium text-vscode-fg-active">
                          {item}
                        </span>
                      </div>
                    </Tooltip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Subtle Horizontal Divider */}
        <div className="h-px w-full bg-[#232323]" />

        {/* ================================================================= */}
        {/* 5. HACKATHONS SECTION                                             */}
        {/* ================================================================= */}
        <section id="sec-hackathons" className="scroll-mt-6 space-y-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-vscode-activity-active-bg text-[#fb923c]">
              <Codicon name="flame" size={18} />
            </span>
            <h2 className="text-page-title font-semibold text-vscode-fg-active">
              Hackathons
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {hackathons.map((event) => {
              const hasPreview = Boolean(event.url || event.role === "Cafe POS");
              const previewHref = event.url || "https://github.com/dharmil03";

              return (
                <div
                  key={event.id}
                  className="flex flex-col justify-between rounded-control border border-vscode-page-border bg-vscode-page-card p-6 transition-colors hover:border-vscode-accent/40"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-page-lead font-bold text-vscode-fg-active">
                        {event.role}
                      </h3>
                      {hasPreview ? (
                        <a
                          href={previewHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-control border border-vscode-accent/40 bg-vscode-accent/15 px-2.5 py-1 text-page-micro font-medium text-vscode-quick-match transition-colors hover:bg-vscode-accent/25"
                        >
                          <Codicon name="globe" size={13} />
                          <span>Preview</span>
                        </a>
                      ) : null}
                    </div>

                    <div className="mt-1 text-page-body font-medium text-vscode-muted">
                      {event.company}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-page-micro text-vscode-dim">
                      <span>{event.period}</span>
                      {event.location ? (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Codicon name="location" size={12} className="text-vscode-dim" />
                            <span>{event.location}</span>
                          </span>
                        </>
                      ) : null}
                    </div>

                    {event.summary ? (
                      <p className="mt-4 text-page-meta font-medium text-vscode-fg">
                        {event.summary}
                      </p>
                    ) : null}

                    {event.highlights.length > 0 ? (
                      <ul className="mt-4 space-y-2.5">
                        {event.highlights.map((line) => (
                          <li
                            key={line}
                            className="flex items-start gap-2.5 text-page-meta leading-relaxed text-vscode-muted"
                          >
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-vscode-accent" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  {event.tags.length > 0 ? (
                    <div className="mt-6 flex flex-wrap gap-2 border-t border-vscode-border/50 pt-4">
                      {event.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 rounded-control border border-vscode-page-border bg-[#141516] px-2.5 py-1 text-page-micro font-medium text-vscode-fg"
                        >
                          <SkillIcon name={tag} size={14} />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        {/* Subtle Horizontal Divider */}
        <div className="h-px w-full bg-[#232323]" />

        {/* ================================================================= */}
        {/* 6. CONTACT SECTION                                                */}
        {/* ================================================================= */}
        <section id="sec-contact" className="scroll-mt-6 space-y-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-vscode-activity-active-bg text-[#facc15]">
              <Codicon name="mail" size={18} />
            </span>
            <h2 className="text-page-title font-semibold text-vscode-fg-active">
              Contact
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Email & Phone Card */}
            <div className="rounded-control border border-vscode-page-border bg-vscode-page-card p-5">
              <div className="text-page-micro font-medium text-vscode-dim">Email</div>
              {email ? (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <a
                    href={`mailto:${email}`}
                    className="truncate font-mono text-page-body font-medium text-vscode-quick-match hover:underline"
                  >
                    {email}
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(email, "email")}
                    className="flex shrink-0 items-center gap-1.5 rounded-control border border-vscode-page-border bg-vscode-page-chip px-3 py-1 text-page-micro text-vscode-fg transition-colors hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover"
                  >
                    <Codicon
                      name={copiedKind === "email" ? "check" : "copy"}
                      size={12}
                      className={copiedKind === "email" ? "text-vscode-added" : "text-vscode-dim"}
                    />
                    <span>{copiedKind === "email" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              ) : null}

              {phone ? (
                <>
                  <div className="mt-5 text-page-micro font-medium text-vscode-dim">Phone</div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <a
                      href={`tel:${phone.replace(/\s+/g, "")}`}
                      className="truncate text-page-body font-medium text-vscode-fg-active hover:underline"
                    >
                      {phone}
                    </a>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(phone, "phone")}
                      className="flex shrink-0 items-center gap-1.5 rounded-control border border-vscode-page-border bg-vscode-page-chip px-3 py-1 text-page-micro text-vscode-fg transition-colors hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover"
                    >
                      <Codicon
                        name={copiedKind === "phone" ? "check" : "copy"}
                        size={12}
                        className={copiedKind === "phone" ? "text-vscode-added" : "text-vscode-dim"}
                      />
                      <span>{copiedKind === "phone" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </>
              ) : null}

              {location ? (
                <>
                  <div className="mt-5 text-page-micro font-medium text-vscode-dim">Location</div>
                  <div className="mt-2 flex items-center gap-2 text-page-body text-vscode-fg">
                    <Codicon name="location" size={14} className="text-vscode-dim" />
                    <span>{location}</span>
                  </div>
                </>
              ) : null}
            </div>

            {/* Elsewhere Links Card */}
            <div className="rounded-control border border-vscode-page-border bg-vscode-page-card p-5">
              <div className="text-page-micro font-medium text-vscode-dim">Elsewhere</div>
              <div className="mt-3 space-y-2">
                {socials.map((social) => {
                  const isGitHub = /github/i.test(social.label) || social.icon === "github";
                  const isLinkedIn =
                    /linkedin/i.test(social.label) ||
                    social.icon === "linkedin" ||
                    social.icon === "globe";

                  return (
                    <a
                      key={social.id}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-control border border-vscode-page-border bg-vscode-page-chip px-4 py-2.5 text-page-body text-vscode-fg transition-colors hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover"
                    >
                      {isGitHub ? (
                        <BrandIcon name="github" size={16} />
                      ) : isLinkedIn ? (
                        <BrandIcon name="linkedin" size={16} />
                      ) : (
                        <Codicon
                          name={social.icon}
                          size={15}
                          className="text-vscode-dim"
                        />
                      )}
                      <span className="truncate font-medium text-vscode-fg-active">
                        {social.label}
                      </span>
                      <Codicon
                        name="link-external"
                        size={13}
                        className="ml-auto text-vscode-dim"
                      />
                    </a>
                  );
                })}
              </div>

              {availability ? (
                <div className="mt-4 flex items-center gap-2 rounded-control border border-emerald-900/40 bg-emerald-950/20 px-3.5 py-2.5 text-page-micro text-emerald-400">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                  <span>{availability}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Low-Contrast Developer Tools Hint */}
          <div className="border-t border-vscode-border/40 pt-5 text-center">
            <p className="font-mono text-page-micro text-vscode-dim leading-relaxed">
              Prefer developer tools? You can optionally toggle the integrated terminal (
              <kbd className="rounded border border-vscode-border bg-vscode-editor px-1.5 py-0.5 text-vscode-muted">
                Ctrl+`
              </kbd>
              ) or preview URLs inside the integrated browser.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
