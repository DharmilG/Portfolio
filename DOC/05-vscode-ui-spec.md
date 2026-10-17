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
Mobile <768px: Activity 48px stays, Sidebar becomes overlay drawer, Editor full-width, Panel bottom-sheet.
```

## 2. Tailwind 4 design tokens (`app/globals.css` — source of truth)

```css
@import "tailwindcss";
@theme {
  --color-vscode-bg: #1e1e1e;
  --color-vscode-side: #181818;
  --color-vscode-titlebar: #191a1b;
  --color-vscode-tab: #181818;
  --color-vscode-tab-hover: #1f1f1f;
  --color-vscode-tab-active: #1e1e1e;
  --color-vscode-border: #2b2b2b;
  --color-vscode-fg: #cccccc;
  --color-vscode-fg-active: #ffffff;
  --color-vscode-dim: #858585;
  --color-vscode-muted: #9d9d9d;
  --color-vscode-emphasis: #bfbfbf; /* sidebar header + static root folder */
  --color-vscode-accent: #0078d4;
  --color-vscode-accent-hover: #026ec1;
  --color-vscode-dot: #e2c08d; /* dirty ● */
  --color-vscode-added: #73c991; /* M badge */
  --color-vscode-error: #f14c4c;
  --color-vscode-warning: #cca700;
  --color-vscode-list-hover: #2a2d2e;
  --color-vscode-list-active: #04395e;
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
  --shadow-vscode: 0 8px 24px rgb(0 0 0 / 0.45);
}
.font-ui { font-family: var(--font-vscode-ui); font-size: 13px; }
.font-code { font-family: var(--font-vscode-code); font-size: 14px; line-height: 1.6; }
/* Shell is flush (no backdrop). Separators: 1px solid var(--color-vscode-border). */
/* Floating widgets only: border-radius var(--radius-control) + var(--shadow-vscode). */
```

Accent usage: active tab top-border 1px accent, Activity active icon = white + rounded pill bg `--color-vscode-activity-active-bg` (no left bar), StatusBar bg accent (white text), focus outlines `1px solid var(--color-vscode-accent)`.

## 3. TitleBar (36px, bg `--color-vscode-titlebar` #191a1b, square)

Left: VS Code logo (`/vscode-logo.svg`, 16px) + menu row (`File Edit Selection View Go Run Terminal Help`, real dropdowns via shared `Menu`, density `menu`). Center: Command Center — `rounded-control bg-vscode-command-bg border 1px #2b2b2b`, max 600px, `⌕ Portfolio`, click -> `Ctrl+P`, hover text white. Right: back/forward (history), layout controls — Customize Layout (`layout`), Toggle Primary Side Bar (`layout-sidebar-left`, wired, Ctrl+B), Toggle Panel (`layout-panel`), Toggle Secondary Side Bar (`layout-sidebar-right`), Browser Preview (`globe`) — all with hover tooltips, decorative window controls `— ▢ ✕`.

## 4. ActivityBar (48px, flush, 1px right hairline)

Top icons (24px, dim -> white on active = rounded pill bg `--color-vscode-activity-active-bg` via shared `IconButton`, tooltip on hover): Explorer `files`, Search `search` (filters Explorer client-side), Source Control `source-control` with count badge `len(dirty)+len(localCommits)` blue circle (shared `Badge`, 18px), Run `debug-alt` (opens preview), Extensions `extensions` (dummy grid + `2` badge).
Bottom: avatar 28px rounded-full `profiles.avatar_url` (your logo) -> click opens `profile.json` tab. Gear 20px below -> hover opens menu (shared `Menu`, density `compact`) `Settings (opens settings.json) | Appearance (theme switch dark/light) | Profile (opens profile.json) | Reset local edits`.

## 5. Sidebar Explorer (280px)

