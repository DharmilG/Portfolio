-- Local starter data: Dharmil Gajjar's portfolio, sourced from the resume.
-- Loaded by `supabase db reset` via config.toml [db.seed] sql_paths.
-- Repo owner/repo name stay backend-only; the Explorer uses title_override.
--
-- Content tables (profiles, skills, experiences, education, social_links) are
-- replaced on every seed. Projects + groups are upserted, so rows added in
-- Studio survive a re-run. The resume PDF itself is never in git: upload it
-- with `node scripts/upload-resume.mjs` after a reset.

begin;

-- === sections (Explorer folders) ===
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

-- === profile (the About hero + Contact) ===
delete from profiles;
insert into profiles (name, avatar_url, bio, location, website, data)
values (
  'Dharmil Gajjar',
  null,
  'Final-year B.Tech ICT student at Adani University (2027) with internship experience in e-commerce development and QA testing. I build with JavaScript, TypeScript, Python, React, Next.js, Node.js and AWS — and I test what I ship.',
  'Ahmedabad, Gujarat, India',
  'https://github.com/DharmilG',
  '{"role":"Full-stack & Backend Engineer","hireable":true,"availability":"Open to full-stack / backend roles","class_of":"2027","focus":"Building a composable e-commerce platform — Next.js storefront, NestJS microservices, AWS SQS","email":"dharmilgajjar0@gmail.com","phone":"+91 83206 33350","summary":"Final-year B.Tech ICT student at Adani University (2027) — full-stack and backend engineering.","stack":["Next.js","NestJS","PostgreSQL","AWS"]}'::jsonb
);

-- === skills (grouped chips: the resume's technical skills) ===
delete from skills;
insert into skills (category, items, orders, visible)
values
  ('Languages', array['Python','JavaScript','TypeScript','SQL']::text[], 10, true),
  ('Frontend', array['HTML','CSS','React','Next.js']::text[], 20, true),
  ('Backend', array['Node.js','Express.js','NestJS','FastAPI','REST APIs','Microservices','Event-Driven Architecture']::text[], 30, true),
  ('Databases', array['PostgreSQL','MongoDB','Redis']::text[], 40, true),
  ('Cloud & DevOps', array['AWS (S3, RDS, SQS)','Docker','Nginx','Git','GitHub','GitHub Actions']::text[], 50, true),
  ('Platforms', array['Odoo 19','Theme development','Website editor components','Backend views']::text[], 60, true),
  ('Testing & QA', array['Functional testing','Integration testing','Manual testing','Bug reproduction and retesting','BLE/Wi-Fi device testing','React Native app testing']::text[], 70, true),
  ('Data & ML', array['Machine Learning','LightGBM','Classification','Pandas','Optuna','SHAP','Data processing']::text[], 80, true);

-- === experience (work + hackathons, one timeline) ===
delete from experiences;
insert into experiences (
  company, role, period, summary, highlights, tags, kind, url, location, orders, visible
)
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

-- The Experience page narrative: two authored parts, one card per resume line.
-- `highlights` above stays the flat list used by About and the hackathon cards.
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

-- === education ===
delete from education;
insert into education (
  institution, degree, field, location, period, score, summary, url, orders, visible
)
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

-- === social links (About hero + Contact) ===
delete from social_links;
insert into social_links (label, url, icon, orders, visible)
values
  ('GitHub', 'https://github.com/DharmilG', 'github', 10, true),
  ('LinkedIn', 'https://www.linkedin.com/in/dharmil-gajjar-8545982a2/', 'globe', 20, true);

-- === certificates ===
-- None on the resume yet. The section stays hidden (visible = false) until a
-- row is added here or in Studio.

-- === project groups (Projects > group > repos) ===
insert into project_groups (slug, title, description, highlights, icon, orders, visible, featured)
values (
  'e-commerce',
  'Composable E-Commerce Platform',
  'Next.js storefront and admin panel backed by independently deployable NestJS microservices — authentication, product, cart, orders, CMS, analytics, imports, notifications and search — communicating over AWS SQS.',
  array[
    'Nine services with shared event contracts, retries, dead-letter handling and idempotency.',
    'Dockerized services behind Nginx, on RDS, S3 and MongoDB Atlas.',
    'Admin panel for products, CMS, navigation, theme settings, orders and analytics.'
  ]::text[],
  'package',
  5,
  true,
  true
)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  highlights = excluded.highlights,
  icon = excluded.icon,
  orders = excluded.orders,
  visible = excluded.visible,
  featured = excluded.featured;

-- === projects ===
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
    'E-Commerce-BDA',
    'storefront-frontend',
    'Storefront Frontend',
    'The Next.js storefront and admin panel of a composable e-commerce platform — catalog, search, cart, checkout, account and CMS pages backed by NestJS microservices over AWS SQS.',
    'e-commerce',
    array[
      'Next.js storefront + admin panel covering products, CMS, navigation, theme, orders and analytics.',
      'Nine independently deployable NestJS services with shared event contracts, retries, DLQ and idempotency.',
      'Dockerized services behind Nginx, on RDS, S3 and MongoDB Atlas.'
    ]::text[],
    null,
    true,
    'projects',
    101,
    true,
    false,
    array['TypeScript', 'CSS', 'JavaScript']::text[]
  ),
  (
    'E-Commerce-BDA',
    'auth-svc',
    'Auth Service',
    'Authentication service of the composable e-commerce platform — the NestJS service behind sign-in, sessions and roles.',
    'e-commerce',
    array[]::text[],
    null,
    true,
    'projects',
    102,
    true,
    false,
    array[]::text[]
  ),
  (
    'DharmilG',
    'Portfolio',
    'Portfolio',
    null,
    null,
    array[]::text[],
    null,
    true,
    'projects',
    10,
    true,
    true,
    array['TypeScript', 'CSS', 'JavaScript']::text[]
  ),
  (
    'DharmilG',
    'Stock-Direction-Predictor',
    'Stock Direction Predictor',
    'Research pipeline predicting the 5-day up/flat/down direction of NIFTY 50 stocks — 180+ leakage-safe features, calibrated probabilities, SHAP explanations and an honest evaluation (47.1% accuracy vs a 47.9% majority baseline; no net profit after costs).',
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
    array['Python', 'Dockerfile', 'Batchfile', 'Shell']::text[]
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
    array['JavaScript', 'PLpgSQL', 'CSS', 'HTML']::text[]
  ),
  (
    'DharmilG',
    'harmoniq-music',
    'Harmoniq Music',
    null,
    null,
    array[]::text[],
    null,
    true,
    'projects',
    40,
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
    array[]::text[],
    null,
    true,
    'projects',
    50,
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
    array[]::text[],
    null,
    true,
    'projects',
    60,
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
    array[]::text[],
    null,
    true,
    'projects',
    70,
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
    array[]::text[],
    null,
    true,
    'projects',
    80,
    true,
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

-- === site settings ===
-- `resume.path` stays null until scripts/upload-resume.mjs uploads the PDF.
insert into site_settings (key, value)
values
  ('resume', '{"path":null,"label":"Dharmil_Gajjar_Resume.pdf","updated_at":null}'::jsonb),
  ('theme', '{"mode":"dark","accent":"#0078d4"}'::jsonb)
on conflict (key) do update set value = excluded.value;

commit;
