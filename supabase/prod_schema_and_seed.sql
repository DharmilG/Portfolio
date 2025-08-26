-- Production Schema & Seed for Supabase Cloud (Single Run)
-- Generated for Dharmil Gajjar's Portfolio
-- Includes: Complete DDL, RLS Policies, Storage Buckets, and Custom Production Seed

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- Sections (Explorer navigation folders)
create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug in ('about','resume','certificates','education','experience','projects','skills','hackathons','contact')),
  title text not null,
  icon text not null default 'folder',
  orders int not null default 0,
  visible boolean not null default true,
  type text not null default 'static' check (type in ('static','projects','system')),
  created_at timestamptz not null default now()
);
create index if not exists idx_sections_orders on sections (orders) where visible = true;

-- Project Groups
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

-- Projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  repo_owner text not null,
  repo_name text not null,
  title_override text null,
  description_override text null,
  group_slug text null references project_groups(slug) on update cascade on delete set null,
  highlights text[] not null default '{}',
  preview_url text null check (preview_url is null or preview_url ~* '^https://'),
  preview_embeddable boolean not null default true,
  folder_slug text not null default 'projects' references sections(slug) on update cascade,
  orders int not null default 0,
  visible boolean not null default true,
  featured boolean not null default false,
  tags text[] not null default '{}',
  last_synced_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (repo_owner, repo_name)
);
create index if not exists idx_projects_visible_orders on projects (folder_slug, orders) where visible = true;
create index if not exists idx_projects_featured on projects (featured) where visible = true and featured = true;
create index if not exists idx_projects_group on projects (group_slug, orders) where visible = true;

-- Profiles
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_url text null,
  bio text null,
  location text null,
  website text null,
  data jsonb not null default '{}'::jsonb,
  about jsonb not null default '{}'::jsonb check (jsonb_typeof(about) = 'object'),
  updated_at timestamptz not null default now()
);

-- Experiences
create table if not exists experiences (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role text not null,
  period text not null,
  summary text null,
  highlights text[] not null default '{}',
  tags text[] not null default '{}',
  kind text not null default 'work' check (kind in ('work','hackathon')),
  url text null check (url is null or url ~* '^https://'),
  location text null,
  phases jsonb not null default '[]'::jsonb check (jsonb_typeof(phases) = 'array'),
  orders int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_experiences_orders on experiences (orders) where visible = true;

-- Education
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

-- Certificates
create table if not exists certificates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  issuer text not null,
  issued_at date null,
  credential_id text null,
  url text null check (url is null or url ~* '^https://'),
  summary text null,
  icon text null,
  orders int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_certificates_orders on certificates (orders) where visible = true;

-- Skills
create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  items text[] not null default '{}',
  orders int not null default 0,
  visible boolean not null default true
);

-- Social Links
create table if not exists social_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null check (url ~* '^https://'),
  icon text not null default 'link',
  orders int not null default 0,
  visible boolean not null default true
);

-- Site Settings
create table if not exists site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- GitHub Cache
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

-- ============================================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

alter table sections enable row level security;
alter table project_groups enable row level security;
alter table projects enable row level security;
alter table profiles enable row level security;
alter table experiences enable row level security;
alter table education enable row level security;
alter table certificates enable row level security;
alter table skills enable row level security;
alter table social_links enable row level security;
alter table site_settings enable row level security;
alter table github_cache enable row level security;

-- Drop existing policies if re-running
drop policy if exists "public read sections" on sections;
drop policy if exists "public read project groups" on project_groups;
drop policy if exists "public read projects" on projects;
drop policy if exists "public read profiles" on profiles;
drop policy if exists "public read experiences" on experiences;
drop policy if exists "public read education" on education;
drop policy if exists "public read certificates" on certificates;
drop policy if exists "public read skills" on skills;
drop policy if exists "public read socials" on social_links;
drop policy if exists "public read settings" on site_settings;
drop policy if exists "public read cache" on github_cache;

