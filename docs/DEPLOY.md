# Deploying the presentations app

The app is the Next.js project in `apps/web`, backed by the hosted Supabase project `mosaic-presentations`
(ref `ondzaqafeotuxxsfobvt`, us-east-2). It ships from the product repository
`nancy-mosaicintelligence/mosaic-presentations` (branch `main`) to Netlify. The two Netlify sites that hold the
frozen keynote (`mosaic-ventowave2026keynote` and `…-v2`) deploy from the old repository and are never touched.

## One-time set-up (about ten minutes, all in dashboards)

1. **Netlify → Add new project → Import an existing project → GitHub** → pick `mosaic-presentations`.
   - Team: Mosaic Special Ops. Project name: `mosaic-presentations` (the site becomes `mosaic-presentations.netlify.app`;
     a custom domain such as `presentations.mosaicintelligence.xyz` can be added later).
   - **Base directory: `apps/web`.** Build command: `pnpm build`. Publish directory: leave to the Next runtime.
     Branch: `main`. (`apps/web/netlify.toml` repeats the command and the Next plugin.)
2. **Environment variables** (Netlify → Project configuration → Environment variables), before the first build,
   because the two public ones are baked into the browser bundle at build time:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://ondzaqafeotuxxsfobvt.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon key (Supabase → Project settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` = the service role key (same page; mark it secret)
   - `OWNER_EMAILS` = `nancy@mosaicintelligence.xyz` (add more owners comma-separated)
   - Never set `ITW_TEST_AUTH` or `ITW_STORE` on the host.
3. **Supabase → Authentication → URL configuration**: Site URL `https://mosaic-presentations.netlify.app`;
   Redirect URLs: add `https://mosaic-presentations.netlify.app/auth/callback` (and the custom domain's later).
4. **Google Cloud → the OAuth client used by Supabase**: nothing changes — Google redirects to Supabase
   (`https://ondzaqafeotuxxsfobvt.supabase.co/auth/v1/callback`), which is already registered.
5. Trigger the first deploy (Netlify → Deploys → Trigger deploy). Every push to `main` deploys from then on.

## First sign-in and the first colleague

- Open the site, sign in with Google as `nancy@…`: the owner bootstrap gives that account the keynote (and any other
  seeded deck) as owner. The hosted database starts empty apart from the seeds — local drafts do not travel.
- Colleagues on `mosaicintelligence.xyz` can sign in and create their own presentations at once. To work on the
  keynote, they need a role: People → invite by address → send the link yourself (one address, one role, fourteen days).
- A viewer opens `/p/<slug>` — the current document; the frozen published version is `/p/<slug>?source=published`.

## What the build needs and why it works

- pnpm workspace: Netlify installs from the repository root; the core package (`packages/presentation-core`) is plain ESM.
- The deck (`index.html`), its content file and the core package sit outside `apps/web`; `next.config.ts` traces them
  into every server bundle (`outputFileTracingIncludes`, rooted at the repository), and `repoRoot()` finds them from
  the bundle's own location when the working directory is elsewhere. `MOSAIC_REPO_ROOT` overrides the search.
- Database migrations: `supabase db push` from a checkout linked to the project (already at `20260921150000`).

## Verifying a deploy (Phase 9)

1. `/sign-in` renders; Google sign-in returns to the library.
2. The keynote card is there for the owner; Edit opens the stage; a text edit saves ("Saved …").
3. Present from the library shows the draft with the exit pill; `/p/italian-tech-week` shows the same document.
4. People: an invitation link for a colleague; they accept and see the deck with their role.
5. Publish once from the editor; `/p/italian-tech-week?source=published` shows that version.
