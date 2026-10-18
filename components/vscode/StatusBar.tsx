"use client";

// StatusBar — 24px accent band, flush below the workbench (DOC/05 §8).
// Left: branch (star when uncommitted saved edits exist; click focuses the
// Source Control view), problem counts, and the local (unpushed) commit count.
// Right: caret Ln/Col (live from the store, pushed by FileViewer), indentation,
// encoding, the active file's language, and the notification bell (dummy
// center: "Cache warmed 2h ago"). Editor items hide when no code tab is open;
// the full toast stack lands with PV-UI-TOAST.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { dirtyCount, useStore } from "@/lib/store";
import { langLabelFor } from "@/lib/langs";
import Codicon from "./Codicon";

type StatusBarProps = {
  onBranchClick?: () => void;
};

// One status-bar item: flat, full height, hover darkens the accent. Buttons
// are the clickable items (branch, bell); the rest are read-only spans.
function Item({
  open = false,
  onClick,
  label,
  children,
}: {
  open?: boolean;
  onClick?: () => void;
  label?: string;
  children: ReactNode;
}) {
  const cls = `flex h-full items-center gap-1 px-1.5 hover:bg-black/20 ${
    open ? "bg-black/20" : ""
  }`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={label} className={cls}>
        {children}
      </button>
    );
  }
  return <span className={cls}>{children}</span>;
}

export default function StatusBar({ onBranchClick }: StatusBarProps) {
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const dirty = useStore((s) => dirtyCount(s.edits) > 0);
  const localCommits = useStore((s) => s.commits.length);
  const caret = useStore((s) => s.caret);

  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLSpanElement>(null);

  // Click-away + Esc close (same pattern as the TitleBar menus).
  useEffect(() => {
    if (!bellOpen) return;
    const close = (e: MouseEvent) => {
      if (!bellRef.current?.contains(e.target as Node)) setBellOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBellOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [bellOpen]);

  const tab = tabs.find((t) => t.id === activeTabId);
  const codeTab = tab?.kind === "code" ? tab : null;

  return (
    <footer
      aria-label="Status bar"
      className="flex h-6 shrink-0 select-none items-center justify-between bg-vscode-accent px-1 text-xs text-white"
    >
      <div className="flex h-full items-center">
        <Item onClick={onBranchClick} label="main — focus Source Control">
          <Codicon name="git-branch" size={12} />
          <span>main{dirty ? "*" : ""}</span>
        </Item>
        <Item>
          <Codicon name="error" size={12} />0
        </Item>
        <Item>
          <Codicon name="warning" size={12} />0
        </Item>
        <Item>
          <Codicon name="git-commit" size={12} />
          <span>local:{localCommits}</span>
        </Item>
      </div>
      <div className="flex h-full items-center">
        {codeTab ? (
          <>
            <Item>
              Ln {caret.line + 1}, Col {caret.col + 1}
            </Item>
            <Item>Spaces: 2</Item>
            <Item>UTF-8</Item>
            <Item>{langLabelFor(codeTab.path)}</Item>
          </>
        ) : null}
        <span ref={bellRef} className="relative flex h-full">
          <Item
            open={bellOpen}
            onClick={() => setBellOpen((v) => !v)}
            label="Notifications"
          >
            <Codicon name="bell" size={12} />
          </Item>
          {bellOpen ? (
            <div className="absolute bottom-full right-0 z-20 mb-1 w-72 rounded-control border border-vscode-border bg-vscode-widget-bg text-vscode-fg shadow-vscode">
              <div className="border-b border-vscode-border px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-vscode-emphasis">
                Notifications
              </div>
              <div className="flex items-start gap-2 px-3 py-2 text-xs">
                <Codicon name="info" size={14} className="mt-0.5 shrink-0" />
                <span>Cache warmed 2h ago</span>
              </div>
            </div>
          ) : null}
        </span>
      </div>
    </footer>
  );
}
