# Project Status

Last updated: 2026-09-18

## Current state

- Phase 1: complete
- Phase 2: complete
- Phase 3: complete with known baseline failures
- Phase 4A (brand and controls): complete, one item unverified in automation
- Phase 4B (typography pair and the white act): complete
- Phase 4C (navigation, AV lesson, thesis): complete, partly reversed by 4D
- Phase 4D (the review pass: type system, presenter chrome, vessel rail, reversals, chain, close): complete
- Phase 4E: blocked on the fluoroscopy frames
- Phase 5 (structured content): complete for this deck — copy, tokens and stations (D-031); section layout, element roles, inline overrides and the global animation values (D-032); the structural containers' reveals and the two vector assets with source hashes (D-033) — all extracted to a validated document (schema v3) and the deck bound to it with proven parity at every step. Renderer drawings and CSS stay in the deck by design
- Phase 6 (editor MVP): complete for the supported scope — `apps/web` (Next.js) frames the unchanged deck through a versioned bridge; select-and-edit copy, roles, overrides, visibility, timing, section layout, motion values, renderer copy and marks; undo/redo, autosave, preview, named versions with restore/duplicate/preview; file-backed store behind the `Store` interface (D-034)
- Phase 7 (auth, roles, invitations, publication): complete against the local Supabase stack — admission rules, owner/editor/viewer enforced in routes and RLS, named invitations, publication with `/p/[slug]` and station deep links, private uploads; Google itself awaits the hosted project (D-035)
- Phases 8 and 9: planned only

## Inspected

- Complete root keynote source and deployment files
- Original WhatsApp export
- All presentation stations (52 at inspection; 54 since D-024) and 26 beat sections
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

The preserved copy and root baseline both have SHA-256:

`60a128e668c02f7d41df6607c1c773b839ecaf9825acf9b562b8fe952eed7837`

## Phase 4A changes

Changed:

- `index.html`: header now carries the official horizontal lockup at the left (`#brand`), the centred icon and text wordmark are gone; the close uses the same official lockup; `Fullscreen · F` HUD button and `F` key handler; `MARK_AR` matches the official icon; hand-traced `MARK_D` and `WORD_D` removed. 936,282 bytes, 3,070 lines.
- `README.md`: controls table notes the HUD button and `Esc`.

Created:

- `presentations/italian-tech-week/assets/brand/` — `mosaic_logo_white.svg`, `mosaic_logo_fullcolor.svg` (unchanged copies, hashes in its README)
- `presentations/italian-tech-week/comparisons/phase4a/` — matched before/after captures at 1440x810 (all 52 stations), 1366x768, 1280x800, 1512x982 (stations 1, 23, 34, 52), a full-motion close sequence, and `verification-report.json`

Untouched: the immutable baseline (hash still `60a128e6…`) and the Phase 3 screenshot set.

