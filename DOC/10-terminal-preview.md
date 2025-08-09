# 10 — Terminal + Preview + Markdown (Detailed)

> As-built for the terminal (PV-C-TERMINAL + the split/profile follow-up),
> markdown preview (PV-C-MDPREVIEW), and the integrated browser
> (PV-C-BROWSERPREVIEW).
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
  `#0078D4` active left border). Tab actions: `+`, profile caret, split,
  trash, and `...` overflow (New / Split / Unsplit / Rename / Clear / Kill).
  The overflow and profile menus are fixed-positioned so they escape the panel
  clip at the 120px minimum height. Panel surface `#181818`,
  border/separators `#2b2b2b`, card radius 8px, toolbar hover `#5a5d5e50`.
- Sessions: seeds `pwsh` then `bash` (bash active). The tab strip is one shared
  pool; each tab keeps one xterm instance (scrollback survives switches, split
  moves, panel hides). New tab from `+` or ``Ctrl+Shift+` ``; the profile caret
  spawns bash or PowerShell; trash kills the focused pane's session; killing
  the last closes the panel (reopening seeds a fresh bash). `Ctrl+D` on an
  empty line also kills. Tab labels show the shell name; double-click or the
  tab context menu renames one (empty resets to the shell name). Kill leaves
  other tabs alone and picks a replacement for the emptied pane, collapsing
  the split when none is left.
- Split: `Ctrl+Shift+5`, the split action, the overflow, the tab context menu,
  `Terminal > Split Terminal`, or `Terminal: Split Terminal`. v1 caps the
  workspace at **two panes**: the left pane follows `activeSessionId` and the
  right pane follows `splitSessionId`; if already split, Split behaves like
  New Terminal in the focused pane. Tabs stay in the shared strip; clicking a
  hidden tab replaces the focused pane's session, clicking either visible tab
  focuses its pane. The 5px vertical `Sash` (120px pane floor) drags live and
  commits a session-only `splitRatio` (0.2–0.8). Unsplit (overflow / command /
  menu) hides the second pane but keeps its session as a tab. The panel stays
  keyboard-focused on the active pane after split/unsplit/tab changes.
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
  ``Ctrl+` ``, `Ctrl+B`) and the terminal commands ``Ctrl+Shift+` ``
  (new) / `Ctrl+Shift+5` (split) pass through to the window handler instead of
  reaching the shell.
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
- `open <path>` — `OPEN_TAB`; FileViewer picks the renderer (Markdown preview
  per §5). `open --preview <url>` targets the integrated browser (§4).

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

## 4. Integrated browser (PV-C-BROWSERPREVIEW, as built)

- **Tabs**: a page is a normal editor tab (`browser:<n>`, globe glyph, label =
  host). The title-bar globe is open-or-list: with no browser tabs it opens
  one; with tabs it lists `New Integrated Browser Tab` + one row per open tab
  (active marked). Each instance owns its URL, back/forward stack, reload key
  and suspended flag (session-only; browser tabs do not persist). Switching
  editor tabs only hides the pane (`hidden`, not unmounted), so the page stays
  alive until Suspend; closing the tab drops the instance. The `...` actions
  menu: Copy URL / Open in External Browser / Reload / Suspend Tab (unloads
  the frame, Resume remounts) / Clear Browser History. Recents/history persist
  in localStorage, cap 200.
- **Navbar**: 6/8/3 insets, 8px gaps. Back/forward/reload are 28px, 40% dimmed
  when unavailable. URL container: `#313131`, 1px `#3C3C3C`, 6px radius, focus
  `#0078D4`, placeholder `Search or enter URL`. Right: the two disabled chat
  actions (`codicon-comment` "Comment on Elements", `codicon-inspect` "Add
  Element to Chat") + the `...` menu. The URL picker opens under the input:
  typing yields the go-to row and/or `{q} - Bing Search` (URL-like input puts
  go-to first) plus up to 6 History matches; an empty field shows the top-3
  `Recents` + other tabs under `Open Tabs` (label right-aligned on the first
  row). Rows are 22px (focus `#04395E`/white, hover `#2A2D2E`). Enter/click
  navigates; search rows load in the current tab while it is still empty, else
  in a new tab. `Ctrl+L` focuses/selects the URL and reopens the picker (not
  while typing in another field/xterm); the first Esc closes the picker, a
  second blurs. URL normalization: explicit schemes kept, localhost/loopback/
  IPs -> `http://`, other bare hosts -> `https://`, whitespace -> search.
- **Framing pre-flight** (`/api/embed-check?url=`): Chrome's refusal is not
  observable from iframe JS, so the pane probes headers before mounting.
  4s timeout, up to 3 validated redirects, body cancelled after the headers;
  `X-Frame-Options` DENY / SAMEORIGIN / ALLOW-FROM, or a `frame-ancestors`
  list that does not admit the app origin, returns `blocked` + the reason;
  loopback/private targets are never probed (`unknown`, mounted directly);
  everything else is `allowed`. Verdicts are cached per origin for 10 min.
  `blocked` never mounts an iframe: the pane shows its own **Failed to Load
  Page** card (reason + URL + Read-Only View / Try Again / Open in External
  Browser) instead of Chrome's error page. A failed probe degrades to best
  effort, and an 8s no-load fallback shows the timeout variant of the card.
  Navbar/menu Reload and Try Again forget the verdict and re-probe.
- **Embeddable mappings** (`lib/embedTargets.ts`): the iframe `src` can differ
  from what the address bar shows. `google.<tld>` home/`/webhp` ->
  `https://www.google.com/search?igu=1`; Google `/search` keeps q/tbm/udm/...
  and adds `igu=1`; YouTube watch/shorts/live/youtu.be ->
  `youtube.com/embed/<id>` (`t`/`start` preserved). Mapped URLs skip the probe
  (known embeddable). These entry points are best-effort and can change
  without notice: Google's igu landing can show a dismissible Chrome promo and
  search can hit an anti-bot check; a dead mapping falls back to the target's
  own behavior (usually the blocked card).
- **Search rows use Bing** (`{q} - Bing Search`): Bing sends no framing block,
  so the SERP renders in-frame; Google and DuckDuckGo refuse.
- **Read-only view** (`/api/embed?url=`, fallback for refused pages): fetches
  HTML only server-side (other content types -> a 415 error page), 3MB / 8s,
  with the shared SSRF guards. It strips scripts, inline handlers, nested
  frames/objects/embeds, meta refresh + CSP and any `<base>`, injects a
  `<base>` at the final URL, and rewrites `<a href>` through the route so
  links keep browsing the read-only surface. The response carries
  `CSP: sandbox; default-src 'none'` (images/media/styles/fonts only); the
  pane mounts it with `sandbox=""` and the banner `Read-only view - scripts
  disabled, links stay in this view` + **Try Live** (forgets the verdict and
  reloads the live path). JS apps render as static markup by design — a
  best-effort fallback, not a general proxy.
- **Sandbox**: live pages run `allow-scripts allow-forms allow-same-origin
  allow-downloads allow-popups`; read-only runs `sandbox=""` on top of the
  response CSP above.
- **Honest limits**: a link clicked inside a live framed page (a Bing result ->
  GitHub, say) navigates the framed site itself; cross-origin navigation can't
  be intercepted, so that target's own refusal is what you see. Our own pages
  can be embedded only if their headers allow it (drop `X-Frame-Options`, set
  a matching `frame-ancestors`). Read-only links stay inside the read-only
  surface, and scripts stay off there.
- **Terminal / palette**: `open --preview <url>` retargets the active browser
  tab (or the first; creates one when none), `reload` remounts it (dim note
  with no browser tab). Palette: `Browser: Open Integrated Browser`,
  `Browser: Focus URL Input` (Ctrl+L), `Browser: Reload`; Run > Open
  Integrated Browser and the globe use the same command.

## 5. Markdown preview (PV-C-MDPREVIEW, as built)

- Detect `.md/.mdx` in FileViewer. A Markdown tab opens in **preview mode**
  by default; `Ctrl+Shift+V` and the editor rail action (`Open Source` / `Open
  Preview`) toggle the same tab between preview and source. There is no split
  group, 5px sash, or second `Preview <name>.md` tab. The palette carries
  `Markdown: Toggle Preview` (same keybinding) and `Markdown: Open Source`.
- Layout: one editor surface. The preview fills the same card as source; a
  22px dirty strip appears while the source carries local content:
  `Previewing unsaved edits ●` (draft buffer) / `Previewing local edits ●`
  (saved edit). The source textarea is mounted only in source mode.
- Content: FileViewer resolves `drafts[path] ?? localEdits[path] ??
  tmpFs[path] ?? repo blob` once and passes the same string to the preview,
  so toggling modes does not refetch `/api/repo/blob` or lose a buffer. The
  preview re-renders 300ms after the last keystroke (typing stays responsive;
  Mermaid re-renders coalesce). Sources over 512 KB show a size note.
- Loading: the whole preview is a dynamic import from FileViewer; Mermaid adds
  a second lazy chunk. A repo blob error or missing content keeps the shared
  editor status line instead of mounting the preview.
- Renderer: `react-markdown` + `remark-gfm` + `rehype-slug` +
  `rehype-highlight` (github-dark; `plainText: ["mermaid"]` keeps Mermaid
  fences out of the highlighter). GFM tables/task lists/strikethrough, heading
  slugs, 860px column, independent scroll. Links open in a new tab (heading
  anchors smooth-scroll in place), images are lazy + `no-referrer`; raw HTML
  is not executed. `.mdx` renders as plain Markdown (JSX is not compiled).
- Mermaid: every ` ```mermaid ` fence maps to `MermaidBlock` — lazy
  `import("mermaid")` after first mount, `theme: "base"` + `darkMode` with
  workbench tokens, `securityLevel: "strict"`, `htmlLabels: false`,
  `maxTextSize: 50_000`, `maxEdges: 500`, sanitized `useId`, and a module-level
  render queue (Mermaid's pipeline is global state). A broken diagram renders
  an isolated error card (message + source) without taking down the preview;
  no zoom/pan/click links.
- Persistence: `mdViewMode[path]` is session-only (absent from
  `vscode-local-v1`); closing the tab drops it, so reopening starts in
  preview. The preview never appears as a separate editor tab.

## 6. Safety / perf

- No `eval`; terminal output caps at 20KB, `cat` at 100 lines, `diff` at 40 rows, `curl` at 20KB / 8s.
- `commit` messages are shown as plain text in xterm (no HTML injection); ANSI is only emitted by the parser, remote curl text is stripped of escape sequences.
- The proxy route owns URL validation and SSRF guards (GET-only public http(s), DNS + redirect checks, 8s/20 KB); the client never opens sockets directly.
- Browser fallbacks reuse `lib/net.ts`: `/api/embed-check` reads headers only
  (4s, 3 validated redirects, private hosts never probed); `/api/embed`
  renders HTML only (3MB / 8s), strips active content, and serves it with
  `CSP: sandbox` into a `sandbox=""` iframe.
- Proxy rate limiting (30/min/IP in DOC/09 5) stays backend-gated with Upstash; the SSRF guards and caps above are live today.
- Persist `tmpFs/localEdits/localCommits` to localStorage (`vscode-local-v1`), cap 2MB total, `Reset local edits` in gear menu clears all.
