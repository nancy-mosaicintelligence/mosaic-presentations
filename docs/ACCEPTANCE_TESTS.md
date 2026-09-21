# Acceptance Tests

## Test status legend

- `PASS`: observed in the current baseline
- `FAIL`: tested and not working
- `UNVERIFIED`: not yet tested or not yet implemented
- `BLOCKED`: requires a missing user asset or external service

## Phase 2 specification

| Test | Status | Evidence |
|---|---|---|
| Required repository guidance exists | PASS | `AGENTS.md` |
| Product scope and roles are defined | PASS | `docs/PRODUCT_SPEC.md` |
| Progressive-refactor architecture is documented | PASS | `docs/ARCHITECTURE.md` |
| Design audit includes anti-AI constraints | PASS | `docs/DESIGN_AUDIT.md` |
| Every future phase has acceptance criteria | PASS | `docs/IMPLEMENTATION_PLAN.md` |
| Material decisions and open items are recorded | PASS | `docs/DECISIONS.md` |
| Current work and verification are recorded | PASS | `docs/STATUS.md` |

## Phase 3 preserved baseline

Baseline viewport: `1440x810`, device scale factor 1, Chromium.

| Test | Status | Expected result |
|---|---|---|
| Untouched reference exists | PASS | Reference hash matches root baseline hash |
| Root presentation loads locally | PASS | Opening station renders without network dependency |
| Required runtime assets load | PASS | No missing runtime requests or console errors |
| Arrow Right advances | PASS | Station increments by one |
| Arrow Left reverses | PASS | Station decrements by one |
| Space, Enter, Page keys work | PASS | Supported forward and backward behavior is preserved |
| Click advances | PASS | General canvas click increments the station |
| Home and End work | PASS | Navigation reaches first and last station |
| Notes toggle works | PASS | Notes panel opens and closes with `N` |
| Explore mode works | PASS | `M` changes between Present and Explore |
| Safe Mode works | PASS | `S` disables 3D while retaining text |
| Fullscreen shortcut works | FAIL | README documents `F`, but no fullscreen handler exists |
| Refresh is stable | PASS | Refresh returns to station 1 without corrupt state |
| Direct station links work | FAIL | No hash or query deep-link implementation exists |
| Reduced motion works | PASS | Animation progress jumps without long interpolation |
| All 52 stations have baseline screenshots | PASS | `presentations/italian-tech-week/baseline/screenshots/1440x810/` |
| Real fluoroscopy media loads | BLOCKED | User will provide approved frames later |

## Phase 4A brand and controls

Verified 2026-09-18 on the root `index.html` with Playwright Chromium 151, viewport 1440x810 unless stated. Evidence: `presentations/italian-tech-week/comparisons/phase4a/`.

| Test | Status | Evidence |
|---|---|---|
| Immutable baseline hash unchanged | PASS | `60a128e6…` before and after |
| Header uses official lockup, icon left of wordmark, source aspect ratio | PASS | rendered 3.640 vs 3.640; 72.8x20 px |
| Header lockup white on dark, full colour on white stage | PASS | station 1 and 34 computed fills |
| Header clear space at least one icon width | PASS | 56 px left, 18 px top, icon 16 px |
| Final lockup is the official horizontal lockup, centred, in view, aspect 3.640 | PASS | station 52 at all four viewports |
| Crowd still resolves into the mark, then completes the lockup | PASS | `close-sequence/` frames |
| Arrow, Space, Enter, Page keys, Home, End | PASS | station counter checks |
| General click advances | PASS | |
| `N`, `S`, `M` toggles | PASS | |
| `F` enters fullscreen from a key gesture; HUD button toggles without advancing | PASS | `fullscreenElement` and `aria-pressed` |
| `fullscreenchange` repaints the HUD button on exit | PASS | exit via API |
| `Esc` exits fullscreen (browser-native) | UNVERIFIED | headless Chromium cannot deliver a native Escape; verify by hand |
| Refresh returns to station 1 | PASS | |
| Active beat within viewport at 1440x810 (1–52), 1366x768, 1280x800, 1512x982 (1, 23, 34, 52) | PASS | bounding-box check |
| Safe Mode still shows the close | PASS | `station-52-safe-mode.png` |
| Reduced-motion settled captures match full-motion settled state | PASS | `close-sequence/settled.png` |
| Zero page errors, zero failed requests | PASS | `verification-report.json` |
| Zero console warnings | PASS with note | the only message was a Chromium GL driver notice raised by the screenshot ReadPixels, reproduced on the untouched baseline |
| Direct station links | FAIL | unchanged; not in Phase 4A scope |
| Real fluoroscopy media | BLOCKED | unchanged |