create policy "public read sections" on sections for select to anon, authenticated using (visible = true);
create policy "public read project groups" on project_groups for select to anon, authenticated using (visible = true);
create policy "public read projects" on projects for select to anon, authenticated using (visible = true);
create policy "public read profiles" on profiles for select to anon, authenticated using (true);
create policy "public read experiences" on experiences for select to anon, authenticated using (visible = true);
create policy "public read education" on education for select to anon, authenticated using (visible = true);
create policy "public read certificates" on certificates for select to anon, authenticated using (visible = true);
create policy "public read skills" on skills for select to anon, authenticated using (visible = true);
create policy "public read socials" on social_links for select to anon, authenticated using (visible = true);
create policy "public read settings" on site_settings for select to anon, authenticated using (true);
create policy "public read cache" on github_cache for select to anon, authenticated using (true);

-- ============================================================================
-- 3. STORAGE BUCKETS & POLICIES
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', true)
on conflict (id) do update set public = true;

drop policy if exists "avatars public read" on storage.objects;
drop policy if exists "owner write avatars" on storage.objects;
drop policy if exists "owner update avatars" on storage.objects;
drop policy if exists "resumes public read" on storage.objects;
drop policy if exists "owner write resumes" on storage.objects;
drop policy if exists "owner update resumes" on storage.objects;

create policy "avatars public read" on storage.objects for select to anon, authenticated using (bucket_id = 'avatars');
create policy "owner write avatars" on storage.objects for insert to authenticated with check (bucket_id = 'avatars');
create policy "owner update avatars" on storage.objects for update to authenticated using (bucket_id = 'avatars');

create policy "resumes public read" on storage.objects for select to anon, authenticated using (bucket_id = 'resumes');
create policy "owner write resumes" on storage.objects for insert to authenticated with check (bucket_id = 'resumes');
create policy "owner update resumes" on storage.objects for update to authenticated using (bucket_id = 'resumes');

-- ============================================================================
-- 4. CUSTOM PRODUCTION SEED DATA
-- ============================================================================

begin;

-- Sections
insert into sections (slug, title, icon, orders, visible, type)
values
  ('about', 'About', 'person', 10, true, 'static'),
  ('resume', 'Resume', 'file-pdf', 20, true, 'static'),
  ('certificates', 'Certificates', 'verified', 30, false, 'static'),
  ('experience', 'Experience', 'briefcase', 40, true, 'static'),
  ('education', 'Education', 'mortar-board', 50, true, 'static'),
  ('projects', 'Projects', 'repo', 60, true, 'projects'),
  ('skills', 'Skills', 'code', 70, true, 'static'),
  ('hackathons', 'Hackathons', 'flame', 80, true, 'static'),
  ('contact', 'Contact', 'mail', 90, true, 'static')
on conflict (slug) do update set
  title = excluded.title,
  icon = excluded.icon,
  orders = excluded.orders,
  visible = excluded.visible,
  type = excluded.type;

