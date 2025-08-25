-- 0014 — profile about.
-- The About page reads an authored profile story (headline, paragraphs, quote,
-- principles, now and beyond) from `profiles.about`. `bio` stays the short
-- fallback used when the profile has no authored story yet.
alter table profiles
  add column if not exists about jsonb not null default '{}'::jsonb;

alter table profiles
  drop constraint if exists profiles_about_object;
alter table profiles
  add constraint profiles_about_object
  check (jsonb_typeof(about) = 'object');
