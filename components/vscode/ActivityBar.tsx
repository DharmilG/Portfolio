"use client";

// ActivityBar — 48px icon rail (store-connected for badge only; rest via props).
// Glyphs are VS Code codicons. See DOC/05 §4, skills rounded-workbench + vscode-tokens + local-git.
import { dirtyCount, useStore } from "@/lib/store";

export type ActivityId = "explorer" | "search" | "scm" | "run" | "extensions";

type ActivityBarProps = {
  active?: ActivityId;
  onSelect?: (id: ActivityId) => void;
  onOpenProfile?: () => void;
  onSettings?: (action: "settings" | "appearance" | "profile" | "reset") => void;
  avatarUrl?: string | null;
  userInitial?: string;
};

// codicon.css pins its font-size with an unlayered `font` shorthand, which
// beats Tailwind size utilities — so glyph size goes inline (24px = VS Code rail).
function Codicon({ name }: { name: string }) {
  return <i className={`codicon codicon-${name}`} style={{ fontSize: 24 }} />;
}

const TOP: { id: ActivityId; label: string; icon: string }[] = [
  { id: "explorer", label: "Explorer", icon: "files" },
  { id: "search", label: "Search", icon: "search" },
  { id: "scm", label: "Source Control", icon: "source-control" },
  { id: "run", label: "Run", icon: "debug-alt" },
  { id: "extensions", label: "Extensions", icon: "extensions" },
];

const GEAR_MENU = [
  { id: "settings", label: "Settings" },
  { id: "appearance", label: "Appearance" },
  { id: "profile", label: "Profile" },
  { id: "reset", label: "Reset local edits" },
] as const;

export default function ActivityBar({
  active = "explorer",
  onSelect,
  onOpenProfile,
  onSettings,
  avatarUrl,
  userInitial = "R",
}: ActivityBarProps) {
  const badge =
    dirtyCount(useStore((s) => s.edits)) + useStore((s) => s.commits).length;

  return (
    <nav
      className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-vscode-border bg-vscode-side py-2 text-vscode-dim"
      aria-label="Activity Bar"
    >
      {TOP.map((item) => {
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            onClick={() => onSelect?.(item.id)}
            className={`relative flex h-10 w-10 items-center justify-center rounded hover:text-vscode-fg ${
              isActive ? "text-vscode-fg" : ""
            }`}
          >
            {isActive ? (
              <span className="absolute left-0 h-6 w-0.5 rounded bg-vscode-accent" />
            ) : null}
            <Codicon name={item.icon} />
            {item.id === "scm" && badge > 0 ? (
              <span className="absolute bottom-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-vscode-badge-bg px-1 text-[10px] font-semibold text-vscode-badge-fg">
                {badge}
              </span>
            ) : null}
          </button>
        );
      })}
      <div className="mt-auto flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onOpenProfile}
          title="Profile"
          className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-vscode-accent text-xs font-semibold text-white hover:ring-2 hover:ring-vscode-accent-hover"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            userInitial
          )}
        </button>
        <div className="group relative">
          <button
            type="button"
            title="Settings"
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-vscode-list-hover hover:text-vscode-fg"
          >
            <Codicon name="gear" />
          </button>
          <div className="invisible absolute bottom-0 left-10 z-10 w-44 rounded-control border border-vscode-border bg-vscode-widget-bg py-1 shadow-vscode group-hover:visible">
            {GEAR_MENU.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSettings?.(m.id)}
                className="block w-full px-3 py-1.5 text-left text-xs text-vscode-fg hover:bg-vscode-list-hover"
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
