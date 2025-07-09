# 02 — Requirements (Detailed)

> Functional + non-functional + parity checklist. Implements `01` scope. Local state per `04 §8`, API per `09`, UI per `05`, terminal per `10`.

## Functional
1. Explorer renders `sections visible ORDER BY orders` + `projects visible AND folder_slug ORDER BY orders`. Name = `uiRenames ?? title_override ?? repo_name`.
2. `Projects/<name>/` maps to `projects(repo_owner, repo_name)`. Expand -> `GET /api/repo/tree`, README auto-open, `M` badge if dirty.
3. Click file -> tab (Shiki + breadcrumb + line numbers), always editable (transparent textarea over the highlight layer — no modes). Typing -> session `drafts` buffer. `Ctrl+S` -> `localEdits` only. `●` dot (unsaved buffer) + `M` (saved edits) + `main*` when dirty.
4. Avatar (logo) -> `profile.json` tab. Gear hover -> `Settings (settings.json) | Appearance (theme) | Profile | Reset local edits`.
5. `Ctrl+P` quick open, `Ctrl+Shift+P` commands (open file, preview, theme, discard), `Ctrl+B` sidebar, ``Ctrl+` `` terminal.
6. `.md` + `Ctrl+Shift+V`/split icon -> markdown split (`localEdits ?? cached`), live update on save.
7. Preview icon when `preview_url != null` -> iframe split (`sandbox allow-scripts allow-same-origin`), url bar + reload + `Open in new tab`. Fallback card if blocked or `preview_embeddable=false`.
8. Terminal: `help ls pwd cd cat echo touch mkdir rm clear whoami date neofetch open theme curl` + git `status diff [file] commit -m "msg" log --graph branch checkout -- <file>`. `push/pull` prints read-only joke, no-op.
9. `echo >/touch` under `/tmp/` or edit of cached file -> `localEdits/tmpFs` (localStorage `vscode-local-v1`, 2MB cap), visible in Explorer dimmed. `Discard` reverts.
10. Source Control: input + Commit button (`Ctrl+Enter`) requires dirty -> `localCommits.unshift({id:local-ts, msg, files})` + confetti + clears dirty. Lane: `LOCAL (k)` SVG `main` dots on top, `CHANGES (n)` diff list, `COMMITS` real page 1 + `View more` (`page+1`, max 20/page).
11. Rename folder/file -> `uiRenames` localStorage only, zero fetch. `Reset` clears.
12. Search filters tree client-side + highlights in viewer. Run opens preview. Extensions dummy cards.
13. `GET /api/commits?owner&repo&per_page=10&page=1` real history only. Merge client: `[...localCommits, ...real]`. No bulk 500/1000.
14. Add project = 1 insert into `projects`. Must appear after cron/first-visit without redeploy, else bug.
15. All `/api/repo/*` enforce allowlist (`visible=true`) else 404, never hit GitHub without it.

## Non-functional
- Next.js 16 App Router (nodejs runtime for routes), React 19, TS strict, Tailwind 4 CSS-first (`@import "tailwindcss"`, `@theme` tokens only, no hard-coded colors).
- Shiki Dark Modern + textarea overlay (no Monaco). Xterm UI only (no pty).
- Secrets server-only: `GITHUB_PAT, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET`. Public only `NEXT_PUBLIC_SUPABASE_*`.
- Cache: ISR 48h + Redis (tree/meta 48h, blob/commits-per-page 24h) + `github_cache` fallback + ETag 304. Display `view = local ?? cached`. Stale banner on `stale:true`.
- Free-tier: <100 GitHub req/day total, <10k Redis cmds/mo, Vercel 10s route timeout, proxy 20KB/8s/30-per-min-IP.
- Mobile: drawer sidebar, full-width editor, bottom-sheet terminal. A11y: focus rings accent, `Esc` closes palette/menus.

## VS Code parity checklist
- [ ] TitleBar 36px + menubar + Command Center + layout icons
- [ ] ActivityBar 48px + badge counts + avatar/gear bottom
- [ ] Explorer 280px + skeleton + `M/●/tmp` states
- [ ] Tabs 35px + breadcrumb 22px + split groups
- [ ] Source Control local lane + real list + commit input + confetti
- [ ] Terminal 280px + `pwsh|bash` + history/complete
- [ ] StatusBar Dark Modern 22px `#181818` + `main*`, `0↓ k↑` sync, `ⓧ0 ⚠0`, `Ln/Col`, `Spaces/UTF-8/LF`, language, bell
- [ ] Palette 480px + fuzzy + commands
