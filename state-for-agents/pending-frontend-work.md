# Pending Frontend Work (backend later)

Frontend-first order. One file → verify → solo commit → tracker commit.
Backend (`lib/allowlist|github|cache|vfs`, `terminal/parser`, 7 API routes,
portfolio page) stays empty placeholders until shell renders on local DB.

## State deps first (UI needs these)
- [ ] PV-STORE — `lib/store.ts` (zustand: explorer, editorTabs, localEdits, localCommits, uiRenames, tmpFs, preview, theme + selectors)
- [ ] PV-LOCALGIT — `lib/localGit.ts` (LocalEdit/LocalCommit/RealCommit types + merge helper)

## Shell
- [ ] PV-C-LAYOUT — `app/layout.tsx` + `app/page.tsx` (workbench grid, fonts)
- [ ] PV-C-TITLEBAR — `components/vscode/TitleBar.tsx` (36px, Command Center pill)
- [ ] PV-C-ACTIVITYBAR — `ActivityBar.tsx` (48px, badges, avatar + gear bottom)
- [ ] PV-C-SIDEBAR — `SideBar.tsx` + `Explorer.tsx` (280px, sections from DB, tree via API, rename/dirty states)
- [ ] PV-C-STATUSBAR — `StatusBar.tsx` (22px #181818 Dark Modern, main*, `0↓ k↑` sync, Ln/Col/LF/lang)

## Editor
- [ ] PV-C-TABS — `Tabs.tsx` + `Breadcrumb.tsx` (dirty ●, split icons)
- [ ] PV-C-FILEVIEWER — `FileViewer.tsx` (Shiki + textarea overlay, Ctrl+S local)
- [ ] PV-C-PALETTE — `CommandPalette.tsx` (Ctrl+P / Ctrl+Shift+P / F1, fuzzy open, 17 commands, `>` mode)
- [ ] PV-C-SOURCECONTROL — `SourceControl.tsx` (input + local lane SVG + real list + View more)

## Interactive
- [ ] PV-C-TERMINAL — `TerminalPanel.tsx` (xterm + git-local commands)
- [ ] PV-C-MDPREVIEW — `MarkdownPreview.tsx` (Ctrl+Shift+V preview/source in the same tab, live local)
- [ ] PV-C-BROWSERPREVIEW — `BrowserPreview.tsx` (iframe split + fallback)
- [ ] PV-PAGE-HOME/PORTFOLIO — `app/page.tsx` polish + `(portfolio)/[[...file]]/page.tsx` deep-links

## Backend (after shell renders)
PV-LIB-ALLOWLIST, PV-LIB-GITHUB, PV-LIB-CACHE, PV-LIB-VFS, PV-LIB-PARSER,
PV-API-PROJECTS/TREE/BLOB/COMMITS/PROXY/CRON/REVALIDATE, PV-ENV-PROD, PV-DEPLOY.
