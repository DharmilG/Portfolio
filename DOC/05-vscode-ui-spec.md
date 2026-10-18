# 05 — VS Code UI Spec (exact match, flush chrome) — Detailed

> Target: VS Code 1.90+ Dark Modern, 2026-10 refresh — floating rounded
> sections (5px gutters, 8px section radius), TitleBar + StatusBar flush,
> 5px control radius.
> Viewer: Shiki (not Monaco). Edits + commits 100% local (see `04 §8`, `06 §10`, `09 §8`).

## 1. Layout grid (2026-10 refresh: floating rounded sections)

```
+----------------------------------------------------+
| TitleBar 36px (flush, full-width, square)          |
| 5px gutter on near-black backdrop                  |
| [rail+sidebar: ONE rounded card] [editor: card]    |
|  rail 48px + pane 280px, internal hairline only    |
|  Tabs 35px / Breadcrumb 22px / Viewport inside     |
|  the editor card; Panel (Terminal 280px) lands      |
|  later as a third card under the editor            |
| 5px gutter                                         |
| StatusBar 24px (flush, full-width, square)         |
+----------------------------------------------------+
Cards: `Section` primitive — `rounded-section` (8px), 1px #2b2b2b border,
`overflow-hidden`; grid gap 5px + padding 5px on `bg-vscode-titlebar` (the workbench base).
Sash (`Sash.tsx`): the 5px gutter right of the sidebar card is a drag grip — always-visible ⋮ (three 3px dots in `--color-vscode-dim`, brighten to `--color-vscode-emphasis` on hover and keep it through the drag, `col-resize` over the strip), drag resizes the pane live (min 170px, editor floor 320px: the live width rides session-only `sidebarPreview`, the released width persists as `sidebarWidth` in `vscode-local-v1`); the Panel + secondary bar reuse the grip.
Mobile <768px: Activity 48px stays, Sidebar becomes overlay drawer, Editor full-width, Panel bottom-sheet.
```

## 2. Tailwind 4 design tokens (`app/globals.css` — source of truth)

```css
@import "tailwindcss";
@theme {
  --color-vscode-bg: #1e1e1e;
  --color-vscode-editor: #121314; /* opened-file surface (active tab merges into it) */
  --color-vscode-side: #181818;
  --color-vscode-titlebar: #191a1b;
  --color-vscode-tab: #181818;
  --color-vscode-tab-hover: #1f1f1f;
  --color-vscode-tab-active: #121314; /* = --color-vscode-editor (merge) */
  --color-vscode-border: #2b2b2b;
  --color-vscode-fg: #cccccc;
  --color-vscode-fg-active: #ffffff;
  --color-vscode-dim: #858585;
  --color-vscode-muted: #9d9d9d;
  --color-vscode-emphasis: #bfbfbf; /* sidebar header + static root folder */
  --color-vscode-accent: #0078d4;
  --color-vscode-accent-hover: #026ec1;
  --color-vscode-dot: #e2c08d; /* dirty ● (legacy amber; tabs use the two below) */
  --color-vscode-modified: #e5ba7d; /* edited: M badge + names + dots */
  --color-vscode-added: #73c991; /* new: tmp file names + dots */
  --color-vscode-error: #f14c4c;
  --color-vscode-warning: #cca700;
  --color-vscode-list-hover: #2a2d2e;
  --color-vscode-list-active: #04395e;
  --color-vscode-list-inactive: #37373d; /* tree selection while unfocused */
  --color-vscode-input-bg: #3c3c3c;
  --color-vscode-command-bg: #242424;
  --color-vscode-widget-bg: #252526;
  --color-vscode-widget-border: #454545;
  --color-vscode-selection: #264f78;
  --color-vscode-line-highlight: #282828;
  --color-vscode-badge-bg: #0078d4;
  --color-vscode-badge-fg: #ffffff;
  --color-vscode-activity-active-bg: #ffffff1a; /* active pill (2025 refresh) */
  --color-vscode-activity-hover-bg: #ffffff0d;
  --radius-control: 5px; /* Command Center, menus, widgets — no pills */
  --radius-tab: 6px;
  --radius-section: 8px; /* workbench section cards */
  --font-vscode-ui: "Segoe WPC", "Segoe UI", system-ui, sans-serif;
  --font-vscode-code: "Cascadia Code", "JetBrains Mono", Consolas, monospace;
  --font-vscode-term: "Fira Code", "Cascadia Code", Consolas, monospace;
  --shadow-vscode: 0 8px 24px rgb(0 0 0 / 0.45);
}
/* Real faces ship with the app: @fontsource/cascadia-code (editor) +
   @fontsource/fira-code (terminal), imported in app/layout.tsx. */
@utility font-code { font-family: var(--font-vscode-code); font-size: 14px; line-height: 1.6; font-variant-ligatures: none; }
@utility font-term { font-family: var(--font-vscode-term); font-size: 13px; line-height: 1.5; }
/* UI text uses the theme utility `font-vscode-ui` on body — no separate class. */
/* Shell is flush (no backdrop). Separators: 1px solid var(--color-vscode-border). */
/* Floating widgets only: border-radius var(--radius-control) + var(--shadow-vscode). */
```

