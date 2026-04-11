-- AICOS storage buckets and object policies

insert into storage.buckets (id, name, public)
values
  ('client_portal', 'client_portal', true),
  ('template-files', 'template-files', true),
  ('sop-files', 'sop-files', true),
  ('assets', 'assets', false),
  ('knowledge-documents', 'knowledge-documents', false)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

-- Staff can manage all storage objects.
create policy storage_objects_staff_all on storage.objects
for all using (public.get_my_role() in ('admin', 'distribution', 'delivery'))
with check (public.get_my_role() in ('admin', 'distribution', 'delivery'));

