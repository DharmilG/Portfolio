-- 0008_github_cache: persistent GitHub snapshot fallback (48h TTL, commits live in Redis only)
-- Source: DOC/04-data-model.md §1 + §6

create table if not exists github_cache (
  repo_full_name text primary key,
  branch text not null default 'main',
  sha text null,
  metadata jsonb null,
  tree jsonb null,
  etag text null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '48 hours')
);

create index if not exists idx_github_cache_expires on github_cache (expires_at);
