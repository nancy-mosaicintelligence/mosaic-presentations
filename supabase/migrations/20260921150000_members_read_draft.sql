-- The shared link shows the current document (D-045): every member — viewers included — may read the
-- draft. Writing it stays with editors and owners; versions, history and the editor stay closed to viewers.
create policy "members read the current document" on public.presentation_drafts for select to authenticated
  using (public.has_role(presentation_id, array['owner', 'editor', 'viewer']::public.membership_role[]));
