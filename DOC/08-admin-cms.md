# 08 — Admin via Supabase Dashboard (no custom UI) — Detailed

> Owner-only writes in dashboard (postgres role). Visitors anon read-only. No code deploy for content.

## 1-row project flow (the design)
```sql
-- show new repo instantly (cron/first-visit warms tree+meta+README+commits p1)
insert into projects (repo_owner, repo_name, title_override, visible, orders, featured, preview_url, preview_embeddable, tags)
values ('YOU','new-app','My App',true,15,false,'https://new-app.vercel.app',true,'{nextjs,supabase}')
on conflict (repo_owner, repo_name) do update set visible=true, orders=15;
-- hide: update projects set visible=false where repo_owner='YOU' and repo_name='old';
-- reorder: update sections set orders=... / update projects set orders=...;
-- feature: update projects set featured=true where id='...';
```
Check: `select repo_owner, repo_name, visible, last_synced_at from projects order by orders;` then open `/Projects/My App/` — tree + history appear. If not, hit `POST /api/revalidate?repo=YOU/new-app`.

## What maps where
- `sections.{slug,title,orders,visible}` -> Explorer folders. `type='projects'` renders repos underneath.
- `projects.{title_override->folder name, description_override, preview_url+preview_embeddable->BrowserPreview tab, tags, featured}`.
- `profiles` (1 row: `name, avatar_url, bio, data jsonb`) -> `profile.json` + avatar logo. Upload logo to Storage `avatars` (public), paste URL.
- `experiences/skills/social_links` -> `*.json` tabs. `site_settings(theme, statusbar_branch, default_preview_layout)` -> shell defaults.

## RLS recap
Anon + authenticated `SELECT` on visible rows + all `profiles/settings/cache` (see `04 §2`). Zero anon write policies. Dashboard writes as owner bypass RLS. Routes use `SUPABASE_SERVICE_ROLE_KEY` only in `sync/revalidate`.

## Safety
- `repo_owner/repo_name` regex `^[A-Za-z0-9_.-]+$`, `preview_url` must be `https://`, no secrets in any table (PAT only in Vercel env).
- `github_cache` + `last_synced_at` managed by cron, never hand-edit except `expires_at` bump to force refresh.
