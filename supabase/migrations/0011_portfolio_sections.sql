-- 0011_portfolio_sections: the real section set (About, Resume, Certificates,
-- Experience, Projects, Skills, Contact), the certificates table and the
-- resumes bucket. The tmp scratch folder leaves the workspace.
-- Source: DOC/04-data-model.md §1/§3

-- The slug list grew (resume, certificates) and lost the tmp scratch folder.
alter table sections drop constraint if exists sections_slug_check;
alter table sections add constraint sections_slug_check
  check (slug in ('about','resume','certificates','experience','projects','skills','contact'));

-- Move anything still parked in tmp before the folder disappears.
update projects set folder_slug = 'projects' where folder_slug = 'tmp';
delete from sections where slug = 'tmp';

-- ============ certificates (Resume + Certificates pages) ============
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

alter table certificates enable row level security;

create policy "public read certificates"
  on certificates for select to anon, authenticated using (visible = true);

-- ============ storage: resume PDFs ============
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', true)
on conflict (id) do update set public = true;

create policy "resumes public read"
  on storage.objects for select to anon, authenticated using (bucket_id = 'resumes');

create policy "owner write resumes"
  on storage.objects for insert to authenticated with check (bucket_id = 'resumes');

create policy "owner update resumes"
  on storage.objects for update to authenticated using (bucket_id = 'resumes');
