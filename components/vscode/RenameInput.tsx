"use client";

// RenameInput — shared inline-rename field (Explorer folder/project renames;
// future tree renames). Fixed VS Code styling; Enter/blur commits
// (empty clears to null), Escape cancels.
type RenameInputProps = {
  defaultValue: string;
  label: string;
  onCommit: (value: string | null) => void;
  onCancel: () => void;
};

export default function RenameInput({
  defaultValue,
  label,
  onCommit,
  onCancel,
}: RenameInputProps) {
  const commit = (value: string) => {
    onCommit(value.trim() === "" ? null : value.trim());
  };
  return (
    <input
      autoFocus
      defaultValue={defaultValue}
      aria-label={label}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit(e.currentTarget.value);
        if (e.key === "Escape") onCancel();
      }}
      onClick={(e) => e.stopPropagation()}
      className="h-5 w-full rounded bg-vscode-input-bg px-1 text-xs text-vscode-fg focus:outline-none focus:ring-1 focus:ring-vscode-accent"
    />
  );
}
