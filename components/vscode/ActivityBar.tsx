"use client";

// ActivityBar — 48px icon rail (store-connected for badge only; rest via props).
// 2025-refresh look: active item = white icon + rounded pill bg (no left bar).
// Shared primitives: IconButton + Badge + Codicon. See DOC/05 §4.
import { dirtyCount, useStore } from "@/lib/store";
import Badge from "./Badge";
import IconButton from "./IconButton";
import Menu from "./Menu";

export type ActivityId = "explorer" | "search" | "scm" | "run" | "extensions";

type ActivityBarProps = {
  active?: ActivityId;
  onSelect?: (id: ActivityId) => void;
  onOpenProfile?: () => void;
  onSettings?: (action: "settings" | "appearance" | "profile" | "reset") => void;
  avatarUrl?: string | null;
  userInitial?: string;
};

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

type GearAction = (typeof GEAR_MENU)[number]["id"];

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
      className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-vscode-border bg-vscode-side text-vscode-dim mt-[3px]"
      aria-label="Activity Bar"
    >
      {TOP.map((item) => (
        <IconButton
          key={item.id}
          icon={item.icon}
          label={item.label}
          size="lg"
          active={item.id === active}
          tooltip="off"
          onClick={() => onSelect?.(item.id)}
        >
          {item.id === "scm" && badge > 0 ? (
            <Badge count={badge} className="absolute bottom-1 right-1" />
          ) : null}
        </IconButton>
      ))}
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
          <IconButton icon="gear" label="Settings" size="md" tooltip="off" />
          <Menu
            items={GEAR_MENU}
            onAction={(id) => onSettings?.(id as GearAction)}
            density="compact"
            label="Settings"
            className="invisible absolute bottom-0 left-10 z-10 w-44 group-hover:visible"
          />
        </div>
      </div>
    </nav>
  );
}
