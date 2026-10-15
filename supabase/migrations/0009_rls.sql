-- 0009_rls: public portfolio reads, owner-only writes (dashboard / service-role)
-- Source: DOC/04-data-model.md §2

alter table sections enable row level security;
alter table projects enable row level security;
alter table profiles enable row level security;
alter table experiences enable row level security;
alter table skills enable row level security;
alter table social_links enable row level security;
alter table site_settings enable row level security;
alter table github_cache enable row level security;

create policy "public read sections"
on sections for select to anon, authenticated using (visible = true);

create policy "public read projects"
on projects for select to anon, authenticated using (visible = true);

create policy "public read experiences"
on experiences for select to anon, authenticated using (visible = true);

create policy "public read skills"
on skills for select to anon, authenticated using (visible = true);

create policy "public read socials"
on social_links for select to anon, authenticated using (visible = true);

create policy "public read profiles"
on profiles for select to anon, authenticated using (true);

create policy "public read settings"
on site_settings for select to anon, authenticated using (true);

create policy "public read cache"
on github_cache for select to anon, authenticated using (true);

-- No public INSERT/UPDATE/DELETE policies: writes only via dashboard (owner)
-- or SUPABASE_SERVICE_ROLE_KEY in cron / Route Handlers.
