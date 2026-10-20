# 11 — Deployment + Roadmap (Vercel, detailed)

> **DEPLOY GATE — DO NOT DEPLOY YET.** Remove this block only when the human starts the deployment stage.
> A Vercel deploy stays blocked until all of these are true:
> 1. `pnpm build` passes locally; the five remaining 0-byte API route stubs are implemented.
> 2. Cloud Supabase is linked, migrations are applied, and real `sections` / `projects` rows exist.
> 3. Vercel env is set; production never reads `.env.local` or `127.0.0.1`.
> 4. GitHub reads are verified against `DharmilG/Portfolio`: branches, branch-aware tree/blob, and 16 commits/page in Source Control.
> 5. Status-bar project/branch pickers and Source-Control-only commit history pass a smoke test.
>
> **Current scope (2026-10-20):** project picker + branch picker in the status bar; 16 real commits per page,
> branch-aware, shown only in Source Control; repo owner stays backend-only; title/description/tags come from
> DB overrides or GitHub metadata. The iframe/preview-URL work is deferred until the projects have public URLs.

## Env (Vercel Project > Settings > Env)
```
NEXT_PUBLIC_SUPABASE_URL=... (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY=... (public)
SUPABASE_SERVICE_ROLE_KEY=... (server only, sync/revalidate)
GITHUB_PAT=ghp_... (server only, fine-grained Contents+Metadata read, selected repos)
UPSTASH_REDIS_REST_URL=... / UPSTASH_REDIS_REST_TOKEN=... (hot cache)
REVALIDATE_SECRET=... (POST /api/revalidate x-secret)
CRON_SECRET=... (GET /api/cron/sync Bearer)
```
Never prefix secrets with `NEXT_PUBLIC_`. Rotate PAT yearly.

## vercel.json
```json
{ "crons": [{ "path": "/api/cron/sync", "schedule": "0 2 * * *" }],
  "regions": ["bom1"] }
```
Pick region near Supabase (e.g. `bom1` for India/SG DB). Nodejs runtime for all `/api/*`.

## Steps (first deploy)
1. `npx create-next-app@latest portfolio --ts --tailwind --app --no-src` (Next 16, React 19, Tailwind 4).
2. `pnpm add @supabase/supabase-js zustand shiki @xterm/xterm @octokit/rest @upstash/redis zod react-markdown remark-gfm rehype-highlight` (pnpm strictly).
3. Supabase: run `04 §1 DDL` + `§2 RLS` + `§3 Storage` + `§4 Seed`. Verify `select * from sections;`.
4. `vercel env add` all above, `vercel --prod`. Test `GET /api/projects` -> `{projects:[]}` then insert demo repo.
5. Dashboard: upload `logo.png` to `avatars`, update `profiles.avatar_url`, insert real `projects` rows. Cron warms overnight; hit `/api/cron/sync` manually once with Bearer to warm now.
6. Custom domain + `frame-ancestors` on your preview apps to allow iframe embed.

## Roadmap (updated: history + fake-git are MVP, not V2)
- **MVP (now):** flush shell + `profile.json` + Explorer + Shiki + local edit + fake commits + real branch-aware commits (16/page) + terminal + markdown split + palette + cache + cron. The iframe preview waits for public project URLs.
- **V1:** search across repos, `log --graph` full SVG, light theme, `View more` infinite, OG images, web-vitals 90+.
- **V2:** shareable deep-links `/Projects/repo/path?line=12`, i18n, guestbook via Supabase inserts (authed only). The multi-branch switcher moved into the current scope.
