-- 0003_profiles: single row rendered as profile.json (avatar = bottom-left logo)
-- Source: DOC/04-data-model.md §1

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
