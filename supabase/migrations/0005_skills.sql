-- 0005_skills: rendered as skills.json
-- Source: DOC/04-data-model.md §1

create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  items text[] not null default '{}',
  orders int not null default 0,
  visible boolean not null default true
);
