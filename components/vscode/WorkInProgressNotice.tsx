"use client";

// WorkInProgressNotice — mobile/tablet-only recommendation banner.
// Desktop visitors get the full workbench with no notice; smaller viewports get
// a compact, dismissible banner suggesting the desktop experience.
import { useEffect, useState } from "react";
import Codicon from "./Codicon";

const STORAGE_KEY = "vscode-wip-dismissed";

export default function WorkInProgressNotice() {
  const [mounted, setMounted] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSmallViewport, setIsSmallViewport] = useState(false);

  useEffect(() => {
    setMounted(true);
    const dismissed = sessionStorage.getItem(STORAGE_KEY) === "true";
    if (!dismissed) setIsDismissed(false);

    const query = window.matchMedia("(max-width: 1023px)");
    const syncViewport = () => setIsSmallViewport(query.matches);
    syncViewport();
    query.addEventListener("change", syncViewport);
    return () => query.removeEventListener("change", syncViewport);
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
    }, 200);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  if (!mounted || isDismissed || !isSmallViewport) return null;

  return (
    <aside
      aria-label="Desktop view recommendation"
      className={`fixed bottom-4 left-4 right-4 z-40 select-none ${
        isExiting ? "animate-vscode-slide-out" : "animate-vscode-slide-in"
      }`}
    >
      <div className="flex flex-col gap-2 rounded-control border border-vscode-widget-border bg-vscode-widget-bg p-3 text-vscode-fg shadow-vscode">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Codicon
              name="device-desktop"
              size={15}
              className="mt-0.5 shrink-0 text-vscode-accent"
            />
            <span className="text-xs font-semibold text-vscode-fg-active">
              Best viewed on desktop
            </span>
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={handleDismiss}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-control text-vscode-dim transition-colors hover:bg-vscode-list-hover hover:text-vscode-fg focus-visible:outline focus-visible:outline-1 focus-visible:outline-vscode-accent"
          >
            <Codicon name="close" size={14} />
          </button>
        </div>

        <p className="text-[12px] leading-snug text-vscode-muted">
          This portfolio is a desktop VS Code workspace. Some sections may be
          constrained on smaller screens.
        </p>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex h-[26px] items-center gap-1.5 rounded-control px-2 text-[11px] text-vscode-muted transition-colors hover:bg-vscode-list-hover hover:text-vscode-fg"
          >
            <Codicon
              name={copied ? "check" : "copy"}
              size={12}
              className={copied ? "text-vscode-added" : undefined}
            />
            <span>{copied ? "Link Copied!" : "Copy Link"}</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="h-[26px] rounded-control bg-vscode-accent px-3 text-[11px] font-medium text-vscode-badge-fg transition-colors hover:bg-vscode-accent-hover"
          >
            Got it
          </button>
        </div>
      </div>
    </aside>
  );
}
