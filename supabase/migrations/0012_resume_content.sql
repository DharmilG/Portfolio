-- 0012_resume_content: the resume becomes the content source for the pages.
-- Adds the education + hackathons sections, the e-commerce project group,
-- resume bullets on experiences/projects, and hides Certificates until a row
-- exists. Source: DOC/04-data-model.md §1.

-- ============ sections: education + hackathons ============
alter table sections drop constraint if exists sections_slug_check;
alter table sections add constraint sections_slug_check
  check (slug in ('about','resume','certificates','education','experience','projects','skills','hackathons','contact'));

-- No certificates on the resume yet: keep the folder hidden until a row exists.
update sections set visible = false where slug = 'certificates';

-- ============ project_groups (Projects > group > repos) ============
create table if not exists project_groups (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text null,
  highlights text[] not null default '{}',
  icon text not null default 'package',
  orders int not null default 0,
  visible boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

alter table project_groups enable row level security;

create policy "public read project groups"
  on project_groups for select to anon, authenticated using (visible = true);

alter table projects add column if not exists group_slug text null
  references project_groups(slug) on update cascade on delete set null;
alter table projects add column if not exists highlights text[] not null default '{}';

create index if not exists idx_projects_group on projects (group_slug, orders) where visible = true;

-- ============ education ============
create table if not exists education (
  id uuid primary key default gen_random_uuid(),
  institution text not null,
  degree text not null,
  field text null,
  location text null,
  period text not null,
  score text null,
  summary text null,
  url text null check (url is null or url ~* '^https://'),
  orders int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_education_orders on education (orders) where visible = true;

alter table education enable row level security;

create policy "public read education"
  on education for select to anon, authenticated using (visible = true);

-- ============ experiences: kind + bullets + stack ============
alter table experiences add column if not exists kind text not null default 'work'
  check (kind in ('work','hackathon'));
alter table experiences add column if not exists highlights text[] not null default '{}';
alter table experiences add column if not exists tags text[] not null default '{}';
alter table experiences add column if not exists url text null
  check (url is null or url ~* '^https://');
alter table experiences add column if not exists location text null;
