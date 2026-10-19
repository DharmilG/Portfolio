"use client";

// SourceControl — SCM view (DOC/05 §7). Source-true metrics from VS Code
// 1.142: scm.css (input inset 11px, editor 1px #3C3C3C / #313131, radius 4,
// focus outline #0078D4 offset -1, grows 1→10 lines), button.css (26px,
// 4px/8px padding, 12px/16px, radius 4, #0078D4 → #026EC1, disabled 0.4),
// countBadge.css (18px, 3px/5px, radius 11, 11px), git-repository.ts
// (placeholder `Message (Ctrl+Enter to commit on "main")`, discard prompt).
// Input font is the UI font (scm.inputFontFamily default), not monospace.
// Product layer (DOC/02 #10): LOCAL lane with accent line + dots (top dot
// pulses) and a 600ms CSS confetti burst on commit.
// Deferred: diff peek (no diff viewer), toast (PV-UI-TOAST), staging, split
// button, real history until `projects` loads + /api/commits ships.
import { useEffect, useRef, useState } from "react";
import { fileIcon } from "@/lib/fileIcons";
import type { RealCommit } from "@/lib/localGit";
import { dirtyCount, useStore } from "@/lib/store";
import Codicon from "./Codicon";
import Modal from "./Modal";
import Tooltip from "./Tooltip";

type SourceControlProps = {
  onOpenFile?: (path: string) => void;
};

type CommitPage = {
  commits: RealCommit[];
  hasMore: boolean;
};

type ConfettiPiece = {
  dx: number;
  dy: number;
  rot: number;
  color: string;
};

const CONFETTI_COLORS = [
  "var(--color-vscode-accent)",
  "var(--color-vscode-added)",
  "var(--color-vscode-modified)",
  "var(--color-vscode-error)",
  "var(--color-vscode-warning)",
];

// One burst: pieces fly up/out from the button center and fade (600ms CSS).
function makeConfetti(): ConfettiPiece[] {
  return Array.from({ length: 16 }, (_, i) => ({
    dx: Math.round((Math.random() - 0.5) * 180),
    dy: Math.round(-30 - Math.random() * 70),
    rot: Math.round((Math.random() - 0.5) * 360),
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }));
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

// Edits are keyed by workspace path; SCM shows the repo-relative name + dir.
function splitPath(path: string): { name: string; dir: string } {
  const parts = path.split("/");
  const name = parts[parts.length - 1] ?? path;
  const dir =
    parts[0] === "Projects" && parts.length >= 4
      ? parts.slice(3, -1).join("/")
      : parts.slice(0, -1).join("/");
  return { name, dir };
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-[11px] bg-vscode-count-bg px-[5px] text-[11px] leading-[11px] text-vscode-count-fg">
      {count}
    </span>
  );
}

function GroupRow({
  label,
  count,
  open,
  onToggle,
}: {
  label: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      className="flex h-7 cursor-pointer select-none items-center gap-1 pl-2 pr-2 hover:bg-vscode-list-hover"
    >
      <span className="flex w-4 shrink-0 items-center justify-center text-vscode-dim">
        <Codicon
          name={open ? "chevron-down" : "chevron-right"}
          className="translate-y-px"
        />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined ? <CountBadge count={count} /> : null}
    </div>
  );
}