Header `Explorer` + `...` overflow button (shared `Tooltip`: `Views and More Actions...`).
Static workspace root `Dharmil Gajjar` (always present, name in `--color-vscode-emphasis`, no rename affordance) — its row carries the view actions right-aligned (`new-file`/`new-folder`/`refresh`/`collapse-all` as 28px `ViewActionButton`s with VS Code tooltips; emit ids, page owns behavior) — with DB sections nested one level deeper.
Sections as folders from `04`: `About/ Experience/ Projects/<repo>/ Skills/ Contact/ tmp/` (tmp dimmed italic + `ephemeral` tag).
Folder rows: chevron + name only (no folder icon, chevron vertically centered). Row: 28px, indent 12px/level, chevron + `vscode-icons` by ext + `resolveName(): uiRenames ?? title_override ?? repo_name` + `M` green badge if dirty + `●` if tmp unsaved. Right-click: `Rename (session only) -> uiRenames`, `Open Preview (if preview_url)`, `Discard local changes`.
`Projects/<repo>/` expand -> `GET /api/repo/tree`, skeleton shimmer rows while loading, README auto-open.

## 6. Editor (core: read + local edit + split)

Tab bar 35px (square, flush): icon + name + `●` dirty dot (color `--color-vscode-dot`) or `x` on hover, active tab `bg-tab-active + top accent line`. Right: split-right icon (markdown/browser preview), `...` (Copy path, Reveal in Explorer, Open raw).
Breadcrumb 22px dim: `Projects > <repo> > src > page.tsx`.
Viewport:
- Default read: Shiki Dark Modern + line numbers (gutter 48px, active line highlight on hover), minimap fake gradient bar right (decorative, 80px).
- Edit mode: `dblclick / pencil / Ctrl+E` swaps to `textarea` overlay (same font/metrics, transparent caret accent). Header banner `Editing locally — not pushed (Esc to view)`. `Ctrl+S` -> `localEdits[path]=value` + toast `Saved locally`, `Esc` -> back to view. No server call (per `09 §8`).
- Split: `Ctrl+\` or preview icon opens second group: `MarkdownPreview` (`Ctrl+Shift+V` toggles for `.md`) or `BrowserPreview` (iframe + url bar + reload + `Open in new tab`, sandbox allow-scripts allow-same-origin).

## 7. Source Control (fun + interactive)

Panel replaces Explorer when git icon active:
- Input `Message (Ctrl+Enter to Commit)` + `Commit` button (disabled if 0 dirty). On commit: prompt-less quick commit -> `localCommits.unshift()` + confetti burst (CSS, 600ms) + toast `Committed locally “msg”`.
- `CHANGES (n)` list: dirty files with `M` + diff peek on click + `Discard` per file.
- `LOCAL (not pushed) (k)` SVG lane: vertical `main` line accent + dots per `localCommits` (msg + time + files count), top dot pulsing.
- `COMMITS` real list from `GET /api/commits` (sha short, msg, author, date), dimmed, read-only.
- Empty state illustration: `No local changes — edit any file to start the tree 🌱`.

## 8. StatusBar (24px, accent blue, flush)

Left: `$(git-branch) main*` (star if dirty), `$(error) 0 $(warning) 0`, `$(git-commit) local:k`. Right: `Ln X, Col Y` (updates on textarea caret), `Spaces:2`, `UTF-8`, `TypeScript/Shiki lang`, `$(bell)` (opens dummy notifications: `Cache warmed 2h ago`). Click branch -> focuses Source Control.

## 9. Command Palette + keybinds

`Ctrl+P` quick open (fuzzy file list from tree+static), `Ctrl+Shift+P` commands (`Open Preview, Toggle Theme, Discard Edits, Focus Terminal`), `Ctrl+Shift+V` markdown split, ``Ctrl+` `` terminal, `Ctrl+B` sidebar, `Ctrl+S` local save, `Ctrl+E` edit toggle.

Palette UI: centered 480px `rounded-control` + `--shadow-vscode`, input (not pill) + list 40px rows + `↑↓ Enter Esc`.

## 10. Search / Run / Extensions (dummy but alive)

- Search: filters current tree client-side, highlights matches in FileViewer (mark tag accent).
- Run: opens `preview_url` in BrowserPreview or `Open in new tab` if `preview_embeddable=false`.
- Extensions: static cards (`Prettier, ESLint`) with `Install (dummy)` -> toast.

All surfaces flush/square; radii only for controls (`rounded-control`); colors/type/shadow from §2 tokens only.
