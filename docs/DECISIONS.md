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
