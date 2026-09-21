-- Mosaic presentations: identity, memberships, invitations, drafts, versions, publication, assets, audit.
-- Every table is under row-level security; the application talks to the database as the signed-in user
-- (the anon key plus the session), so these policies are the last word on who may read or write what.
-- The service role is used only for the sign-in bootstrap (profiles, owner seeding) and invitation lookup.

create extension if not exists pgcrypto;

create type public.membership_role as enum ('owner', 'editor', 'viewer');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now()
);

create table public.presentations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,80}$'),
  title text not null,
  renderer text not null,
  created_at timestamptz not null default now()
);

create table public.presentation_memberships (
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.membership_role not null,
  granted_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  primary key (presentation_id, user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  email text not null check (email = lower(email)),
  role public.membership_role not null check (role <> 'owner'),
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id),
  revoked_at timestamptz
);
create index invitations_presentation_idx on public.invitations (presentation_id, created_at desc);

create table public.presentation_drafts (
  presentation_id uuid primary key references public.presentations (id) on delete cascade,
  document jsonb not null,
  content_hash text not null,
  based_on uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create table public.presentation_versions (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  schema_version int not null,
  name text not null check (length(name) between 1 and 120),
  note text check (note is null or length(note) <= 2000),
  author_id uuid references public.profiles (id),
  author_email text,
  created_at timestamptz not null default now(),
  content_hash text not null,
  document jsonb not null,
  duplicated_from uuid
);
create index versions_presentation_idx on public.presentation_versions (presentation_id, created_at desc);

create table public.publication_records (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  version_id uuid not null references public.presentation_versions (id),
  published_by uuid references public.profiles (id),
  published_at timestamptz not null default now(),
  active boolean not null default true
);
create unique index publication_active_idx on public.publication_records (presentation_id) where active;

create table public.presentation_assets (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  storage_path text not null unique,
  name text,
  sha256 text not null,
  bytes int not null,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id bigserial primary key,
  presentation_id uuid references public.presentations (id) on delete cascade,
  actor_id uuid,
  actor_email text,
  action text not null,
  detail jsonb,
  at timestamptz not null default now()
);
create index audit_presentation_idx on public.audit_events (presentation_id, at desc);

-- a profile for every auth user, kept in step with the auth record
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do update set email = excluded.email, full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end $$;
create trigger on_auth_user_created after insert or update of email on auth.users
  for each row execute procedure public.handle_new_user();

-- the role test every policy uses
create or replace function public.has_role(pid uuid, roles public.membership_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.presentation_memberships m where m.presentation_id = pid and m.user_id = auth.uid() and m.role = any (roles))
$$;

-- a presentation never loses its last owner
create or replace function public.protect_last_owner() returns trigger
language plpgsql as $$
begin
  -- a presentation being deleted takes its memberships with it; the rule is about live presentations
  if not exists (select 1 from public.presentations p where p.id = old.presentation_id) then return coalesce(new, old); end if;
  if old.role = 'owner' and (tg_op = 'DELETE' or new.role <> 'owner') then
    if (select count(*) from public.presentation_memberships where presentation_id = old.presentation_id and role = 'owner') <= 1 then
      raise exception 'a presentation keeps at least one owner';
    end if;
  end if;
  return coalesce(new, old);
end $$;
create trigger memberships_last_owner before update or delete on public.presentation_memberships
  for each row execute procedure public.protect_last_owner();

-- row-level security
alter table public.profiles enable row level security;
alter table public.presentations enable row level security;
alter table public.presentation_memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.presentation_drafts enable row level security;
alter table public.presentation_versions enable row level security;
alter table public.publication_records enable row level security;
alter table public.presentation_assets enable row level security;
alter table public.audit_events enable row level security;

create policy "own profile, and owners see their members" on public.profiles for select to authenticated
  using (id = auth.uid() or exists (
    select 1 from public.presentation_memberships a join public.presentation_memberships b on a.presentation_id = b.presentation_id
    where a.user_id = auth.uid() and a.role = 'owner' and b.user_id = public.profiles.id));

create policy "members see the presentation" on public.presentations for select to authenticated
  using (public.has_role(id, array['owner', 'editor', 'viewer']::public.membership_role[]));

create policy "own membership, owners see all" on public.presentation_memberships for select to authenticated
  using (user_id = auth.uid() or public.has_role(presentation_id, array['owner']::public.membership_role[]));
create policy "owners grant" on public.presentation_memberships for insert to authenticated
  with check (public.has_role(presentation_id, array['owner']::public.membership_role[]));
create policy "owners change" on public.presentation_memberships for update to authenticated
  using (public.has_role(presentation_id, array['owner']::public.membership_role[]));
create policy "owners revoke" on public.presentation_memberships for delete to authenticated
  using (public.has_role(presentation_id, array['owner']::public.membership_role[]));

create policy "owners manage invitations" on public.invitations for all to authenticated
  using (public.has_role(presentation_id, array['owner']::public.membership_role[]))
  with check (public.has_role(presentation_id, array['owner']::public.membership_role[]));

create policy "editors read the draft" on public.presentation_drafts for select to authenticated
  using (public.has_role(presentation_id, array['owner', 'editor']::public.membership_role[]));
create policy "editors write the draft" on public.presentation_drafts for insert to authenticated
  with check (public.has_role(presentation_id, array['owner', 'editor']::public.membership_role[]));
create policy "editors update the draft" on public.presentation_drafts for update to authenticated
  using (public.has_role(presentation_id, array['owner', 'editor']::public.membership_role[]));

create policy "editors read versions" on public.presentation_versions for select to authenticated
  using (public.has_role(presentation_id, array['owner', 'editor']::public.membership_role[]));
create policy "editors create versions" on public.presentation_versions for insert to authenticated
  with check (public.has_role(presentation_id, array['owner', 'editor']::public.membership_role[]));

create policy "members see what is published" on public.publication_records for select to authenticated
  using (public.has_role(presentation_id, array['owner', 'editor', 'viewer']::public.membership_role[]));
create policy "owners publish" on public.publication_records for insert to authenticated
  with check (public.has_role(presentation_id, array['owner']::public.membership_role[]));
create policy "owners retire" on public.publication_records for update to authenticated
  using (public.has_role(presentation_id, array['owner']::public.membership_role[]));

-- a viewer may read the published document itself (and nothing about drafts or history)
create policy "members read the published version" on public.presentation_versions for select to authenticated
  using (exists (select 1 from public.publication_records p where p.version_id = public.presentation_versions.id and p.active
                 and public.has_role(p.presentation_id, array['viewer']::public.membership_role[])));

create policy "editors see assets" on public.presentation_assets for select to authenticated
  using (public.has_role(presentation_id, array['owner', 'editor']::public.membership_role[]));
create policy "editors add assets" on public.presentation_assets for insert to authenticated
  with check (public.has_role(presentation_id, array['owner', 'editor']::public.membership_role[]));

create policy "owners read the audit log" on public.audit_events for select to authenticated
  using (public.has_role(presentation_id, array['owner']::public.membership_role[]));
create policy "members write audit events" on public.audit_events for insert to authenticated
  with check (public.has_role(presentation_id, array['owner', 'editor', 'viewer']::public.membership_role[]) and actor_id = auth.uid());

-- private storage for uploaded assets: <presentation uuid>/<sha256>.svg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('assets', 'assets', false, 2097152, array['image/svg+xml'])
  on conflict (id) do nothing;
create policy "editors read assets" on storage.objects for select to authenticated
  using (bucket_id = 'assets' and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'editor']::public.membership_role[]));
create policy "editors upload assets" on storage.objects for insert to authenticated
  with check (bucket_id = 'assets' and public.has_role(((storage.foldername(name))[1])::uuid, array['owner', 'editor']::public.membership_role[]));