Accent usage: active tab top-border 1px accent, Activity active icon = white + rounded pill bg `--color-vscode-activity-active-bg` (no left bar), StatusBar bg accent (white text), focus outlines `1px solid var(--color-vscode-accent)`.

## 3. TitleBar (36px, bg `--color-vscode-titlebar` #191a1b, square)

Left: VS Code logo (`/vscode-logo.svg`, 16px) + menu row (`File Edit Selection View Go Run Terminal Help`, real dropdowns via shared `Menu`, density `menu`). Center: Command Center — `rounded-control bg-vscode-command-bg border 1px #2b2b2b`, max 600px, `⌕ Portfolio`, click -> `Ctrl+P`, hover text white. Right: back/forward (history), layout controls — Customize Layout (`layout`), Toggle Primary Side Bar (`layout-sidebar-left`, wired, Ctrl+B), Toggle Panel (`layout-panel`), Toggle Secondary Side Bar (`layout-sidebar-right`), Browser Preview (`globe`) — all with hover tooltips, decorative window controls `— ▢ ✕`.

## 4. ActivityBar (48px, flush, 1px right hairline)

Top icons (24px, dim -> white on active = rounded pill bg `--color-vscode-activity-active-bg` via shared `IconButton`, tooltip on hover): Explorer `files`, Search `search` (filters Explorer client-side), Source Control `source-control` with count badge `len(dirty)+len(localCommits)` blue circle (shared `Badge`, 18px), Run `debug-alt` (opens preview), Extensions `extensions` (dummy grid + `2` badge).
Bottom: avatar 28px rounded-full `profiles.avatar_url` (your logo) -> click opens `profile.json` tab. Gear 20px below -> hover opens menu (shared `Menu`, density `compact`) `Settings (opens settings.json) | Appearance (theme switch dark/light) | Profile (opens profile.json) | Reset local edits`.

## 5. Sidebar Explorer (280px default — sash-resizable, min 170px)

Header `Explorer` + `...` overflow button (shared `Tooltip`: `Views and More Actions...`).
Static workspace root `Dharmil Gajjar` (always present, name in `--color-vscode-emphasis`, no rename affordance) — its row carries the view actions right-aligned (`new-file`/`new-folder`/`refresh`/`collapse-all` as 28px `ViewActionButton`s with VS Code tooltips; emit ids, page owns behavior) — with DB sections nested one level deeper.
Sections as folders from `04`: `About/ Experience/ Projects/<repo>/ Skills/ Contact/` + pinned `tmp` scratch node (local-only `tmpFs`; renders when non-empty, open by default, dimmed italic; DB sections with slug `tmp` are ignored): files `untitled-N` + folders `New Folder N/` with `.gitkeep` inside, rows open/focus tabs like repo files.
Folder rows: chevron + name only (no folder icon, chevron vertically centered). Row: 28px, indent 12px/level, chevron + `vscode-icons` by ext + `resolveName(): uiRenames ?? title_override ?? repo_name`. Decorations (git conventions): edited existing files get an amber name + `M` badge (`--color-vscode-modified`, once `Ctrl+S` saved the buffer); new `tmp/` files tint green (`--color-vscode-added`, untracked — no badge). Right-click: `Rename (session only) -> uiRenames`, `Open Preview (if preview_url)`, `Discard local changes`. Rows are shared `TreeRow`s (`data-path` each): clicking selects (folders too); opening/activating a file auto-reveals it (autoReveal in `lib/store` — expand ancestors, scroll into view, select). Selection renders blue `list-active` while the tree has focus, gray `list-inactive` otherwise.
`Projects/<repo>/` expand -> `GET /api/repo/tree`, skeleton shimmer rows while loading, README auto-open.

## 6. Editor (core: read + local edit + split)