## Phase 4B typography and the white act

Verified 2026-09-18 on the root `index.html` with Playwright Chromium 151. Evidence: `presentations/italian-tech-week/comparisons/phase4b/`.

| Test | Status | Evidence |
|---|---|---|
| Immutable baseline and Phase 4A snapshot hashes unchanged | PASS | `60a128e6…`, `815abd72…` |
| Embedded faces: Fraunces, DM Sans, IBM Plex Mono, Architects Daughter; Hanken removed | PASS | `document.fonts` |
| Embedded fonts cover all of ASCII (not a partial subset) | PASS | cmap parse of the WOFF2 payloads; width probe distinct from Georgia/Times/Helvetica |
| Weight axes live (DM Sans 300 < 350 < 500; Fraunces 300 < 400 < 500) | PASS | rendered widths 369/373/386 and 403/418/426 px |
| Roles: hero, huge, big, qq in the serif; body, lede, running copy in DM Sans; HUD mono; chalk untouched | PASS | computed styles |
| ×2 multipliers are bare serif numerals, no chip | PASS | computed border/radius |
| Station 29: setup line right of centre above a left-anchored statement | PASS | element rects |
| Station 32: phrase sets in three lines, hyphen intact | PASS | client rects |
| Active beat within viewport and no clipped text, stations 1–52, at 1440x810, 1366x768, 1280x800, 1512x982 | PASS | bounding-box and scrollWidth checks |
| Arrow, click, Home, End, N, S, M, F, refresh | PASS | |
| Full-motion white act (29–33) captured and settles as reduced motion does | PASS | `white-act-motion/` |
| Zero page errors, warnings, or failed requests | PASS | `verification-report.json` |
| Matched before/after captures, all 52 stations, four viewports | PASS | 416 PNGs |
| `Esc` leaves fullscreen (browser-native) | UNVERIFIED | still needs one real keypress; unchanged from 4A |
| Direct station links | FAIL | unchanged; not in scope |
| Real fluoroscopy media | BLOCKED | unchanged |

## Phase 4C navigation, AV lesson, thesis

Verified 2026-09-18 on the root `index.html` with Playwright Chromium 151. Evidence: `presentations/italian-tech-week/comparisons/phase4c/`.

| Test | Status | Evidence |
|---|---|---|
| Immutable baseline and Phase 4B snapshot hashes unchanged | PASS | `60a128e6…`, `c0b75b99…` |
| Board, bubbles, equals sign, duo and moves markup gone; Architects Daughter no longer embedded | PASS | DOM query, `document.fonts` |
| Roles: questions, sense headings, AV statement, vessel statements in Fraunces; running copy in DM Sans; eyebrow mono; chain unchanged | PASS | computed styles |
| 34: dominant question ≥1.6× the second, which is indented and below it | PASS | element rects (66 px vs 33 px) |
| 37: engineering lower and right of nature, tie line (2 paths) and node drawn, 6 + 6 icons, everything inside the viewport | PASS | element rects |
| 37: engineering block and tie revealed | PASS with note | settles at opacity 0.972, identical to the 4B snapshot's `=`/engineering column, because `data-p` equals the station's progress and the reveal ramp ends at p+.002; pre-existing convention, not a regression |
| 39: three steps descend as a stair, offset right of the statement; statement in 4 lines | PASS | element rects |
| 41: claim top-left, reason bottom-right, no numbered columns, copy intact including the flagged claim | PASS | element rects, text check |
| Active beat within viewport and no clipped text, stations 1–52, four viewports | PASS | bounding-box and scrollWidth checks |
| Arrow, click, Home, End, N, S, M, F, refresh | PASS | |
| Full-motion run 34–41 captured | PASS | `nav-av-motion/` |
| Zero page errors, warnings, or failed requests | PASS | `verification-report.json` |
| Matched before/after captures, all 52 stations, four viewports | PASS | 416 PNGs |
| `Esc` leaves fullscreen (browser-native) | UNVERIFIED | unchanged from 4A |
| Direct station links | FAIL | unchanged; not in scope |
| Real fluoroscopy media | BLOCKED | unchanged |

