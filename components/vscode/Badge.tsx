// Badge — VS Code count badge, 2025-refresh style: 18px circle that grows
// into a rounded row for 2+ digits. Layout-agnostic; callers position it
// (e.g. as an absolute overlay on an activity item).
export default function Badge({
  count,
  className = "",
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-vscode-badge-bg px-[5px] text-[11px] font-semibold leading-none text-vscode-badge-fg ${className}`}
    >
      {count}
    </span>
  );
}