export default function SourceControl({ onOpenFile }: SourceControlProps) {
  const edits = useStore((s) => s.edits);
  const localCommits = useStore((s) => s.commits);
  const projects = useStore((s) => s.projects);
  const commitMsg = useStore((s) => s.commitMsg);
  const setCommitMsg = useStore((s) => s.setCommitMsg);
  const commitLocal = useStore((s) => s.commitLocal);
  const discardEdit = useStore((s) => s.discardEdit);

  const dirty = dirtyCount(edits);
  // VS Code lists resources with compareFileNames (case-insensitive, name
  // first) then by path — so app/globals.css precedes README.md.
  const files = Object.keys(edits).sort((a, b) => {
    const an = splitPath(a).name.toLowerCase();
    const bn = splitPath(b).name.toLowerCase();
    return an === bn ? a.localeCompare(b) : an.localeCompare(bn);
  });

  const [open, setOpen] = useState({
    changes: true,
    local: true,
    commits: true,
  });
  const [pendingDiscard, setPendingDiscard] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const [announce, setAnnounce] = useState("");

  const [real, setReal] = useState<RealCommit[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [historyState, setHistoryState] = useState<
    "idle" | "loading" | "error"
  >("idle");

  const msgRef = useRef<HTMLTextAreaElement>(null);
  const burstTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const repo = projects[0];
  const repoKey = repo ? `${repo.repo_owner}/${repo.repo_name}` : "";

  const toggle = (key: keyof typeof open) =>
    setOpen((o) => ({ ...o, [key]: !o[key] }));

  // Auto-grow 1→10 lines (scm.inputMaxLineCount default 10; 13px × 1.5 =
  // 20px line box, +2px padding +1px border each side). An empty box stays at
  // one line: the placeholder wraps at sidebar widths and must not drive the
  // height (VS Code measures editor content, not placeholder text).
  useEffect(() => {
    const el = msgRef.current;
    if (!el) return;
    if (commitMsg === "") {
      el.style.height = "26px";
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight + 2, 206)}px`;
  }, [commitMsg]);

  useEffect(
    () => () => {
      if (burstTimer.current) clearTimeout(burstTimer.current);
    },
    [],
  );

  // Real history: page 1 when a repo is linked (backend ships last, so the
  // common state today is `projects` empty → placeholder).
  useEffect(() => {
    setReal([]);
    setPage(1);
    setHasMore(false);
    setHistoryState("idle");
    if (!repo) return;
    let cancelled = false;
    setHistoryState("loading");
    fetch(
      `/api/commits?owner=${encodeURIComponent(repo.repo_owner)}&repo=${encodeURIComponent(
        repo.repo_name,
      )}&per_page=10&page=1`,
    )
      .then((r) => (r.ok ? (r.json() as Promise<CommitPage>) : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        setReal(data.commits ?? []);
        setHasMore(Boolean(data.hasMore));
        setHistoryState("idle");
      })
      .catch(() => {
        if (!cancelled) setHistoryState("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoKey]);

  const loadMore = () => {
    if (!repo || historyState === "loading") return;
    setHistoryState("loading");
    fetch(
      `/api/commits?owner=${encodeURIComponent(repo.repo_owner)}&repo=${encodeURIComponent(
        repo.repo_name,
      )}&per_page=10&page=${page + 1}`,
    )
      .then((r) => (r.ok ? (r.json() as Promise<CommitPage>) : Promise.reject()))
      .then((data) => {
        setReal((prev) => [...prev, ...(data.commits ?? [])]);
        setHasMore(Boolean(data.hasMore));
        setPage((p) => p + 1);
        setHistoryState("idle");
      })
      .catch(() => setHistoryState("error"));
  };

  const commit = () => {
    if (dirty === 0) return;
    if (commitMsg.trim() === "") {
      // git-commands.ts `git.commit`: "Please provide a commit message".
      setShowError(true);
      msgRef.current?.focus();
      return;
    }
    const made = commitLocal(commitMsg);
    if (!made) return;
    setShowError(false);
    setCommitMsg("");
    setPieces(makeConfetti());
    setAnnounce(`Committed locally: ${made.msg}`);
    if (burstTimer.current) clearTimeout(burstTimer.current);
    burstTimer.current = setTimeout(() => setPieces([]), 700);
    msgRef.current?.focus();
  };

  const confirmDiscard = (choice: string) => {
    const path = pendingDiscard;
    setPendingDiscard(null);
    if (path && choice === "discard") discardEdit(path);
  };

  const pendingName = pendingDiscard ? splitPath(pendingDiscard).name : "";

  return (
    <div className="text-[13px]">
      {/* Commit input: 5px vertical row padding, 11px left inset, 12px right. */}
      <div className="pl-[11px] pr-3 pt-[5px]">
        <textarea
          ref={msgRef}
          rows={1}
          value={commitMsg}
          onChange={(e) => {
            setCommitMsg(e.target.value);
            if (showError) setShowError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              commit();
            }
          }}
          placeholder='Message (Ctrl+Enter to commit on "main")'
          aria-label="Commit message"
          spellCheck={false}
          className={`block w-full resize-none overflow-y-auto rounded-[4px] border bg-vscode-scm-input-bg px-[6px] py-[2px] text-[13px] leading-[20px] text-vscode-fg placeholder:text-vscode-scm-placeholder ${
            showError
              ? "border-vscode-validation-error-border outline outline-1 outline-vscode-validation-error-border outline-offset-[-1px]"
              : "border-vscode-scm-input-border focus:outline focus:outline-1 focus:outline-vscode-accent focus:outline-offset-[-1px]"
          }`}
        />
        {showError ? (
          <div className="rounded-b-[2px] border border-t-0 border-vscode-validation-error-border bg-vscode-validation-error-bg px-[3px] py-px text-[12px] leading-[18px] text-vscode-fg">
            Please provide a commit message
          </div>
        ) : null}
      </div>

      {/* Action button row: 36px tall (28 + 8), 26px button, 11px inset. */}
      <div className="relative flex h-9 items-center pl-[11px] pr-3">
        <button
          type="button"
          disabled={dirty === 0}
          onClick={commit}
          className="flex h-[26px] w-full items-center justify-center rounded-[4px] border border-transparent bg-vscode-accent px-2 py-[4px] text-[12px] leading-[16px] text-vscode-badge-fg enabled:hover:bg-vscode-accent-hover enabled:focus-visible:outline enabled:focus-visible:outline-1 enabled:focus-visible:outline-offset-2 enabled:focus-visible:outline-vscode-accent disabled:opacity-40"
        >
          <Codicon name="check" className="mr-[0.2em]" />
          <span>Commit</span>
        </button>
        {pieces.length > 0 ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-0 w-0"
          >
            {pieces.map((p, i) => (
              <span
                key={i}
                className="scm-confetti absolute h-[10px] w-[6px] rounded-[1px]"
                style={
                  {
                    backgroundColor: p.color,
                    "--dx": `${p.dx}px`,
                    "--dy": `${p.dy}px`,
                    "--rot": `${p.rot}deg`,
                  } as React.CSSProperties
                }
              />
            ))}
          </span>
        ) : null}
      </div>

      <p role="status" className="sr-only">
        {announce}
      </p>

      {/* CHANGES */}
      {dirty > 0 ? (
        <>
          <GroupRow
            label="Changes"
            count={dirty}
            open={open.changes}
            onToggle={() => toggle("changes")}
          />
          {open.changes ? (
            <div>
              {files.map((path) => {
                const { name, dir } = splitPath(path);
                return (
                  <div
                    key={path}
                    data-path={path}
                    onClick={() => onOpenFile?.(path)}
                    className="group/row flex h-7 cursor-pointer items-center gap-1 pl-6 pr-2 hover:bg-vscode-list-hover"
                  >
                    <span className="shrink-0 text-vscode-dim">
                      <Codicon name={fileIcon(name)} />
                    </span>
                    <span className="max-w-[60%] shrink-0 truncate">
                      {name}
                    </span>
                    {dir ? (
                      <span className="min-w-0 flex-1 truncate text-[11px] text-vscode-dim">
                        {dir}
                      </span>
                    ) : (
                      <span className="min-w-0 flex-1" />
                    )}
                    <span className="hidden shrink-0 items-center group-focus-within/row:flex group-hover/row:flex">
                      <Tooltip text="Discard Changes" position="bottom" align="end">
                        <button
                          type="button"
                          aria-label={`Discard changes in ${name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingDiscard(path);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-control hover:bg-vscode-list-hover hover:text-vscode-fg"
                        >
                          <Codicon name="discard" />
                        </button>
                      </Tooltip>
                    </span>
                    <span className="w-4 shrink-0 text-center text-[11px] font-semibold text-vscode-modified">
                      M
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 px-4 pb-2 pt-6 text-center">
          <Codicon
            name="source-control"
            size={28}
            className="text-vscode-dim opacity-60"
          />
          <p className="text-xs leading-relaxed text-vscode-dim">
            No local changes — edit any file to start the tree 🌱
          </p>
        </div>
      )}

      {/* LOCAL (not pushed) — product lane; hidden while empty (VS Code hides
          empty groups). Top dot pulses; reduced motion is handled in CSS. */}
      {localCommits.length > 0 ? (
        <>
          <GroupRow
            label="Local (not pushed)"
            count={localCommits.length}
            open={open.local}
            onToggle={() => toggle("local")}
          />
          {open.local ? (
            <div>
              {localCommits.map((c, i) => {
                const first = i === 0;
                const last = i === localCommits.length - 1;
                return (
                  <div
                    key={c.id}
                    className="relative flex h-7 items-center gap-2 pl-6 pr-2 hover:bg-vscode-list-hover"
                  >
                    {localCommits.length > 1 ? (
                      <span
                        aria-hidden="true"
                        className={`absolute left-[15px] w-[2px] bg-vscode-accent/40 ${
                          first ? "top-1/2 h-1/2" : last ? "top-0 h-1/2" : "top-0 h-full"
                        }`}
                      />
                    ) : null}
                    <span
                      aria-hidden="true"
                      className={`absolute left-[11px] top-1/2 h-[9px] w-[9px] -translate-y-1/2 rounded-full border-2 border-vscode-side bg-vscode-accent ${
                        first ? "motion-safe:animate-pulse" : ""
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate" title={c.msg}>
                      {c.msg}
                    </span>
                    <span className="shrink-0 text-[11px] text-vscode-dim">
                      {c.files.length} {c.files.length === 1 ? "file" : "files"}
                    </span>
                    <span className="w-16 shrink-0 text-right text-[11px] text-vscode-dim tabular-nums">
                      {timeAgo(c.time)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
      ) : null}

      {/* COMMITS — real history (read-only, opens on GitHub). */}
      <GroupRow
        label="Commits"
        open={open.commits}
        onToggle={() => toggle("commits")}
      />
      {open.commits ? (
        <div>
          {!repo ? (
            <p className="px-4 py-2 text-xs text-vscode-dim">
              No repository linked
            </p>
          ) : historyState === "loading" && real.length === 0 ? (
            <p className="px-4 py-2 text-xs text-vscode-dim">
              Loading commit history…
            </p>
          ) : historyState === "error" ? (
            <p className="px-4 py-2 text-xs text-vscode-dim">
              Couldn&apos;t load commit history.
            </p>
          ) : real.length === 0 ? (
            <p className="px-4 py-2 text-xs text-vscode-dim">
              No commits yet
            </p>
          ) : (
            <>
              {real.map((c) => (
                <a
                  key={c.sha}
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  title={`${c.author} · ${timeAgo(c.date)}`}
                  className="flex h-7 items-center gap-2 pl-6 pr-2 hover:bg-vscode-list-hover"
                >
                  <span className="shrink-0 font-code text-[11px] text-vscode-dim">
                    {c.sha.slice(0, 7)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {c.message.split("\n")[0]}
                  </span>
                  <span className="shrink-0 text-[11px] text-vscode-dim">
                    {timeAgo(c.date)}
                  </span>
                </a>
              ))}
              {hasMore ? (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={historyState === "loading"}
                  className="flex h-7 w-full items-center pl-6 pr-2 text-left text-[12px] text-vscode-dim hover:bg-vscode-list-hover hover:text-vscode-fg disabled:opacity-40"
                >
                  View more
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {pendingDiscard ? (
        <Modal
          message={`Are you sure you want to discard changes in '${pendingName}'?`}
          buttons={[
            { id: "discard", label: "Discard File", primary: true },
            { id: "cancel", label: "Cancel" },
          ]}
          onAction={confirmDiscard}
          onCancel={() => setPendingDiscard(null)}
        />
      ) : null}
    </div>
  );
}
