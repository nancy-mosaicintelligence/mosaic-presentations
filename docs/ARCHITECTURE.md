# Mosaic Presentation Studio Architecture

## Architecture decision

Wrap and progressively refactor the current presentation. Do not rewrite the renderer as React before parity is proven.

The root `index.html` is a working, self-contained 920,579-byte artifact. It embeds its fonts, Three.js runtime, content, animation configuration, notes, SVG paths, and procedural scenes. A clean rewrite would put the distinctive camera and timing behavior at unnecessary risk.

## Current presentation architecture

- Static HTML with inline CSS and JavaScript
- Three.js r128 embedded in the document
- 52 stations in a `STATIONS` array
- 26 DOM beat sections selected by station key
- Mutable presentation state held in one closure
- Custom requestAnimationFrame interpolation
- Scroll-based Explore mode and step-based Present mode
- Procedural WebGL room, vasculature, vessel, and instruments
- Procedural 2D team, crowd, and final-logo sequence
- Inline SVG diagrams and logo paths
- No application server, database, package manager, or build step

## Target system

### Web application

Use a Next.js and TypeScript application for authenticated routes, server-side access checks, editor UI, APIs, and deployable presentation routes.

### Presentation player

Keep the original renderer isolated at first. Load it through a same-origin player route or iframe with a small, versioned message bridge for:

- Current station
- Navigation commands
- Notes visibility
- Safe mode
- Fullscreen request
- Preview state
- Draft payload loading
- Ready, error, and asset-status events

The bridge must validate message origins and payload schemas.

### Presentation core package

A framework-independent package should own:

- Schema definitions
- Runtime validation
- Schema-version migrations
- Immutable snapshot creation
- Draft-to-version comparison
- Undo and redo commands
- Serialization and deterministic hashing

### Renderer adapters

Each presentation type owns an adapter that converts structured state into its renderer's inputs. The Italian Tech Week adapter may preserve custom code and expose only supported properties.

## Proposed repository layout

```text
AGENTS.md
README.md
docs/
apps/web/
  app/(public)/p/[slug]/page.tsx
  app/(editor)/presentations/[id]/edit/page.tsx
  app/api/
  components/editor/
  components/player/
  lib/auth/
  lib/db/
  lib/storage/
packages/presentation-core/
  src/schema/
  src/history/
  src/validation/
presentations/italian-tech-week/
  baseline/original/
  baseline/screenshots/
  renderer/
  content/
  assets/
  visual-tests/
supabase/migrations/
tests/e2e/
.env.example
```

The full application skeleton begins only after preservation and the first reviewable design-refinement groups.

## Data model

### User and membership

- `profiles`: application identity linked to the auth provider
- `presentation_memberships`: presentation or workspace role assignment
- `invitations`: named, expiring invitations and their status

### Presentation

- `presentations`: stable identity, slug, owner, metadata, access policy
- `presentation_drafts`: one mutable structured draft per presentation
- `presentation_versions`: immutable full snapshots
- `publication_records`: the approved version currently served
- `presentation_assets`: private object metadata and ownership
- `access_codes`: scoped hash, expiry, rotation, and revocation metadata
- `audit_events`: security and publication-relevant actions

### Snapshot requirements

Each immutable version contains:

- Version ID and presentation ID
- Schema version
- Human-readable version name
- Author and timestamp
- Optional note
- Complete content, token, layout, animation, and asset-reference state
- Deterministic content hash

Restoration copies the selected snapshot into the working draft and records an audit event. It never deletes versions created later.

## Content schema boundaries

The initial schema should contain:

- `presentation`: metadata, renderer ID, schema version, theme reference
- `sections`: ordered authored sections
- `stations`: ordered navigation and timing states
- `elements`: typed text, media, logo, diagram, and custom-scene bindings
- `tokens`: allowed color and typography values
- `layout`: supported alignment, dimensions, offsets, and spacing
- `animation`: supported duration, delay, interpolation, and reveal values
- `assets`: stable IDs and metadata rather than public raw URLs

Custom scene bindings may contain renderer-specific validated properties. They must not allow arbitrary code from editor input.

## Authentication and authorization

Use Supabase Auth with Google as the recommended first implementation. Supabase keeps authentication, PostgreSQL, row-level security, and private storage in one access model.

Authorization rules:

- Restrict the company sign-in flow to `mosaicintelligence.xyz`.
- Assign no elevated role from the email domain alone.
- Enforce roles in server routes and database row-level security.
- Protect private storage through signed or authorized requests.
- Prefer named external invitations.
- Store shared access-code verifiers with Argon2id or an equivalent password hash.
- Scope access codes to one presentation and include expiry and revocation.
- Never place service-role keys in client bundles.

Clerk is an alternative if turnkey organization administration is prioritized. Auth.js provides more ownership but would require separately assembling user, role, invitation, and storage policy. Supabase is the simplest secure first system for the confirmed scope.

No service is provisioned in Phases 2 or 3.

## Publication and direct links

- `/p/[slug]` resolves only an approved version.
- Optional station deep links use a validated fragment or query parameter.
- The player must clamp invalid station values.
- Refresh restores the approved version and requested station.
- Invite or access-code state is verified server-side before presentation content or private asset URLs are returned.
- Viewer responses should avoid exposing draft metadata or version history.

## Asset storage

- Official logo SVGs and presentation-owned static assets may live in versioned source when licensing permits.
- Uploaded private assets live in an access-controlled object bucket.
- Database records store stable asset IDs, metadata, checksum, and ownership.
- Versions refer to immutable asset records.
- Replacing an asset never mutates a prior version's asset identity.
- Fluoroscopy frames require a documented rights and de-identification check before ingestion.

## Migration sequence

1. Preserve and verify the untouched baseline.
2. Add a small player bridge without changing presentation visuals.
3. Introduce the app shell and route the untouched player through it.
4. Extract design tokens and simple copy into validated structured data.
5. Extract safe layout and animation properties section by section.
6. Keep bespoke scenes behind renderer adapters.
7. Add drafts, history, auth, permissions, and publication around the stable player.

At every extraction step, compare matching baseline and implementation screenshots and rerun navigation checks.

## Failure handling

- WebGL failure activates Safe Mode while keeping all narrative text.
- Missing optional media renders an intentional low-distraction fallback and reports asset status to the editor.
- Invalid draft payloads fail validation and never replace the last valid draft.
- A failed publish keeps the previously approved version active.
- Database migrations require a documented rollback or forward-fix procedure.

## Deployment direction

Vercel is the recommended application host because the target uses Next.js server rendering and route handlers. Supabase provides persistent data, auth, and private object storage. Deployment and service provisioning require separate approval.

