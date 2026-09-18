# Decision Log

## D-001: Preserve before refactoring

- Date: 2026-09-18
- Status: accepted
- Decision: Keep an exact immutable copy of the current keynote and preserve the root player until parity is demonstrated.
- Reason: The keynote contains tightly coupled bespoke rendering and timing that a broad rewrite could lose.

## D-002: Progressive wrapper architecture

- Date: 2026-09-18
- Status: accepted for implementation planning
- Decision: Build the future Next.js application around an isolated version of the existing renderer, then extract content and parameters incrementally.
- Consequence: The application can add auth, editing, and versioning without placing the visual baseline at immediate risk.

## D-003: Invite-only access

- Date: 2026-09-18
- Status: accepted
- Decision: Presentations and editor access are invite-only. No public-by-default route is planned.

## D-004: Approved company domain

- Date: 2026-09-18
- Status: accepted
- Decision: The approved Google Workspace domain is `mosaicintelligence.xyz`.
- Constraint: Domain membership verifies identity but never grants editor or owner status automatically.

## D-005: Explicit roles

- Date: 2026-09-18
- Status: accepted
- Decision: Use `owner`, `editor`, and `viewer` roles with server and database enforcement.

## D-006: External access model

- Date: 2026-09-18
- Status: accepted for planning
- Decision: Prefer named external invitations. Allow optional scoped shared access codes when event convenience justifies reduced attribution.
- Security: Codes must be strongly hashed, expiring, revocable, rotatable, and scoped to one presentation.

## D-007: Supabase recommendation

- Date: 2026-09-18
- Status: accepted for architecture; not provisioned
- Decision: Use Supabase Auth, PostgreSQL, row-level security, and private storage for the first implementation.
- Reason: It provides the smallest integrated secure stack for Google sign-in, explicit roles, versions, invitations, and private assets.

## D-008: Presentation design preservation

- Date: 2026-09-18
- Status: accepted
- Decision: Preserve the existing spatial narrative and refine only the motifs that make parts of the deck feel generated or generic.

## D-009: Anti-AI visual constraints

- Date: 2026-09-18
- Status: accepted
- Decision: Exclude purple and indigo glow effects, decorative meshes, neon rings, symmetric feature-card grids, default Inter or SF Pro display headers, centered dual-button marketing CTAs, tight mechanical spacing, and AI-marketing language.
- Direction: Use greater whitespace, dramatic asymmetry, direct copy, and a high-contrast serif paired with a geometric body face.

## D-010: Fluoroscopy assets

- Date: 2026-09-18
- Status: pending asset
- Decision: Wait for the real fluoroscopy frames. Do not generate or source substitutes.
- Required before publication: asset location, usage rights, de-identification review, and intended sequence.

## D-011: Official logo assets

- Date: 2026-09-18
- Status: accepted for Phase 4
- Decision: Use official horizontal SVG lockups instead of the current reconstructed text-and-symbol treatment.

## D-012: Typography families

- Date: 2026-09-18
- Status: open
- Question: Which licensed high-contrast serif and geometric body family should become the approved presentation pair while remaining coherent with Mosaic's brand system?

## D-013: Remote repository

- Date: 2026-09-18
- Status: accepted
- Decision: Publish the current project to the private GitHub repository `nancy-mosaicintelligence/mosaic-itw-keynote`.

## D-014: Public deployment

- Date: 2026-09-18
- Status: accepted
- Decision: Publish the current presentation as a public Netlify site.
- Scope: The public artifact contains only the generated `dist/index.html`; internal documentation, baselines, comparison captures, and repository metadata remain outside the deployed output.

## D-015: Release source

- Date: 2026-09-18
- Status: accepted
- Decision: Deploy the current Phase 4A root keynote rather than the preserved Phase 3 baseline.
- Integrity: The selected `index.html` has SHA-256 `815abd721ca278d1f5b671f98a56c0344477cf5036a586a0750ebf966ec49616`.
