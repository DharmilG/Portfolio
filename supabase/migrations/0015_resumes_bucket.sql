-- 0015_resumes_bucket: public resumes bucket for PDF downloads
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', true)
on conflict (id) do update set public = true;

drop policy if exists "resumes public read" on storage.objects;
create policy "resumes public read"
on storage.objects for select to anon, authenticated using (bucket_id = 'resumes');

drop policy if exists "owner write resumes" on storage.objects;
create policy "owner write resumes"
on storage.objects for insert to authenticated with check (bucket_id = 'resumes');

drop policy if exists "owner update resumes" on storage.objects;
create policy "owner update resumes"
on storage.objects for update to authenticated using (bucket_id = 'resumes');
