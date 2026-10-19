"use client";

// StatusBar — the Dark Modern band, flush below the workbench (DOC/05 §8).
// Values from VS Code source: 22px tall, #181818 bg, #CCCCCC text, 1px top
// #2B2B2B hairline, item hover #F1F1F133 + white text. Left: branch (label
// gains `*` for working-tree changes — the saved-edits layer; the icon flips
// to git-branch-changes), sync (`$(sync) 0↓ k↑` — k = local commits awaiting
// push; icon-only at zero, exactly like core git), problem counts. Right:
// caret Ln/Col (live from the store, pushed by FileViewer), indentation,
// encoding, EOL, the active file's language (file icon + name), and the
// notification bell (dummy center: "Cache warmed 2h ago"). Editor items hide
// when no code tab is open; the full toast stack lands with PV-UI-TOAST.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { fileIcon } from "@/lib/fileIcons";
import { langLabelFor } from "@/lib/langs";
import { dirtyCount, useStore } from "@/lib/store";
import Codicon from "./Codicon";

type StatusBarProps = {
  onBranchClick?: () => void;
};

// One status-bar item: full height, real metrics (3px margins + 5px padding;
// the first/last items drop the margins and use 8px padding), hover =
// statusBarItem hover background + white text. Buttons are the clickable
// items (branch, bell); the rest are read-only spans.
function Item({
  edge = false,
  open = false,
  onClick,
  label,
  className = "",
  children,
}: {
  edge?: boolean;
  open?: boolean;
  onClick?: () => void;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const cls = `flex h-full cursor-pointer items-center gap-1 ${
    edge ? "px-2" : "mx-[3px] px-[5px]"
  } hover:bg-vscode-statusbar-hover hover:text-vscode-fg-active ${
    open ? "bg-vscode-statusbar-hover text-vscode-fg-active" : ""
  } ${className}`;
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
      className="flex h-[22px] shrink-0 select-none items-center justify-between border-t border-vscode-border bg-vscode-statusbar text-xs text-vscode-fg tabular-nums"
    >
      <div className="flex h-full items-center">
        <Item edge onClick={onBranchClick} label="main — focus Source Control">
          <Codicon name={dirty ? "git-branch-changes" : "git-branch"} />
          <span>main{dirty ? "*" : ""}</span>
        </Item>
        <Item className="max-sm:hidden">
          <Codicon name="sync" />
          {localCommits > 0 ? <span>0↓ {localCommits}↑</span> : null}
        </Item>
        <Item>
          <Codicon name="error" />0
          <Codicon name="warning" />0
        </Item>
      </div>
      <div className="flex h-full items-center">
        {codeTab ? (
          <>
            <Item className="max-sm:hidden">
              Ln {caret.line + 1}, Col {caret.col + 1}
            </Item>
            <Item className="max-md:hidden">Spaces: 2</Item>
            <Item className="max-md:hidden">UTF-8</Item>
            <Item className="max-md:hidden">LF</Item>
            <Item className="max-sm:hidden">
              <Codicon name={fileIcon(codeTab.path)} />
              {langLabelFor(codeTab.path)}
            </Item>
          </>
        ) : null}
        <span ref={bellRef} className="relative flex h-full">
          <Item
            edge
            open={bellOpen}
            onClick={() => setBellOpen((v) => !v)}
            label="Notifications"
          >
            <Codicon name="bell" />
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
