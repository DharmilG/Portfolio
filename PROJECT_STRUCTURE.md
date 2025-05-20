# Project Structure — Portfolio VS Code

> Stack: Next.js 16 App Router + Tailwind 4 + Supabase (local CLI first) + Upstash Redis + Vercel.
> Toolchain: pnpm 11.25.0 strictly (`packageManager` pinned; `pnpm-lock.yaml` tracked).
> Never use npm/yarn/bun in this repo.
> Docs: `DOC/` (12 files, all detailed). DB source: `DOC/04-data-model.md`. No code yet — structure first.

## Target tree

```
E:\Portfolio\
  DOC\                          # specs (done, committed)
    README.md
    01-project-overview.md ... 11-deployment-roadmap.md
  PROJECT_STRUCTURE.md          # this file
  supabase\                     # local-first DB (next step, not yet created)
    config.toml                 # via `npx supabase init`
    migrations\
      0001_sections.sql         # CREATE TABLE sections + index
      0002_projects.sql         # CREATE TABLE projects + indexes
      0003_profiles.sql         # CREATE TABLE profiles
      0004_experiences.sql      # CREATE TABLE experiences + index
      0005_skills.sql           # CREATE TABLE skills
      0006_social_links.sql     # CREATE TABLE social_links
      0007_site_settings.sql    # CREATE TABLE site_settings
      0008_github_cache.sql     # CREATE TABLE github_cache + index
      0009_rls.sql              # ENABLE RLS + all SELECT policies (no anon writes)
      0010_storage.sql          # bucket avatars + storage policies
      0011_seed.sql             # sections + profile + skills/experience/socials + settings + hidden demos
    seed.sql                    # re-export of 0011 (used by `supabase db reset`)
  app\                          # Next.js 16 (to scaffold)
    layout.tsx
    globals.css                 # `@import "tailwindcss"` + `@theme` tokens (DOC/05 §2)
    (portfolio)\[[...file]]\page.tsx
    api\
      projects\route.ts
      repo\tree\route.ts
      repo\blob\route.ts
      commits\route.ts
      proxy\route.ts            # terminal curl
      cron\sync\route.ts        # Bearer CRON_SECRET, nightly warm
      revalidate\route.ts       # x-secret, revalidateTag
  components\vscode\            # per DOC/05 + DOC/10
    TitleBar.tsx  ActivityBar.tsx  SideBar.tsx  Explorer.tsx
    Tabs.tsx  FileViewer.tsx  Breadcrumb.tsx
    SourceControl.tsx  TerminalPanel.tsx
    MarkdownPreview.tsx  BrowserPreview.tsx
    StatusBar.tsx  CommandPalette.tsx
  lib\                          # per DOC/03 + DOC/09
    db.ts  github.ts  cache.ts  allowlist.ts  validators.ts
    localGit.ts  store.ts  vfs.ts  terminal\parser.ts
  public\
    icons\  logo.png  og.png
  .env.local.example
  vercel.json                   # cron `0 2 * * *` + region
  package.json  tsconfig.json  next.config.ts
```

## Conventions (locked from docs)

- `orders` sort, `visible` gate, `repo_owner/repo_name` source of truth (no URL column).
- `github_cache` pristine server snapshot; commits in Redis per-page only.
- Client rule: `view = localEdits[path] ?? cached`. Local state keys `vscode-local-v1` (edits/commits/renames/tmp).
- Secrets server-only (`GITHUB_PAT, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET`). Public only `NEXT_PUBLIC_SUPABASE_*`.
- Commits: `GET /api/commits?per_page=10&page=1`, Redis EX 24h, `hasMore` flag, merge `[...local, ...real]`.

## SQL files (next step)

Split `DOC/04 §1-§4` verbatim, one table per migration (order matters: sections before projects for FK). `0009_rls.sql` after all tables. `0010_storage.sql` needs `storage.buckets`. `0011_seed.sql` runnable twice (`ON CONFLICT DO NOTHING`).

## Local run order (Docker present)

1. `npx supabase init` (creates `supabase/config.toml`)
2. Write `migrations/0001-0011` + `seed.sql`
3. `npx supabase start` → note `API URL, anon key, service_role key`
4. `npx supabase db reset` (applies migrations + seed)
5. Copy keys to `.env.local`, `npm run dev`, test `GET /api/projects`
6. Prod later: `supabase link` + `supabase db push` (same files, zero drift)
