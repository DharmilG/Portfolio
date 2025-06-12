"use client";

// Tabs — editor tab strip (editor chrome). Maps store tabs -> Tab tiles;
// hidden when no tabs. Labels follow uiRenames (resolveName), dirty from
// local edits (isDirty). Right-side actions (split, ...) land with previews.
// See DOC/05 §6.
import { isDirty, useStore } from "@/lib/store";
import { resolveName } from "./Explorer";
import Tab from "./Tab";

export default function Tabs() {
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const edits = useStore((s) => s.edits);
  const renames = useStore((s) => s.renames);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const closeTab = useStore((s) => s.closeTab);

  if (tabs.length === 0) return null;

  return (
    <div
      role="tablist"
      aria-label="Open editors"
      className="flex h-[35px] shrink-0 items-center overflow-x-auto bg-vscode-tab px-2"
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
  );
}
