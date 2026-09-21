-- The library: a presentation is an editable deck (our document + a renderer), a static HTML file kept
-- privately, or a link. Company accounts may create their own; the creator is its first owner.

alter table public.presentations
  alter column renderer drop not null,   -- only editable decks have a renderer
  add column kind text not null default 'deck' check (kind in ('deck', 'html', 'link')),
  add column description text,
  add column source_url text,
  add column storage_path text,
  add column created_by uuid references public.profiles (id),
  add column updated_at timestamptz not null default now(),
  add column archived_at timestamptz,
  add constraint presentations_kind_shape check ((kind = 'deck' and renderer is not null) or (kind = 'html' and renderer is null) or (kind = 'link' and renderer is null and source_url is not null));

create or replace function public.touch_presentation() returns trigger
language plpgsql security definer set search_path = public as $$
begin update public.presentations set updated_at = now() where id = coalesce(new.presentation_id, old.presentation_id); return coalesce(new, old); end $$;
create trigger drafts_touch after insert or update on public.presentation_drafts for each row execute procedure public.touch_presentation();
create trigger versions_touch after insert on public.presentation_versions for each row execute procedure public.touch_presentation();
create trigger publication_touch after insert on public.publication_records for each row execute procedure public.touch_presentation();

-- static HTML decks live in their own private bucket: <presentation uuid>/index.html
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('decks', 'decks', false, 26214400, array['text/html'])
  on conflict (id) do nothing;
create policy "members read static decks" on storage.objects for select to authenticated
  using (bucket_id = 'decks' and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'editor', 'viewer']::public.membership_role[]));
create policy "owners write static decks" on storage.objects for insert to authenticated
  with check (bucket_id = 'decks' and public.has_role(((storage.foldername(name))[1])::uuid, array['owner']::public.membership_role[]));
