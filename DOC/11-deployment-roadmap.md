# 11 — Deployment + Roadmap (Vercel, detailed)

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
- **MVP (now):** flush shell + `profile.json` + Explorer + Shiki + local edit + fake commits + real paginated commits + terminal + markdown split + iframe preview + palette + cache + cron.
- **V1:** search across repos, `log --graph` full SVG, light theme, `View more` infinite, OG images, web-vitals 90+.
- **V2:** multi-branch switcher (data from `github_cache.branch` list), shareable deep-links `/Projects/repo/path?line=12`, i18n, guestbook via Supabase inserts (authed only).