-- Profile (About Hero + Contact)
delete from profiles;
insert into profiles (name, avatar_url, bio, location, website, data, about)
values (
  'Dharmil Gajjar',
  null,
  'Final-year B.Tech ICT student at Adani University (2027) with internship experience in backend development, e-commerce, and QA testing. I build with Go, TypeScript, JavaScript, Python, Next.js, PostgreSQL and AWS — and I test what I ship.',
  'Ahmedabad, Gujarat, India',
  'https://github.com/DharmilG',
  '{"role":"Full-stack & Backend Engineer","hireable":true,"availability":"Open to full-stack / backend roles","class_of":"2027","focus":"Building high-performance backend systems & e-commerce microservices — Go, PostgreSQL, Next.js, and AWS","email":"dharmilgajjar0@gmail.com","phone":"+91 83206 33350","summary":"Final-year B.Tech ICT student at Adani University (2027) — full-stack and backend engineering.","stack":["Go","TypeScript","Next.js","PostgreSQL","AWS"]}'::jsonb,
  $about${
    "headline": "Full-stack & Backend engineer. Final-year ICT student. I test what I ship.",
    "story": [
      "I'm Dharmil — a full-stack engineer who likes the part where the database, the API, the interface and the device all have to agree.",
      "I'm in my final year of B.Tech ICT at Adani University. At Northstar Innovations I built a custom Odoo 19 storefront for a perfume brand — the theme, the reusable editor components, and the admin controls that let the team change layouts without touching code. I also did QA on a React Native IoT app, tracing BLE and Wi-Fi signals across the app, the device and the backend.",
      "That mix shaped how I work: model the data, build the API, make the interface feel obvious, then test the edges before someone else finds them. Right now I'm building high-performance backend services and e-commerce platforms with Go, Next.js, and PostgreSQL — looking for a full-stack or backend team where I can own meaningful slices end to end."
    ],
    "quote": "I test what I ship — not because it's the last step, but because it's how I know it works.",
    "principles": [
      {
        "title": "Own the path",
        "body": "I'm most useful where frontend, backend and data meet. I'd rather trace a bug through the whole stack than hand it off at a boundary.",
        "icon": "git-merge",
        "note": "Go microservices · Odoo storefront · React Native QA"
      },
      {
        "title": "Test what I ship",
        "body": "QA taught me to verify the happy path, the retry, the edge case and the thing that only breaks on a real device.",
        "icon": "beaker",
        "note": "BLE/Wi-Fi · functional · integration"
      },
      {
        "title": "Make it usable",
        "body": "The best code removes the next support ticket. At Northstar, admins could change padding, spacing and imagery without waiting on a deploy.",
        "icon": "layout",
        "note": "Website editor controls · no-code layout"
      }
    ],
    "now": [
      {
        "label": "Building",
        "value": "Go Commerce Platform",
        "detail": "High-performance e-commerce backend built with Go, PostgreSQL, and clean microservices architecture."
      },
      {
        "label": "Studying",
        "value": "Final-year B.Tech ICT",
        "detail": "Adani University · graduating 2027"
      },
      {
        "label": "Looking for",
        "value": "Full-stack / backend roles",
        "detail": "A team where I can own a slice end to end and test what ships."
      }
    ],
    "beyond": [
      {
        "title": "High-performance systems",
        "body": "Concurrency, clean architecture and predictable latency. Go Commerce is where I explore it deeply.",
        "icon": "symbol-event"
      },
      {
        "title": "Devices at the edge",
        "body": "BLE and Wi-Fi testing taught me that the real world — a dropped signal, a slow device — is the hardest environment.",
        "icon": "radio-tower"
      },
      {
        "title": "Applied ML",
        "body": "Classification, SHAP and the moment a model's output becomes a decision. I built a NIFTY 50 direction predictor to learn it honestly.",
        "icon": "graph"
      }
    ]
  }$about$::jsonb
);

-- Skills
delete from skills;
insert into skills (category, items, orders, visible)
values
  ('Languages', array['Go','TypeScript','JavaScript','Python','SQL']::text[], 10, true),
  ('Frontend', array['HTML','CSS','React','Next.js','Tailwind CSS']::text[], 20, true),
  ('Backend', array['Go (Golang)','Node.js','Express.js','NestJS','FastAPI','REST APIs','Microservices','Event-Driven Architecture']::text[], 30, true),
  ('Databases', array['PostgreSQL','MongoDB','Redis']::text[], 40, true),
  ('Cloud & DevOps', array['AWS (S3, RDS, SQS)','Docker','Nginx','Git','GitHub','GitHub Actions']::text[], 50, true),
  ('Platforms', array['Odoo 19','Theme development','Website editor components','Backend views']::text[], 60, true),
  ('Testing & QA', array['Functional testing','Integration testing','Manual testing','Bug reproduction and retesting','BLE/Wi-Fi device testing','React Native app testing']::text[], 70, true),
  ('Data & ML', array['Machine Learning','LightGBM','Classification','Pandas','Optuna','SHAP','Data processing']::text[], 80, true);

