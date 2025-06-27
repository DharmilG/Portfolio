"use client";

// Modal — VS Code-style center dialog (widget surface, no backdrop dim,
// Esc cancels, primary button focused). Buttons render left-to-right in the
// caller's order; `primary` gets the accent fill. First user: the tab
// close-confirmation (Tabs.tsx); later: discard-edit + commit confirmations.
// See DOC/05 §6.
import { useEffect } from "react";

type ModalButton = {
  id: string;
  label: string;
  primary?: boolean;
};

type ModalProps = {
  message: string;
  buttons: ModalButton[];
  onAction: (id: string) => void;
  onCancel: () => void;
};

export default function Modal({
  message,
  buttons,
  onAction,
  onCancel,
}: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={message}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div className="w-[420px] max-w-[90vw] rounded-section border border-vscode-widget-border bg-vscode-widget-bg px-5 py-4 shadow-vscode">
        <p className="text-[13px] leading-relaxed text-vscode-fg">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          {buttons.map((b) => (
            <button
              key={b.id}
              type="button"
              autoFocus={b.primary}
              onClick={() => onAction(b.id)}
              className={`h-[26px] rounded-control px-3 text-[13px] focus-visible:outline focus-visible:outline-1 focus-visible:outline-vscode-accent ${
                b.primary
                  ? "bg-vscode-accent text-vscode-badge-fg hover:bg-vscode-accent-hover"
                  : "bg-vscode-input-bg text-vscode-fg hover:bg-vscode-widget-border"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
