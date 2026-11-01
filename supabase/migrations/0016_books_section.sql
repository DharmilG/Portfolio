-- 0016_books_section.sql
-- Allow 'books' in sections.slug check constraint

alter table sections drop constraint if exists sections_slug_check;
alter table sections add constraint sections_slug_check
  check (slug in ('about','resume','certificates','education','experience','projects','skills','hackathons','books','contact'));