-- Experiences
delete from experiences;
insert into experiences (company, role, period, summary, highlights, tags, kind, url, location, orders, visible)
values
  (
    'Northstar Innovations',
    'Software Engineer Intern',
    'Jan 2026 — Jul 2026',
    'Custom Odoo 19 e-commerce theming and QA on a React Native IoT app.',
    array[
      'Built a custom Odoo 19 e-commerce theme for a perfume brand — the homepage and reusable components admins customize in the website editor.',
      'Added admin controls for element padding, section spacing and image styling, so layout changes need no code.',
      'Built a custom backend view to manage product categories, with the option to choose which categories appear in the navbar.',
      'Built a My Account area: order-wise chat with admin, recently viewed products, orders, returns, wishlist and account settings.',
      'QA on a React Native IoT app — verified that every feature sent and received the correct connection signals over BLE and Wi-Fi.',
      'Tested scheduling workflows and control features across the app, device and backend, using functional and integration testing.',
      'Reproduced and reported defects, fixed some in the application, and retested each fix to confirm expected behavior.'
    ]::text[],
    array['Odoo 19','Python','JavaScript','QA','React Native']::text[],
    'work',
    null,
    'Ahmedabad, India',
    10,
    true
  ),
  (
    'Odoo Hackathon, Adani University',
    'Cafe POS',
    'Jan 2026',
    'Full-stack restaurant POS built with a team in a two-day hackathon.',
    array[
      'QR-code table ordering for customers, a real-time Kitchen Display System, a cashier terminal and an admin dashboard.',
      'Role-based access and live order updates across the terminals (React, Node.js, Express.js, MongoDB, Socket.IO).'
    ]::text[],
    array['React','Node.js','Express.js','MongoDB','Socket.IO']::text[],
    'hackathon',
    null,
    'Ahmedabad, India',
    20,
    true
  ),
  (
    'Hackout, DA-IICT Gandhinagar',
    'Community Mangrove Watch',
    'Aug 2025',
    'Mobile-first app for reporting coastal and mangrove incidents.',
    array[
      'Photo upload, GPS location tagging and an incident map for coastal reports.',
      'Gemini through Google Genkit verifies and scores submitted reports, with an admin dashboard for reviewing them.'
    ]::text[],
    array['Next.js','Tailwind CSS','Google Genkit','Firebase']::text[],
    'hackathon',
    null,
    'Gandhinagar, India',
    30,
    true
  );

update experiences
set phases = $json$[
  {
    "label": "Part 01",
    "title": "Product & storefront",
    "summary": "Odoo 19 theming, admin tooling and the account experience.",
    "tags": ["Odoo 19", "Python", "JavaScript"],
    "achievements": [
      {
        "lead": "A custom Odoo 19 storefront",
        "body": "Built the homepage and reusable components for a perfume brand, editable through Odoo's website editor.",
        "tags": ["Odoo 19", "JavaScript"]
      },
      {
        "lead": "No-code layout controls",
        "body": "Added admin controls for element padding, section spacing and image styling, so layout changes need no code.",
        "tags": ["Odoo 19", "Python"]
      },
      {
        "lead": "Category management",
        "body": "Built a custom backend view to manage product categories, including which categories appear in the navbar.",
        "tags": ["Odoo 19", "Python"]
      },
      {
        "lead": "The My Account suite",
        "body": "Shipped order-wise admin chat, recently viewed products, orders, returns, wishlist and account settings.",
        "tags": ["Odoo 19", "JavaScript"]
      }
    ]
  },
  {
    "label": "Part 02",
    "title": "Quality & releases",
    "summary": "Functional and integration QA across a React Native IoT app.",
    "tags": ["QA", "React Native"],
    "achievements": [
      {
        "lead": "BLE + Wi-Fi verification",
        "body": "Verified that every feature sent and received the correct connection signals over BLE and Wi-Fi.",
        "tags": ["QA", "React Native"]
      },
      {
        "lead": "Scheduling & control flows",
        "body": "Tested scheduling workflows and controls across the app, device and backend with functional and integration tests.",
        "tags": ["QA", "React Native"]
      },
      {
        "lead": "The defect loop",
        "body": "Reproduced and reported defects, fixed some in the application, and retested each fix to confirm expected behavior.",
        "tags": ["QA", "React Native"]
      }
    ]
  }
]$json$::jsonb
where company = 'Northstar Innovations' and kind = 'work';

