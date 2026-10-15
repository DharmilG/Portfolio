-- 0007_site_settings: key/value config (theme, statusbar branch, preview layout)
-- Source: DOC/04-data-model.md §1

create table if not exists site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
