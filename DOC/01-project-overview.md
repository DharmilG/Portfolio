# 01 — Project Overview (Detailed)

> Portfolio that looks and behaves exactly like modern VS Code (1.90+, flush chrome, 5px control radius).
> Stack: Next.js 16 App Router + Tailwind 4 + Supabase + Upstash Redis + Vercel. Shiki viewer (not Monaco).

## Goal
Interactive developer portfolio where visitors browse real project code, preview live sites, play with a dummy terminal, edit files locally, and make fake local commits — all free-tier, no visitor login.

## Personas
- **Visitor / recruiter:** opens folders, reads code, checks live preview, tries terminal `status/commit/log`, edits a file to see dirty + branch tree. Zero auth, zero GitHub quota consumed.
- **Owner (you):** adds a project with 1 Supabase insert (`repo_owner, repo_name, visible, preview_url`). Cron + lazy sync fetches tree + meta + README + real commits automatically. No redeploy, no custom admin.

## Scope MVP (locked)
- VS Code shell: TitleBar (menu row + Command Center), ActivityBar (Explorer/Search/Source Control/Run/Extensions + bottom avatar/gear), Sidebar Explorer, Tabs + breadcrumb, Editor (Shiki), bottom Terminal, StatusBar, Command Palette.
- Sections as folders from DB: `About/ Experience/ Projects/<repo>/ Skills/ Contact/ tmp/`.
- Projects: allowlisted GitHub repos via `projects` table (`owner/name`). Tree in 1 req (`recursive=1`), blobs lazy on open, meta + languages header, real commits paginated (`per_page=10, page`, `View more`).
- Profile: bottom-left logo (`profiles.avatar_url`) -> `profile.json`. Gear hover -> `Settings/Appearance/Profile/Reset local edits`.
- Live preview: iframe split group from `projects.preview_url` (+ `Open in new tab` fallback if `preview_embeddable=false`).
- Dummy terminal: xterm UI + client parser (`help/ls/cat/echo/touch` + git `status/diff/commit/log/branch/checkout` + `curl` via `/api/proxy`). `tmp/` session files.
- Markdown split: `Ctrl+Shift+V` (`react-markdown + remark-gfm`), live local-edit preview.
- Local edit + fake git: seamless always-editable editor (transparent textarea over the Shiki layer — no modes), typing -> `drafts` session buffer, `Ctrl+S` -> `localEdits` (localStorage), commit input/terminal -> `localCommits` (SVG `main` lane + confetti). Display rule everywhere: `view = drafts[path] ?? localEdits[path] ?? cached`. Never writes to server (see `04 §8`).

## Non-goals
- No real push/merge, no backend shell (no pty on Vercel serverless), no custom admin UI (Supabase dashboard only), no Monaco, no bulk 500/1000 commit sync, no tarball ingest.

## Constraints (free-tier)
- GitHub PAT 5000 req/hr (visitors use 0, server uses ~30 req/2days for 10 repos). Unauth 60/hr never used directly.
- Upstash Redis free 500k cmds/mo (we use ~5k). Supabase free 500MB. Vercel hobby free + daily cron.
- Caps: tree 5000 entries, blob 512KB, binary blocklist, proxy 20KB/8s, commit msg 200 chars.

## Success criteria
- Pixel-parity Dark Modern chrome, open-Explorer -> code in <1s (cache HIT), add-repo via 1 insert visible after cron/first-visit, edit -> commit -> tree in <3 clicks, Lighthouse 90+, zero `GITHUB_PAT` exposure.