Decisions recorded: D-014 (embed, don't link), D-015 (close animation), D-016 (HUD fullscreen control).

## Phase 4B changes

Changed:

- `index.html`: Hanken Grotesk's four faces replaced by two variable OFL fonts, Fraunces (display) and DM Sans (body), embedded as base64; `--f-display` replaced by `--f-serif` and `--f-body`; `.hero`, `p.huge`, `p.big`, `.qq` and the ×2 numerals move to the serif, everything else to DM Sans with weights remapped (200→300, 300→350); `.hero` measure 19ch→21ch; the white act's paragraph rhythm ×1.5; station 29 recomposed as an asymmetric grid, station 30's count paragraph stepped in, the ×2 chips removed, station 32's measure widened. 1,034,796 bytes, 3,080 lines. Stations, notes, timings, and copy unchanged.
- `docs/DECISIONS.md`: D-017 (type pair, resolves D-012), D-018 (white-act composition).

Created:

- `presentations/italian-tech-week/snapshots/phase4a/` — exact copy of the 4A result, the "before" for this phase
- `presentations/italian-tech-week/comparisons/phase4b/` — matched before/after captures, all 52 stations at all four viewports, plus a full-motion white-act sequence and `verification-report.json`
- `output/typography/` — the font comparison (`sheet.html`, `compare.html`, screenshots, fetched OFL subsets with manifest)

Incident during the phase: the first font fetch pulled latin-ext subsets, so the first comparison and first embed rendered system fallbacks. Detected by a coverage check, corrected, and the pair re-confirmed by the user on real renders (see D-017).

## Phase 4C changes

Changed:

- `index.html`: stations 34–37 recomposed (dominant question, nature-then-engineering on a 12-column grid, one hand-drawn tie line with an orange node, no equals sign or columns); 38–39 lose the chalkboard for an eyebrow, one serif statement and a three-step stair; 41 loses the 01/02/03 columns for a claim-and-reason diagonal; `.vopen`/`.vhero` move to Fraunces; board CSS/JS, duo/moves CSS and the Architects Daughter face removed. Speaker notes for 38 and 39 updated. 1,011,962 bytes, 2,972 lines. Station order, timings and reveal points unchanged; copy changes are punctuation and case only (D-019).
- `docs/DECISIONS.md`: D-019, D-020.

Created:

- `presentations/italian-tech-week/snapshots/phase4b/` — the "before" for this phase
- `presentations/italian-tech-week/comparisons/phase4c/` — matched before/after captures, all 52 stations at four viewports, a full-motion 34–41 sequence, `verification-report.json`

## Phase 4D changes (2026-09-20)

Driven by the user's station-by-station review of the 4C build (D-021).

Changed in `index.html` (1,040,939 bytes, 3,138 lines):

- One type system: mono only for the counter/clock and room annotations; every other label in DM Sans sentence case at reading size; body copy 400 weight, ~18–20px; team labels and chart labels redrawn at ≥13px; pills removed from the organ tags and the therapy list.
- Presenter chrome: plain-word buttons that hide until the mouse moves; counter, chapter, clock at 13px; a fixed-width meter so the rail never moves.
- Vessel rail: the deck's route drawn as a straight, symmetric vessel spanning the bar, one diamond per chapter, a white trace and tip; click or drag to navigate; scaled so the last station is the vessel's end.
- Reversals: 29 (lead-in above, one voice, sequenced), 34 (flush left, sequenced), 38–39 (chalkboard restored from the 4B snapshot, bubbles sequenced), 41 (three stages restored, legible, sequenced).
- 21 as one serif sentence; 46 as a serif crescendo with the earlier lines stepping back; the close lengthened to 9 s in three stages.
- Architects Daughter embedded again.

Created: `snapshots/phase4c/`, `comparisons/phase4d/` (416 matched captures, timestamped close frames, rail and tag-motion stills, `verification-report.json`), `assets/partners/wave-by-vento-w.svg`.

Second review, same day (D-022): the rail redrawn as a straight symmetric vessel spanning the bar; organ tags landing 1.1 s apart with a ring; the Wave by Vento W mark in place of the venue line; the lockup at 30px; the therapies as icon pills arriving in turn; the two questions equal on one line; station 29's lead-in back to a small sans line; the tunnel lines one under the other. File 1,045,522 bytes.

Third pass (D-023, D-024): station 21 as setup-then-point with the point landing large; the chain split into three counter-driven stations (46–48) with wider spacing and compounding fade. The deck is now **54 stations**. Fourth pass (D-025): the chain climbs — each new point takes the centre at full size while the earlier ones move up, shrink and fade; "October 2026, Italy" under the event mark.
Fifth pass (D-026): orange on the nature/engineering headings and questions; larger date line with room under the mark (bar 78px); the penultimate sentence solid until the next step; the C-arm label on the gantry and the C-arm gone at station 16; station 21 split so the point lands on its own step (the deck is now **55 stations**).
Sixth pass (D-027, D-028): the room recedes for the whole run of text and never flickers between stations; the tree drawn thicker and complete at 9; the orange box drops onto "vascular system"; station 18 in sequence; the C-arm label at its leader's end. Inputs and feel (D-029): ease-out steps (480–1900 ms), Tab/Shift+Tab, Backspace, right-click, trackpad/wheel, touch; `?watchdog=off` for automated capture.

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
- Phase 4A: matched before/after captures at all four viewports; computed logo geometry, fills, clear space, and accessible name; keyboard, click, Home, End, Notes, Safe, Present/Explore, fullscreen enter and exit, refresh; active-beat bounds at all four viewports; console, page-error, and request capture; reduced-motion and full-motion close compared

## Passed

- Keynote is self-contained and loads without external runtime assets
- Preserved source matches the root source byte for byte
- Baseline console has no warnings or errors
- Arrow, click, Home, End, Notes, Explore, and Safe Mode interactions work
- The presentation runs at approximately 60 frames per second in the sampled desktop baseline
- Reduced-motion behavior is present
- All active beats remained within viewport bounds in the tested sizes
- Phase 4A: header and final lockup render at the official 3.640 aspect ratio, icon left of wordmark, white on dark and full colour on the white stage, with clear space above one icon width
- Phase 4A: `F` and the HUD button enter fullscreen from a user gesture and the button state follows `fullscreenchange`
- Phase 4A: every navigation control listed above still works; refresh returns to station 1; zero page errors and zero failed requests

## Failed

- Direct station links do not exist (unchanged, outside Phase 4)

## Passed in Phase 4D

- 54 of 54 automated checks on the final file (`96e32502…`, 1,053,118 bytes, 55 stations): 53 in one clean full run plus the station-18 pill check re-run in isolation after its expected sequence was updated to D-027's (the deck was right; the expectation was stale). Matched captures before (52 stations, 4C snapshot) and after (55) at four viewports., covering rail click/drag/End mapping, chrome auto-hide, every reversal, the climbing chain across 46–48, station 21's setup-then-point, the close timeline, the header mark and date line in both motion modes, and the tag landing sequence; matched captures before (52 stations) and after (54) at four viewports
- No beat overflow or text clipping at any of the four viewports across all 52 stations

## Passed in Phase 4C

- All 4C composition checks (34, 37, 39, 41), role resolution, removals confirmed
- No beat overflow or text clipping at any of the four viewports across all 52 stations
- All controls, refresh, console, and requests clean; 25 of 26 automated checks, the 26th a threshold artefact documented in the acceptance table

## Passed in Phase 4B

- Embedded fonts cover ASCII, weight axes vary, roles resolve to the intended faces
- No beat overflow or text clipping at any of the four viewports across all 52 stations
- All controls, refresh, console, and requests clean; 24 of 24 automated checks

## Unverified after Phases 4A–4D

- Canvas-drawn team labels (31–32) are confirmed by capture, not by automation.

- `Esc` leaving fullscreen: headless Chromium cannot deliver the browser-native Escape, so only the API exit path was checked. Press `F` then `Esc` in a real browser once.
- Sharpness at projector scale was checked by geometry (vector SVG at the source ratio), not on a projector.
- The only console message in the automated run was a Chromium GL driver performance notice caused by the screenshot ReadPixels; it reproduced on the untouched baseline and is not a page defect.

## Blocked or unverified

- Real fluoroscopy frames, rights, and de-identification
- Exact approved serif and geometric font families and licenses
- Production auth and role enforcement
- External invitation and access-code behavior
- Draft persistence and version history
- Clean-checkout install and production application build
- Deployed production behavior

## Current risks

- The source remains a tightly coupled single-file application.
- Clinical and market claims lack citations in the current deck.
- The weakest narrative section depends on fluoroscopy media that has not arrived.
- A typography change can materially alter wrapping and timing.
- Invite-only access cannot be enforced by the current static host configuration.
- The motion-reference directory contains missing assets and cannot serve as a production dependency.

## Phase 5 step 1 (2026-09-20)

- `packages/presentation-core/` (schema, validator, migration, hash, runs renderer; zero dependencies; `node --test`)
- `presentations/italian-tech-week/content/presentation.json` (+ `bindings.json`), embedded in `index.html`; `applyContent()` renders copy, tokens and stations from it
- `tools/extract-content.mjs`, `tools/embed-content.mjs`, `tools/check-parity.mjs`; `snapshots/phase4d/` is the parity reference
- Parity: re-extraction identical; all 55 stations identical to the snapshot; the full behavioural verification (54 checks) passes on the bound deck (`6da5ba48…`, 1,072,869 bytes); `node --test` 11/11

## Phase 5 step 2 (2026-09-20)

- Schema v2 (`layout`, `role`, `style`, `animation`; migration 1→2 = version stamp); validator range- and allow-list checks; 13 unit tests
- `presentation.json` now carries the layout of 26 sections, 48 element roles, 11 sets of inline overrides and the six animation values (content `7135615b29db`); `applyContent()` applies them and the reveal loop, easing and tween read `ANIM.*`
- `tools/check-parity.mjs` gained a layout signature; `tools/check-binding.mjs` is the mutation proof
- Parity: re-extraction identical; layout signature and all 55 stations identical to `snapshots/phase4d/`; the full behavioural verification (54 checks) passes on the step-2 deck (`ed7ab81e…`, 1,077,138 bytes); `node --test` 13/13

## Phase 5 step 3 (2026-09-20)

- Schema v3: `group` elements (containers with their own reveal) and `assets` (`svg-paths` with viewBox, path data and hashed source files); migration 2→3 = version stamp; 15 unit tests, one of which checks the document's assets against the brand files on disk
- `presentation.json`: 11 groups (10 with reveals), 2 assets, 70 elements, 68 bindings (content `c7fc141655dc`); the lockup and event-mark geometry left the script for the document (`applyContent()` and the `LOGO_*` constants read it)
- Parity: re-extraction identical; layout signature (now including both marks) and all 55 stations identical to `snapshots/phase4d/`; `check-binding` covers group reveals and assets; the full behavioural verification (54 checks) passes on the step-3 deck (`890e30bc…`, 1,079,487 bytes); `node --test` 15/15

## Phase 6 (2026-09-21)

- `apps/web/` — Next.js 15 + TypeScript, pnpm workspace; `pnpm dev` then http://localhost:3000 → the editor. Data in `apps/web/data/` (ignored); `ITW_DATA_DIR` points it elsewhere
- The deck: editor bridge v1 (inert unframed) and schema v4 `hidden`; `1,085,778` bytes, `e6c772a5…`; parity and 54/54 behavioural checks re-proven
- `packages/presentation-core`: `history.js` (commands, undo/redo, coalescing), self-contained SHA-256, `safeCss()`; 21 unit tests
- `apps/web/tests/e2e/editor.test.mjs`: 10 browser tests, all passing (`pnpm test:e2e` with `PW_EXEC`/`PW_MODULES` set)
- Not in the MVP: adding/removing stations or elements, raster media, authentication (Phase 7)

## Phase 7 (2026-09-21)

- `supabase/` — config and the initial migration (tables, trigger, `has_role()`, RLS, private `assets` bucket); local stack via `supabase start` (Docker/colima)
- `apps/web`: middleware session gate; `lib/auth/` (session, admission, bootstrap, roles, members, invitations); `lib/store-supabase.ts` behind the same `Store` interface; sign-in, callback, sign-out, no-access, `/invite/[token]`, `/p/[slug]`, people page; publication API; the editor knows the role
- The deck: `#s=<n>` deep link (read, clamped, never written); document at schema v5 (`cb9da1dbf67d`); `2fcec3ce…`, 1086036 bytes; parity re-proven, 54/54 behavioural checks
- Tests: 21 unit; 17 browser (access 7, editor 10) against the local stack
- Pending for the hosted project: create it, apply the migration, configure Google (client id/secret in Google Cloud and the Supabase dashboard), set the environment; then Phase 8/9 verify Google sign-in on the deployed system

## The platform (branch `platform`)

- Step 1 (2026-09-21, D-037): filmstrip with live text cards, arrows and keys; typing on the stage with a floating toolbar (marks, size, alignment, colour); 4 browser tests; deck parity and 54/54 re-proven
- Step 2 (2026-09-21, D-038): home = the library; three kinds (editable deck, static HTML in a CSP sandbox, link); create from the engine's template; import by file or link; archive; 5 browser tests; migration `20260921100000_library.sql` applied locally and to the hosted project
- Step 3 (2026-09-21, D-039): images — schema v6 `image` element and asset; the deck renders crop/turn/flip/filters from data; private `images` bucket and `/img/` route; Images tab, crop box, sliders; 3 browser tests; migration `20260921120000_images.sql` applied locally and hosted
- Step 4 (2026-09-21, D-040): the composer — a plain scene on the engine, document-created sections and elements, schema v7, ten beats with re-spacing, station tools (add from the picker, move, remove), "New presentation" composes; 5 browser tests, 4 unit tests
- Step 5 (2026-09-21, D-041): the Slides-like layer — free text and image boxes, drag to move, corner handles to resize, nudged flow lines, drag-and-drop from the library and from files, image boxes (the fluoroscopy frames among them) filled by click or drop, every on-page renderer copy typed in place, the bar (Save, Undo, Redo, History, Present, Publish, Share); schema v8; 7 browser tests
- Next: Phase 8 (build, host, deploy) once the host is chosen; then Phase 9 on the deployed system

## Deployment (2026-09-21)

- Original: `main` → https://mosaic-ventowave2026keynote.netlify.app (untouched since the start)
- Clean presentation deck: branch `v2`, tag `presentation-clean-2026-09-21` → https://mosaic-ventowave2026keynote-v2.netlify.app — **frozen** (D-036); snapshot in `snapshots/frozen-v2/`
- Platform: branch `platform` (from the same commit) — the app, deployed in Phase 8 to a host of the user's choice; it serves the deck itself

## Next recommended work

Walk the whole deck once in a real browser with the projector in mind (fullscreen, `Esc`, the rail under a mouse, the 9 s close). Then either Phase 4E when the fluoroscopy frames arrive, or Phase 5 (the structured content schema) — the 4D review also surfaced that the copy still carries the unsupported claims listed in the design audit, which a copy pass should settle before publication.

