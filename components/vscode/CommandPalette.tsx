"use client";

// CommandPalette — Ctrl+P quick open / Ctrl+Shift+P / F1 commands (DOC/05 §9).
// Real 2026 quick input (quickInput.css + quickInputController.ts): widget
// min(62vw, 600px), top = 36px titlebar offset, aligned under the Command
// Center pill (falls back to viewport center when the pill is hidden), radius 12px,
// #222222 bg + 1px #313131 (widget.border); header pad 6/6/4/6; input 26px,
// 6px radius, #313131/#3C3C3C (no focus ring); list cap min(40vh, 440px)
// (= min(0.4×height, 20×22px)), rows 22px / 3px radius / 6+6 insets, icon
// 16+6, rows ml 5px; focus row #04395E + white, hover #2A2D2E, matches bold
// #2AAAFF, keybindingLabel chips; list pb 7px.
// Lists: files = open tabs (tab order) then tmp scratch + loaded repo trees
// A–Z; commands = lib/commands registry. `>` prefix switches mode (backspace
// past it returns); ↑↓ wrap; Enter runs & closes; Esc / click-away close.
// Shortcuts match quickAccess.ts: the same shortcut while open keeps the
// palette (query selected, typing replaces); the other one switches mode and
// preserves the query suffix. Destructive commands confirm via shared Modal.
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { COMMANDS, type Command } from "@/lib/commands";
import { fileIcon } from "@/lib/fileIcons";
import { fuzzyScore } from "@/lib/fuzzy";
import { repoTreeKey, useStore, type PaletteMode } from "@/lib/store";
import Codicon from "./Codicon";
import Modal from "./Modal";

type FileRow = {
  kind: "file";
  path: string;
  name: string;
  dir: string;
  open: boolean;
  score: number;
  /** match indices into `path` (split into name/dir at render) */
  indices: number[];
};

type CommandRow = {
  kind: "command";
  cmd: Command;
  score: number;
  indices: number[];
};

type Row = FileRow | CommandRow;

// Bold #2AAAFF (list.highlightForeground) on matched chars. Guard: indices
// are computed on the lower-cased text — skip if a case fold changed length.
function Highlight({ text, indices }: { text: string; indices: number[] }) {
  if (indices.length === 0 || text.toLowerCase().length !== text.length) {
    return <>{text}</>;
  }
  const set = new Set(indices);
  return (
    <>
      {[...text].map((ch, i) =>
        set.has(i) ? (
          <span key={i} className="font-bold text-vscode-quick-match">
            {ch}
          </span>
        ) : (
          ch
        ),
      )}
    </>
  );
}

// KeybindingLabel chips (keybindingLabel.css): 11px/10px keys, 3px radius,
// 3px/5px padding, mx 2px, "+" separators; on the focused/hover row the chip
// bg clears and the border becomes currentColor @30%.
function Keybinding({ keys, selected }: { keys: string; selected: boolean }) {
  return (
    <span className="ml-2 mr-[8px] flex shrink-0 items-center text-[11px] leading-[10px]">
      {keys.split("+").map((k, i) => (
        <Fragment key={i}>
          {i > 0 ? <span className="text-[13px]">+</span> : null}
          <span
            className={`mx-[2px] inline-flex min-w-3 items-center justify-center rounded-keybinding border border-vscode-keybinding-border border-b-vscode-keybinding-border-bottom px-[5px] py-[3px] first:ml-0 last:mr-0 ${
              selected
                ? "border-white/30 bg-transparent"
                : "bg-vscode-keybinding-bg group-hover:border-[#cccccc4d] group-hover:bg-transparent"
            }`}
          >
            {k}
          </span>
        </Fragment>
      ))}
    </span>
  );
}