-- Education
delete from education;
insert into education (institution, degree, field, location, period, score, summary, url, orders, visible)
values
  (
    'Adani University',
    'B.Tech',
    'Information and Communication Technology (ICT)',
    'Ahmedabad, Gujarat',
    '2023 — 2027',
    'CGPA 7.79/10',
    'Final year — building full-stack systems and shipping them.',
    null,
    10,
    true
  ),
  (
    'Royal School of Science',
    'Higher Secondary',
    'Science',
    'Dhoraji, Rajkot',
    '2023',
    'Percentile 85.56',
    null,
    null,
    20,
    true
  );

-- Social Links
delete from social_links;
insert into social_links (label, url, icon, orders, visible)
values
  ('GitHub', 'https://github.com/DharmilG', 'github', 10, true),
  ('LinkedIn', 'https://www.linkedin.com/in/dharmil-gajjar-8545982a2/', 'globe', 20, true);

-- Project Groups: Composable E-commerce hidden in production (visible = false)
insert into project_groups (slug, title, description, highlights, icon, orders, visible, featured)
values (
  'e-commerce',
  'Composable E-Commerce Platform',
  'Next.js storefront and admin panel backed by independently deployable NestJS microservices communicating over AWS SQS.',
  array[
    'Nine services with shared event contracts, retries, dead-letter handling and idempotency.',
    'Dockerized services behind Nginx, on RDS, S3 and MongoDB Atlas.'
  ]::text[],
  'package',
  5,
  false, -- HIDDEN IN PRODUCTION
  false
)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  highlights = excluded.highlights,
  icon = excluded.icon,
  orders = excluded.orders,
  visible = excluded.visible,
  featured = excluded.featured;

