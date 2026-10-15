-- 0006_social_links: sidebar / contact links
-- Source: DOC/04-data-model.md §1

create table if not exists social_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null check (url ~* '^https://'),
  icon text not null default 'link',
  orders int not null default 0,
  visible boolean not null default true
);
