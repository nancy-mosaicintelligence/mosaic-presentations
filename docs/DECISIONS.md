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
- Status: open
- Question: Confirm the private repository name and hosting account before any remote repository is created.


## D-014: Official lockup embedded, not linked

- Date: 2026-09-18
- Status: accepted (Phase 4A)
- Decision: The two official lockups (`mosaic_logo_white.svg`, `mosaic_logo_fullcolor.svg`) are copied unchanged into `presentations/italian-tech-week/assets/brand/`, and their path data and viewBox are embedded verbatim in `index.html` as `LOGO_VB`, `LOGO_ICON_D`, and `LOGO_WORD_D`. One `lockup()` helper builds the header and closing marks from the same two paths.
- Reason: The keynote's promise is one self-contained file that runs from a double-click with no requests. Embedding keeps that promise and the runtime-request check while still using the official geometry. Colour is applied per surface (white on the dark stage, full colour on the white stage) so each surface matches the official file it stands in for.
- Consequence: If the brand library changes, the path strings must be re-extracted; the asset README records the source hashes.

## D-015: The close keeps the crowd-to-mark moment, then completes the lockup

- Date: 2026-09-18
- Status: accepted (Phase 4A)
- Decision: The crowd still resolves into the icon at screen centre, in orange, exactly as before. Over the last tenth of the settle (`crowdSettle` .90 → 1.0) the wordmark fades in, the icon's fill interpolates from `#FC6452` to white, and the pair glides left by half the wordmark's width so the official white-on-dark horizontal lockup lands centred. Reduced motion jumps to the settled state as it does for every other progress-driven value.
- Alternatives rejected: keeping an orange icon beside a white wordmark (not an official variant); converging the crowd directly to the icon's off-centre final position (weakens the centred resolution the deck was built around).
- Consequence: At the settled station 52 the mark is the official white lockup; the orange is now a moment in the motion rather than the end state.

## D-016: Fullscreen control in the HUD

- Date: 2026-09-18
- Status: accepted (Phase 4A)
- Decision: `F` toggles fullscreen on `document.documentElement`, with the WebKit-prefixed API as fallback, and a fourth HUD button `Fullscreen · F` sits beside the existing `Safe`, `Notes`, and `Present` buttons in the same style. The button hides itself when the browser reports fullscreen unavailable. Exit is the browser's own `Esc`; a `fullscreenchange` listener keeps the button's pressed state honest either way.
- Reason: The README already promised `F`. A visible control was added because presenters on an unfamiliar machine need to find fullscreen without remembering a key, and the existing HUD vocabulary already had a slot for it; nothing new was styled.

## D-017: Typography pair — Fraunces display, DM Sans body (resolves D-012)

