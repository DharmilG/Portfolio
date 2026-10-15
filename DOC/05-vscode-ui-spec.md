# 05 — VS Code UI Spec (exact match, modern rounded) — Detailed

> Target: VS Code 1.90+ Dark Modern with 8px rounded workbench, Command Center pill, floating panels.
> Viewer: Shiki (not Monaco). Edits + commits 100% local (see `04 §8`, `06 §10`, `09 §8`).

## 1. Layout grid

```
+----------------------------------------------------+
| TitleBar 36px (traffic + Command Center pill)       |
+------+-----------+---------------------+-----------+
| Act  | Sidebar   | Editor groups       | Panel?    |
| 48px | 280px     | flex-1              | (right)   |
|      |           | Tabs 35px           |           |
|      |           | Breadcrumb 22px     |           |
|      |           | Viewport            |           |
|      |           +---------------------+           |
|      |           | Bottom Panel 280px (Terminal)     |
+------+-----------+---------------------+-----------+
| StatusBar 24px (rounded bottom)                     |
+----------------------------------------------------+
Outer: body bg #0f0f0f, workbench gap 8px, padding 8px, all panels radius 8px, border 1px #2b2b2b, shadow 0 8px 24px rgb(0 0 0/.45).
Mobile <768px: Activity 48px stays, Sidebar becomes overlay drawer, Editor full-width, Panel bottom-sheet.
```

## 2. Tailwind 4 design tokens (`app/globals.css`)

```css
@import "tailwindcss";
@theme {
  --color-vscode-bg: #1e1e1e;
  --color-vscode-side: #181818;
  --color-vscode-tab: #1f1f1f;
  --color-vscode-tab-active: #1e1e1e;
  --color-vscode-border: #2b2b2b;
  --color-vscode-fg: #cccccc;
  --color-vscode-dim: #858585;
  --color-vscode-accent: #0078d4;
  --color-vscode-accent-hover: #006bb3;
  --color-vscode-dot: #e2c08d; /* dirty ● */
  --color-vscode-added: #73c991; /* M badge */
  --color-vscode-error: #f14c4c;
  --radius-vscode: 8px;
  --radius-tab: 6px;
  --radius-pill: 999px;
  --font-vscode-ui: "Segoe WPC", "Segoe UI", system-ui, sans-serif;
  --font-vscode-code: "Cascadia Code", "JetBrains Mono", Consolas, monospace;
  --shadow-vscode: 0 8px 24px rgb(0 0 0 / 0.45);
}
.font-ui { font-family: var(--font-vscode-ui); font-size: 13px; }
.font-code { font-family: var(--font-vscode-code); font-size: 14px; line-height: 1.6; }
.workbench { background: #0f0f0f; gap: 8px; padding: 8px; }
.panel { background: var(--color-vscode-side); border:1px solid var(--color-vscode-border); border-radius: var(--radius-vscode); box-shadow: var(--shadow-vscode); }
```

Accent usage: active tab top-border 1px accent, Activity active icon + left 2px accent bar, StatusBar bg accent (white text), focus outlines `1px solid var(--color-vscode-accent)`.

## 3. TitleBar (36px)

Left: traffic dots (macOS style, dummy) + `☰ Menu` (opens Command Palette `>Preferences`). Center: Command Center pill `rounded-full bg-[#2b2b2b] w-[420px] h-[24px]` with `⌕ portfolio — Visual Studio Code`, click -> `Ctrl+P`. Right: layout controls (split editor, toggle panel/sidebar icons).

## 4. ActivityBar (48px, rounded-left)

Top icons (24px, dim -> white on active, tooltip on hover): Explorer `files`, Search `search` (filters Explorer client-side), Source Control `git-branch` with count badge `len(dirty)+len(localCommits)` blue circle, Run `play` (opens preview), Extensions `extensions` (dummy grid + `2` badge).
Bottom: avatar 28px rounded-full `profiles.avatar_url` (your logo) -> click opens `profile.json` tab. Gear 20px below -> hover opens menu `Settings (opens settings.json) | Appearance (theme switch dark/light) | Profile (opens profile.json) | Reset local edits`.

## 5. Sidebar Explorer (280px)

Header `EXPLORER ...` + `...` menu (New File in tmp, Refresh from cache, Collapse All).
Sections as folders from `04`: `About/ Experience/ Projects/<repo>/ Skills/ Contact/ tmp/` (tmp dimmed italic + `ephemeral` tag).
Row: 28px, indent 12px/level, chevron + `vscode-icons` by ext + `resolveName(): uiRenames ?? title_override ?? repo_name` + `M` green badge if dirty + `●` if tmp unsaved. Right-click: `Rename (session only) -> uiRenames`, `Open Preview (if preview_url)`, `Discard local changes`.
`Projects/<repo>/` expand -> `GET /api/repo/tree`, skeleton shimmer rows while loading, README auto-open.

## 6. Editor (core: read + local edit + split)

Tab bar 35px rounded-top: icon + name + `●` dirty dot (color `--color-vscode-dot`) or `x` on hover, active tab `bg-tab-active + top accent line`. Right: split-right icon (markdown/browser preview), `...` (Copy path, Reveal in Explorer, Open raw).
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

## 8. StatusBar (24px, accent blue, rounded-bottom)

Left: ` main*` (star if dirty), `$(error) 0 $(warning) 0`, `$(git-commit) local:k`. Right: `Ln X, Col Y` (updates on textarea caret), `Spaces:2`, `UTF-8`, `TypeScript/Shiki lang`, `$(bell)` (opens dummy notifications: `Cache warmed 2h ago`). Click branch -> focuses Source Control.

## 9. Command Palette + keybinds

`Ctrl+P` quick open (fuzzy file list from tree+static), `Ctrl+Shift+P` commands (`Open Preview, Toggle Theme, Discard Edits, Focus Terminal`), `Ctrl+Shift+V` markdown split, ``Ctrl+` `` terminal, `Ctrl+B` sidebar, `Ctrl+S` local save, `Ctrl+E` edit toggle.

Palette UI: centered 480px rounded-8px shadow, input pill + list 40px rows + `↑↓ Enter Esc`.

## 10. Search / Run / Extensions (dummy but alive)

- Search: filters current tree client-side, highlights matches in FileViewer (mark tag accent).
- Run: opens `preview_url` in BrowserPreview or `Open in new tab` if `preview_embeddable=false`.
- Extensions: static cards (`Prettier, ESLint`) with `Install (dummy)` -> toast.

All rounded, all tokens from §2, no hard-coded colors outside `@theme`.
