"use client";

// TitleBar — menu row + command center + layout/window controls.
// Menus are data (MENU_ITEMS); the component only emits action ids.
// See DOC/05 §3, skills vscode-tokens + dumb-depth.
import { useEffect, useRef, useState } from "react";

export type MenuItem =
  | { separator: true }
  | { label: string; action: string; hint?: string }
  | { label: string; disabled: true; hint: string };

export type Menu = { menu: string; items: MenuItem[] };

export const MENU_ITEMS: Menu[] = [
  {
    menu: "File",
    items: [
      { label: "New Text File", action: "new-tmp-file" },
      { label: "Open File…", action: "quick-open" },
      { label: "Save (local)", action: "save-local" },
      { separator: true },
      { label: "Close Tab", action: "close-tab" },
    ],
  },
  {
    menu: "Edit",
    items: [
      { label: "Undo", disabled: true, hint: "Available when the editor lands" },
      { label: "Redo", disabled: true, hint: "Available when the editor lands" },
      { separator: true },
      { label: "Cut", disabled: true, hint: "Available when the editor lands" },
      { label: "Copy", disabled: true, hint: "Available when the editor lands" },
      { label: "Paste", disabled: true, hint: "Available when the editor lands" },
    ],
  },
  {
    menu: "Selection",
    items: [
      { label: "Select All", disabled: true, hint: "Available when the editor lands" },
    ],
  },
  {
    menu: "View",
    items: [
      { label: "Explorer", action: "view-explorer" },
      { label: "Search", action: "view-search" },
      { label: "Source Control", action: "view-scm" },
      { label: "Run", action: "view-run" },
      { label: "Extensions", action: "view-extensions" },
      { separator: true },
      { label: "Command Palette…", action: "palette" },
      { separator: true },
      { label: "Toggle Sidebar", action: "toggle-sidebar" },
      { label: "Toggle Panel", action: "toggle-panel" },
      { label: "Toggle Terminal", action: "toggle-terminal" },
    ],
  },
  {
    menu: "Go",
    items: [
      { label: "Go to File…", action: "quick-open" },
      { label: "Go to Symbol…", disabled: true, hint: "Available when the editor lands" },
    ],
  },
  {
    menu: "Run",
    items: [
      { label: "Open Preview", action: "open-preview" },
      { label: "Start Debugging", disabled: true, hint: "Preview is the demo runner here" },
    ],
  },
  {
    menu: "Terminal",
    items: [
      { label: "New Terminal", action: "new-terminal" },
      { label: "Clear", disabled: true, hint: "Available when the terminal lands" },
    ],
  },
  {
    menu: "Help",
    items: [
      { label: "About Portfolio", disabled: true, hint: "Available when About content lands" },
    ],
  },
];

type TitleBarProps = {
  onQuickOpen?: () => void;
  onCommand?: () => void;
  onMenuAction?: (action: string) => void;
  onNavigate?: (dir: -1 | 1) => void;
};

export default function TitleBar({
  onQuickOpen,
  onCommand,
  onMenuAction,
  onNavigate,
}: TitleBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const barRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const close = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [openMenu ]);

  const go = (dir: -1 | 1) => {
    if (onNavigate) onNavigate(dir);
    else if (dir === -1) history.back();
    else history.forward();
  };

  const fire = (action: string) => {
    setOpenMenu(null);
    onMenuAction?.(action);
  };

  return (
    <header
      ref={barRef}
      className="flex h-9 shrink-0 items-center gap-1 rounded-vscode bg-vscode-side px-2 text-[13px] text-vscode-dim"
    >
      <img
        src="/vscode-logo.svg"
        width={16}
        height={16}
        alt="Visual Studio Code"
        draggable={false}
        className="ml-1 mr-2 shrink-0"
      />
      <nav className="flex items-center" aria-label="Application menu">
        {MENU_ITEMS.map((m) => (
          <div key={m.menu} className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === m.menu ? null : m.menu)}
              onMouseEnter={() => {
                if (openMenu) setOpenMenu(m.menu);
              }}
              className={`rounded px-2 py-1 hover:bg-vscode-list-hover hover:text-vscode-fg ${
                openMenu === m.menu ? "bg-vscode-list-hover text-vscode-fg" : ""
              }`}
            >
              {m.menu}
            </button>
            {openMenu === m.menu ? (
              <div className="absolute left-0 top-full z-20 min-w-56 rounded-vscode border border-vscode-border bg-vscode-widget-bg py-1 shadow-vscode">
                {m.items.map((item, i) =>
                  "separator" in item ? (
                    <div key={i} className="my-1 border-t border-vscode-border" />
                  ) : (
                    <button
                      key={i}
                      type="button"
                      disabled={"disabled" in item}
                      title={"hint" in item && item.hint ? item.hint : undefined}
                      onClick={() => "action" in item && fire(item.action)}
                      className="block w-full px-4 py-1 text-left text-vscode-fg hover:bg-vscode-list-active disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      {item.label}
                    </button>
                  ),
                )}
              </div>
            ) : null}
          </div>
        ))}
      </nav>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => go(-1)}
          className="rounded p-1 hover:bg-vscode-list-hover hover:text-vscode-fg"
          aria-label="Go back"
        >
          <i className="codicon codicon-chevron-left" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          className="rounded p-1 hover:bg-vscode-list-hover hover:text-vscode-fg"
          aria-label="Go forward"
        >
          <i className="codicon codicon-chevron-right" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          setOpenMenu(null);
          onQuickOpen?.();
        }}
        className="mx-auto flex h-6 w-[420px] max-w-full items-center justify-center gap-2 rounded-pill bg-vscode-command-bg text-xs hover:text-vscode-fg"
      >
        <i className="codicon codicon-search" aria-hidden="true" />
        <span className="truncate">Portfolio</span>
      </button>
      <button
        type="button"
        onClick={onCommand}
        className="rounded p-1 hover:bg-vscode-list-hover hover:text-vscode-fg"
        aria-label="Split editor right"
      >
        <i className="codicon codicon-split-horizontal" />
      </button>
      <button
        type="button"
        onClick={onCommand}
        className="rounded p-1 hover:bg-vscode-list-hover hover:text-vscode-fg"
        aria-label="Toggle sidebar"
      >
        <i className="codicon codicon-layout-sidebar-left" />
      </button>
      <button
        type="button"
        onClick={onCommand}
        className="rounded p-1 hover:bg-vscode-list-hover hover:text-vscode-fg"
        aria-label="Toggle panel"
      >
        <i className="codicon codicon-layout-panel" />
      </button>
      <div
        className="flex items-center text-vscode-dim"
        title="Window controls are decorative in a browser"
        aria-hidden="true"
      >
        <span className="rounded p-1.5">
          <i className="codicon codicon-chrome-minimize" />
        </span>
        <span className="rounded p-1.5">
          <i className="codicon codicon-chrome-maximize" />
        </span>
        <span className="rounded p-1.5">
          <i className="codicon codicon-chrome-close" />
        </span>
      </div>
    </header>
  );
}
