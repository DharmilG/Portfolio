"use client";

// WorkInProgressNotice — VS Code-style work-in-progress alerts.
// Desktop (≥1024px): Notification toast sliding in from left to right into
// the standard bottom-right notification slot, dismissible by the user.
// Tablet & Mobile (<1024px): Centered modal dialog advising users to view
// on a desktop screen, with "Continue Anyway" and "Copy Link" options.
// Session-based persistence (sessionStorage) prevents repeated interruptions.
import { useEffect, useState } from "react";
import Codicon from "./Codicon";

const STORAGE_KEY = "vscode-wip-dismissed";

export default function WorkInProgressNotice() {
  const [mounted, setMounted] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Only run on client after hydration
    setMounted(true);
    const dismissed = sessionStorage.getItem(STORAGE_KEY) === "true";
    if (!dismissed) {
      setIsDismissed(false);
    }

    const checkViewport = () => {
      setIsMobileOrTablet(window.matchMedia("(max-width: 1023px)").matches);
    };

    checkViewport();
    const mql = window.matchMedia("(max-width: 1023px)");
    mql.addEventListener("change", checkViewport);
    return () => mql.removeEventListener("change", checkViewport);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Storage quota or private mode fallback
    }
    window.setTimeout(() => {
      setIsDismissed(true);
      setIsExiting(false);
    }, 260);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback if clipboard API is restricted
      setCopied(false);
    }
  };

  if (!mounted || isDismissed) return null;

  // Tablet & Mobile: Prominent Warning Modal
  if (isMobileOrTablet) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Work in Progress Notice"
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity duration-200 ${
          isExiting ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="relative w-full max-w-[440px] rounded-section border border-vscode-widget-border bg-vscode-widget-bg p-5 text-vscode-fg shadow-vscode sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-vscode-accent/15 text-vscode-accent">
                <Codicon name="device-desktop" size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-vscode-fg-active">
                    Desktop Experience Recommended
                  </h2>
                </div>
                <span className="inline-block rounded-control bg-vscode-badge-bg/20 px-2 py-0.5 text-[10px] font-medium text-vscode-accent">
                  Work in Progress
                </span>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close dialog"
              onClick={handleDismiss}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control text-vscode-dim hover:bg-vscode-list-hover hover:text-vscode-fg focus-visible:outline focus-visible:outline-1 focus-visible:outline-vscode-accent transition-colors"
            >
              <Codicon name="close" size={14} />
            </button>
          </div>

          <p className="mt-4 text-[13px] leading-relaxed text-vscode-fg">
            Please open on desktop or larger screens to view the portfolio. This website is built as an interactive Visual Studio Code desktop environment and is currently a work in progress. Tablet and mobile viewports may display constrained or corrupted UI layouts.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex h-[30px] items-center justify-center gap-1.5 rounded-control bg-vscode-input-bg px-3 text-xs text-vscode-fg hover:bg-vscode-widget-border focus-visible:outline focus-visible:outline-1 focus-visible:outline-vscode-accent transition-colors"
            >
              <Codicon
                name={copied ? "check" : "copy"}
                size={13}
                className={copied ? "text-vscode-added" : "text-vscode-dim"}
              />
              <span>{copied ? "Link Copied!" : "Copy Link"}</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="h-[30px] rounded-control bg-vscode-accent px-4 text-xs font-medium text-vscode-badge-fg hover:bg-vscode-accent-hover focus-visible:outline focus-visible:outline-1 focus-visible:outline-vscode-accent transition-colors"
            >
              Continue Anyway
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop (≥1024px): VS Code Notification Card sliding in from left to right at bottom-right
  return (
    <aside
      aria-label="Work in Progress Notification"
      className={`fixed bottom-8 right-4 z-40 w-[380px] max-w-[calc(100vw-2rem)] select-none ${
        isExiting ? "animate-vscode-slide-out" : "animate-vscode-slide-in"
      }`}
    >
      <div className="flex flex-col gap-2 rounded-control border border-vscode-widget-border bg-vscode-widget-bg p-3.5 text-vscode-fg shadow-vscode">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Codicon
              name="warning"
              size={16}
              className="mt-0.5 shrink-0 text-vscode-warning"
            />
            <span className="text-xs font-semibold text-vscode-fg-active">
              Portfolio • Work in Progress
            </span>
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={handleDismiss}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-control text-vscode-dim hover:bg-vscode-list-hover hover:text-vscode-fg focus-visible:outline focus-visible:outline-1 focus-visible:outline-vscode-accent transition-colors"
          >
            <Codicon name="close" size={14} />
          </button>
        </div>

        <p className="text-[12.5px] leading-relaxed text-vscode-fg">
          This portfolio website is currently under active development. You may encounter incomplete sections, bugs, or temporary UI glitches.
        </p>

        <div className="mt-1 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="h-[26px] rounded-control bg-vscode-accent px-3.5 text-xs font-normal text-vscode-badge-fg hover:bg-vscode-accent-hover focus-visible:outline focus-visible:outline-1 focus-visible:outline-vscode-accent transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </aside>
  );
}
