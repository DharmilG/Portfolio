-- 0001_sections: Explorer folders (About, Experience, Projects, Skills, Contact, tmp)
-- Source: DOC/04-data-model.md §1

create extension if not exists "pgcrypto";

create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug in ('about','experience','projects','skills','contact','tmp')),
  title text not null,
  icon text not null default 'folder',
  orders int not null default 0,
  visible boolean not null default true,
  type text not null default 'static' check (type in ('static','projects','system')),
  created_at timestamptz not null default now()
);

create index if not exists idx_sections_orders on sections (orders) where visible = true;
