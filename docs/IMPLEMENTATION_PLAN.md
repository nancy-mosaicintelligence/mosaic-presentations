# Implementation Plan

## Working approach

Move in small reviewable groups. Keep the original presentation recoverable. A passing build is not sufficient evidence for visual or interaction parity.

## Phase 1: Inspection

Status: complete.

Acceptance criteria:

- Repository, original export, brand sources, code references, and visual references inspected
- Current experience run in a browser
- Architecture, dependencies, controls, design gaps, and risks documented
- No redesign implemented

## Phase 2: Specification

Status: complete.

Outputs:

- Repository agent guide
- Product specification
- Design audit
- Architecture
- Acceptance tests
- Implementation plan
- Decision log
- Status log

Acceptance criteria:

- Confirmed domain, access model, design direction, and missing fluoroscopy dependency recorded
- Every future phase has a clear completion gate
- Major migration remains deferred until preservation evidence exists

## Phase 3: Presentation preservation

Status: complete with known baseline failures.

Work:

- Preserve an exact copy of the root keynote
- Record its cryptographic hash
- Capture all 52 stations at 1440x810
- Retest navigation, notes, modes, refresh, and console state
- Record fullscreen and deep-link failures rather than altering the reference

Acceptance criteria:

- The preserved file matches the source byte for byte
- Complete baseline screenshots exist
- Tests distinguish passing behavior from known defects
- No redesign or renderer migration is included

## Phase 4: Italian Tech Week refinement

Status: planned.

### Group 4A: Brand and presentation controls

- Replace reconstructed logo treatments with approved official SVG lockups
- Add working fullscreen behavior
- Preserve all existing navigation
- Capture matched logo and control comparisons

### Group 4B: White explanatory act

- Establish the approved serif and geometric typography pair
- Expand whitespace and create asymmetric composition
- Remove pill and badge patterns that do not convey meaning
- Preserve the argument and station sequence unless a pacing change is explicitly approved

### Group 4C: Navigation and AV analogy

- Make one question dominant
- Reduce the literal chalkboard treatment
- Connect perception visually to the established sensing and vessel language
- Avoid equal columns and formulaic three-part groupings

### Group 4D: Loop and chain

- Consolidate duplicated explanation
- Keep the stronger vessel-integrated motion
- Verify that the transition to the bottom-up section remains legible

### Group 4E: Fluoroscopy evidence

- Wait for user-supplied approved frames
- Confirm rights and de-identification
- Integrate real frames at appropriate contrast and crop
- Provide graceful missing-media behavior

Acceptance criteria for every group:

- Matching before-and-after screenshots
- Navigation and motion regression checks
- Supported viewport checks
- No new console errors
- A concrete explanation of the improvement and unresolved issues

## Phase 5: Structured content model

Status: planned.

Work:

- Define versioned presentation, section, station, element, token, layout, animation, and asset schemas
- Add validation and migration helpers
- Extract simple copy and tokens before complex scene parameters
- Add renderer adapters for custom scenes
- Compare extracted output against approved visual baselines

Acceptance criteria:

- Supported changes occur through structured data
- Unsupported values fail validation
- Existing animation remains intact
- Original custom renderer remains recoverable

## Phase 6: Editor MVP

Status: planned.

Work order:

1. Inline text editing backed by structured commands
2. Typography controls
3. Image, video, and logo replacement
4. Alignment and spacing controls
5. Supported animation controls
6. Undo and redo
7. Draft persistence
8. Preview mode
9. Named version creation
10. History, preview, duplication, and restoration

Acceptance criteria:

- Editors complete primary changes without source edits
- Controls appear only where supported
- Preview and restoration preserve work and history
- Browser tests cover editing and version workflows

## Phase 7: Authentication, roles, and external access

Status: planned.

Work:

- Configure Supabase Auth with Google
- Restrict the company path to `mosaicintelligence.xyz`
- Add explicit owner, editor, and viewer memberships
- Enforce authorization in server routes, APIs, database policies, and private storage
- Implement named invitations as the default external path
- Optionally implement expiring shared codes with strong hashing and rotation
- Add revocation and audit events

Acceptance criteria:

- Unauthorized mutation and private retrieval are blocked at the server and data layers
- Domain membership does not imply an elevated role
- Browser tests cover every role and external access path

## Phase 8: GitHub and deployment readiness

Status: planned.

Work:

- Create the application and package structure
- Prepare `.env.example`, migrations, seed or owner bootstrap, setup instructions, health check, rollback instructions, and production build
- Expand `.gitignore` to exclude secrets, local artifacts, reports, private uploads, and generated output
- Show proposed repository name, commit contents, ignored contents, and exact external actions

Acceptance criteria:

- Clean-checkout install and production build succeed
- No credentials or machine-specific runtime dependencies are tracked
- User approves before remote creation or deployment

## Phase 9: Production verification

Status: blocked until deployment approval and services exist.

Acceptance criteria:

- Deployed URL opened and tested
- Auth, roles, external access, editing, versions, assets, presentation controls, direct links, and responsive behavior verified
- Console and network failures documented
- Production URL and remaining limitations recorded

