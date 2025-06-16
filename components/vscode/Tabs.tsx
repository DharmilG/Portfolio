"use client";

// Tabs — editor tab strip (editor chrome). Maps store tabs -> Tab tiles;
// hidden when no tabs. Labels follow uiRenames (resolveName), dirty from
// local edits (isDirty). Slim 33px rail (32px tile + 1px headroom) per
// VS Code 1.142 "connected tabs": the bottom rule is an absolute hairline
// below the tiles so the active tab + its fillets visibly interrupt it and
// merge into the editor surface. Right-side actions (split, ...) land with
// previews. See DOC/05 §6.
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
      className="relative h-[33px] shrink-0 bg-vscode-tab"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-vscode-border"
      />
      <div className="relative flex h-full items-end overflow-x-auto px-1.5">
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
    </div>
  );
}
