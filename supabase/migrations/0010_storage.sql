-- 0010_storage: public avatars bucket (your logo, bottom-left avatar)
-- Source: DOC/04-data-model.md §3

insert into storage.buckets (id, name, public)
values ('avatars','avatars', true)
on conflict (id) do update set public = true;

create policy "avatars public read"
on storage.objects for select to anon, authenticated using (bucket_id = 'avatars');

create policy "owner write avatars"
on storage.objects for insert to authenticated with check (bucket_id = 'avatars');

create policy "owner update avatars"
on storage.objects for update to authenticated using (bucket_id = 'avatars');
