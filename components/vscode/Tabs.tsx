"use client";

// Tabs — editor tab strip (editor chrome). Maps store tabs -> Tab tiles;
// hidden when no tabs. Labels follow uiRenames (resolveName), dirty from
// local edits (isDirty). Right: pinned actions rail (stays put while the tab
// run scrolls) — `...` menu: Copy path / Reveal in Explorer / Open raw
// (repo file -> raw.githubusercontent.com/<owner>/<repo>/HEAD/<path>); the
// split-right icon lands with the preview components. See DOC/05 §6.
import { useEffect, useRef, useState } from "react";
import { isDirty, useStore } from "@/lib/store";
import { resolveName } from "./Explorer";
import Menu, { type MenuItem } from "./Menu";
import Tab from "./Tab";
import ViewActionButton from "./ViewActionButton";

// Projects/<owner>/<repo>/<rest> -> GitHub raw URL (HEAD = default branch).
function rawUrlFor(path: string): string | null {
  const parts = path.split("/");
  if (parts[0] !== "Projects" || parts.length < 4) return null;
  const rest = parts.slice(3).map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${parts[1]}/${parts[2]}/HEAD/${rest}`;
}

type TabsProps = {
  // Reveal in Explorer — the page owns sidebar visibility + active view.
  onReveal?: (path: string) => void;
};

export default function Tabs({ onReveal }: TabsProps) {
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const edits = useStore((s) => s.edits);
  const renames = useStore((s) => s.renames);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const closeTab = useStore((s) => s.closeTab);

  const [menuOpen, setMenuOpen] = useState(false);
  const bandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!bandRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [menuOpen]);

  if (tabs.length === 0) return null;

  const active = tabs.find((t) => t.id === activeTabId) ?? null;
  const rawUrl =
    active && active.kind !== "browser" ? rawUrlFor(active.path) : null;
  const items: MenuItem[] = [
    { id: "copy-path", label: "Copy path" },
    {
      id: "reveal",
      label: "Reveal in Explorer",
      disabled: !active || active.kind === "browser",
    },
    { id: "open-raw", label: "Open raw", disabled: !rawUrl },
  ];

  const fire = (id: string) => {
    setMenuOpen(false);
    if (!active) return;
    if (id === "copy-path") void navigator.clipboard.writeText(active.path);
    else if (id === "reveal") onReveal?.(active.path);
    else if (id === "open-raw" && rawUrl)
      window.open(rawUrl, "_blank", "noopener");
  };

  return (
    <div
      ref={bandRef}
      className="relative flex h-[35px] shrink-0 items-center bg-vscode-tab pl-2"
    >
      <div
        role="tablist"
        aria-label="Open editors"
        className="flex min-w-0 flex-1 items-center overflow-x-auto"
      >
        {tabs.map((t) => (
          <Tab
            key={t.id}
            name={resolveName(t.path, renames, t.path.split("/").pop() ?? t.path)}
            active={t.id === activeTabId}
            dirty={isDirty(edits, t.path)}
            onSelect={() => setActiveTab(t.id)}
            onClose={() => closeTab(t.id)}
          />
        ))}
      </div>
      <div className="flex shrink-0 items-center px-1">
        <ViewActionButton
          icon="more"
          label="More Actions..."
          align="end"
          onClick={() => setMenuOpen((v) => !v)}
        />
      </div>
      {menuOpen ? (
        <Menu
          items={items}
          onAction={fire}
          density="compact"
          label="Editor actions"
          className="absolute right-1 top-full z-20 min-w-44"
        />
      ) : null}
    </div>
  );
}
