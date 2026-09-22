# Mosaic — Italian Tech Week keynote

One self-contained `index.html`. No build step, no dependencies, no network.
Fonts (Fraunces, DM Sans, IBM Plex Mono, Architects Daughter — all SIL OFL) and three.js r128
are embedded in the file, so it renders identically offline and on any host.

## Run it locally

Open `index.html` in a browser. (Double-clicking works; a local server is not needed.)

## Controls

| Key | Action |
|---|---|
| → / ↓ / Space / Enter / Page Down / Tab / click / tap / swipe left / scroll down | next station |
| ← / ↑ / Page Up / Backspace / Shift+Tab / right-click / swipe right / scroll up | previous station |
| Home / End | first / last station |
| `M` | Present ↔ Explore mode |
| `N` | speaker notes |
| `S` | safe mode (3D scene off, all text intact) |
| `F` | fullscreen (`Esc` leaves) |

55 stations. Advancing works on a general click anywhere on the screen —
nothing has to be targeted — and on a presentation clicker (Page Down / Page
Up), a trackpad swipe, or the mouse wheel. The bar at the bottom shows the route as a
vessel with one node per chapter; click or drag along it to go anywhere.
The Safe / Notes / Present / Fullscreen buttons appear when the mouse moves
and hide again after a couple of seconds.

If the frame rate is low for the first few seconds the deck switches itself
to Safe mode (`S` toggles it back). Append `?watchdog=off` to the URL to keep
that guard out of automated screenshot runs.

The header and the closing lockup use the official Mosaic logo, embedded from
`presentations/italian-tech-week/assets/brand/`.

## Deploy

```bash
cd itw-keynote
git init
git add .
git commit -m "Italian Tech Week keynote"
git branch -M main
git remote add origin git@github.com:<you>/itw-keynote.git
git push -u origin main
```

**Vercel** — import the repo, framework preset **Other**, leave build command
and output directory empty. It serves `index.html` at the root.

**Netlify** — import the repo, leave build command empty, publish directory `.`.

Either one can also take the file by drag-and-drop without GitHub:
Netlify Drop (app.netlify.com/drop) or `vercel deploy` from this folder.

## The editor

`apps/web` is the editor and player application (Next.js, TypeScript). It frames the deck and edits the structured document behind it — copy, roles, overrides, visibility, timing, layout, motion, renderer copy, marks — with undo/redo, autosave, preview and named versions.

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000. The deck at the root of the repository is unchanged for an audience: the bridge the editor uses is inert unless the deck is framed by the editor on the same origin.

### Sign-in and roles

Access is invite-only. The app uses Supabase (Auth with Google, Postgres with row-level security, private storage):

1. **Locally**: install Docker (colima works) and the Supabase CLI, then `supabase start` in the repository — it applies `supabase/migrations/` and prints the local URL and keys. Copy `apps/web/.env.example` to `apps/web/.env.local` and fill them in; set `OWNER_EMAILS` to the company address that should own the presentations. Google is not available locally: with `ITW_TEST_AUTH=1` the browser tests (and you) can sign in by password through `POST /auth/test-sign-in` for accounts created with the service role.
2. **Hosted**: create a Supabase project, run the migration (`supabase db push`), and in the Supabase dashboard enable the Google provider with an OAuth client created in Google Cloud (authorised redirect: `https://<project>.supabase.co/auth/v1/callback`; set the app's `Site URL` and add `https://<app>/auth/callback` to the redirect list). Put the project URL, anon key and service-role key in the app's environment. Never commit them.

The home page is the library: every presentation you hold a role on. Company accounts can compose a new deck on the keynote engine (an opening and a close to start; add stations from the beat picker — opening, chapter, statement, statement + point, list, pills, image, number / quote, two columns, close — type on the stage, place images; add free text boxes and image boxes, drag and resize them, drop pictures from the library or from your desktop; Save, Undo/Redo, History, Present, Publish and Share in the bar), make an editable copy of the keynote, import a finished HTML deck (file or link; stored privately, presented in a sandbox, not editable) or add a link (Drive, Slides…); each has the same roles, invitations and publication rules.

Rules: only `mosaicintelligence.xyz` accounts may sign in without an invitation, and even they hold no role on anyone else's presentation until an owner grants one. Owners manage people at `/presentations/<id>/people`: roles (owner, editor, viewer), and named invitations — one address, one role, fourteen days, a link shown once. Owners publish a version; everyone with access sees it at `/p/<id>` (a direct link may carry `#s=<station>`). The library's Present shows the working document (what Edit shows); Publish is what changes the shared link. The Mosaic marks under `apps/web/public/brand/` sit first in every image library.

Offline mode: `ITW_STORE=file` runs the editor without sign-in against `apps/web/data/` (never in production).

Unit tests: `pnpm test`. Browser tests: `pnpm test:e2e` (needs the local stack, `PW_EXEC` and `PW_MODULES`, see `tools/README.md`).
