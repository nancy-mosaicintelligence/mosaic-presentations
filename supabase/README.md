# Database

`migrations/` is the schema: identity (`profiles`), `presentations`, `presentation_memberships` (owner, editor, viewer), `invitations` (hashed tokens, expiry, revocation), `presentation_drafts`, `presentation_versions` (immutable), `publication_records`, `presentation_assets` (private `assets` bucket), `audit_events`; the `has_role()` helper, the last-owner trigger, and row-level security on every table.

- Local: `supabase start` applies the migrations to the Docker stack; `supabase db reset --no-seed` reapplies them from scratch.
- Hosted: `supabase db push` applies pending migrations to the linked project.
- Rollback: migrations are forward-only; a mistake is corrected by a new migration. Before applying one in production take a snapshot from the Supabase dashboard (or `pg_dump`) so the previous state can be restored.
- Keys: the anon key is public; the service-role key bypasses RLS and lives only in server environment variables.