function FileLine({ row, selected }: { row: FileRow; selected: boolean }) {
  const nameStart = row.path.length - row.name.length;
  const nameIndices: number[] = [];
  const dirIndices: number[] = [];
  for (const i of row.indices) {
    if (i >= nameStart) nameIndices.push(i - nameStart);
    else if (i < nameStart - 1) dirIndices.push(i);
  }
  return (
    <>
      <span className="flex h-full w-[22px] shrink-0 items-center justify-center pr-[6px] text-vscode-dim">
        <Codicon name={fileIcon(row.name)} />
      </span>
      <span className="ml-[5px] flex min-w-0 flex-1 items-center">
        <span className="truncate">
          <Highlight text={row.name} indices={nameIndices} />
        </span>
        {row.dir ? (
          <span
            className={`ml-1.5 truncate text-vscode-muted ${
              selected ? "opacity-100" : "opacity-70"
            }`}
          >
            <Highlight text={row.dir} indices={dirIndices} />
          </span>
        ) : null}
      </span>
    </>
  );
}

function CommandLine({ row, selected }: { row: CommandRow; selected: boolean }) {
  const { cmd } = row;
  return (
    <>
      <span className="ml-[5px] min-w-0 flex-1 truncate">
        <Highlight text={cmd.label} indices={row.indices} />
      </span>
      {cmd.hint ? (
        <span className="ml-2 shrink-0 text-xs text-vscode-dim">{cmd.hint}</span>
      ) : null}
      {cmd.keybinding ? (
        <Keybinding keys={cmd.keybinding} selected={selected} />
      ) : null}
    </>
  );
}

