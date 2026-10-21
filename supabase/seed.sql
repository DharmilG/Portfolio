-- Local starter data: the real DharmilG portfolio projects.
-- Loaded by `supabase db reset` via config.toml [db.seed] sql_paths.
-- Repo owner/repo name stay backend-only; the Explorer uses title_override.
--
-- The workspace sections (About, Resume, Certificates, Experience, Projects,
-- Skills, Contact) drive the Explorer; every content row below is yours to
-- edit in Supabase Studio.

begin;

-- === sections (Explorer folders) ===
insert into sections (slug, title, icon, orders, visible, type)
values
  ('about', 'About', 'person', 10, true, 'static'),
  ('resume', 'Resume', 'file-pdf', 20, true, 'static'),
  ('certificates', 'Certificates', 'verified', 30, true, 'static'),
  ('experience', 'Experience', 'briefcase', 40, true, 'static'),
  ('projects', 'Projects', 'repo', 50, true, 'projects'),
  ('skills', 'Skills', 'code', 60, true, 'static'),
  ('contact', 'Contact', 'mail', 70, true, 'static')
on conflict (slug) do update set
  title = excluded.title,
  icon = excluded.icon,
  orders = excluded.orders,
  visible = excluded.visible,
  type = excluded.type;

-- === profile (the About hero) ===
insert into profiles (name, avatar_url, bio, location, website, data)
values (
  'Dharmil Gajjar',
  null,
  'Full-stack developer building web products end to end — typed, tested, deployed. This portfolio is a VS Code clone: every project, commit and file you see is real.',
  'India',
  'https://github.com/DharmilG',
  '{"role":"Full-stack Developer","hireable":true,"years":3,"focus":"React + TypeScript + Supabase","availability":"Open to opportunities","email":"","summary":"I design and ship web applications — from the data model to the last pixel."}'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  avatar_url = excluded.avatar_url,
  bio = excluded.bio,
  location = excluded.location,
  website = excluded.website,
  data = excluded.data;

-- === skills (grouped chips) ===
insert into skills (category, items, orders, visible)
values
  ('Frontend', array['React','Next.js','TypeScript','Tailwind CSS','Shiki']::text[], 10, true),
  ('Backend', array['Node.js','PostgreSQL','Supabase','Redis','REST APIs']::text[], 20, true),
  ('Data & Infra', array['Python','Docker','GitHub Actions','Vercel']::text[], 30, true),
  ('Practices', array['Testing','Accessibility','Performance','Design systems']::text[], 40, true)
on conflict (id) do update set
  category = excluded.category,
  items = excluded.items,
  orders = excluded.orders,
  visible = excluded.visible;

-- === experience (timeline) ===
insert into experiences (company, role, period, summary, orders, visible)
values
  ('Freelance', 'Full-stack Developer', '2024 — Now', 'Design and ship web products for clients — schema, API, UI and the deploy pipeline.', 10, true),
  ('Open Source', 'Maintainer', '2023 — Now', 'Maintain public repositories and build the tooling I want to exist.', 20, true)
on conflict (id) do update set
  company = excluded.company,
  role = excluded.role,
  period = excluded.period,
  summary = excluded.summary,
  orders = excluded.orders,
  visible = excluded.visible;

-- === social links (Contact + About hero) ===
insert into social_links (label, url, icon, orders, visible)
values
  ('GitHub', 'https://github.com/DharmilG', 'github', 10, true),
  ('LinkedIn', 'https://www.linkedin.com/in/your-handle', 'linkedin', 20, true)
on conflict (id) do update set
  label = excluded.label,
  url = excluded.url,
  icon = excluded.icon,
  orders = excluded.orders,
  visible = excluded.visible;

-- === certificates ===
-- Add your own rows here or in Studio (title, issuer, issued_at, credential_id,
-- url, summary). The page renders an empty state until then.

-- === site settings ===
insert into site_settings (key, value)
values
  ('resume', '{"url":null,"label":"Resume (PDF)","updated_at":null}'::jsonb),
  ('theme', '{"mode":"dark","accent":"#0078d4"}'::jsonb)
on conflict (key) do update set value = excluded.value;

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
