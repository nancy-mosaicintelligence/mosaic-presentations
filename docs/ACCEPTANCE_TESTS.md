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

- A versioned schema validates the Italian Tech Week presentation.
- Invalid element types and unsupported properties are rejected.
- Content, tokens, layout, animation, assets, and renderer code remain separate.
- Structured-data output matches approved baseline states.
- Schema migrations are deterministic and covered by tests.
- Custom scenes accept validated parameters without accepting arbitrary code.

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

