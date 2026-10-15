-- 0004_experiences: rendered as experience.json
-- Source: DOC/04-data-model.md §1

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
