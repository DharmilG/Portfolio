"use client";

// Toast — the notification stack (PV-UI-TOAST). VS Code shows notifications
// in the top-right corner of the window: a small card with an icon, the
// message and a close button; it fades away on its own. The stack lives in
// the store (session-only) and is mounted once by the portfolio page.
import { useEffect } from "react";
import { useStore, type ToastKind } from "@/lib/store";
import Codicon from "./Codicon";

const LIFETIME = 4500;

const ICON: Record<ToastKind, string> = {
  info: "info",
  success: "pass",
  warning: "warning",
};

export default function Toast() {
  const toasts = useStore((s) => s.toasts);
  const dismissToast = useStore((s) => s.dismissToast);

  // Each toast dismisses itself; the timer is keyed by the toast id.
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      window.setTimeout(() => dismissToast(t.id), LIFETIME),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [toasts, dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-11 z-40 flex w-80 flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-2 rounded-control border border-vscode-widget-border bg-vscode-widget-bg px-3 py-2 text-xs text-vscode-fg shadow-vscode"
        >
          <Codicon
            name={ICON[t.kind]}
            size={14}
            className={`mt-0.5 shrink-0 ${
              t.kind === "success"
                ? "text-vscode-added"
                : t.kind === "warning"
                  ? "text-vscode-warning"
                  : "text-vscode-accent"
            }`}
          />
          <span className="min-w-0 flex-1 break-words">{t.message}</span>
          <button
            type="button"
            aria-label={`Dismiss: ${t.message}`}
            onClick={() => dismissToast(t.id)}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-control text-vscode-dim hover:bg-vscode-list-hover hover:text-vscode-fg"
          >
            <Codicon name="close" size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
