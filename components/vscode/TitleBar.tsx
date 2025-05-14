"use client";

// TitleBar — 36px top chrome (presentational; parent wires callbacks).
// See DOC/05 §3, skills rounded-workbench + vscode-tokens.
type TitleBarProps = {
  onCommand?: () => void;
  onQuickOpen?: () => void;
  onToggleLayout?: () => void;
};

function LayoutIcon({ d }: { d: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export default function TitleBar({
  onCommand,
  onQuickOpen,
  onToggleLayout,
}: TitleBarProps) {
  return (
    <header className="flex h-9 shrink-0 items-center gap-2 rounded-vscode bg-vscode-side px-3 text-vscode-dim">
      {/* macOS traffic dots are OS chrome (not theme): hexes stay local */}
      <div className="flex items-center gap-2" aria-hidden="true">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
      </div>
      <button
        type="button"
        onClick={onCommand}
        className="rounded p-1 hover:bg-vscode-list-hover hover:text-vscode-fg"
        aria-label="Menu"
      >
        ☰
      </button>
      <button
        type="button"
        onClick={onQuickOpen}
        className="mx-auto flex h-6 w-[420px] max-w-full items-center justify-center gap-2 rounded-pill bg-vscode-command-bg text-xs hover:text-vscode-fg"
      >
        <span aria-hidden="true">⌕</span>
        <span className="truncate">portfolio — Visual Studio Code</span>
      </button>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggleLayout}
          className="rounded p-1 hover:bg-vscode-list-hover hover:text-vscode-fg"
          aria-label="Split editor"
        >
          <LayoutIcon d="M8 1v14M2 1h12v14H2z" />
        </button>
        <button
          type="button"
          onClick={onToggleLayout}
          className="rounded p-1 hover:bg-vscode-list-hover hover:text-vscode-fg"
          aria-label="Toggle panel"
        >
          <LayoutIcon d="M1 6h14M2 1h12v14H2z" />
        </button>
        <button
          type="button"
          onClick={onToggleLayout}
          className="rounded p-1 hover:bg-vscode-list-hover hover:text-vscode-fg"
          aria-label="Toggle sidebar"
        >
          <LayoutIcon d="M6 1v14M2 1h12v14H2z" />
        </button>
      </div>
    </header>
  );
}