-- Projects: Including Go-Commerce (Visible & Featured), Hiding Composable E-commerce
insert into projects (
  repo_owner,
  repo_name,
  title_override,
  description_override,
  group_slug,
  highlights,
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
    'A VS Code-styled interactive developer portfolio built with Next.js 16 App Router, Tailwind 4, Supabase, and real-time GitHub tree/commit exploration.',
    null,
    array[
      'Full VS Code workbench shell: Titlebar, Activity Bar, File Explorer, Editor tabs, Terminal, and Status Bar.',
      'Real-time GitHub API integration: branch switching, directory navigation, and commit log with visual graph rail.',
      'Built-in terminal shell supporting custom navigation commands, cat, grep, and curl.'
    ]::text[],
    null,
    true,
    'projects',
    10,
    true,
    true,
    array['TypeScript', 'Next.js', 'Tailwind CSS', 'Supabase']::text[]
  ),
  (
    'DharmilG',
    'go-commerce',
    'Go Commerce',
    'High-performance, modular e-commerce backend platform engineered in Go (Golang) — RESTful APIs, clean architecture, and PostgreSQL.',
    null,
    array[
      'Engineered with Go clean architecture: decoupled domain, use case, and repository layers.',
      'High-throughput RESTful endpoints designed for low latency and high concurrency.',
      'PostgreSQL persistence with efficient schema design and transactional consistency.'
    ]::text[],
    null,
    true,
    'projects',
    15,
    true, -- VISIBLE & FEATURED
    true,
    array['Go', 'PostgreSQL', 'Docker', 'REST API']::text[]
  ),
  (
    'DharmilG',
    'Stock-Direction-Predictor',
    'Stock Direction Predictor',
    'Research pipeline predicting the 5-day up/flat/down direction of NIFTY 50 stocks — 180+ leakage-safe features, calibrated probabilities, SHAP explanations and an honest evaluation.',
    null,
    array[
      'Triple-barrier labels, purged walk-forward splits, probability calibration and Optuna tuning.',
      'News + macro pipeline from NSE announcements, GDELT, FRED and FinBERT with time-aware joins.',
      'FastAPI + Streamlit app for predictions, rankings, probability scores and SHAP explanations.'
    ]::text[],
    null,
    true,
    'projects',
    20,
    true,
    true,
    array['Python', 'FastAPI', 'Machine Learning', 'Docker']::text[]
  ),
  (
    'DharmilG',
    'hostsel-management-sys',
    'Hostel Management System',
    'Hostel management system — student registration, profiles and records, and automatic room allocation — React on the front, Node.js/Express REST APIs on PostgreSQL.',
    null,
    array[
      'Automatic room allocation driven by availability and student records.',
      'React UI over Node.js/Express REST APIs with PostgreSQL for records.'
    ]::text[],
    null,
    true,
    'projects',
    30,
    true,
    true,
    array['React', 'Node.js', 'Express.js', 'PostgreSQL']::text[]
  ),
  (
    'DharmilG',
    'harmoniq-music',
    'Harmoniq Music',
    'Music streaming and audio player web application with dynamic playlist management.',
    null,
    array[]::text[],
    null,
    true,
    'projects',
    40,
    true,
    false,
    array['JavaScript', 'CSS', 'HTML']::text[]
  ),
  (
    'DharmilG',
    'Books',
    'Books',
    'Digital book catalog and reading tracking application.',
    null,
    array[]::text[],
    null,
    true,
    'projects',
    50,
    true,
    false,
    array['JavaScript', 'HTML']::text[]
  ),
  (
    'DharmilG',
    'Chat-app',
    'Chat App',
    'Real-time web chat messaging application powered by WebSockets.',
    null,
    array[]::text[],
    null,
    true,
    'projects',
    60,
    true,
    false,
    array['JavaScript', 'Socket.IO', 'Node.js']::text[]
  ),
  (
    'DharmilG',
    'url_short',
    'URL Shortener',
    'URL shortening service with click analytics and fast redirection.',
    null,
    array[]::text[],
    null,
    true,
    'projects',
    70,
    true,
    false,
    array['Python', 'Flask']::text[]
  ),
  (
    'DharmilG',
    'querytohtml',
    'Query to HTML',
    'Developer utility for converting structured queries and database records into HTML reports.',
    null,
    array[]::text[],
    null,
    true,
    'projects',
    80,
    true,
    false,
    array['Python']::text[]
  ),
  -- Composable E-Commerce Repos: Hidden in production
  (
    'E-Commerce-BDA',
    'storefront-frontend',
    'Storefront Frontend',
    'The Next.js storefront and admin panel of a composable e-commerce platform.',
    'e-commerce',
    array[]::text[],
    null,
    true,
    'projects',
    101,
    false, -- HIDDEN IN PRODUCTION
    false,
    array['TypeScript', 'CSS', 'JavaScript']::text[]
  ),
  (
    'E-Commerce-BDA',
    'auth-svc',
    'Auth Service',
    'Authentication service of the composable e-commerce platform.',
    'e-commerce',
    array[]::text[],
    null,
    true,
    'projects',
    102,
    false, -- HIDDEN IN PRODUCTION
    false,
    array[]::text[]
  )
on conflict (repo_owner, repo_name) do update set
  title_override = excluded.title_override,
  description_override = excluded.description_override,
  group_slug = excluded.group_slug,
  highlights = excluded.highlights,
  preview_url = excluded.preview_url,
  preview_embeddable = excluded.preview_embeddable,
  folder_slug = excluded.folder_slug,
  orders = excluded.orders,
  visible = excluded.visible,
  featured = excluded.featured,
  tags = excluded.tags;

-- Site Settings
insert into site_settings (key, value)
values
  ('resume', '{"path":null,"label":"Dharmil_Gajjar_Resume.pdf","updated_at":null}'::jsonb),
  ('theme', '{"mode":"dark","accent":"#0078d4"}'::jsonb)
on conflict (key) do update set value = excluded.value;

commit;
