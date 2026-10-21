# 04 — Data Model (Supabase Postgres) — Detailed

> Stack: Supabase Postgres + RLS + Storage `avatars`. Dashboard-only admin, no custom UI.
> Convention: `orders` for Explorer sort, `visible` for public show/hide. All reads public, all writes owner-only via dashboard / service-role.

## 0. ER Summary

```
sections 1--* projects (via projects.folder_slug = sections.slug)
profiles 1 row -> rendered as profile.json
experiences / skills / social_links / certificates -> the portfolio pages
site_settings (key/value) -> theme, statusbar, layout, resume url
github_cache (repo_full_name PK) -> GitHub snapshot, 48h TTL
```

Name resolution (Explorer + Tabs):
```
displayName = uiRenames[path] (Zustand + localStorage, session-only, no DB write)
           ?? projects.title_override
           ?? sections.title
           ?? repo_name / slug
```

## 1. Full DDL (paste into Supabase SQL Editor, run once)

```sql
-- extensions
create extension if not exists "pgcrypto";

-- ============ sections (Explorer folders) ============
create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug in ('about','resume','certificates','experience','projects','skills','contact')),
  title text not null,
  icon text not null default 'folder',
  orders int not null default 0,
  visible boolean not null default true,
  type text not null default 'static' check (type in ('static','projects','system')),
  created_at timestamptz not null default now()
);
create index if not exists idx_sections_orders on sections (orders) where visible = true;

-- ============ projects (allowlisted GitHub repos) ============
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  repo_owner text not null,
  repo_name text not null,
  title_override text null,
  description_override text null,
  preview_url text null check (preview_url is null or preview_url ~* '^https://'),
  preview_embeddable boolean not null default true,
  folder_slug text not null default 'projects' references sections(slug) on update cascade,
  orders int not null default 0,
  visible boolean not null default true,
  featured boolean not null default false,
  tags text[] not null default '{}',
  last_synced_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (repo_owner, repo_name)
);
create index if not exists idx_projects_visible_orders on projects (folder_slug, orders) where visible = true;
create index if not exists idx_projects_featured on projects (featured) where visible = true and featured = true;

-- ============ profiles (single row -> profile.json) ============
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_url text null,
  bio text null,
  location text null,
  website text null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============ experiences (-> experience.json) ============
create table if not exists experiences (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role text not null,
  period text not null,
  summary text null,
  orders int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_experiences_orders on experiences (orders) where visible = true;

-- ============ skills (-> skills.json) ============
create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  items text[] not null default '{}',
  orders int not null default 0,
  visible boolean not null default true
);

-- ============ certificates (Certificates + Resume pages) ============
create table if not exists certificates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  issuer text not null,
  issued_at date null,
  credential_id text null,
  url text null check (url is null or url ~* '^https://'),
  summary text null,
  icon text null,
  orders int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_certificates_orders on certificates (orders) where visible = true;

-- ============ social_links ============
create table if not exists social_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null check (url ~* '^https://'),
  icon text not null default 'link',
  orders int not null default 0,
  visible boolean not null default true
);

-- ============ site_settings ============
create table if not exists site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ============ github_cache (persistent fallback, 48h TTL) ============
create table if not exists github_cache (
  repo_full_name text primary key, -- 'owner/name' lowercased
  branch text not null default 'main',
  sha text null, -- commit sha snapshot
  metadata jsonb null, -- stars, forks, language, description, updated_at, languages{}
  tree jsonb null, -- [{path,type,sha,size}] from recursive tree
  etag text null, -- If-None-Match for 304 saving quota
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '48 hours')
);
create index if not exists idx_github_cache_expires on github_cache (expires_at);
```

## 2. RLS (public portfolio, no visitor login)