- Date: 2026-09-18
- Status: accepted (Phase 4B), chosen by the user from a rendered comparison
- Decision: The display voice (`.hero`, `p.huge`, `p.big`, `.qq`, and the ×2 numerals) is Fraunces, a high-contrast serif with weight and optical-size axes, at 300 light / 400 strong, tracking −.012em. The body voice is DM Sans, a geometric sans with its own optical-size axis, at 350 for running copy (where Hanken Grotesk sat at 300), 300 where Hanken sat at 200, and 400/500 for emphasis. IBM Plex Mono (labels, HUD) and Architects Daughter (chalk, until 4C) are unchanged.
- Licensing: both families are SIL Open Font License 1.1, which permits embedding in the self-contained file and redistribution. One variable WOFF2 per family (latin subset) is embedded as base64, declared `font-weight:300 500`; Hanken Grotesk's four faces are removed. Net file growth ≈ 98 KB (936,282 → 1,034,796 bytes). Source URLs and byte sizes are in `output/typography/fonts/manifest.json`.
- Verification note: the first fetch pulled the latin-ext subsets by mistake (the CSS API's subset comment precedes its block, and the parser attached it to the previous one), so the first comparison sheet and the first embed rendered system fallbacks (Georgia/Helvetica Neue) with only a handful of glyphs from the real fonts. Caught by a width probe against Georgia/Times/Helvetica and a cmap check; refetched, coverage proven (ASCII complete), comparison rebuilt, and the pair re-confirmed by the user on the real renders. Any future font embed must repeat the coverage check before capture.
- Alternatives shown: Bodoni Moda + Manrope (hairlines too fine for an 810p projector), DM Serif Display + Figtree (one weight, loses the light/strong distinction), Playfair Display + DM Sans (reads as a template default), and Fraunces + Hanken kept as body (zero reflow, but a grotesk rather than the geometric asked for). Instrument Serif was excluded as the current over-used generated-page serif; Neue Haas Grotesk (brand guide) needs a commercial web license that is not held.
- Consequence: `--f-display` is gone; `--f-serif` and `--f-body` replace it. The `.hero` measure widens from 19ch to 21ch so the serif keeps the original three-line breaks on the opening and closing statements. Vessel-act statements (`.vhero`, `.vopen`, `.chain`) stay in DM Sans for now; promoting them to the serif is a 4C/4D question when those sections are recomposed.

## D-018: The white act's composition (stations 29–33)

- Date: 2026-09-18
- Status: accepted (Phase 4B)
- Decision: In the "Difficult to scale" run, spacing between paragraphs on the white stage grows from 14px to 22px (`.beat.lite .mv > p + p`), roughly the 1.5× the brief asked for. Station 29 becomes an asymmetric grid: the setup line hangs top-right in a 26ch measure and the statement lands bottom-left at 22ch. Station 30's second paragraph steps in under the statement by 10% of its column. The ×2 multipliers lose their mono chip (border, radius, padding) and are set as bare Fraunces numerals in orange at 1.3em. Station 32's column widens so "labor-to-output" no longer breaks on its hyphen. Station 33 stays a single centred question: it is the one centred beat in an otherwise left-anchored act, so the centring reads as punctuation rather than formula.
- Reason: The audit named the chips, the even stacking and the tight rhythm as the things that made this act feel generated. The change removes the UI vocabulary and uses type and placement to carry the argument, without touching station order, timing, notes, or copy.
- Out of scope here: navigation and the AV analogy (4C), loop and chain (4D), fluoroscopy (4E).

## D-019: Navigation and the AV lesson recomposed (stations 34–41)

- Date: 2026-09-18
- Status: accepted (Phase 4C)
- Decision:
  - **34–37.** "Where am I?" is the dominant question (Fraunces 400, up to 66px, black); "What's around me?" follows it smaller, lighter and indented. The connecting sentence sits under them in a 44ch measure with the arrow replaced by a full stop. Nature's six senses come first, left; engineering's six answer lower and to the right, on a 12-column grid (nature columns 1–7, engineering 6–12) with no equals sign. One hand-drawn line in the deck's own sketch idiom (`handLine` + `sketch`) runs from under nature's note into engineering's heading and ends in an orange node — the same thin-line-and-node language as the room annotations and the vascular illumination. The mono uppercase captions become short sentences in DM Sans. Reveal points are unchanged (1.555, 1.590, 1.625).
  - **38–39.** The chalkboard is gone: no slate, frame, bubbles, arrows or handwriting face. The lesson is an eyebrow ("Lessons learnt from the autonomous vehicle industry") and one serif statement with "Only then can planning become useful." in orange. The three-step working-out becomes a descending stair of three plain sentences, each with a short rule; the last rule is orange and ends in a node (perceive), tying the sequence to the sensing language rather than a classroom. Reveal point unchanged (1.700). Speaker notes for 38 and 39 updated to describe what is now on screen.
  - **41.** The numbered three-column thesis becomes one diagonal: the claim top-left at 15ch, the reason bottom-right at 34ch as a single paragraph. The copy is the same words joined in the order they were already read; the claim "delivering any therapy to any organ, anywhere" stays orange and stays on the unsupported-claims list (D-008 direction, DESIGN_AUDIT copy section) — it was not strengthened.
- Copy changes, all punctuation or case: "→" between two sentences became a full stop (34–35, 38); "autonomous driving…" capitalised at sentence start (39); "the" added to "Lessons learnt from the autonomous vehicle industry"; a full stop added to "…exactly the same 2 questions."
- Removed: `.duo`, `.eqsign`, `.colhead/.colbody/.colnote`, `.moves/.mv1/.mk`, `.qq/.oneline`, the board CSS, `buildBoard()` and `buildMess()`. `handBox`/`handOval`/`handLine`/`sketch` stay (road icons and the new tie use them).

## D-020: Vessel statements join the serif; the chalk face is removed

- Date: 2026-09-18
- Status: accepted (Phase 4C)
- Decision: `.vopen` and `.vhero` (the vessel-act statements at stations 21–22) move to Fraunces at the same sizes, so every large statement in the deck now shares one display voice. `.chain` (station 46) and the loop labels (`.lp`) stay in DM Sans until 4D recomposes them. Architects Daughter had no remaining user after D-019 and is removed from the embedded faces (file −23 KB; four faces remain: Fraunces, DM Sans, IBM Plex Mono ×2).

## D-021: The review that reset Phase 4D (2026-09-20)

- Status: accepted; supersedes parts of D-018 and D-019
- Context: the user reviewed the 4C build station by station and named what still read as generated: tracked uppercase mono used for words the audience must read; light, small body copy; pill-shaped presenter buttons; captions placed between sentences; placements (a top-right lead-in, an indented second question, a diagonal claim/reason) that had no reading-order logic; team and icon labels too small to read; and a close that resolved in three seconds. Two of the Phase 4C recompositions were rejected outright: the chalkboard is wanted back, and the thesis needs its three stages.
- Decisions:
  1. **One type system, projector-sized.** Mono is instrumentation only: the counter and clock, and the room's object annotations (at 12px). Every other label or caption is DM Sans 400, sentence case, no tracking: venue line, cue, email, icon captions (≥13px), organ tags (no pill), the "they can deliver" list (no pills, dot-separated), chart and figure labels, team labels on the canvas (≥13px at 1440, near-black). Running copy is DM Sans 400 at ~18px base and ~20px in the white act; nothing on white sits in the faint greys.
  2. **Presenter chrome.** The buttons are plain words with their key as a quiet suffix, no borders or pills, hidden in Present mode until the mouse moves and gone again ~2 s later. Counter, chapter and clock stay readable at 13px.
  3. **The vessel rail.** The progress strip is a vessel silhouette drawn to the bar's real size: a straight axis with the lumen widening and narrowing symmetrically about it and tapering to a point at each end, one diamond per chapter (travelled and current filled, ahead hollow), a thin white trace of the route travelled and a white tip with a ring at the current position. A first version with a waving centreline, a side branch and an orange trace read as crooked and was replaced the same day at the user's request, matching the reference's straight symmetric form. The rail runs from the meter to the bar's edge; the buttons sit above its right end when shown. Click or drag anywhere on it to go there (this also gives direct navigation); the mapping is scaled to the last station, and the meter is fixed-width so the rail cannot move under a drag. Audience-visible at all times; only the buttons hide. Mechanism after the reference deck (`code/explore/advance.html`, `world.html`): a centreline path, `getPointAtLength`, pointer capture.
  4. **Reversals.** 29: lead-in above the statement on one edge, both in the serif, the statement arriving a beat later. 34: both questions flush left, the second arriving after the first. 38–39: the chalkboard, bubbles and arrows restored exactly from the 4B snapshot, the three bubbles now arriving in turn. 41: the three-stage columns restored with serif stage numbers and legible text, stages 02 and 03 arriving in turn. The audit's "no equal columns" and "reduce the chalkboard" points are withdrawn for these two stations: the columns are a sequence, and the board is the presenter's own voice.
  5. **Single voice.** 21 becomes one serif sentence; a caption device never sits between two sentences.
  6. **The chain (46) is the finale.** Three serif lines, each larger than the last, arriving in turn; as the third lands the first two step back; the arrows go. The loop (42–45) stays as it was — 46 no longer duplicates it, it concludes it.
  7. **The close.** Station 52 takes 9 s instead of 3.2: the sentence goes (~1.7 s), the figures gather (~3.4 s), the mark holds orange (~1.9 s), the name arrives (~1.3 s). Reduced motion still jumps to the settled lockup; arrow keys still cut ahead.
- Consequence: Architects Daughter is embedded again (file 1,040,749 bytes). `--f-display`-era rules `.vopen/.vsplit`, the 4C `avlesson/avpath/avsteps` blocks and the tick rail are gone.

## D-022: Second review pass (2026-09-20)

- Status: accepted
- Decisions, in the order the user gave them:
  1. **Organ tags (16–17) land one by one.** Spacing 1.1 s (was 0.46 s), fade 0.9 s, and each node emits an expanding ring as it lands (`.site.land u::after`, 1.4 s), so every arrival is seen. Reduced motion: no ring, immediate.
  2. **The event mark replaces the venue line.** "Italian Tech Week · October 2026" is gone from the header; the Wave by Vento **W** pictogram sits top-right at 26px, turning slowly about its vertical axis (7 s per turn, none under reduced motion), white on the dark stage and black on the white one. The SVG is the organiser's own file, fetched from their production CDN and inlined as paths (`assets/partners/`). The purple wave loop on their site is a 7–9 MB PNG on a development host and is not embeddable; if the organiser supplies a source, a light loop can replace the W. Usage rights are the presenter's to confirm with the organiser.
  3. **The Mosaic lockup grows** from 20px to 30px in the header.
  4. **Therapies (18) as pills with icons, arriving in turn.** Five pills — drugs (capsule), radiation (trefoil), energy (bolt), embolic agents (beads), other therapies (plus) — drawn in the deck's line-icon style, arriving 0.46 s apart. This is a deliberate exception to the no-pills rule: the user wants the options to read as discrete choices.
  5. **The two questions (34) are equal.** Same size on one line with a light slash between; the second still arrives after the first.
  6. **Station 29** as the original layout: a small DM Sans lead-in (≤22px) above the large serif statement, both on one left edge, the statement arriving second.
  7. **The tunnel lines (24–28)** each on their own line with breathing room, the current line in orange, at ≥20px.
- Superseded: D-021 §4's "the second question smaller" and the serif lead-in on 29.

## D-023: Station 21 says its point twice as loud (2026-09-20)

- Status: accepted; supersedes D-021 §5
- Context: the one-sentence version made "direct human perception disappeared with it" hard to find. The original two-part structure (setup, then the point) was right; its mono dash-caption between them was the generated-looking part.
- Decision: two serif paragraphs on one left edge. The setup — "Endovascular medicine is an extraordinary access system, but it came with an expensive tradeoff." — at 300 weight, ~30px, arrives with the station. The point — "As the incision disappeared, direct human perception disappeared with it." — at 400 weight, ~56px, arrives about 1.5 s after the vessel settles (`data-seq` 1.6), and as it lands the setup steps back to half opacity. Hierarchy comes from time and size, the same device as the chain on 46; no caption, dash or mono. Copy change: "tradeoff" now closes a sentence and "As" opens one.

## D-024: The chain lands on the counter (2026-09-20)

- Status: accepted; extends D-021 §6
- Decision: Station 46 becomes three stations (46, 47, 48; the deck is now 54 stations). Each line of the chain arrives on its own keypress rather than on a timer, like the loop labels before it. The gap between lines roughly doubles (28–60px). Every earlier line steps further back at every step: at 47 the first line is at 55%; at 48 the first is at ~30% and the second at 55%. The sizes still grow line by line (37 → 48 → 63px at 1440). The reveal windows are spaced so no line is visible before its own station. Speaker notes written for all three.
- Reason: the user reads the growing type as compounding and wants each point given its own moment and its own air; the timer version felt crowded.
- Consequence: station numbers after 46 shift by two (the close is 52–54); the rail's 13 chapter nodes are unchanged. The Phase 4D comparison "before" set has 52 stations, so from 47 onward the pairs are offset by two.

## D-025: The chain climbs (2026-09-20)

- Status: accepted; refines D-024
- Decision: each point of the chain (46–48) first appears alone at full size in the centre. On the next station the earlier point climbs to make room, shrinks and fades, and the new point takes the centre at full size; the same happens again for the third. Final states: the first point smallest and faintest at the top (~58% size, 31%), the second in between (~75%, 56%), the third full size and bright at the centre. Layout is computed every frame from progress (sizes, measured heights, a fixed gap), so the climb animates with the station tween and nothing ever overlaps; reduced motion jumps to the settled states.
- Also: "October 2026, Italy" sits under the Wave by Vento W in the header — the mark centred over the line, the line DM Sans 15px in white (black on the white stage), the header bar deepened from 56px to 64px to hold the stack. A first cut at 12px, right-aligned, was rejected as off-centre and too small.

## D-026: Fifth review pass (2026-09-20)

- Status: accepted
- Decisions, in the order given:
  1. **Orange as the analogy (35–38).** As in the original deck, the two questions and both column headings — "But nature doesn't." / "Engineering works the same way." — are in the signal orange, so nature and engineering read as the same claim twice.
  2. **Header.** The date line grows to 18px and sits 12px under the W so the mark has room to turn; the header bar deepens to 78px.
  3. **"Once it can be learnt, it can be scaled." stays solid.** Its beat had been told to start leaving at 2.270, which at the station's own progress (2.265) already dimmed it to ~68%. It now leaves from 2.276, so it is at full strength until the next step and goes within the first ~2.5 s of the close.
  4. **The C-arm label sits at the end of its leader line.** The drawing already has a leader stroke from the gantry corner up-left to (−0.792, 0.190), like the table's and the monitor's; the label's anchor had never matched it (−0.762, −0.470, floating below). A first correction put it on the gantry's arc; the user pointed to the leader, and the anchor is now (−0.800, 0.190), reading leftward, so the line ends at the label as it does for the other two.
  5. **The C-arm leaves as the cardiovascular station arrives.** Its departure window moves from 0.646–0.722 (between stations 16 and 17) to 0.540–0.600, so the drawing and its label are gone when "So far, we used these pathways…" lands and the organ tags have the stage. The table and monitor labels keep their existing dimming.
  6. **Station 21 becomes two stations (21, 22; the deck is now 55).** The setup — "…but it came with an expensive tradeoff." — stands alone first. On the next step the point lands, now at 44px rather than 56px, while the setup shrinks by about a fifth and fades to half. Supersedes D-023's timed reveal.

## D-027: Sixth review pass — the room recedes, the tree thickens (2026-09-20)

- Status: accepted
- Decisions, in the order given:
  1. **The room steps back while text is up.** Whenever an in-room beat is live (stations 8–19 and 50), the table, C-arm and monitor drawings drop to 20% and their labels to 14%, and stay there through consecutive text stations; they return only when no text is on. The figure and its vasculature are unaffected.
  2. **The arterial tree reads as a vessel.** The tree is drawn three times, the extra two passes offset by a hair (±0.0022 units), with additive blending, so it reads thicker and brighter in the signal orange. The extra passes draw only while the tree is lit (`vascOn > .02`).
  3. **Station 18 in sequence.** The sentence arrives with the station, the five pills follow one by one (0.6–2.1 s), and "precisely where they are needed" lands last (~2.9 s).
  4. **Station 8 → 9: the orange box drops.** "vascular system" carries an orange highlight box that drops from above and settles with a small overshoot as the tree lights up at station 9 (the text turns near-black on the box). Reduced motion shows it settled.
  5. **Station 17:** "vascular system" in orange.
- Verification note: headless Chromium renders the room act at 13–18 fps even on the untouched 4C snapshot (software rasteriser; the real deck runs at ~60 on a GPU), and the extra tree passes halve that in the vascular act. The deck's frame-rate watchdog therefore trips during automated capture at random, depending on where its 4 s sample falls. A `?watchdog=off` query flag now keeps the guard out of automated runs only; the guard is unchanged for presenters. On a genuinely weak laptop the guard still switches to Safe Mode as before.

## D-028: A smooth step from 9 to 10 (2026-09-20)

- Status: accepted; refines D-027 §1–2
- Context: between "The vascular system…" (9) and "Enormous implications" (10) the room brightened back to white and the tree visibly grew before the next text arrived, because the room-fade followed each beat's own window (leaving a gap at the crossover) and the tree's draw and lighting ramps ended after station 9's progress.
- Decision: the room-fade now holds for the whole run of text in the room — from the first in-room beat to the last before the vessel (stations 8–19), and again on the way out (50) — so the table, C-arm and monitor stay back through every step of the act, including the wordless pause at 15. The tree's draw and lighting both complete at station 9's progress (0.334), so it is whole and lit when the orange box lands and nothing grows on the next step.

## D-029: The step is felt on the press; every input a presenter might reach for (2026-09-20)

- Status: accepted
- Easing: an ordinary step (one without an authored `dur`) now uses a mostly ease-out curve (72% cubic-out, 28% smoothstep) and a shorter duration (480–1900 ms, was 750–3200), so the picture starts moving the instant the press lands and settles softly; the rail tip has moved ~6 px within 120 ms of a press, where the old smoothstep had barely started. Authored cinematic moves (the road, the room arrival, the vessel entry, the close) keep their slow start and their durations.
- Inputs, all in Present mode: next — →, ↓, Space, Enter, Page Down, Tab, left mouse button (on the press, not the release), tap, swipe left, wheel/trackpad down; previous — ←, ↑, Page Up, Backspace, Shift+Tab, right mouse button, swipe right, wheel/trackpad up. Page Down/Up and the arrows cover presentation clickers. The wheel counts one notch or swipe per step and ignores trackpad inertia for 650 ms. The context menu is suppressed on the stage so the right button can go back; it still works on the bar. Tab no longer moves keyboard focus through the bar's buttons — each has its own key.

## D-030: Two versions live — v2 on its own branch and site (2026-09-20)

- Status: done, at the user's request
- The existing private repository `nancy-mosaicintelligence/mosaic-itw-keynote` (default `main`, 936,328-byte deck, Netlify site `mosaic-ventowave2026keynote`) is left untouched. The refined deck is branch **`v2`** (commit `b30ec6c` on top of `main`'s `ce2e4d2`), pushed with the docs, snapshots, baseline screenshots, comparison READMEs and verification reports; the per-viewport comparison PNG sets (182 MB) are gitignored and stay local.
- A second Netlify project, **`mosaic-ventowave2026keynote-v2`** (same team, Pro), serves the v2 deck at https://mosaic-ventowave2026keynote-v2.netlify.app. It was deployed from a folder holding only `index.html` and `netlify.toml` (the toml copies the deck into `dist/` and publishes that alone), so no docs, snapshots or screenshots are served. This first deploy is a manual upload, not yet linked to the repository: a push to `v2` does not redeploy until the project is linked to the repo/branch in the Netlify dashboard (Project configuration → Build & deploy → Link repository, branch `v2`), or it is re-deployed the same way.
- Both sites are public and unpassworded; the invite-only access the spec calls for is Phase 7. Render was considered as an alternative host; no Render credentials or CLI exist in this environment, and the repository already had a Netlify integration, so Netlify was used.

## D-031: Phase 5, first step — the deck reads its words from a document (2026-09-20)

- Status: accepted
- What exists now:
  - `packages/presentation-core/` — schema v1 (`schema.js`: closed lists of marks, icons, element types, custom scenes and camera targets; field specs per level), a strict validator (`validate.js`: unknown fields, types, marks, icons, scenes and scene parameters are errors; text may not contain markup; tokens must be `#rrggbb`/`rgba()` and quoted font stacks; stations must reference sections and increase in progress), deterministic migration scaffolding (`migrate.js`), canonical-JSON content hashing (`hash.js`), and the runs→HTML renderer (`render-runs.js`). No runtime dependencies; tests run on `node --test`.
  - `presentations/italian-tech-week/content/presentation.json` — the deck's copy (27 sections, 59 elements as runs with marks, icons and reveal timings, including the tunnel act's JS-authored lines), colour and font tokens, the copy the renderer draws itself (road milestones, team, organ sites, chart labels, sense icons, annotations, overlays, chrome), and all 55 stations with notes and flags. Content hash `0953771bb567`.
  - `index.html` embeds that document in `<script type="application/json" id="itw-content">` and, at start-up, `applyContent()` writes tokens onto `:root`, renders every bound element (`data-id`) from its runs, and builds `STATIONS` and the renderer's copy lists from the document. The markup keeps the layout; the document holds the words.
  - Tools: `tools/extract-content.mjs` (DOM-driven extraction, also the binding map), `tools/embed-content.mjs` (validate and embed, `--check` for staleness), `tools/check-parity.mjs` (station-by-station equality of two builds).
- Choices:
  1. **Plain ES modules with JSDoc types, no dependencies**, rather than TypeScript now. The core package must run inside the single-file deck and in Node without a build; TypeScript arrives with the Next.js application (Phase 6–7) and can type-check these files as they are (`// @ts-check`).
  2. **Runs, not HTML.** Text is a list of runs with named marks; the renderer owns the tag for each mark and the drawing for each icon, so editor input can never carry markup or scripts.
  3. **Custom scenes are references** (`itw-impact-chart`, `itw-sense-icons`, `itw-sense-tie`, `itw-chalkboard`, `itw-loop`) with a closed parameter list per scene; their code stays in the renderer.
  4. **Layout and animation stay in the markup and CSS for this step** (widths, alignment, class variants, easing). Extracting them is the next Phase 5 step, section by section, each with the same parity proof.
  5. **Parity is proven, not assumed**: re-extracting the bound deck yields the identical document, and `check-parity` finds all 55 stations identical to the pre-binding snapshot (`snapshots/phase4d/`, `96e32502…`).
- Evidence-quality note: headless software rendering can lag a station change by more than a frame, so the parity check settles on the counter and on no beat being mid-fade before it reads a station.

## D-032: Phase 5, second step — layout and animation values move into the document (2026-09-20)

- Status: accepted
- What exists now:
  - Schema v2: a section may carry `layout` (`variants` from a closed list of the deck's beat classes, `width` as `min(Npx,N%)`, `box` from a closed list, `until`); an element may carry `role` (its class tokens, from a closed list) and `style` (inline overrides limited to eight properties — `maxWidth`, `margin`, `marginTop`, `marginBottom`, `textAlign`, `fontSize`, `lineHeight`, `color` — with values matched against a conservative character class, so no `url()`, `expression()`, semicolons or braces); the document may carry `animation` (`revealSpacing`, `revealFade`, `stepMin`, `stepMax`, `stepPerUnit`, `stepEaseOut`, each range-checked). Migration 1→2 is the version stamp: every new field is optional, and a v1 document renders with the layout its markup already carries.
  - The Italian Tech Week document now holds the layout of all 26 sections, the role of 48 elements, the inline overrides of 11, and the six animation values (`.46`, `.80`, `480`, `1900`, `16000`, `.72`). Content hash `7135615b29db`.
  - `applyContent()` in the deck sets each section's class list, `data-until` and content box from `layout`; each bound element's class attribute from `role`, and its inline style from `style` (clearing every permitted key first, then setting the document's, so a shorthand is never broken by a later longhand); the reveal loop, `stepEase` and the station tween read `ANIM.*`, with the renderer's own numbers as the fallback for a document without `animation`.
  - `tools/check-binding.mjs`: the mutation proof. A copy of the document with a changed section variant, exit progress and box width, a changed role, colour and measure, an element's overrides removed, and a reveal spacing of 3 s is embedded into a copy of the deck; every change is observed in the browser against the unmutated control.
- Choices:
  1. **Roles are the deck's own class names, allow-listed.** The class vocabulary (`hero`, `strong`, `lede`, `vopen`, `c1`…`c3`, `lp1`…`lp3`, …) is the layout system the CSS already implements; the document names roles, the stylesheet owns what they look like. Inventing a parallel vocabulary now would only be a rename, and the editor (Phase 6) can present these as named styles.
  2. **Inline overrides are a closed set of typographic and spacing properties**, not free CSS. The eight keys cover every inline style the deck uses; anything else is rejected by the validator.
  3. **Animation is global for this step** (one spacing, one fade, one step-duration rule); per-element `reveal.p`/`reveal.seq` already came with step 1. Per-section easing does not exist in the deck, so it is not modelled.
  4. **Structural containers stay in the markup** (`.acts`, `.sense`, `.mv1`, `.mnode`, `.marrow`, the chalkboard, the loop): their reveals are not yet in the document. That, and the asset model, are the remaining Phase 5 steps.
  5. **Parity is proven the same way as step 1, plus the binding proof**: re-extracting the bound deck yields the identical document; `check-parity` finds the layout signature (section classes and boxes, every bound element's classes and computed type, size, spacing and colour) and all 55 stations identical to the pre-binding snapshot; `check-binding` shows the values are live.
- Evidence-quality note: the extractor's `revealFade` regex first matched an unrelated `(REDUCED?.01:.9)` on the organ-site line and produced `0.9`; the validator did not catch it because `0.9` is in range. The regex now anchors on the reveal line itself, and the checked-in value is `0.8`. A range check is not a correctness check — the parity run is.

## D-033: Phase 5, third step — groups and assets; the document now describes everything the deck reveals or draws from a file (2026-09-20)

- Status: accepted
- What exists now:
  - Schema v3: a `group` element — a structural container (`acts`, `sense nature|eng`, `mnode`, `marrow up|down`, `mv1`) with its own `reveal`, `role` and `style`, carrying no copy of its own; its children follow it in the section's element list. The document may carry `assets`: a map of kebab ids to `{ kind: "svg-paths", use, viewBox, paths: [{ d }], sources: [{ path, sha256 }] }`. Path data is matched against the SVG path grammar (commands, numbers, separators — nothing else), the viewBox against four numbers, source paths must be repo-relative `.svg` files with no `..`, hashes 64 hex. Migration 2→3 is the version stamp.
  - The Italian Tech Week document holds the 11 containers (10 with reveals: the two therapy acts, the two sense blocks, the three chalkboard nodes and two arrows, the second and third vessel stages) and two assets: `mosaic-lockup` (the icon and wordmark paths and the source viewBox, hashed against both official files, which share the geometry) and `wave-by-vento-w` (the event mark's two paths, hashed against the fetched file). Content hash `c7fc141655dc`; 70 elements, 68 bindings.
  - The deck's `applyContent()` sets the groups' reveals; `LOGO_VB/LOGO_ICON_D/LOGO_WORD_D` are read from the lockup asset and the header's event mark takes its viewBox and path data from the other. The 35 KB of path strings left the script for the document; the markup keeps two empty `<path>` elements for the mark. The file stays self-contained (no request at runtime).
  - Tests: a unit test reads each asset's source files from disk, checks their SHA-256 against the document, and checks that the file's viewBox and `d` attributes equal the asset's — so the document can never drift from the brand files without the suite saying so.
- Choices:
  1. **Groups are flat, not nested.** The element list stays a list; a group is an element with a reveal, and containment stays in the markup. This is enough for the reveal model to be complete and keeps every binding a `(section, tag, nth)` triple. The editor (Phase 6) will need a tree view for reordering, which can be derived from the bindings rather than stored twice.
  2. **Assets are geometry with provenance, not files.** The renderer draws the lockup and the mark; what the document owns is the path data and where it came from. Uploads, storage and protected retrieval arrive with the application (Phases 7–8) and will add a second asset kind; `svg-paths` stays the safe kind for anything an editor may inline because the grammar admits no markup.
  3. **Fills stay in CSS**, per surface (white on the dark stage, full colour on the white act), exactly as the brand README describes; the two official files differ only in fill.
  4. **The same proof**: re-extraction identical; the parity layout signature now includes both marks' viewBox and path data; all 55 stations identical to the pre-binding snapshot; `check-binding` mutates a group's reveal and both assets' viewBoxes and sees them on the page.
- Follow-up: with copy, tokens, stations, layout, roles, overrides, animation, group reveals and assets in the document, Phase 5's extraction is complete for this deck. What remains outside the document is renderer code (the room, the road, the tree, the scenes) and CSS, which is the intended boundary.

## D-034: Phase 6 — the editor MVP around the unchanged deck (2026-09-21)

- Status: accepted
- What exists now:
  - `apps/web/` — a Next.js 15 + TypeScript application in a pnpm workspace with `packages/presentation-core`. Routes: `/presentations/[id]/edit` (the editor), `/player/[id]` (the deck, served from the repository with the requested document embedded: `?source=draft` by default, `version:<id>`, or `committed`), and a JSON API under `/api/presentations/[id]/` for the draft (`GET`/`PUT`), versions (`GET`/`POST`, `GET /[vid]`, `POST /[vid]/restore`, `POST /[vid]/duplicate`) and SVG asset uploads (`POST /assets`).
  - The deck gained a message bridge (v1), active only when framed by the same-origin editor: the parent loads a draft (applied in place — words, layout, roles, overrides, tokens, animation, station notes and chapters), navigates, toggles present/notes/safe/fullscreen and turns edit mode on, where a pointer press selects the topmost bound element instead of stepping; the deck answers with its state, station changes and selections. Opened on its own the deck ignores all of it (parity re-proven: layout signature and 55 stations identical; 54/54 behavioural checks).
  - Schema v4: elements may be `hidden`. `safeCss()` restricts inline overrides to the character class *and* an allow-list of functions (`clamp`, `min`, `max`, `calc`, `rgb(a)`, `hsl(a)`, `var`), closing the `url()` hole the character class alone left open.
  - `packages/presentation-core/src/history.js`: path-based commands with recorded inverses, undo/redo, coalescing of consecutive edits to the same path (typing), structural sharing. The content hash is now computed by a self-contained SHA-256 (checked against Node's) so the package runs in the browser and the deck alike.
  - The editor: outline of stations by chapter with the current station's chapter, note, progress and duration editable; the stage; an inspector for the selected element (runs with marks and icons, items, reveal, visibility, roles from the closed list, the eight overrides with the grammar enforced as you type, the section's layout); panels for the motion values (range-checked), the renderer's own copy, the marks (replace by SVG upload: only viewBox and paths are taken) and the versions. Undo/redo (buttons and ⌘Z/⇧⌘Z), autosave 700 ms after the last change with the save state shown, preview (chrome hidden, `?preview=1`, returns without loss), named versions with a note, preview/duplicate/restore of any version. Restore copies the snapshot into the draft and keeps every later version; the audit log records seeds, versions, restores and uploads.
  - A file-backed store (`apps/web/data/`, ignored by git; `ITW_DATA_DIR` overrides it) behind a `Store` interface: `getDraft`, `saveDraft`, `listVersions`, `getVersion`, `createVersion`, `duplicateVersion`, `restoreVersion`, `putAsset`, `audit`. Every write validates first; an invalid draft is refused with its issues and the last valid draft stands; a draft written under an older schema is migrated on read.
  - Tests: 21 unit tests in the core (history, SHA-256, safeCss among them) and 10 browser tests (`apps/web/tests/e2e/`) that start the app on their own port against a temporary store and drive the editor through the real stage: selection by pointer, copy edits, autosave and reload, undo/redo, visibility and overrides, motion ranges, versions (create, immutability, restore keeps later versions, duplicate, preview), preview mode, the player route's sources, and SVG uploads.
- Choices:
  1. **The deck stays the renderer; the editor frames it.** No rewrite of the room, the road or the scenes into editor components; the bridge is the whole contract, versioned, origin-checked both ways. Live edits are applied in place for the parts `applyContent()` owns; the renderer copy and the assets are read at start-up, so those edits reload the stage with the draft embedded server-side — always faithful, never a second rendering path.
  2. **The player route embeds the document.** A single deck file serves the draft, any version, or the committed document by substitution of one script block. This is also how the public route (Phase 7) will serve the published version.
  3. **Persistence is an interface with a file implementation first.** The database, roles and sessions arrive in Phase 7 behind the same `Store`; until then every write is attributed to `local`. Nothing in the file store shape is meant to survive Phase 7 except the interface.
  4. **The editor is deliberately plain**: one type face, hairlines, the deck's signal colour for the current station and the selection, no decoration. It is a tool the presenter uses for minutes; the deck is what the room sees.
  5. **Not done, by design, in the MVP**: adding or removing stations and elements (structural edits change the deck's timing table and are a later step), per-element easing (the deck has none), image and video replacement (the deck has no raster media; the fluoroscopy frames arrive with Phase 4E), authentication (Phase 7).
- Evidence-quality note: two automation slips cost time and are worth recording — the desktop pane's screenshot frame is half the emulated viewport, so a click by coordinate must be halved; and a Playwright `boundingBox()` inside a frame is already page-relative. Neither is a product defect; the deck's bridge selected correctly by real pointer press in both browsers once the coordinates were right.

## D-035: Phase 7 — sign-in, roles, invitations and publication, enforced in the server and in the database (2026-09-21)

- Status: accepted
- What exists now:
  - **Supabase** (Auth with Google, Postgres with row-level security, private storage) as the architecture recommended. Locally the whole stack runs in Docker (`supabase start`; `supabase/config.toml`, `supabase/migrations/20260921000000_init.sql`); the hosted project is the same migration plus environment variables (`apps/web/.env.example`). No hosted project was created in this phase.
  - **Admission**: anyone may complete Google sign-in, but the session survives only if the account is on `mosaicintelligence.xyz` or already holds a membership or an open invitation; otherwise it is signed out on the spot and sent to `/no-access`. A company account is *identified*, not *authorised*: it holds no role until an owner grants one (the browser tests prove a colleague with no role reaches nothing). Owners are bootstrapped once from `OWNER_EMAILS` (company addresses only).
  - **Roles** (`presentation_memberships`: owner, editor, viewer) are checked twice: `requireRole()` in every route (pages redirect, APIs answer 401/403) and row-level security in Postgres, because the application talks to the database as the signed-in user (anon key + session), never as the service role for user data. The service role is used only for the sign-in bootstrap, the presentation row and invitation lookup. A trigger keeps at least one owner per presentation.
  - **Named invitations** (`invitations`): one address, one role (editor or viewer, never owner), fourteen days, a 256-bit token shown once and stored as its SHA-256; accepting requires being signed in as exactly that address; single use; revocable while open; every step in `audit_events`. Shared access codes were not built (the plan marks them optional; named invitations are attributable and individually revocable, which is what the spec prefers).
  - **Publication**: owners publish a version (`publication_records`, the previous one retired, never deleted). `/p/[slug]` serves the published document to any member and nothing else — no draft, no history; unpublished is 404. A direct link may carry `#s=<n>`, which the deck honours and clamps and never writes back (so a refresh without it still returns to station 1, as documented). The player's `draft`/`version`/`committed` sources need the editor role.
  - **Uploads** go to the private `assets` bucket (`<presentation uuid>/<sha256>.svg`, policies by role) with a `presentation_assets` row; the document records the source as `storage://assets/…` (schema v5 relaxes the source-path grammar; migration 4→5 is the stamp).
  - **The store** behind the editor is now `SupabaseStore` (same `Store` interface as the file store, plus `publish`/`published`), chosen per request after the role gate. The file store remains the explicit offline mode (`ITW_STORE=file`, never in production).
  - **People page** (`/presentations/[id]/people`, owners): members with role changes and removal, invitations with the link shown once and revocation. The editor bar shows People (owners), Sign out, and the Versions panel gains Publish (owners) and a "published" tag.
  - **Tests**: `tests/e2e/access.test.mjs` (7) drives every path — signed out, a stranger refused at admission, a colleague without a role, owner people-management and the last-owner rule, invitation binding/single use, editor vs viewer reach, publication visibility, revocation, deep links — through the app's own admission with a password stand-in for Google (`POST /auth/test-sign-in`, present only with `ITW_TEST_AUTH=1` outside production). The editor suite (10) now runs signed in against the database store. The fixtures create the accounts and delete the presentation row (cascade) so every run starts clean.
- Choices:
  1. **RLS as the last word, the app as the first.** The route gate gives clear errors and redirects; the policies guarantee that a bug in a route cannot leak a draft to a viewer or let an editor publish, and they are tested through the app, not only in isolation.
  2. **A password path for tests, not a mock.** The tests sign in through the same admission function the Google callback uses, so what they prove is the real decision; the route does not exist unless explicitly enabled and never in production.
  3. **Invitations over codes.** Attributable, single-use, bound to an address, revocable. Codes can come later behind the same tables if an event needs them.
  4. **Google itself is configured in the hosted project**, not here: the OAuth client id and secret belong in Google Cloud and the Supabase dashboard, never in the repository. `README.md` lists the steps.
- Evidence-quality note: PostgREST refused an ambiguous embed (`presentation_memberships` has two foreign keys to `profiles`) — the join is now named. The last-owner trigger initially also blocked the test fixture's cascade delete of a presentation; it now steps aside when the presentation itself is gone.

## D-036: The clean presentation deck is frozen; the platform continues on its own branch (2026-09-21)

- Status: accepted (the user's instruction)
- What is frozen: the deck served at https://mosaic-ventowave2026keynote-v2.netlify.app/ — `index.html` `2fcec3ce63739e27…`, commit `3185c2a`, tag `presentation-clean-2026-09-21`, byte-for-byte copy in `presentations/italian-tech-week/snapshots/frozen-v2/`. This is the deck to present from if the platform is not used.
- Rules: no deploy to the v2 Netlify site again (it is a manual-deploy site with no repository link, so only a deliberate upload could change it; the dashboard's "lock to published deploy" is the belt to these braces); no further commits to branch `v2`; the snapshot is never edited.
- Where work continues: branch `platform`, taken from that commit. The platform serves the deck itself (`/player`, `/p/[slug]`), so it needs no static site; if a new standalone deck is ever wanted it gets a new snapshot name and a new site.
- The three lines now: `main` → the original deck (untouched since the start); `v2` → the clean refined deck (frozen); `platform` → the editable, invite-only system.

## D-037: The platform, step 1 — editing that behaves like a slide tool (2026-09-21)

- Status: accepted (the user's review of the Phase 6 editor: "not intuitive", no way to move between slides, text edited in boxes)
- What changed:
  - **Filmstrip** under the stage: one card per station, grouped by chapter, the current one marked and kept in view; a click goes there. Cards are live text — the number, and the first words that station shows (computed from the document, so they follow every edit) — on a dark, black or white ground by station. Prev/next arrows and the counter sit over the stage in edit mode too; ←/→, PageUp/Down, Home and End step the stage whenever the focus is not in a field.
  - **Typing on the stage**: a second press on a line (or a double click) opens it for typing in place — a paragraph, a list item, a pill, a chain line, a loop label. The line becomes `contenteditable` inside the deck; on every input the bridge converts the DOM back into runs (text nodes, the renderer's own tags `em`, `b`, `i`, `em.hl`, `b.lead`, `b.x2`, reveal spans, icons matched by their path data) and posts them; the editor records them in history (coalesced per line) and autosaves; the deck keeps the open line's text while a draft is re-applied around it. Enter or Done closes the line; Escape too. Closing an unchanged line is not a history step.
  - **Floating toolbar** above the open line: the six marks on the selection (wrap, or unwrap when already inside that mark, then re-render through the model), size in 2 px steps with "auto" back to the role's size, alignment, colour — size/alignment/colour are the element's inline overrides, applied straight to the element without a full re-apply, so the caret stays.
  - Hit-testing looks through beats that have faded out (they stay stacked, transparent), so the line under the pointer is the one on screen.
- Choices:
  1. **The document is still the model.** Inline editing is an interaction layer over runs; nothing is stored as HTML. That keeps validation, versions, undo and the parity tooling exactly as they were.
  2. **Live text thumbnails, not screenshots.** A real render per station would need a rasteriser or a capture job and would go stale with every edit; the words a station shows are what a presenter scans for anyway, and they update instantly.
  3. **Double press detected in the bridge.** The bridge cancels the first press (so the deck does not step), which makes the browser's own `dblclick` unreliable; two presses on the same line within half a second open it.
- Proof: `apps/web/tests/e2e/inline.test.mjs` (4: filmstrip/arrows/keys, typing with marks kept, toolbar marks + size + alignment + undo, a list item on another station); the editor and access suites unchanged; deck parity (layout + 55 stations) and 54/54 behavioural checks re-proven — the bridge stays inert unframed.
- Next in this line: home + library + import (static HTML / links), then images (element, library, editor), then the create harness (D-038 onward).

## D-038: The platform, step 2 — the library: home, create, import, links (2026-09-21)

- Status: accepted
- What changed:
  - **Home is the library**: every presentation the signed-in person holds a role on, as cards (kind, role, published state, note, source), with Edit / Open / Present / People / Archive by role. The editor and the people page link back to it.
  - **Three kinds of presentation** (`presentations.kind`): `deck` — our structured document on a renderer (editable; the only kind the editor opens); `html` — a finished HTML file kept in the private `decks` bucket, presented as is; `link` — a URL kept elsewhere (Drive, Slides, a site). Each has the same roles, invitations and publication rules; `/p/[slug]` presents all three (deck → published version; html → a full-window frame of `/raw/[slug]`; link → sent on).
  - **Static HTML runs in a sandbox.** `/raw/[slug]` serves the file byte for byte under `Content-Security-Policy: sandbox allow-scripts allow-pointer-lock; frame-ancestors 'self'` inside an iframe that is itself sandboxed, so the file executes with an opaque origin: it cannot read this application's cookies or storage (the test proves `document.cookie` is empty inside), and only we may frame it. Imports by link are fetched server-side with a size cap and an SSRF guard (http(s) only, no local or private hosts).
  - **Create** makes an editable deck from a renderer's template document (today: the keynote engine with the Italian Tech Week document) — its own draft, versions and people; the creator is its owner. Company accounts create; guests only see what they were invited to. Titles become slugs, uniquified.
  - **Archive** (owners) removes a presentation from the library without deleting anything; the audit trail records creations and archivals. `updated_at` follows drafts, versions and publications.
  - The registry became data: `presentations` rows (seeded once for the committed keynote) plus a code-side `RENDERERS` table (deck file + template). Access checks, stores and routes read the row.
- Choices:
  1. **Editable means our format.** An imported HTML or a link is presented and shared, never edited: there is nothing structured to edit in it, and pretending otherwise would be a lie in the interface. The card says so.
  2. **Company accounts may create their own presentations.** Domain membership still grants no role on anyone else's; it grants a library of your own. Creation goes through the service role after the server's domain check, and is audited.
  3. **Sandbox rather than trust.** A user-supplied HTML file on our origin would be a script injection into the platform; the CSP sandbox removes the origin instead of trying to sanitise the file.
- Proof: `apps/web/tests/e2e/library.test.mjs` (5): the empty library and who may create; a new deck with its own draft and owner, separate from the keynote's; an HTML import stored privately, served in the sandbox with no cookies visible inside, refused to non-members, no editor for it; a link kept as a redirect; private addresses and non-HTML refused; archive by owners only, audited; the browser form creates and opens a deck. The editor, access and inline suites still pass.
- Next: images (step 3), then the create harness (step 4), where "New presentation" stops starting from the keynote's words.

## D-039: The platform, step 3 — images: an element, a library, an editor (2026-09-21)

- Status: accepted
- What changed:
  - **Schema v6**: an `image` element (`asset`, `alt`, `size` = width as a percentage of the content box, side, corner radius; `adjust` = crop as fractions of the source, rotation in quarter turns, flips, brightness, contrast, saturation, opacity, blur — each range-checked; `reveal` and `hidden` as any element) and an `image` asset kind (`src` in private storage, `sha256`, pixel size, mime). The validator ties every image element to an image asset in the document. Migration 5→6 is the stamp.
  - **The deck renders image elements.** An image has no node in the markup, so `applyContent()` makes one (`figure.pic > .rot > .crop > img`) and places it in document order inside the section's content box; the crop is a window onto the source (`aspect-ratio` from the crop and the source size, the picture scaled and offset inside it), the rotation and flips turn that window, the filters go on the picture, the opacity on the frame; everything is CSS derived from document fields, nothing is baked into pixels. A draft re-applied live removes pictures that left the document. The bridge stays inert unframed; parity and the behavioural checks are re-proven.
  - **Storage and serving**: uploads (PNG, JPEG, WebP, GIF; ≤ 15 MB; dimensions read from the header bytes, no decoder) go to the private `images` bucket under `<presentation>/<sha256>.<ext>` with a `presentation_assets` row; `/img/<slug>/<file>` streams them to members (immutable, private cache); signed-out gets 401, a non-member 403. The stored document keeps `storage://images/…`; the rendering copy (embedded or sent to the stage) maps it to `/img/<slug>/…`.
  - **The editor**: an Images tab — the presentation's library with upload; placing one appends an image element to the current station's section (revealed at that station) and selects it. The inspector for an image: alt, width, side, corners; a crop box (drag the window, pull its corners), quarter turns, flips, five sliders; Remove from the station (the file stays in the library, the asset record stays in the document for versions that use it). Every change is a command: undo, versions and validation apply as for text.
- Choices:
  1. **Adjustments are data, applied by the renderer.** No pixel processing on upload or on save: the original is kept once, every version can point at it with different crops and filters, and the deck's own CSS does the work. Baking would be lossy and would fork files per version.
  2. **Per-presentation libraries** for now. A cross-presentation image library needs a workspace notion (who may reuse whose upload); that comes with workspaces, not before.
  3. **The first structural edit.** Until now the document could only change what the markup already held; an image element is created by the document. The same placement rule (in document order, after the previous element) is what the create harness will use for every new element.
- Proof: `apps/web/tests/e2e/images.test.mjs` (3): an upload with its size, wrong files refused, serving to members only; placement from the tab onto the stage with the served route, brightness, a quarter turn, a dragged crop and a width all landing in the draft and as CSS on the stage; undo and removal. The other suites unchanged; deck parity and 54/54 behavioural checks.
- Next: the create harness (step 4).

## D-040: The platform, step 4 — the composer: new decks from beats on the keynote engine (2026-09-21)

- Status: accepted (the beat list agreed with the user)
- What changed:
  - **The engine has a plain scene.** `scene: { kind: "plain" }` on a document keeps the type, the motion, the rail, the HUD, the notes, the white act (from station `lite` flags) and the closing lockup (from a station `close` flag), and leaves the room, the road, the vessel, the tree, the crowd and every keynote-specific overlay dark. In the frame loop the keynote's bespoke middle runs only for the keynote's scene; a plain deck's stage comes from station flags. Opened as the keynote, nothing changes (parity and the behavioural checks re-proven).
  - **The document can create what the markup never had.** `applyContent()` makes sections (`section.beat` with a content box) and elements of every type (text, list, chips, chain, group, image, the lockup scene) that have no node, placed in document order and inside their container (`in`), all marked generated so a live re-apply can take them away again; lists and chains grow or shrink to their items; the station table is rebuilt whole on load, and the beats' visibility ranges recomputed. The keynote's derivations of its own copy tolerate a document without it.
  - **Schema v7**: `scene`, `in` (an element's container group, earlier in the same section), `close` on stations, the `itw-lockup` scene, and the composer's roles (`cols`, `col`, `chapno`). Stamp migration.
  - **The beats** (`packages/presentation-core/src/beats.js`): opening, chapter, statement, statement + point (two stations), list (one station per item), pills (arriving in turn), image (a caption; the picture comes from the Images tab), number / quote, two columns (nested groups), close — each a section built from the engine's own roles, layouts and reveals, plus the stations that play it. `newDeckDocument()` starts a deck with the keynote's tokens, motion and lockup, an opening carrying the title and a close; `respace()` lays a composed deck's stations out at 0.04 and moves every reveal with its station (the keynote's hand-timed values are never touched).
  - **The editor** gains station tools under the filmstrip: **+ Add station** opens the beat picker (the new beat lands after the whole of the current beat, before the close), ◀ ▶ move a beat as a whole, **Remove** takes a station (and its section when nothing else plays it). Each is one undo step over the whole document. The library's **New presentation** composes (title, event line); **Copy of the keynote** remains for the full room-and-vessel deck.
- Choices:
  1. **One engine, two scenes**, not a second renderer. The composed decks look like V2 because they *are* V2's type system and motion; the set pieces are simply off. Bringing a set piece into a composed deck (the room behind a chapter, say) is a later, deliberate addition.
  2. **Beats are recipes, not templates to fork.** They emit ordinary sections and stations; after that every line, timing and layout is editable like anything else, and a beat carries no identity of its own.
  3. **Structure edits are whole-document commands.** Adding, moving or removing touches stations, sections and reveals together; one path-based command could not express that atomically. Undo therefore restores the whole structure.
  4. **The close is a station flag**, so the engine's own 9-second lockup arrival serves composed decks unchanged.
- Proof: `packages/presentation-core/test/beats.test.js` (4: a new deck validates; every beat validates inside a deck with its stations; re-spacing; keys never collide) and `apps/web/tests/e2e/composer.test.mjs` (5: the new deck's document; the stage on a plain scene with the event line, no event mark and the close's lockup; eight beats added from the picker, re-spaced, rendered, columns nested; a beat moved as a whole, a station removed with its section, undo; version, publish and present). All 34 browser tests and 26 unit tests pass; the keynote's parity (layout + 55 stations) and 54/54 behavioural checks.
- Known gaps: pills carry no icons unless added by hand (the icon set is the keynote's); the image beat waits for a picture from the Images tab; a chapter beat does not yet rename the chapter of the stations after it (edit the chapter field per station); no set pieces in composed decks.

## D-041: The platform, step 5 — the Slides-like layer: boxes, moving, dropping, every text in place, the bar (2026-09-21)

- Status: accepted (the user's second review: edit every text on the screen, move and resize like Google Slides, drag-and-drop images and image boxes, fill the fluoroscopy frames, Save / Undo / Redo / Present / Publish)
- What changed:
  - **Schema v8**: `place` (x, y, w in % of the stage: a free box), `nudge` (dx, dy: a flow element moved off its position), `frame` (an image box's aspect; an image element may then be empty). The keynote's three fluoroscopy placeholders are bound as empty image boxes (`lab.1–3`, a synthetic section); extracted and embedded, the placeholder renders exactly as before (parity re-proven).
  - **The deck**: placed elements become absolute on the stage (moved out of the content box so percentages mean the stage); nudges are `translate(vw, vh)`; an image box shows its frame while empty and, once filled, the picture covering it with filters, turns and flips. In edit mode the bridge draws corner handles on the selection; a press on the selected element (or any free box) drags it, a handle resizes it (free boxes: width; pictures: width; flow text: measure in `vw`), and the result is posted as `place`, `nudge`, `width` or `maxWidth`; drops of the library's images or of files are posted with their stage coordinates and the image box under the pointer, if any. The renderer's own copy that is text on the page — event line, cue, room annotations, fluoroscopy labels, the substitution line, the road milestones (bound as they appear) — carries its document path, so a double click opens it for typing; the stage reloads after the line closes and the save lands.
  - **The editor**: **+ Text box**, **+ Image box**, **+ Image** (upload and place) under the filmstrip; the Images tab's pictures are draggable onto the stage and the whole stage takes dropped files (uploaded, then placed); an empty image box, clicked, opens the library in fill mode; the inspector's Position section shows left/top/width for a free box, "Back into the flow", "Put back" for a nudge, "Make it a free box" for a flow element. The bar: **Save** (explicit, beside autosave), **Undo / Redo**, **History** (the versions), **Present** (the draft, fullscreen, from this station), **Publish** (one click: a version named by the moment, published, the share link shown), **Share** (the link and the People page).
- Choices:
  1. **Percent of the stage, not pixels.** Free boxes and nudges are stored relative to the stage so a deck edited on a laptop lands the same on a projector; the engine's responsive type stays intact beneath.
  2. **Flow first, freedom on demand.** The beats keep their designed rhythm; an element becomes a free box only when moved out deliberately, and can go back. This keeps composed decks looking like V2 by default while allowing Slides-style placement wherever the author wants it.
  3. **Image boxes are frames, not crops.** A box has a shape; the picture covers it. The crop window remains the tool for free pictures; panning inside a frame is a later addition.
  4. **Renderer copy edits reload the stage** rather than re-implementing each renderer routine live; the reload happens on its own once the change is saved.
  5. **Publish is one press** for owners — a version is still created underneath, so History keeps every published state and restore works as before.
- Not in this step (said plainly): shapes, lines, tables, charts, diagrams, video, audio and word art from Slides' Insert menu; multi-select and alignment guides; panning a picture inside a frame. Shapes and lines are the natural next element types.
- Proof: `apps/web/tests/e2e/slides.test.mjs` (7): a text box added, dragged and resized by a handle; a flow line nudged and put back; an image box filled from the library with the picture covering its frame; the keynote's fluoroscopy frame clicked and filled; a picture dropped from the library and a file dropped on the stage; the event line typed in place and shown by the reloaded stage; Save, History, Publish (the publication and the share link), Present. The keynote's parity and behavioural checks re-proven.

## D-042: Editing feel — a press opens copy, a still press opens text, the sides fold away (2026-09-21)

- Status: accepted (the user's third review: renderer copy still not editable; panels should collapse; the whole should feel like Slides or Canva)
- What changed:
  - The renderer's overlays (`#road`, `#annot`, the lab) refused the pointer (`pointer-events: none`, `aria-hidden`), so their lines could never be pressed; while editing, their text nodes now take the pointer and show the same dashed hover as any line. The road's milestone copy, the annotations, the fluoroscopy labels, the cue and the event line open on a single press.
  - The "second press within half a second" rule is gone. A press selects; a press on the *selected* line opens it for typing on release, unless the pointer moves, in which case it drags — Slides' own grammar, with no timing to learn.
  - The outline and the inspector fold away with ◧ ◨ in the bar (remembered per browser) and fold on their own below 1180 px, so a split screen gives the stage the width; the stage keeps 16:9 and takes the room.
- Proof: two more browser tests in `slides.test.mjs` (milestone copy typed on a press; a selected line opened by a still press; panels folded by hand and by width, the stage growing); the inline and editor suites unchanged; keynote parity and behavioural checks re-proven.
- Still open on feel: transitions between stations while editing are the deck's own (cinematic), which reads as slow in an editor; a faster "edit" stepping speed is the next refinement. Keyboard: Delete removes the selection, arrows nudge it — to add.

## D-043: Removing things, keys on a selection, a draft reset; the tests keep their hands off the keynote (2026-09-21)

- Status: accepted (the user could not delete a text box; the local keynote carried leftovers from test runs)
- What changed:
  - **Remove** in the inspector for every element, and **Delete / Backspace** on the selection in either frame; **Escape** lets go; the **arrow keys** nudge the selection by 1 % of the stage (Shift: 5 %). Removing one of the keynote's own bound lines hides its node rather than losing it; undo brings the element and the node back. Free boxes and generated elements are removed outright.
  - **History → Reset the draft to the committed document**: the starting document again (the template, or a composed deck's fresh opening and close) as an editor-rights update; versions stay; the stage reloads.
  - **The library page re-runs the owner bootstrap**, so an `OWNER_EMAILS` account always holds the seeded decks even if a membership was lost.
  - **The browser suites work on a deck of their own** (`e2e-keynote`, an editable copy of the keynote created fresh per run) and never reset the keynote or the operator's drafts; the shared local database had let the tests wipe the operator's memberships and edits. The access suite still checks the bootstrap on the keynote, read-only.
- Proof: two more tests in `slides.test.mjs` (a fresh text box nudged by keys and deleted; a keynote line removed and hidden, then restored by undo; Escape; the reset); every suite green on the test deck; keynote parity and behavioural checks re-proven.

## D-044: Present is the working document; a way out of the player; the library redesigned; the brand marks in every image library (2026-09-21)

- Status: accepted (the user found the library's Present showing a stale published version with no way back, and asked for a better-looking home page with the Mosaic logo, and for the logo in the image library)
- What changed:
  - **The library's Present opens the working document** (`/player/<slug>?source=draft&back=/`), exactly what Edit shows; the published version keeps its own **Published** link. Publish remains the deliberate act that changes what viewers see at `/p/<slug>`.
  - **A full-window player has an exit**: a pill at the top (back to the library, full screen) that shows on movement and fades when the hands are still; Escape goes back once out of full screen. Only a top-level page gets it (`back=<same-site path>`); the editor's framed player never does; another origin is never a way back.
  - **The library redesigned** on the keynote's own type (Fraunces, DM Sans, loaded from Google Fonts for the app only; the deck stays self-contained): the white Mosaic lockup in every bar, a header, covers (the keynote's first station for decks on its renderer; a typographic cover for the rest), tags on the cover, one clear action row, an empty state, the favicon.
  - **The brand marks ship with the app** (`apps/web/public/brand/`: the logo in white, colour and black; the icon in white, orange and black — the six vector files; the two "highres" traces are heavier and coarser and were left out) and sit first in every presentation's image library under "Mosaic brand". They are image assets like uploads, so they are placed, dragged, resized and adjusted the same way. The schema allows an SVG **only** at `/brand/<name>.svg` with `image/svg+xml`; uploads stay raster.
- Proof: library tests (Present link, the pill present/absent/never cross-origin, Escape leaves), an images test (a brand mark placed → SVG asset in the document, drawn on the stage, served with its type), a core test for the SVG rule; every suite green.

## D-045: The shared link is the current document; titles rename in place; a quieter bar; every bound line takes the press and moves (2026-09-21)

- Status: accepted (the user found the share link showing an old published snapshot, no way to rename a presentation, a busy bar, and a keynote line — the one under the patient — that would not open or move)
- What changed:
  - **`/p/<slug>` is the current document** — what the editor shows — for every member, viewers included (migration `20260921150000_members_read_draft.sql`: members may *read* the draft; writing, versions and history stay with editors and owners). The published version stays reachable, frozen, at `/p/<slug>?source=published`; the library's Published link and the share dialog name it so. Publish is now "freeze a named version", not "make the link show something else".
  - **Renaming**: `PATCH /api/presentations/<id> { title }` for owners and editors (audited as `presentation.renamed`); the card's title has a pencil, the editor's bar title is a button — click, type, Enter (Escape cancels). The title is the presentation's name in the library and the bar; a deck's own opening line is typed on the stage as before.
  - **The bar** loses Sign out (the library has it) and Notes (the station note sits in the outline panel).
  - **Every bound line takes the press.** The deck's own copy nodes (`#subst`, the cue, the partner line, the annotations, the road milestones, the fluoroscopy labels) had `pointer-events:none` by id; the edit-mode rule now overrides all of them, and the hit test skips anything transparent anywhere up the tree (a faded beat, a line whose fade has not run). A press that stays still opens the line; a press that moves **drags it**, and the offset lands in the document under `offsets[<copy path>]` (schema 8, optional; ±100 % of the stage; applied with the CSS `translate` property so the renderer's own transforms are untouched). Undo puts it back. The rule stands: what is on the page is editable and movable.
- Proof: access (viewer sees the current document at the link, the frozen one at `?source=published`, still no draft API or player source), library (rename on the card and through the API, refusals), slides (the substitution line typed in place and dragged, undo, rename from the bar); core (offsets validated); keynote parity and 54/54 re-proven after the deck change.

## D-046: Delete, one card shape, plain words (2026-09-21)

- Status: accepted (the user asked for uniform cards, a plainer introduction line, and a real delete beside Archive)
- What changed:
  - **Delete** (`DELETE /api/presentations/<id>`, owners): the rows go by cascade (draft, versions, people, invitations, publication, audit trail) and the stored files with them (the presentation's images, an imported deck). A warning names what goes and that there is no undo; Archive stays the reversible choice. The built-in decks answer 409 and show no Delete: they would only be seeded again.
  - **One card shape**: a 16:9 cover, a two-line title, one line under it (the note, a link's host, or nothing), the meta line, the action row — so every card is the same height whatever it holds. The link card had been getting the invitation box's `.link` padding and border through a class-name collision; the kind classes are now `kind-deck`, `kind-html`, `kind-link`.
  - The introduction line says what to do: start a deck, copy the keynote, bring in a file or a link, share it.
- Proof: library test (delete from the card with the warning, refusals for non-owners and built-in decks, rows and page gone); cards measured equal at 1440 px.

## D-047: The product repository and the host (2026-09-22)

- Status: accepted (the user: "push this to a different GitHub repo and publish so that other Mosaic people can use it officially")
- Decision: a private repository of its own, `nancy-mosaicintelligence/mosaic-presentations`, whose `main` is this platform branch (the keynote repository keeps `main` and `v2` frozen and untouched). The host is **Netlify**: the account is already connected, the two frozen decks live there, and the Next runtime handles the app. Continuous deploys from `main`.
- Build: `apps/web` is the base directory; pnpm installs the workspace from the root; the deck, its content and the core package are traced into the server bundles (`outputFileTracingIncludes`, rooted at the repository); `repoRoot()` also searches upward from the module itself. `.env.example` names every variable. The runbook is `docs/DEPLOY.md`.
- Boundary: the site, its environment variables (two of them secrets) and the Supabase redirect URL are set in the dashboards by the owner; no key passes through this session.

## D-048: Sharing is immediate; a role is set by sharing again (2026-09-22)

- Status: accepted (the owner shared the keynote with a colleague and it did not appear; "pending" made no sense to her — nobody approves anything; and changing a role meant a second invitation)
- What changed: **Share** replaces "invite". An address that has signed in before holds the role the moment it is shared (the membership is written at once; any open invitation for it is closed). An address that has not signed in yet is granted **at its first sign-in**, automatically — the sign-in callback and the library page turn every open invitation for that email into a membership; no link to click. Typing the same address again **sets the role** (members through the role menu; not-yet-signed-in addresses through their row, or by sharing again). Open invitations last 90 days. The old `/invite/<token>` links still work for anyone who has one.
- The People page: one list — people with access (role menu, Remove) and those not signed in yet (role menu, Remove) — and a plain confirmation: "in their library now" or "appears the first time they sign in at <site>", with the site link to copy.
- Links carry the site's own address (`URL` on Netlify), not a deploy permalink.
- Proof: access tests — an existing account shared with is a member at once and the presentation is in their library; a brand-new address is waiting, then holds the role after its first sign-in without any link; sharing again changes the role; revocation still locks out.

## D-049: Boxes anywhere, cropping on the stage, copy and paste, a leave guard, fewer tabs (2026-09-22)

- Status: accepted (the owner's list after the first day on the deployed editor)
- What changed:
  - **Boxes on every station.** The keynote draws some sections itself (the tunnel, the lab) with no beat node, so a text box, image box or image added there landed in the document and never on the stage. The deck now makes a host layer for such a section the moment a free box needs one, shown with the section's stations, taking the pointer only on its boxes.
  - **Cropping on the stage, like Slides.** A framed picture (an image box, the fluoroscopy frames) is painted from its crop: the named region covers the frame, centred, and the whole picture is laid out at that scale. Double-click opens the crop: drag pans, the wheel zooms, Escape (or a press elsewhere) closes it; the rest of the picture shows dimmed meanwhile; one undo step per session. The inspector's crop box stays for plain pictures.
  - **⌘C, ⌘V, ⌘D** in either frame: a copy of any element is pasted on the current station as a free box a step aside (a keynote line becomes a free box where it stood); ⌘D duplicates in one go. The clipboard is the editor's own.
  - **A leave guard.** Autosave has always written every change within a second; still, a close or reload with an unsaved change asks first, and a link out of the editor asks Save and leave / Discard and leave / Stay.
  - **Tabs**: Marks and Renderer copy are gone — the copy is typed on the stage, the marks are the renderer's own.
  - **Several pictures at once** in the image library's upload.
  - **An error screen** for the editor with the message and a way back, instead of a blank page.
  - Sharing with anyone: any Google account can be shared with; an outside address is admitted at its first sign-in by the share (D-048) — no change was needed, the People copy says so.
- Proof: slides tests (the tunnel station's box on the stage, ⌘C/⌘V/⌘D from both frames, the crop session and its undo, the leave guard); keynote parity and 54/54 re-proven after the deck change.

## D-050: One canvas everywhere — what is designed is what is presented (2026-09-23)

- Status: accepted (the owner: pictures looked two small and one big on the stage and all alike in Present; "if I can't tell how the image sizing is going to be in actuality, it's hard to design")
- Cause: the deck is fluid, and some of it is fixed in pixels (the fluoroscopy layer is inset from the window edges by pixel amounts; type clamps; paddings). On the editor's small stage those pixels take a large share; at full screen a small one. Free boxes, sized in percent of the stage, scale evenly. So the proportions between the two changed with the window.
- Decision: **the deck is designed and shown on a 1920×1080 canvas, everywhere.** The editor's stage is that canvas scaled to fit the room it has (a `ResizeObserver`, the frame at 1920×1080 with a CSS transform; the inline toolbar maps the caret through the scale). Present fills the screen with the same canvas scaled to fit. The viewer page `/p/<slug>` and the library's Present are a shell page holding the deck at the canvas size, scaled and letterboxed, with the exit pill; `?raw=1` is the deck itself for the shell's frame. The deck relays Escape to the shell (keys live inside the frame). Pixel-based layout now behaves identically on the stage, in Present and at the shared link; the frozen decks are untouched.
- Tests read frame geometry through `frameBox()` (fixtures): a frame rectangle mapped through the canvas scale and the frame's place on the page — Playwright's own `boundingBox()` does not account for a transformed frame.
- Proof: the seven suites (with the access tests reading the deck through `raw=1`), keynote parity and 54/54 re-proven after the deck change (the Escape relay).

## D-051: Several elements at once — select, move, align, distribute, match sizes (2026-09-23)

- Status: accepted (the owner: "select all the images I want, right-click, resize them to be the same size" and align them, as in Slides and Canva)
- What changed:
  - **A selection can hold several elements**: shift-click or ⌘-click adds or removes one; ⌘A takes every free box on the station. Dragging one of them moves them all. Delete, the arrow keys, ⌘C and ⌘D act on the whole set (a paste lands each copy a step aside).
  - **A right-click on the stage opens a menu** (the deck hands the editor the click point and every selected rectangle in percent of the canvas): Align left / centre / right / top / middle / bottom (to the selection's own bounds; one element aligns to the page), Distribute horizontally / vertically (three or more), Centre on page, Match size — width / height / both (the first selected is the reference; a framed picture takes the reference's frame for "both"), then Copy, Paste, Duplicate, Delete. The same buttons sit in the side panel while several are selected.
  - Free boxes move by their place; the keynote's own lines by a nudge; sizes change only on free boxes. **Every operation is one undo step** (a whole-document command).
- Proof: a slides test (three boxes: shift-click, the menu, Align top, Match width, Distribute with equal gaps, one undo per step, a group drag); the seven suites; keynote parity and 54/54 after the deck change.

## D-052: A copy of a deck; the event mark and header sizes in Setup (2026-09-24)

- Status: accepted (the owner needs the keynote again for the Fundomo AGM in New York: same deck, Fundomo's mark in place of Vento Wave's, a bigger Mosaic logo and mark)
- What changed:
  - **Make a copy** (library card; `POST /api/presentations/<id>/copy`, editors and owners): a new deck the caller owns, whose draft is the source's *current* document — edits included — with the source's pictures copied into the new presentation's own storage (objects and library rows) and the document pointed at them.
  - **Setup tab** in the editor: the event mark (the mark that turns beside the event line) picked from built-in marks — Wave by Vento, Fundomo — or uploaded as an SVG drawn from paths; and the header sizes: the Mosaic logo and the event mark as multiples of the renderer's own sizes (`tokens.scale.brand` / `.partner`, 0.5–3; schema 8, optional; the deck sets `--brand-scale` / `--partner-scale`).
  - The marks ship with the app under `apps/web/public/marks/` with their path data in `lib/marks.json`; the document names the file and its hash as the source. Fundomo's mark is the rings-and-eye icon from fundomo.com, in its own colours: **a path may carry a `fill`** (schema 8, optional; the deck draws it, else the renderer's white) — the first multi-colour mark. The wordmark is offered too.
- Proof: library test (the copy holds the edit and the picture, served from its own storage; viewers refused), slides test (the Fundomo mark in the document and in the header; the sizes in the document and on the stage); core tests; parity and 54/54 after the deck change.

## D-053: Published means public; a presentation's address (2026-09-24)

- Status: accepted (the owner: after Publish "it should be accessible by anyone on the internet", and the link should carry the presentation's name)
- What changed:
  - **`/p/<slug>` is for anyone once published.** People with access see the current document there (or the frozen version with `?source=published`); everyone else — signed in with no role, or not signed in at all — sees the published version, no sign-in. Nothing published: a stranger is sent to sign in, an outsider refused. The pictures of a published deck are served to anyone likewise. The editor, the player sources, the draft API and versions stay with members. Publishing is therefore the deliberate act that makes a deck public; the share dialog says so.
  - **The address** (`PATCH { slug }`, owners): 2–80 characters of lowercase letters, digits and hyphens; built-in decks' and taken addresses refused. In the share dialog: a field, "Use the name", Change — with a warning that links already handed out stop working. A rename never moves the address by itself.
- Proof: access tests (a stranger before and after a publication, an outsider, a removed member still sees the public version but nothing else, the raw deck behind the shell), library test (the address: refusals, the move, the old address gone, editors refused).

## D-054: The header logos are elements too (2026-09-24)

- Status: accepted (the owner: enlarged logos touched the edge; "it should just be treated as a picture or any other element")
- What changed: the Mosaic logo and the event mark select on a press, drag to move, resize by their corner handles, nudge by the arrow keys, and have a panel of their own (size, position, Put back). The offset lives in `offsets["chrome.brand" | "chrome.partner"]`, the size in `tokens.scale` as before; both are one undo step each. The header pads itself when a logo is enlarged (24 px per unit above 1×) so nothing touches the edge; at the usual size nothing changes. A logo is never removed — Put back returns it.
- Proof: a slides test (select, drag, nudge, resize, the edge, Put back); parity and 54/54 after the deck change.

## D-055: Export to Google Slides (2026-09-24)

- Status: accepted (the owner: "turn the presentation into a google slide format but still retain the full style and animation and transition of the original presentation"; then, on the first result: overlapping text, nothing movable, pills and icons missing)
- The limit, stated first: Google Slides cannot play the deck. The camera drop into the room, the reveals timed to the road, the vessel flight, the crowd, the spinning mark — all of it is the engine drawing every frame from the document, and Slides has no equivalent: a slide holds shapes, pictures, text and a handful of fixed transitions. So the export keeps everything a slide *can* hold, as editable objects, and says plainly what it cannot.
- What changed:
  - **Export** in the editor's bar makes a PowerPoint file (`<title>.pptx`) that Google Slides opens with File → Import slides. A range of stations, all by default. Every station becomes one slide in three layers: **the picture** — the scene as the engine draws it, the road, the panels, the drawn figures — as the slide's background; **the objects** — the Mosaic logo and the event mark, every figure and placed picture, the drawn charts, every arrow, sensing icon and chip icon — as images of their own, so they move and resize in Slides (inline SVG is drawn from a clone with its computed paint inlined — html2canvas serialises SVG without the stylesheet, which is how the icons went missing the first time — at 2–4× for crisp enlargement; an icon inside a text box is given its colour outright before the words are blanked); **the words** — every visible line as an editable text box where it sits, in the deck's fonts (Fraunces, DM Sans, IBM Plex Mono — all on Google Fonts) with size, weight, italics, colour, opacity, letter-spacing and alignment run by run. A pill (a chip: a box with a background or border of its own) is a rounded, filled, edged text box with the words at their inset. **The speaker note** goes on the slide's notes; **a fade** joins every slide to the next.
  - **Layout that survives a different face.** Slides' Fraunces and DM Sans are wider than the deck's embedded cuts, so a paragraph handed over as a single run re-wrapped a word later and spilled into the next box. Now the deck reads its own line breaks — glyph by glyph — and hands each line over with a soft break; a box is 1.3× its widest line, a centred box on the same centre, and the line pitch is exact points, so nothing can re-wrap or drift. pptxgenjs repeats a paragraph's properties before later runs; the package writer strips the repeats.
  - **Nothing caught mid-flight.** The deck settles the station at once (the tween collapsed), freezes every CSS transition and animation (the event mark faces the room), and after one frame — once the timed entrances have noted the clock — moves the clock a minute forward, so the staggered reveals, the site tags, the crowd and the chips have all landed by the third frame, when the picture is taken. No waiting: an export is three frames a station plus the rasterising. Safe mode steps aside and the watchdog holds still for the duration; both come back as they were.
  - The bridge: `itw:export {index}` → the deck answers `itw:exportReady` with the frame size, the text boxes (lines, runs, pill), the objects (tagged `data-export`, pills `data-export-hide`), the note; the editor rasterises each object from the live stage, hides objects and pills, rasterises the document with html2canvas, builds the slide with pptxgenjs, writes the fade with JSZip and sends `itw:exportDone`, which puts everything back; then it returns to the station it was on. `pptxgenjs`, `html2canvas` and `jszip` are browser-only dependencies of `apps/web`; pptxgenjs' Node-only branches (`node:fs`, `node:https`) are stubbed out of the browser bundle in `next.config.ts`.
  - What does not carry over, and the dialog says so: movement inside a station, the camera, the reveals, the animated figures; backdrop blur behind the panels (html2canvas has none — the panels stay translucent); the road labels the engine draws in SVG stay in the picture. Weight variants below bold (Fraunces 300) come through as the regular face.
- Proof: `export.test.mjs` (stations 1–3 → three slides, each with a background picture, the fade, the note, the words in runs in the deck's fonts with the accent colour; the opening line in one paragraph with soft breaks where the deck breaks it and an exact pitch; the marks as pictures; the opening box on the words' centre and top; a room station, a white station and the chips station — every chip however late it reveals, as a rounded, edged box with its icon a picture; safe mode stepping aside and returning; the stage untouched afterwards); the seven suites; parity and 54/54 after the deck change.