## Phase 4D review pass, presenter chrome, vessel rail

Verified 2026-09-20 on the root `index.html` with Playwright Chromium 151. Evidence: `presentations/italian-tech-week/comparisons/phase4d/`.

| Test | Status | Evidence |
|---|---|---|
| Immutable baseline and Phase 4C snapshot hashes unchanged | PASS | `60a128e6…`, `44287e60…` |
| Mono/uppercase only for instrumentation: venue, cue, email, icon captions, organ tags, therapy list, chapter, buttons in DM Sans sentence case; counter and room annotations mono | PASS | computed styles |
| Body copy ≥18px, white-act copy ≥20px, captions ≥13px at 1440 | PASS | computed sizes |
| Buttons hidden at rest, no pills or borders, plain words; appear on mouse movement, hide after ~2 s | PASS | computed opacity over time |
| Vessel rail: straight symmetric vessel spanning the bar, 13 chapter nodes, one current, tip and ring, old tick strip gone | PASS | DOM; crops in `comparisons/phase4d/rail/` |
| Rail navigation: last node → Close chapter (50); End → tip at the vessel's end (0.99); a drag to the middle lands on station 23 and the rail does not move while dragging | PASS | after fixing the meter to a fixed width |
| 29: lead-in above the statement, one edge, both serif, statement revealed second | PASS | element rects |
| 34: both questions flush left, second revealed after the first | PASS | element rects |
| 38–39: chalkboard, three bubbles, two arrows, Architects Daughter restored; bubbles sequenced 0 / 1.4 / 2.8 | PASS | DOM |
| 41: three columns, serif stage numbers 26px, column text 19px, stages 02–03 revealed in turn | PASS | element rects |
| 21: setup (30px, weight 300) then the point (56px, weight 400) landing ~1.5 s after the vessel settles; setup steps back to 0.5; no mono caption | PASS | in-page timestamps, computed styles (D-023) |
| 46–48: each new point takes the centre at full size (63px); earlier points climb, shrink and fade — 47: 48px/.57 above 63px/.97; 48: 37px/.32, 48px/.57, 63px/.97 — no overlaps, nothing under the header | PASS | element rects per station (D-024, D-025) |
| Close: sentence solid at its own station, gone by 2.5 s of the close; mark solid 5.4 s, held orange until 7.6 s, wordmark done 8.4 s | PASS | in-page timestamps (D-026 §3 moved the sentence's exit later by design) |
| Second review (D-022, D-025): header carries the Wave by Vento W mark (2 paths, 24px) turning at 7 s/turn, still under reduced motion, with "October 2026, Italy" beneath; lockup 30px | PASS | computed styles in both motion modes |
| 16–17: four organ tags land one by one, 1.1 s apart, each with a landing ring | PASS | in-page timestamps: arrivals 2.6 / 3.7 / 4.8 / 5.9 s; `tags-motion/` still |
| 18: five therapy pills with icons, sequenced 0–4, 18px | PASS | DOM |
| 29: small DM Sans lead-in (22px) above the serif statement | PASS | computed styles |
| 34: both questions the same size (56px) on one line, second revealed | PASS | element rects |
| 24–28: four tunnel lines each on its own line, current line orange, 23px | PASS | client rects |
| Fifth review (D-026): orange questions and column headings on 35–38; C-arm label on the gantry and C-arm gone at 16; 21 setup alone then 22 point lands with the setup shrunk and dimmed to 0.5; 54 solid until the next step; date line 18px under the mark | PASS | computed styles and rects per station |
| Sixth review (D-027, D-028): room drawings and labels ≤0.15 for the whole in-room text run (8–19, incl. the wordless 15) and never brightening across the 9→10 step in full motion; the tree drawn in three passes and complete at 9; 8→9 orange box absent then landed with the text near-black on it; 17 "vascular system" orange; 18 sentence → pills (1.3–4.5) → orange line (6.4) | PASS | computed styles, in-page samples across the transition |
| Inputs (D-029): Tab / Shift+Tab, Backspace, right-click, wheel (one step per swipe, inertia ignored, reverse) all navigate; a step is under way within 120 ms of a press (rail tip moved 12.7 px) | PASS | station counter and rail geometry |
| Frame-rate guard: headless Chromium renders the room act at 13–18 fps even on the untouched 4C snapshot, so automated runs use `?watchdog=off`; the guard is unchanged for presenters | NOTE | measured fps at stations 3/8/9/13 on three builds |
| Active beat within viewport and no clipped text, stations 1–55, four viewports | PASS | bounding-box and scrollWidth checks |
| Arrow, click, Home, End (55), N, S, M, F, refresh | PASS | |
| Zero page errors, warnings, or failed requests | PASS | `verification-report.json` |
| Matched before/after captures at four viewports (before: 52 stations of the 4C snapshot; after: 54) | PASS | re-captured after each review fix |
| `Esc` leaves fullscreen (browser-native) | UNVERIFIED | unchanged since 4A |
| Team labels on the canvas are DM Sans at ≥13px | UNVERIFIED by automation | canvas text cannot be queried; confirmed in captures of 31–32 |
| Direct station links via URL | FAIL | unchanged; the rail now gives direct navigation in-session, but no hash/URL scheme yet |
| Real fluoroscopy media | BLOCKED | unchanged |

## Phase 4 design refinement

Each visual change group must pass:

- Before and after captures use the same station and viewport.
- Official logo SVG remains sharp and correctly proportioned.
- No text or active beat crosses the viewport bounds at 1440x810, 1366x768, 1280x800, or 1512x982.
- Arrow, click, Home, End, Notes, Explore, and Safe Mode behavior remains intact.
- Fullscreen enters and exits through the visible control and keyboard shortcut.
- No new console error or failed request appears.
- Motion timing remains intentional at full and reduced motion.
- The change removes a documented problem without introducing generic card, pill, glow, or mesh styling.
- Copy changes preserve factual meaning and flag unsupported claims.

Fluoroscopy integration additionally requires:

- Approved original frames
- Confirmed usage rights
- Confirmed de-identification or patient-data handling
- Correct aspect ratio and visible detail at projector size
- Graceful fallback when the media cannot load

## Phase 5 content architecture

Step 1 (copy, tokens, stations) verified 2026-09-20. Evidence: `packages/presentation-core/test/`, `tools/check-parity.mjs`, D-031.
Step 2 (layout, roles, inline overrides, animation) verified 2026-09-20. Evidence: the same tests (13), `tools/check-parity.mjs` (layout signature + 55 stations), `tools/check-binding.mjs`, D-032.
Step 3 (group reveals, assets) verified 2026-09-20. Evidence: the same tests (15), `tools/check-parity.mjs` (layout signature incl. both marks + 55 stations), `tools/check-binding.mjs`, D-033.

| Test | Status | Evidence |
|---|---|---|
| A versioned schema validates the Italian Tech Week presentation | PASS | `presentation.json` (schema 1, 27 sections, 59 elements, 55 stations) passes `validate()` with no errors |
| Invalid element types and unsupported properties are rejected | PASS | unit tests: unknown type, unknown fields at document/element/station/run level, markup in text, unknown marks, icons, scenes and scene parameters, bad tokens, out-of-order or dangling stations |
| Content, tokens, layout, animation, assets and renderer code remain separate | PASS | copy, tokens and stations (step 1), section layout, element roles and inline overrides, and the global animation values (step 2), the structural containers' reveals and the two vector assets with their source hashes (step 3) are in the document; the renderer's drawings and the CSS stay in the deck by design (D-033) |
| Structured-data output matches approved baseline states | PASS | re-extracting the bound deck reproduces the document byte for byte; `check-parity` finds all 55 stations identical to the pre-binding snapshot (`snapshots/phase4d/`) |
| Schema migrations are deterministic and covered by tests | PASS | `migrate()` identity at v1, refuses future/unknown versions, returns a copy; unit-tested |
| Custom scenes accept validated parameters without accepting arbitrary code | PASS | scenes are references with closed parameter lists; a `code` parameter is rejected in tests |
| The deck's embedded `renderRuns` equals the package's reference implementation | PASS | unit test compares the two texts |
| Deck behaviour unchanged after binding | PASS | full verification run on the bound deck (see Phase 4D table; same checks) |

Step 2 additions:

| Test | Status | Evidence |
|---|---|---|
| Layout, role, style and animation fields validate and are allow-listed | PASS | unit test: an unknown variant, a `url()` in a width, an unknown box, an unknown role, a `background` override, a `url(javascript:)` colour, an out-of-range ease and step, and an unknown animation key are each rejected at their path |
| A v1 document migrates to v2 deterministically and still validates | PASS | unit test: two runs equal, only `schemaVersion` differs, the result validates |
| Layout unchanged after binding | PASS | `check-parity` layout signature identical to `snapshots/phase4d/`: every section's class list, exit progress and box, every bound element's class list and computed family, weight, size, measure, margins, alignment, leading and colour |
| Every station unchanged after binding | PASS | `check-parity`: 55 of 55 identical |
| Re-extraction reproduces the document | PASS | extracting from the bound deck yields the same document byte for byte (24,166 characters) |
| The values are read from the document, not the markup | PASS | `check-binding`: a mutated variant, exit progress, box width, role, colour, measure, removed overrides and a 3 s reveal spacing each reach the page; the control deck is unchanged |
| Deck behaviour unchanged after step 2 | PASS | full verification run on the step-2 deck: 54 of 54 checks (rail, chrome, reversals, chain, station 21, close, header, tags, bounds and clipping at four viewports, console and requests clean) |

Step 3 additions:

| Test | Status | Evidence |
|---|---|---|
| Group elements and assets validate and are allow-listed | PASS | unit test: a `<` in path data, a malformed hash, a `..` source path, an unknown asset kind/id, and copy on a group are each rejected at their path |
| A v1 and a v2 document migrate to v3 deterministically and validate | PASS | unit test |
| Assets are the geometry of the brand files, hashes included | PASS | unit test reads `assets/brand/mosaic_logo_white.svg`, `mosaic_logo_fullcolor.svg` and `assets/partners/wave-by-vento-w.svg`, compares SHA-256, viewBox and every `d` attribute with the document |
| Layout and marks unchanged after binding | PASS | `check-parity` layout signature (sections, 68 bound elements, both marks' viewBox and path data) identical to `snapshots/phase4d/` |
| Every station unchanged after binding | PASS | `check-parity`: 55 of 55 identical |
| Re-extraction reproduces the document | PASS | byte for byte (63,431 characters) |
| Group reveals and assets are read from the document | PASS | `check-binding`: a mutated group reveal (`p`/`seq`) and both assets' viewBoxes reach the page; the control is unchanged |
| Deck behaviour unchanged after step 3 | PASS | full verification run on the step-3 deck: 54 of 54 checks, including the header lockup and event-mark geometry checks from Phase 4A/4D |

## Phase 6 editor MVP

- Authorized editors can select and edit supported text.
- Typography, alignment, spacing, visibility, asset, and supported animation controls update the draft.
- Undo and redo cover all supported editing commands.
- Autosave protects the working draft without creating named versions.
- Preview hides editor controls and returns without data loss.
- A named version stores a complete immutable snapshot.
- Prior versions can be previewed, duplicated, and restored.
- Restoration retains versions created after the restored version.

## Phase 7 authentication and permissions

- Google sign-in accepts the approved company domain path.
- Domain membership alone does not grant editor access.
- Owners can assign and revoke roles.
- Viewers cannot enter editor routes.
- Viewers and unauthenticated users receive denied responses from write APIs.
- Private draft, history, administrative, and asset requests require authorization.
- External invitations are individually revocable.
- Shared access codes, if enabled, are hashed, scoped, expiring, and rotatable.
- Security boundaries have browser-based end-to-end coverage.

## Phase 8 build and deployment readiness

- A clean checkout installs from documented commands.
- Production build succeeds.
- `.env.example` contains names and setup guidance without secrets.
- Database migrations and owner bootstrap are reproducible.
- `.gitignore` excludes credentials, private local files, uploads, reports, and build output.
- Rollback and health-check procedures are documented.
- No remote repository or deployment occurs without approval.

## Phase 9 production verification

Production cannot be marked complete until the deployed URL has been opened and the following are verified on the deployed system:

- Company authentication and domain restriction
- Owner, editor, viewer, external, and unauthorized access paths
- Editing, autosave, preview, version creation, duplication, and restoration
- Asset upload and protected retrieval
- Presentation navigation, fullscreen, refresh, and direct links
- Supported viewport behavior
- Primary workflows without console errors

