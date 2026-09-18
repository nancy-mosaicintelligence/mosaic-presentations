# Project Status

Last updated: 2026-09-18

## Current state

- Phase 1: complete
- Phase 2: complete
- Phase 3: complete with known baseline failures
- Phase 4A: complete and verified (official logo integration and fullscreen controls)
- Phases 5 through 9: planned only
- GitHub and Netlify release: in progress

## Inspected

- Complete root keynote source and deployment files
- Original WhatsApp export
- All 52 presentation stations and 26 beat sections
- Brand visual and voice guides
- Sixteen official Mosaic SVG and PNG assets
- Code motion references and their missing dependencies
- Anvil design references
- Current keyboard, click, notes, modes, refresh, reduced-motion, WebGL, and responsive behavior

## Phase 2 changes

Created:

- `AGENTS.md`
- `docs/PRODUCT_SPEC.md`
- `docs/DESIGN_AUDIT.md`
- `docs/ARCHITECTURE.md`
- `docs/ACCEPTANCE_TESTS.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/DECISIONS.md`
- `docs/STATUS.md`

Recorded:

- Approved domain: `mosaicintelligence.xyz`
- Invite-only access
- Preserve-first visual direction
- Explicit anti-AI design constraints
- Real fluoroscopy frames pending
- Progressive wrapper architecture
- Supabase recommendation

## Phase 3 changes

Created:

- `presentations/italian-tech-week/baseline/original/index.html`
- `presentations/italian-tech-week/baseline/README.md`
- Complete 1440x810 screenshot set under `presentations/italian-tech-week/baseline/screenshots/1440x810/`

The preserved copy has SHA-256:

`60a128e668c02f7d41df6607c1c773b839ecaf9825acf9b562b8fe952eed7837`

The current Phase 4A keynote selected for release has SHA-256:

`815abd721ca278d1f5b671f98a56c0344477cf5036a586a0750ebf966ec49616`

## Phase 4A changes

- Replaced reconstructed wordmark treatments with official horizontal Mosaic SVG artwork.
- Added a visible `Fullscreen · F` control and implemented the `F` keyboard shortcut.
- Preserved presentation motion, navigation, safe mode, notes, and view-mode behavior.
- Added matched before-and-after captures and a machine-readable verification report under `presentations/italian-tech-week/comparisons/phase4a/`.

## Verification performed

- Byte comparison of root and preserved keynote
- Local static-server load
- Console and network inspection
- Keyboard navigation
- Click navigation
- Notes, Present and Explore, Safe Mode, Home, and End controls
- Refresh behavior
- Reduced-motion behavior
- All-station screenshot capture at 1440x810
- Active-beat viewport-bound checks at 1440x810, 1366x768, 1280x800, and 1512x982 during Phase 1

## Passed

- Keynote is self-contained and loads without external runtime assets
- Preserved source matches the root source byte for byte
- Baseline console has no warnings or errors
- Arrow, click, Home, End, Notes, Explore, and Safe Mode interactions work
- The presentation runs at approximately 60 frames per second in the sampled desktop baseline
- Reduced-motion behavior is present
- All active beats remained within viewport bounds in the tested sizes

## Failed

- Direct station links do not exist.

## Blocked or unverified

- Real fluoroscopy frames, rights, and de-identification
- Exact approved serif and geometric font families and licenses
- Production auth and role enforcement
- External invitation and access-code behavior
- Draft persistence and version history
- Clean-checkout install and production application build
- Deployed production behavior
- Native `Escape` exit from fullscreen could not be asserted in the headless verification environment.

## Current risks

- The source remains a tightly coupled single-file application.
- Clinical and market claims lack citations in the current deck.
- The weakest narrative section depends on fluoroscopy media that has not arrived.
- A typography change can materially alter wrapping and timing.
- Invite-only access cannot be enforced by the current static host configuration.
- The motion-reference directory contains missing assets and cannot serve as a production dependency.

## Next recommended work

Publish the current Phase 4A build, verify the live production URL, and then defer larger visual or architectural changes until the approved typography and real fluoroscopy assets are available.
