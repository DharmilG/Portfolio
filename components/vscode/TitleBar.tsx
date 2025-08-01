"use client";

// TitleBar — menu row + command center + layout/window controls.
// Menus are data (MENU_ITEMS); the component only emits action ids.
// The globe is open-or-list: with no browser tabs it opens one, with tabs it
// lists them + New Integrated Browser Tab (VS Code browser.openOrListAction).
// See DOC/05 §3, skills vscode-tokens + dumb-depth.
import { useEffect, useRef, useState } from "react";
import { browserTabLabel, useStore } from "@/lib/store";
import IconButton from "@/components/vscode/IconButton";
import Menu, { type MenuItem } from "./Menu";

export type Menu = { menu: string; items: MenuItem[] };

export const MENU_ITEMS: Menu[] = [
  {
    menu: "File",
    items: [
      { label: "New Text File", id: "new-tmp-file" },
      { label: "Open File…", id: "quick-open" },
      { label: "Save (local)", id: "save-local" },
      { separator: true },
      { label: "Close Tab", id: "close-tab" },
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
      { label: "Explorer", id: "view-explorer" },
      { label: "Search", id: "view-search" },
      { label: "Source Control", id: "view-scm" },
      { label: "Run", id: "view-run" },
      { label: "Extensions", id: "view-extensions" },
      { separator: true },
      { label: "Command Palette…", id: "palette" },
      { separator: true },
      { label: "Toggle Sidebar", id: "toggle-sidebar" },
      { label: "Toggle Panel", id: "toggle-panel" },
      { label: "Toggle Terminal", id: "toggle-terminal" },
    ],
  },
  {
    menu: "Go",
    items: [
      { label: "Go to File…", id: "quick-open" },
      { label: "Go to Symbol…", disabled: true, hint: "Available when the editor lands" },
    ],
  },
  {
    menu: "Run",
    items: [
      { label: "Open Integrated Browser", id: "open-preview" },
      { label: "Start Debugging", disabled: true, hint: "Preview is the demo runner here" },
    ],
  },
  {
    menu: "Terminal",
    items: [
      { label: "New Terminal", id: "new-terminal" },
      { label: "Split Terminal", id: "split-terminal" },
      { label: "Unsplit Terminal", id: "unsplit-terminal" },
      { label: "Kill Terminal", id: "kill-terminal" },
      { separator: true },
      { label: "Clear", id: "clear-terminal" },
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
  onMenuAction?: (action: string) => void;
  onNavigate?: (dir: -1 | 1) => void;
};

export default function TitleBar({
  onQuickOpen,
  onMenuAction,
  onNavigate,
}: TitleBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const barRef = useRef<HTMLElement>(null);
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const browserTabs = tabs.filter((t) => t.kind === "browser");

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
      className="flex h-9 shrink-0 items-center gap-1 bg-vscode-titlebar px-2 text-[13px] text-vscode-dim"
    >
      <img
        src="/vscode-logo.svg"
        width={16}
        height={16}
        alt="Visual Studio Code"
        draggable={false}
        className="ml-1 mr-2 shrink-0"
      />
      <nav
        className="hidden items-center sm:flex"
        aria-label="Application menu"
      >
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
              <Menu
                items={m.items}
                onAction={fire}
                density="menu"
                label={m.menu}
                className="absolute left-0 top-full z-20 min-w-56"
              />
            ) : null}
          </div>
        ))}
      </nav>
      <div className="flex items-center">
        <IconButton
          icon="chevron-left"
          label="Go back"
          tooltip="off"
          onClick={() => go(-1)}
        />
        <IconButton
          icon="chevron-right"
          label="Go forward"
          tooltip="off"
          onClick={() => go(1)}
        />
      </div>
      <button
        type="button"
        data-command-center
        onClick={() => {
          setOpenMenu(null);
          onQuickOpen?.();
        }}
        className="mx-auto hidden h-6 w-[600px] min-w-0 max-w-full items-center justify-center gap-2 rounded-control border border-vscode-border bg-vscode-command-bg text-xs hover:text-vscode-fg sm:flex"
      >
        <i className="codicon codicon-search" aria-hidden="true" />
        <span className="truncate">Portfolio</span>
      </button>
      {/* Decorative layout actions drop below tablet; the sidebar and panel
          toggles stay (they are the only layout controls that do anything). */}
      <div className="hidden items-center md:flex">
        <IconButton
          icon="layout"
          label="Customize Layout"
          onClick={() => fire("customize-layout")}
        />
      </div>
      <IconButton
        icon="layout-sidebar-left"
        label="Toggle Primary Side Bar (Ctrl+B)"
        onClick={() => fire("toggle-sidebar")}
      />
      <IconButton
        icon="layout-panel"
        label="Toggle Panel (Ctrl+J)"
        onClick={() => fire("toggle-panel")}
      />
      <div className="hidden items-center md:flex">
        <IconButton
          icon="layout-sidebar-right"
          label="Toggle Secondary Side Bar (Ctrl+Alt+B)"
          onClick={() => fire("toggle-secondary-sidebar")}
        />
      </div>
      {browserTabs.length === 0 ? (
        <IconButton
          icon="globe"
          label="Browser"
          onClick={() => fire("open-preview")}
          tooltip="right"
        />
      ) : (
        <div className="relative">
          <IconButton
            icon="globe"
            label="Browser"
            tooltip="right"
            onClick={() =>
              setOpenMenu(openMenu === "__browser__" ? null : "__browser__")
            }
          />
          {openMenu === "__browser__" ? (
            <Menu
              items={[
                {
                  id: "open-preview",
                  label: "New Integrated Browser Tab",
                  icon: "add",
                },
                { separator: true },
                ...browserTabs.map((t) => ({
                  id: `browser-tab:${t.id}`,
                  label: browserTabLabel(t.path),
                  icon: "globe",
                  active: t.id === activeTabId,
                })),
              ]}
              onAction={fire}
              density="compact"
              label="Browser"
              className="absolute right-0 top-full z-20 min-w-56"
            />
          ) : null}
        </div>
      )}
      <div
        className="hidden items-center text-vscode-dim lg:flex"
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
