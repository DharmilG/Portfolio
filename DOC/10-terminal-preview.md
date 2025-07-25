# 10 — Terminal + Preview + Markdown (Detailed)

> As-built for the terminal (PV-C-TERMINAL); preview + markdown are planned.
> Dummy emulator, client-only. Same `localEdits/localCommits` store as `05`.
> No pty (Vercel serverless can't hold pty). Depends on `04 §8`, `05 §6-7`, `09 §5, §8`.

## 1. Terminal UI (`components/vscode/TerminalPanel.tsx`)

- Bottom Panel card under the editor, 5px card gutter, **closed by default**.
  `Ctrl+`` and `Ctrl+J` toggle it; `Ctrl+B` still toggles the sidebar. A dialog
  owns the keyboard while open. TitleBar layout-panel + View menu use the same
  commands.
- Height 280px default. The 5px gutter carries a horizontal `Sash` (min 120px,
  max = row − 215px, editor floor 200px). Drag live via `panelPreview`, commit
  on release. Maximize toggles `min(60vh, editor-floor cap)`; restore returns
  to the last height. Close (`x`) hides the panel but keeps xterm buffers
  mounted, so scrollback survives.
- Chrome: 35px panel title (11px uppercase `TERMINAL` tab, 1px accent
  underline inset 2px, square 28px maximize/close actions), 22px terminal tab
  strip (12px labels, 10px horizontal padding, 1px separators, 1px
  `#0078D4` active left border, 22px +/clear/trash actions). Panel surface
  `#181818`, border/separators `#2b2b2b`, card radius 8px, toolbar hover
  `#5a5d5e50`.
- Sessions: seeds `pwsh` then `bash` (bash active). `+` spawns a new bash;
  trash kills the active session; killing the last closes the panel
  (reopening seeds a fresh bash). `Ctrl+D` on an empty line also kills.
  One xterm instance per session; tab labels show the shell name.
- xterm: `@xterm/xterm` 5.5.0 + `@xterm/addon-fit`, Fira Code 13px,
  `lineHeight: 1`, block cursor (blink), scrollback 1000, 20px left gutter
  (VS Code `--vscode-spacing-size200`). Dark Modern ANSI palette: bg `#181818`,
  fg `#CCCCCC`, selection `#264F78`; normal `#000000/#cd3131/#0DBC79/#e5e510/
  #2472c8/#bc3fbc/#11a8cd/#e5e5e5`; bright `#666666/#f14c4c/#23d18b/#f5f543/
  #3b8eea/#d670d6/#29b8db/#e5e5e5`.
- Prompt: bash `user@portfolio:<cwd>$ `; pwsh `PS <cwd>>`. User bright green
  (`#23d18b`), cwd blue (`#3b8eea`), `main*` amber (`#e5ba7d`) iff
  `localEdits` is non-empty. ANSI SGR strings from the pure parser.
- Keys: `Enter` submit; `Ctrl+Enter` explicit submit (same commit path);
  `Up/Down` history; `Left/Right/Home/End/Delete/Backspace`; `Tab`
  completes; `Ctrl+L`/`Ctrl+K` clear; `Ctrl+C` copies selection else cancels
  the line with `^C`; `Ctrl+Shift+C/V` copy/paste; `Ctrl+A/E/U/W` line edits;
  multi-line paste is processed line by line. Workbench chords (`Ctrl+J`,
  ``Ctrl+` ``, `Ctrl+B`) pass through to the window handler.
- History: per session, 100 cap, mirrored flat to localStorage
  `vscode-term-hist`; new sessions replay the flat list. Panel/session state
  itself is session-only (`vscode-local-v1` excludes it).

## 2. Parser (`lib/terminal/parser.ts`)

```ts
type TerminalShell = "bash" | "pwsh";
type Ctx = {
  cwd: string; shell: TerminalShell;
  vfs: string[]; dirs: string[];
  localEdits: Record<string, string>;
  localCommits: LocalCommit[];
  tmpFs: Record<string, string>;
  cached?: Record<string, string>;      // blob API pending
  realCommits?: RealCommit[];           // commits API pending
  branch?: string;
};
type Effect =
  | {kind:'OPEN_TAB', path:string}
  | {kind:'WRITE_EDIT'|'WRITE_TMP', path:string, content:string}
  | {kind:'DELETE', path:string}
  | {kind:'COMMIT', msg:string}
  | {kind:'DISCARD', path?:string}
  | {kind:'SET_THEME', mode:'dark'|'light'}
  | {kind:'CLEAR'|'RELOAD_PREVIEW'}
  | {kind:'CURL', url:string};
parse(input:string, ctx:Ctx): {output:string; effects:Effect[]; cwd?:string};
renderPrompt(cwd:string, dirty:boolean, shell:TerminalShell): string;
complete(line:string, ctx:Ctx, cursor?:number): {line:string; cursor:number; listing?:string};
```

Pure and synchronous (no fetch); `CURL` is performed by the panel. Rendered
output is ANSI text; errors are red `command not found: X — try 'help'`.

VFS: sections map to folders (`projects` → `Projects`), repo trees map to
`Projects/<owner>/<repo>/...`, and `Projects/` + `tmp/` always exist. Saved
edits and `tmpFs` overlay the tree; parent dirs are derived. The parser
supports `cached` + `realCommits`, but the panel passes empty maps until
`/api/repo/blob` and `/api/commits` land: `cat` reads saved edits/tmp, `log`
lists local commits, and missing cached content prints a dim note.

## 3. Commands

Files:
- `ls [path]`, `pwd`, `cd <dir>` — `ls` marks edited files `M`, blue dirs,
  dim `tmp/` paths.
- `cat <file>` — saved edit > tmp > cached; first 100 lines, truncation note;
  binaries/deep dirs are errors.
- `echo <txt> > <file>` / `>>` — writes `tmp/` or an existing repo file
  (dirty edit); other paths are a read-only snapshot error. `touch` mirrors
  that rule; `mkdir`/`rm` are tmp-only.
- `open <path>` — `OPEN_TAB`; FileViewer picks the renderer (preview split
  lands with §4-5).

Local git (same store as Source Control §7; `git <verb>` accepted for git
verbs only):
- `status` — branch, modified files, local commits, commit hint.
- `diff [file]` — LCS `-/+` rows (40-row cap) from cached vs local edits.
- `commit -m "msg"` — requires dirty files; commits all and clears them,
  or `Please provide a commit message` / `nothing to commit`.
- `log --graph` — local commits + cached real commits (`origin` tags, when
  supplied), flat star rows; `branch` prints `* main`; `checkout -- <file>` /
  `checkout -- .` discards one/all local edits.
- `push`/`pull`/`fetch` are read-only-upstream jokes — no network, no remote.

Misc:
- `help` — grouped accent table; `whoami`, `date`, `neofetch`, `clear`.
- `theme dark|light` — emits `SET_THEME`; light writes a dim "staying Dark
  Modern" note because the workbench palette is dark-only.
- `curl <url>` — `CURL` effect. The parser accepts a bare host (prepends
  `https://`), keeps an explicit `http(s)://`, and treats
  `-l`/`--list-only`, `-s`/`--silent`, `-S`/`--show-error`,
  `-L`/`--location` (plus combined short forms like `-sL`) as no-ops; other
  options and multiple URLs are errors. The panel fetches
  `/api/proxy?url=…`; the route allows GET only, validates public http(s)
  URLs, rejects credentials and loopback/private/link-local/metadata hosts
  and IPs (DNS and every redirect hop are rechecked, max 3), accepts text
  content types, and returns at most 20 KB after an 8s deadline.
  Proxy-generated errors carry `x-proxy-error` so the terminal prints the
  reason (`Private or local addresses are blocked`, …) instead of a generic
  failure; `x-proxy-truncated` drives the 20 KB note (ANSI stripped).

## 4. Browser preview (planned)

- Trigger: tab icon `split-right` when `projects.preview_url != null`, or Run icon, or terminal `open --preview <repo>`, or palette `Open Preview`.
- Layout: second editor group split right, url bar (readonly input + reload + `Open in new tab`), iframe `flex-1 bg-white` (flush, square).
- Iframe: `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`, `allow="clipboard-read"`, full scroll/click navigation works iff target allows framing.
- Embed fix (your own Vercel apps): remove `X-Frame-Options: DENY`, set `Content-Security-Policy: frame-ancestors https://<portfolio>.vercel.app`. If `preview_embeddable=false` or `onError/load timeout 8s` -> fallback card `Preview blocked by site — [Open in new tab]`.
- State: `previewUrl, history[], reloadKey` in Zustand `previewSlice`, `RELOAD_PREVIEW` from terminal.

## 5. Markdown preview (planned)

- Detect `.md/.mdx` in FileViewer. `Ctrl+Shift+V` (or split icon) toggles split group.
- Render: `react-markdown + remark-gfm + rehype-highlight (github-dark)` + VS Code markdown CSS (max-width 860px, 16px/1.7).
- Content: `localEdits[path] ?? blob.content` — edits live-update preview on `Ctrl+S` (debounce 300ms). Dirty banner `Previewing local edits ●`.
- Scroll: independent (linked headings V2). Print-safe, no scripts.

## 6. Safety / perf

- No `eval`; terminal output caps at 20KB, `cat` at 100 lines, `diff` at 40 rows, `curl` at 20KB / 8s.
- `commit` messages are shown as plain text in xterm (no HTML injection); ANSI is only emitted by the parser, remote curl text is stripped of escape sequences.
- The proxy route owns URL validation and SSRF guards (GET-only public http(s), DNS + redirect checks, 8s/20 KB); the client never opens sockets directly.
- Proxy rate limiting (30/min/IP in DOC/09 5) stays backend-gated with Upstash; the SSRF guards and caps above are live today.
- Persist `tmpFs/localEdits/localCommits` to localStorage (`vscode-local-v1`), cap 2MB total, `Reset local edits` in gear menu clears all.
