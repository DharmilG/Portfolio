-- Local starter data: the real DharmilG portfolio projects.
-- Loaded by `supabase db reset` via config.toml [db.seed] sql_paths.
-- Repo owner/repo name stay backend-only; the Explorer uses title_override.

begin;

insert into sections (slug, title, icon, orders, visible, type)
values ('projects', 'Projects', 'folder', 0, true, 'projects')
on conflict (slug) do update set
  title = excluded.title,
  icon = excluded.icon,
  orders = excluded.orders,
  visible = excluded.visible,
  type = excluded.type;

insert into projects (
  repo_owner,
  repo_name,
  title_override,
  description_override,
  preview_url,
  preview_embeddable,
  folder_slug,
  orders,
  visible,
  featured,
  tags
)
values
  (
    'DharmilG',
    'Portfolio',
    'Portfolio',
    null,
    null,
    true,
    'projects',
    0,
    true,
    false,
    array['TypeScript', 'CSS', 'JavaScript']::text[]
  ),
  (
    'E-Commerce-BDA',
    'storefront-frontend',
    'Storefront Frontend',
    null,
    null,
    true,
    'projects',
    1,
    true,
    false,
    array['TypeScript', 'CSS', 'JavaScript']::text[]
  ),
  (
    'DharmilG',
    'Stock-Direction-Predictor',
    'Stock Direction Predictor',
    null,
    null,
    true,
    'projects',
    2,
    true,
    false,
    array['Python', 'Dockerfile', 'Batchfile', 'Shell']::text[]
  ),
  (
    'DharmilG',
    'hostsel-management-sys',
    'Hostel Management System',
    null,
    null,
    true,
    'projects',
    3,
    true,
    false,
    array['JavaScript', 'PLpgSQL', 'CSS', 'HTML']::text[]
  ),
  (
    'DharmilG',
    'harmoniq-music',
    'Harmoniq Music',
    null,
    null,
    true,
    'projects',
    4,
    true,
    false,
    array['JavaScript', 'CSS', 'PLpgSQL', 'HTML']::text[]
  ),
  (
    'DharmilG',
    'Books',
    'Books',
    'My bank of books :)',
    null,
    true,
    'projects',
    5,
    true,
    false,
    array[]::text[]
  ),
  (
    'DharmilG',
    'Chat-app',
    'Chat App',
    null,
    null,
    true,
    'projects',
    6,
    true,
    false,
    array[]::text[]
  ),
  (
    'DharmilG',
    'url_short',
    'URL Shortener',
    null,
    null,
    true,
    'projects',
    7,
    true,
    false,
    array[]::text[]
  ),
  (
    'DharmilG',
    'querytohtml',
    'Query to HTML',
    null,
    null,
    true,
    'projects',
    8,
    true,
    false,
    array[]::text[]
  )
on conflict (repo_owner, repo_name) do update set
  title_override = excluded.title_override,
  description_override = excluded.description_override,
  preview_url = excluded.preview_url,
  preview_embeddable = excluded.preview_embeddable,
  folder_slug = excluded.folder_slug,
  orders = excluded.orders,
  visible = excluded.visible,
  featured = excluded.featured,
  tags = excluded.tags;

commit;