export default function CommandPalette() {
  const mode = useStore((s) => s.paletteMode);
  const tabs = useStore((s) => s.tabs);
  const tmpFs = useStore((s) => s.tmpFs);
  const trees = useStore((s) => s.trees);
  const projects = useStore((s) => s.projects);
  const branchByRepo = useStore((s) => s.branchByRepo);
  const treeBranch = useStore((s) => s.treeBranch);
  const setPaletteMode = useStore((s) => s.setPaletteMode);
  const closePalette = useStore((s) => s.closePalette);

  const [value, setValue] = useState("");
  const [index, setIndex] = useState(0);
  const [pending, setPending] = useState<Command | null>(null);
  const prevMode = useRef<PaletteMode | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const open = mode !== null;
  const query = (value.startsWith(">") ? value.slice(1) : value).trim();

  // Fresh open: empty field (prefix only in commands mode). Mode switch while
  // open: keep the query suffix, swap the prefix (quickAccess.ts rewrite).
  useEffect(() => {
    const wasOpen = prevMode.current !== null;
    prevMode.current = mode;
    if (mode === null) return;
    setValue((v) => {
      if (!wasOpen) return mode === "commands" ? ">" : "";
      const from: PaletteMode = v.startsWith(">") ? "commands" : "files";
      if (from === mode) return v;
      const suffix = from === "commands" ? v.slice(1) : v;
      return (mode === "commands" ? ">" : "") + suffix;
    });
    setIndex(0);
    inputRef.current?.focus();
  }, [mode]);

  // The Command Center is not viewport-centered: its left menu group is wider
  // than the right controls, so mx-auto shifts it right. Anchor the quick input
  // to the pill's measured center so it opens directly beneath it; clamp to the
  // viewport and fall back to center when the pill is hidden (<640px).
  useLayoutEffect(() => {
    if (!open) return;
    const box = boxRef.current;
    if (!box) return;
    const place = () => {
      const width = box.getBoundingClientRect().width;
      const pill = document.querySelector<HTMLElement>("[data-command-center]");
      const pillRect = pill?.getBoundingClientRect();
      const center =
        pillRect && pillRect.width > 0
          ? pillRect.left + pillRect.width / 2
          : window.innerWidth / 2;
      const left = Math.min(
        Math.max(8, center - width / 2),
        Math.max(8, window.innerWidth - width - 8),
      );
      box.style.left = `${Math.round(left)}px`;
      box.style.transform = "none";
      // Tailwind v4's -translate-x-1/2 uses the standalone `translate`
      // property, so `transform: none` alone leaves the -50% shift in place.
      box.style.setProperty("translate", "none");
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(box);
    const pill = document.querySelector<HTMLElement>("[data-command-center]");
    if (pill) ro.observe(pill);
    window.addEventListener("resize", place);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", place);
    };
  }, [open]);

  // Global shortcuts (the palette owns its keys). Same shortcut while open:
  // keep the palette, select the query (real adjustValueSelection). Other
  // shortcut: switch mode (or open). Dialogs keep the keyboard to themselves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      const toFiles = mod && !e.shiftKey && !e.altKey && k === "p";
      const toCommands =
        (mod && e.shiftKey && !e.altKey && k === "p") || e.key === "F1";
      if (!toFiles && !toCommands) return;
      e.preventDefault();
      const s = useStore.getState();
      const want: PaletteMode = toCommands ? "commands" : "files";
      if (s.paletteMode === want) {
        const el = inputRef.current;
        el?.focus();
        el?.setSelectionRange(want === "commands" ? 1 : 0, el.value.length);
        return;
      }
      s.setPaletteMode(want);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click-away closes (VS Code hides the quick input on outside mousedown).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      if (!boxRef.current?.contains(e.target as Node)) {
        useStore.getState().closePalette();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const rows: Row[] = useMemo(() => {
    if (!open || mode === null) return [];
    if (mode === "commands") {
      return COMMANDS.map((cmd) => {
        const m = fuzzyScore(query, cmd.label);
        return m
          ? { kind: "command" as const, cmd, score: m.score, indices: m.indices }
          : null;
      })
        .filter((r): r is CommandRow => r !== null)
        .sort((a, b) => b.score - a.score);
    }
    // Files: open tabs (tab order) + tmp scratch + loaded repo trees.
    const codeTabs = tabs.filter((t) => t.kind === "code");
    const tabOrder = new Map(codeTabs.map((t, i) => [t.path, i]));
    const paths = [
      ...codeTabs.map((t) => t.path),
      ...Object.keys(tmpFs),
      ...projects.flatMap((p) => {
        const repo = `${p.repo_owner}/${p.repo_name}`;
        const branch = branchByRepo[repo] ?? treeBranch[repo];
        return (trees[repoTreeKey(repo, branch)] ?? [])
          .filter((e) => e.type === "blob")
          .map((e) => `Projects/${repo}/${e.path}`);
      }),
    ];
    const scored = [...new Set(paths)].flatMap((path) => {
      const m = fuzzyScore(query, path);
      if (!m) return [];
      const name = path.split("/").pop() ?? path;
      const dir = path.slice(0, Math.max(0, path.length - name.length - 1));
      return [
        {
          kind: "file" as const,
          path,
          name,
          dir,
          open: tabOrder.has(path),
          score: m.score,
          indices: m.indices,
        },
      ];
    });
    if (query === "") {
      // Open tabs first (tab order), then everything else A–Z.
      return scored.sort((a, b) => {
        const ao = tabOrder.get(a.path) ?? Number.POSITIVE_INFINITY;
        const bo = tabOrder.get(b.path) ?? Number.POSITIVE_INFINITY;
        return ao !== bo ? ao - bo : a.path.localeCompare(b.path);
      });
    }
    return scored.sort(
      (a, b) => b.score - a.score || a.path.localeCompare(b.path),
    );
  }, [open, mode, query, tabs, tmpFs, trees, projects, branchByRepo, treeBranch]);

  // Keep the selection in range (filters can shrink the list).
  useEffect(() => {
    if (index >= rows.length) setIndex(0);
  }, [index, rows.length]);

  // Scroll the focused row into view (keyboard walk).
  useEffect(() => {
    if (rows.length === 0) return;
    const el = scrollerRef.current?.children[index] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [index, rows]);

  const move = (d: 1 | -1) => {
    if (rows.length === 0) return;
    setIndex((i) => (i + d + rows.length) % rows.length);
  };

  const run = (row: Row) => {
    const s = useStore.getState();
    if (row.kind === "file") {
      if (row.open) {
        const tab = s.tabs.find((t) => t.kind === "code" && t.path === row.path);
        if (tab) s.setActiveTab(tab.id);
      } else {
        s.openTab({ kind: "code", path: row.path, sha: null });
      }
      s.closePalette();
      return;
    }
    if (row.cmd.disabled) return;
    if (row.cmd.confirm) {
      setPending(row.cmd);
      return;
    }
    row.cmd.run();
    if (!row.cmd.keepOpen) s.closePalette();
  };

  const resolvePending = (choice: string) => {
    const cmd = pending;
    setPending(null);
    if (!cmd) return;
    if (choice === "confirm") {
      cmd.run();
      useStore.getState().closePalette();
      return;
    }
    inputRef.current?.focus();
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = rows[index];
      if (row) run(row);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closePalette();
    }
  };

  if (mode === null) return null;

  return (
    <>
      <div
        ref={boxRef}
        onKeyDown={onKeyDown}
        className="fixed left-1/2 top-9 z-40 w-[min(62vw,600px)] -translate-x-1/2 rounded-quick border border-vscode-quick-border bg-vscode-quick-bg text-[13px] text-vscode-fg shadow-vscode"
      >
        <div className="flex px-[6px] pb-[4px] pt-[6px]">
          <input
            ref={inputRef}
            autoFocus
            value={value}
            onChange={(e) => {
              const raw = e.target.value;
              const derived: PaletteMode = raw.startsWith(">")
                ? "commands"
                : "files";
              if (derived !== mode) setPaletteMode(derived);
              setValue(raw);
              setIndex(0);
            }}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            aria-label={mode === "commands" ? "Command palette" : "Quick open"}
            aria-controls="command-palette-list"
            aria-activedescendant={
              rows[index] ? `command-palette-row-${index}` : undefined
            }
            className="h-[26px] w-full rounded-quick-input border border-vscode-quick-input-border bg-vscode-quick-input-bg px-[6px] py-[4px] text-[13px] text-vscode-fg caret-vscode-accent outline-none placeholder:text-vscode-quick-placeholder"
          />
        </div>
        <div className="flex max-h-[min(40vh,440px)] pb-[7px]">
          <div
            id="command-palette-list"
            ref={scrollerRef}
            role="listbox"
            aria-label="Results"
            className="min-h-0 flex-1 overflow-y-auto px-[6px]"
          >
            {rows.length === 0 ? (
              <div className="flex h-[22px] items-center px-[6px] text-vscode-dim">
                {mode === "commands"
                  ? "No matching commands"
                  : "No matching results"}
              </div>
            ) : (
              rows.map((row, i) => {
                const selected = i === index;
                return (
                  <div
                    key={row.kind === "file" ? `f:${row.path}` : `c:${row.cmd.id}`}
                    id={`command-palette-row-${i}`}
                    role="option"
                    aria-selected={selected}
                    title={row.kind === "command" ? row.cmd.hint : undefined}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseMove={() => {
                      if (!selected) setIndex(i);
                    }}
                    onClick={() => run(row)}
                    className={`group flex h-[22px] items-center rounded-quick-row px-[6px] ${
                      selected
                        ? "bg-vscode-list-active text-vscode-fg-active"
                        : "hover:bg-vscode-list-hover"
                    }${
                      row.kind === "command" && row.cmd.disabled
                        ? " opacity-40"
                        : ""
                    }`}
                  >
                    {row.kind === "file" ? (
                      <FileLine row={row} selected={selected} />
                    ) : (
                      <CommandLine row={row} selected={selected} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      {pending && pending.confirm ? (
        <Modal
          message={pending.confirm.message}
          buttons={[
            { id: "cancel", label: "Cancel" },
            {
              id: "confirm",
              label: pending.confirm.confirmLabel,
              primary: true,
            },
          ]}
          onAction={resolvePending}
          onCancel={() => {
            setPending(null);
            inputRef.current?.focus();
          }}
        />
      ) : null}
    </>
  );
}
