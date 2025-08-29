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
  ('books', 'Books', 'book', 85, true, 'static'),
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
  ('Databases', array['PostgreSQL','Supabase','MongoDB','Redis']::text[], 40, true),
  ('Cloud & DevOps', array['AWS (S3, RDS, SQS)','Docker','Nginx','Git','GitHub','GitHub Actions']::text[], 50, true),
  ('Platforms', array['Odoo 19','Theme development','Website editor components','Backend views']::text[], 60, true),
  ('Testing & QA', array['Functional testing','Integration testing','Manual testing','Bug reproduction and retesting','BLE/Wi-Fi device testing','React Native app testing']::text[], 70, true),
  ('Data & ML', array['Machine Learning','RAG','LightGBM','Classification','Pandas','Optuna','SHAP','Data processing']::text[], 80, true);

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
