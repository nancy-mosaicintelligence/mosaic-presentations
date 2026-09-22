-- Raster images for presentations: kept privately per presentation, described in the document as image assets.
alter table public.presentation_assets
  add column kind text not null default 'svg' check (kind in ('svg', 'image')),
  add column mime text,
  add column width int,
  add column height int;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('images', 'images', false, 15728640, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
  on conflict (id) do nothing;
create policy "members see images" on storage.objects for select to authenticated
  using (bucket_id = 'images' and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'editor', 'viewer']::public.membership_role[]));
create policy "editors add images" on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'editor']::public.membership_role[]));
create policy "members read image rows" on public.presentation_assets for select to authenticated
  using (kind = 'image' and public.has_role(presentation_id, array['viewer']::public.membership_role[]));
