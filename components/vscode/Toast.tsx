"use client";

// Toast — the notification stack (PV-UI-TOAST).
// Desktop & tablet: VS Code notification toast sliding in from bottom-right
// above the status bar, styled like native VS Code notification widgets.
import { useEffect } from "react";
import { useStore, type ToastKind } from "@/lib/store";
import Codicon from "./Codicon";

const LIFETIME = 3500;

const ICON: Record<ToastKind, string> = {
  info: "info",
  success: "pass",
  warning: "warning",
};

export default function Toast() {
  const toasts = useStore((s) => s.toasts);
  const dismissToast = useStore((s) => s.dismissToast);

  // Auto-dismiss each toast after LIFETIME
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      window.setTimeout(() => dismissToast(t.id), LIFETIME),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [toasts, dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-8 right-4 z-50 flex w-[380px] max-w-[calc(100vw-2rem)] flex-col gap-2.5 select-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-3 rounded-control border border-vscode-widget-border bg-vscode-widget-bg p-3.5 text-vscode-fg shadow-vscode animate-vscode-slide-in"
        >
          <Codicon
            name={ICON[t.kind]}
            size={16}
            className={`mt-0.5 shrink-0 ${
              t.kind === "success"
                ? "text-[#23d18b]"
                : t.kind === "warning"
                  ? "text-[#cca700]"
                  : "text-[#0078d4]"
            }`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] leading-relaxed text-vscode-fg select-text">
              {t.message}
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => dismissToast(t.id)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-control text-vscode-dim hover:bg-vscode-list-hover hover:text-vscode-fg focus-visible:outline focus-visible:outline-1 focus-visible:outline-vscode-accent transition-colors"
          >
            <Codicon name="close" size={14} />
          </button>
        </div>
      ))}
    </aside>
  );
}