Tab bar 35px band (`--color-vscode-tab`, hidden when no tabs): tiles icon + name + status dot — `●` whenever the tab has an unsaved buffer (`drafts`) or saved edits, swapping to `x` on tile hover. Dot + name tint green for new `tmp/` files (`--color-vscode-added`) and amber (`--color-vscode-modified`) for edited files; edited files also show an `M` badge just left of the dot/`x`. `--radius-tab` top corners, active tab `bg-tab-active` (= `--color-vscode-editor` #121314) only (no top accent line — merges into the opened-file surface). Closing a tab with an unsaved buffer raises the confirm dialog (`Modal.tsx`: `Do you want to save the changes you made to <name>?` — `Don't Save` / `Cancel` / `Save`; `Esc` = Cancel, locally saved edits close silently). Right: pinned actions rail (holds position while the tab run scrolls) — `More Actions...` `...` menu: `Copy path` (workspace path -> clipboard), `Reveal in Explorer` (full parity: shows the Explorer view + sidebar, expands ancestors, selects + scrolls; `store.revealPath`), `Open raw` (repo file -> `raw.githubusercontent.com/<owner>/<repo>/HEAD/<path>` in a new tab; dimmed for `tmp/` files); split-right icon lands with the preview components (`Ctrl+\`).
Breadcrumb 22px dim: `Projects > <repo> > src > page.tsx`. Any crumb opens a
quick-pick tree of that level's siblings (VS Code: "dropdown with that level's
siblings"): the clicked node auto-expands in place with Explorer-style chevron
toggles (▸/▾ folders, file glyphs — an icon on every row; rows 24px, content
inset 5px + 16px per level; the focused row carries a 1px `--color-vscode-accent`
outline and scrolls into view). Picking a file opens it + the Explorer
auto-reveals/selects it; empty folders = no-op. The file crumb's symbols
picker waits for a symbol provider.
Viewport (content = `drafts[path] ?? edits[path] ?? tmpFs[path] ?? blob cache` — the
buffer persists until `Ctrl+S`; the blob cache waits for `/api/repo/blob`, a dim
placeholder line shows until then):
- Seamless single surface — no read/edit modes: the Shiki 1.x `dark-plus` highlight layer (fine-grained core bundle + JS regex engine, no wasm/bundler config; exact Dark Modern token polish later) with a sticky 48px number gutter paints below a transparent-text `textarea` that owns all input (same metrics, `wrap=off`, ligatures off on both layers). Colors stay while typing, caret/selection/undo are native, clicks land the caret exactly. The active line (caret line) gets `--color-vscode-line-highlight` and its gutter number brightens to `--color-vscode-fg`. Minimap fake gradient bar right (decorative, 80px, `pointer-events-none`). Code font: `font-code` = Cascadia Code 14px/1.6 (real face ships via `@fontsource/cascadia-code`); terminal will use `font-term` = Fira Code.
- Typing writes the session buffer (`drafts[path]` — session-only, the tab dot appears live; the buffer persists until saved). `Ctrl+S` promotes the buffer into `localEdits[path]` (buffer clears, amber `M` appears; toast `Saved locally` lands with `PV-UI-TOAST`). No banner, no mode toggle (`Ctrl+E` / `Esc` unbound). No server call (per `09 §8`).
- Split: `Ctrl+\` or preview icon opens second group: `MarkdownPreview` (`Ctrl+Shift+V` toggles for `.md`) or `BrowserPreview` (iframe + url bar + reload + `Open in new tab`, sandbox allow-scripts allow-same-origin).

## 7. Source Control (fun + interactive)

Panel replaces Explorer when git icon active:
- Input `Message (Ctrl+Enter to Commit)` + `Commit` button (disabled if 0 dirty). On commit: prompt-less quick commit -> `localCommits.unshift()` + confetti burst (CSS, 600ms) + toast `Committed locally “msg”`.
- `CHANGES (n)` list: dirty files with `M` + diff peek on click + `Discard` per file.
- `LOCAL (not pushed) (k)` SVG lane: vertical `main` line accent + dots per `localCommits` (msg + time + files count), top dot pulsing.
- `COMMITS` real list from `GET /api/commits` (sha short, msg, author, date), dimmed, read-only.
- Empty state illustration: `No local changes — edit any file to start the tree 🌱`.

## 8. StatusBar (24px, accent blue, flush)

Left: `$(git-branch) main*` (star when uncommitted saved edits exist — the store `edits` layer; drafts don't star until `Ctrl+S`), `$(error) 0 $(warning) 0` (static for now), `$(git-commit) local:k` (k = local commits awaiting push). Right: `Ln X, Col Y` (1-based, live from the store `caret` that FileViewer pushes on caret moves), `Spaces: 2`, `UTF-8`, the active file's language (`langLabelFor` in `lib/langs.ts`), `$(bell)` (popover card — header + `Cache warmed 2h ago`; `Esc`/click-away closes; the toast stack lands with `PV-UI-TOAST`). Editor items (Ln/Col, Spaces, UTF-8, language) hide when no code tab is open; branch/problems/local/bell always show; hover darkens an item. Click branch -> focuses Source Control (`scm` view).

## 9. Command Palette + keybinds

`Ctrl+P` quick open (fuzzy file list from tree+static), `Ctrl+Shift+P` commands (`Open Preview, Toggle Theme, Discard Edits, Focus Terminal`), `Ctrl+Shift+V` markdown split, ``Ctrl+` `` terminal, `Ctrl+B` sidebar, `Ctrl+S` local save.

Palette UI: centered 480px `rounded-control` + `--shadow-vscode`, input (not pill) + list 40px rows + `↑↓ Enter Esc`.

## 10. Search / Run / Extensions (dummy but alive)

- Search: filters current tree client-side, highlights matches in FileViewer (mark tag accent).
- Run: opens `preview_url` in BrowserPreview or `Open in new tab` if `preview_embeddable=false`.
- Extensions: static cards (`Prettier, ESLint`) with `Install (dummy)` -> toast.

All surfaces flush/square; radii only for controls (`rounded-control`); colors/type/shadow from §2 tokens only.
