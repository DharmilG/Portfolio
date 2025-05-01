# 10 — Terminal + Preview + Markdown (Detailed)

> Dummy emulator, client-only. Same `localEdits/localCommits` store as `05`. No pty (Vercel serverless can't hold pty).
> Depends on `04 §8`, `05 §6-7`, `09 §5, §8`.

## 1. Terminal UI (`components/vscode/TerminalPanel.tsx`)

- `@xterm/xterm + @xterm/addon-fit` in bottom Panel (280px, resizable, maximize toggles 60vh). Tabs `pwsh | bash` (same engine, different prompt glyph `PS>` vs `$`). `+` spawns session `id`, trash kills, chevron hides (`Ctrl+``).
- Prompt: `user@portfolio:<cwd>$` green `user@portfolio`, blue `cwd`, `main*` suffix if dirty (from `localEdits`).
- Keys: `Up/Down` history (per session, 100 cap, localStorage `vscode-term-hist`), `Tab` completes from `vfs + tmpFs + commands`, `Ctrl+L` clear, `Ctrl+C` cancel line, `Ctrl+Enter` commit shortcut when input starts `commit`.
- Output: xterm rows, `help` prints accent-colored table. Errors red `command not found: X — try 'help'`.

## 2. Parser (`lib/terminal/parser.ts`)

```ts
type Ctx = { cwd:string; vfs:string[]; localEdits:Record<string,string>; localCommits:LocalCommit[]; tmpFs:Record<string,string> };
type Effect =
 | {kind:'OPEN_TAB', path:string}
 | {kind:'WRITE_EDIT'|'WRITE_TMP', path:string, content:string}
 | {kind:'DELETE', path:string}
 | {kind:'COMMIT', msg:string}
 | {kind:'DISCARD', path?:string}
 | {kind:'SET_THEME', mode:'dark'|'light'}
 | {kind:'CLEAR'|'RELOAD_PREVIEW'};
parse(input:string, ctx:Ctx): {output:string; effects:Effect[]};
```

Pure function, no fetch except `curl` effect handled by caller via `/api/proxy`.

## 3. Commands

Base (vfs = sections+projects tree + tmp overlay):
- `help` — grouped table (files / git local / web).
- `ls [path] | pwd | cd <dir>` — `ls` merges real vfs + `tmpFs`, marks `M` dirty, `tmp/` dimmed. `cd` updates `cwd` only.
- `cat <file>` — prints `localEdits[path] ?? cached` (first 100 lines, `... truncated`). Binary -> `binary file, use 'open'`.
- `echo <txt> > <file> | touch <file> | mkdir <d> | rm <p>` — `echo/touch` under `/tmp/` or existing file edit -> `WRITE_EDIT` (dirty). `mkdir/rm` only under `/tmp/`, else `permission denied: read-only snapshot`.
- `open <path>` — `OPEN_TAB`. `theme dark|light` — `SET_THEME`. `whoami|date|neofetch|clear` — fun static.
- `curl <url>` — `fetch('/api/proxy?url='+encodeURIComponent(url))` (see `09 §5`), prints truncated 20KB, 8s timeout.

Git local (same store as Source Control §7):
- `status` — `On branch main / Changes (n): M path / Local commits (k): ... / nothing to commit` + hint.
- `diff [file]` — line `-/+` peek (first 40 lines) from `cached vs localEdits`.
- `commit -m "msg"` — requires dirty, pushes `localCommits`, clears dirty for those files, prints `✔ Committed locally “msg” (not pushed)`.
- `log --graph | branch | checkout -- <file>` — `log` draws ASCII `* local-xyz msg` + real commits (top 10 from cache, dimmed); `branch` prints `* main`; `checkout --` discards single/all (`DISCARD`).
- Unknown `git push/pull` -> `Nice try — this portfolio is read-only upstream 😄. Your commits live in browser only.`

## 4. Browser preview (`components/vscode/BrowserPreview.tsx`)

- Trigger: tab icon `split-right` when `projects.preview_url != null`, or Run icon, or terminal `open --preview <repo>`, or palette `Open Preview`.
- Layout: second editor group split right, url bar (readonly input + reload + `Open in new tab`), iframe `flex-1 bg-white rounded-b-[8px]`.
- Iframe: `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`, `allow="clipboard-read"`, full scroll/click navigation works iff target allows framing.
- Embed fix (your own Vercel apps): remove `X-Frame-Options: DENY`, set `Content-Security-Policy: frame-ancestors https://<portfolio>.vercel.app`. If `preview_embeddable=false` or `onError/load timeout 8s` -> fallback card `Preview blocked by site — [Open in new tab]`.
- State: `previewUrl, history[], reloadKey` in Zustand `previewSlice`, `RELOAD_PREVIEW` from terminal.

## 5. Markdown preview (`components/vscode/MarkdownPreview.tsx`)

- Detect `.md/.mdx` in FileViewer. `Ctrl+Shift+V` (or split icon) toggles split group.
- Render: `react-markdown + remark-gfm + rehype-highlight (github-dark)` + VS Code markdown CSS (max-width 860px, 16px/1.7).
- Content: `localEdits[path] ?? blob.content` — edits live-update preview on `Ctrl+S` (debounce 300ms). Dirty banner `Previewing local edits ●`.
- Scroll: independent (linked headings V2). Print-safe, no scripts.

## 6. Safety / perf

- No `eval`, truncate all outputs 20KB, `curl` denylist private IPs (see `09 §5`), `commit msg` max 200 chars escaped.
- Persist `tmpFs/localEdits/localCommits` to localStorage (`vscode-local-v1`), cap 2MB total, `Reset local edits` in gear menu clears all.
