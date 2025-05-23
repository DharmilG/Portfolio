"use client";

// ActivityBar — 48px icon rail (store-connected for badge only; rest via props).
// See DOC/05 §4, skills rounded-workbench + vscode-tokens + local-git.
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

function Icon({ d, circles }: { d?: string; circles?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      {d ? <path d={d} /> : null}
      {circles
        ? circles.split("|").map((c) => {
            const [cx, cy, r] = c.split(",").map(Number);
            return <circle key={c} cx={cx} cy={cy} r={r} />;
          })
        : null}
    </svg>
  );
}

const TOP: { id: ActivityId; label: string; d?: string; circles?: string }[] = [
  { id: "explorer", label: "Explorer", d: "M3 2h6l2 2h6v12H3z" },
  { id: "search", label: "Search", d: "M9 3a6 6 0 1 0 4.2 10.4L17 17" },
  { id: "scm", label: "Source Control", circles: "6,5,2|6,15,2|14,8,2" },
  { id: "run", label: "Run", d: "M6 3l11 7-11 7z" },
  { id: "extensions", label: "Extensions", d: "M3 3h6v6H3zM11 3h2v6h-2zM3 11h2v6H3zM7 11h6v6H7z" },
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
            <Icon d={item.d} circles={item.circles} />
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
            <Icon d="M10 6.5A3.5 3.5 0 1 0 10 13.5 3.5 3.5 0 1 0 10 6.5M10 1v3M10 16v3M1 10h3M16 10h3M3.6 3.6l2.1 2.1M14.3 14.3l2.1 2.1M16.4 3.6l-2.1 2.1M5.7 14.3l-2.1 2.1" />
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
