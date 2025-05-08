-- 0002_projects: allowlisted GitHub repos (1 row = 1 project, no redeploy)
-- Source: DOC/04-data-model.md §1

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