```sql
alter table sections enable row level security;
alter table projects enable row level security;
alter table profiles enable row level security;
alter table experiences enable row level security;
alter table skills enable row level security;
alter table social_links enable row level security;
alter table site_settings enable row level security;
alter table github_cache enable row level security;

-- public read visible only (sections/projects/experiences/skills/socials)
create policy "public read sections"
on sections for select to anon, authenticated using (visible = true);

create policy "public read projects"
on projects for select to anon, authenticated using (visible = true);

create policy "public read experiences"
on experiences for select to anon, authenticated using (visible = true);

create policy "public read skills"
on skills for select to anon, authenticated using (visible = true);

create policy "public read socials"
on social_links for select to anon, authenticated using (visible = true);

-- fully public (single-row config + cache fallback)
create policy "public read profiles"
on profiles for select to anon, authenticated using (true);

create policy "public read settings"
on site_settings for select to anon, authenticated using (true);

create policy "public read cache"
on github_cache for select to anon, authenticated using (true);

-- certificates: public read (migration 0011)
alter table certificates enable row level security;
create policy "public read certificates"
  on certificates for select to anon, authenticated using (visible = true);

-- no public writes: only service_role / dashboard (authenticated owner) can write.
-- Do NOT create insert/update/delete policies for anon. Manage writes in dashboard as postgres owner.
-- Cron / Route Handlers use SUPABASE_SERVICE_ROLE_KEY server-side to upsert github_cache + last_synced_at.
```

## 3. Storage — avatars (your logo bottom-left)

```sql
-- Run in SQL editor (or Dashboard > Storage > New bucket 'avatars', public ON):
insert into storage.buckets (id, name, public)
values ('avatars','avatars', true)
on conflict (id) do update set public = true;

-- Public read, owner-only write:
create policy "avatars public read"
on storage.objects for select to anon, authenticated using (bucket_id = 'avatars');

create policy "owner write avatars"
on storage.objects for insert to authenticated with check (bucket_id = 'avatars');

create policy "owner update avatars"
on storage.objects for update to authenticated using (bucket_id = 'avatars');
```

Upload `logo.png` -> copy public URL -> paste into `profiles.avatar_url`.

The resume PDF lives in its own public bucket (`resumes`, migration 0011):

```sql
insert into storage.buckets (id, name, public)
values ('resumes','resumes', true)
on conflict (id) do update set public = true;

create policy "resumes public read"
  on storage.objects for select to anon, authenticated using (bucket_id = 'resumes');
```

Upload the PDF -> point `site_settings` key `resume` at it
(`{"url": "https://…/resumes/your-file.pdf", "label": "Resume (PDF)"}`) -> the
Resume page embeds it and offers the download.

## 4. Seed (dashboard > SQL, run once)

```sql
-- sections (About first, then the rest)
insert into sections (slug, title, icon, orders, visible, type) values
('about','About','person',10,true,'static'),
('resume','Resume','file-pdf',20,true,'static'),
('certificates','Certificates','verified',30,true,'static'),
('experience','Experience','briefcase',40,true,'static'),
('projects','Projects','repo',50,true,'projects'),
('skills','Skills','code',60,true,'static'),
('contact','Contact','mail',70,true,'static')
on conflict (slug) do nothing;

-- profile (replace avatar_url after upload)
insert into profiles (name, avatar_url, bio, location, website, data) values
('Ronny', null, 'Full-stack dev. VS Code portfolio.', 'India', 'https://example.vercel.app',
 '{"role":"Full-stack Developer","stack":["Next.js 16","Tailwind 4","Supabase"],"hireable":true}'::jsonb);

-- skills / experience / socials demo
insert into skills (category, items, orders, visible) values
('Frontend','{Next.js,React,Tailwind}',10,true),
('Backend','{Postgres,Supabase,Redis}',20,true);

insert into experiences (company, role, period, summary, orders, visible) values
('Freelance','Full-stack Developer','2024 — Now','Built Vercel + Supabase apps.',10,true);

insert into social_links (label, url, icon, orders, visible) values
('GitHub','https://github.com/YOU','github',10,true),
('LinkedIn','https://linkedin.com/in/YOU','linkedin',20,true);

-- certificates (your own rows)
insert into certificates (title, issuer, issued_at, credential_id, url, summary, orders, visible) values
('Example certificate','Example issuer','2025-01-01','ABC-123','https://example.com/cert','What it proves.',10,true);

-- site settings
insert into site_settings (key, value) values
('theme','{"mode":"dark","accent":"#007acc"}'),
('statusbar_branch','{"branch":"main"}'),
('resume','{"url":null,"label":"Resume (PDF)","updated_at":null}'),
('default_preview_layout','{"split":"right"}')
on conflict (key) do nothing;

-- demo projects (hidden until you add real repos)
insert into projects (repo_owner, repo_name, title_override, visible, featured, orders, tags) values
('vercel','next.js','Next Demo',false,false,999,'{demo}'),
('supabase','supabase','Supabase Demo',false,false,999,'{demo}')
on conflict (repo_owner, repo_name) do nothing;
```

Add real repo: `insert into projects (repo_owner, repo_name, visible, orders, preview_url) values ('YOU','my-app',true,10,'https://my-app.vercel.app');`

## 5. Access patterns (how code uses tables)

- Explorer: `select * from sections where visible order by orders` + `select * from projects where visible and folder_slug='projects' order by orders`.
- Portfolio pages: `GET /api/profile` reads `profiles` (1 row), `experiences`, `skills`, `social_links`, `certificates` and `site_settings` in one public request; the store keeps it for the session.
- `settings.json` tab: `select * from site_settings`.
- Browser preview tab: shows iff `projects.preview_url is not null`. If `preview_embeddable=false`, show `Open in new tab` only.
- Terminal `ls/open`: same queries, client-cached in Zustand 60s.
- Cron `/api/cron/sync`: service-role `select repo_owner, repo_name from projects where visible` -> GitHub -> `upsert github_cache + update projects.last_synced_at`.
- Allowlist: every `/api/repo/*` must first `select 1 from projects where repo_owner=? and repo_name=? and visible` else 404. Never call GitHub without this.

## 6. Cache fields explained

- `github_cache.metadata`: `{stars, forks, open_issues, language, description, default_branch, updated_at, languages:{TS:1234}}`.
- `github_cache.tree`: full recursive tree `[{path,type:blob|tree,sha,size}]`, capped 5000 entries, filtered (`node_modules,dist,.git` excluded at sync time).
- `etag/sha`: send `If-None-Match: etag` -> on `304` just bump `expires_at`, zero quota cost.
- `expires_at`: `fetched_at + 48h`. API order: Redis HIT -> `github_cache` fresh -> GitHub -> stale fallback.
- Commits NOT in table: real history lives in Redis `commits:o/r:branch:page:per_page` EX 24h only. `github_cache.sha` (HEAD) invalidates those keys on change. Keeps table lean.

## 7. What NOT to store

- No visitor data, no renames (`uiRenames` stays in localStorage), no terminal `tmp/` files (Zustand memory only), no PAT (Vercel env only).

## 8. Local-only (no migration) — edits + fake git

> Editable files + pseudo-commits are 100% client state. No new tables, no RLS change, no service-role write.

- `localEdits: Record<path, content>` (Zustand + localStorage `vscode-edits-v1`). `Ctrl+S` writes here only.
- `localCommits: [{id:`local-${ts}`, msg, files[], time}]` (localStorage `vscode-commits-v1`). Commit button pushes here only.
- `uiRenames: Record<path, customName>` + terminal `tmpFs` same mechanism.
- `github_cache` stays pristine server snapshot. Display rule everywhere: `view = localEdits[path] ?? cached blob`. Dirty = `localEdits[path] != cached`.
- Optional `site_settings.default_branch` string only for lane label (`main`). No per-user branches in DB.
