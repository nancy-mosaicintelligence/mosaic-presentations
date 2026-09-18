# Mosaic Presentation Studio Product Specification

## Product statement

Mosaic Presentation Studio is a focused web application for presenting and editing high-craft interactive HTML keynotes. The first supported presentation is the Italian Tech Week keynote, "The Room and the Vessel."

The first release must protect the keynote's spatial narrative and bespoke animation while allowing authorized people to update the properties the presentation actually uses. It is not a general-purpose Canva, Webflow, Figma, or slide authoring replacement.

## Confirmed product decisions

- Access is invite-only.
- The approved Google Workspace domain is `mosaicintelligence.xyz`.
- Company-domain authentication verifies identity but does not grant edit access.
- Roles are assigned explicitly.
- The Italian Tech Week visual system should be preserved as much as possible.
- Repetitive AI-like motifs should be refined without flattening the keynote into a conventional deck.
- Real fluoroscopy frames will be supplied later. No synthetic or substitute clinical frames may be introduced.

## Primary users

### Owner

An owner manages presentations, people, role assignments, publication, versions, private access, and access revocation.

### Editor

An editor changes supported content and design properties, previews the presentation, saves drafts, and creates or restores named versions.

### Viewer

A viewer opens and presents an approved version. A viewer cannot open editor routes, write presentation data, inspect version history, or access private source assets outside the approved presentation.

## Core experience

### Present mode

Present mode must:

- Render the approved presentation without editing chrome.
- Preserve the existing camera motion, procedural scenes, timing, and direct navigation.
- Support Arrow keys, Space, Enter, Page keys, Home, End, and click-to-advance.
- Add working fullscreen behavior.
- Support direct links to an approved presentation and optional station.
- Recover predictably after refresh.
- Run at 1440 by 810 and common laptop viewports.
- Expose speaker notes only through an intentional control.
- Fail gracefully if WebGL or an optional media asset is unavailable.
- Prevent viewers from reaching editor data or APIs.

### Edit mode

Authorized owners and editors must be able to:

- Navigate the full presentation and select supported elements on the canvas.
- Edit supported text without changing source code.
- Replace approved images, videos, and logos.
- Adjust allowed typography, color, alignment, dimensions, spacing, visibility, and positioning values.
- Adjust only the animation parameters exposed by each component.
- Undo and redo changes.
- Maintain an autosaved working draft.
- Preview without editor controls and return without losing work.
- Create a named immutable version with an optional note.
- Preview, duplicate, and restore prior versions.

Raw `contenteditable` markup is not the content model. Direct editing is an interaction layer over structured presentation data.

## Content and rendering boundaries

The platform must keep these concerns separate:

- Presentation content
- Design tokens
- Layout configuration
- Animation configuration
- Application state
- Rendering logic
- Authentication and authorization
- Version history

The Italian Tech Week renderer may keep bespoke code for the room, vasculature, vessel, procedural crowd, and other authored scenes. The editor exposes a safe subset of parameters for those components.

## Version states

The interface must distinguish:

- Unsaved local changes
- Autosaved draft state
- Named immutable versions
- Published or approved versions

Each named version stores a full restorable snapshot with its ID, presentation ID, name, author, creation time, optional note, schema version, asset references, and complete supported presentation state.

Restoring a version creates a new draft based on that snapshot. It does not delete or reorder newer history.

## Authentication and access

- Google is the company authentication method.
- Only `mosaicintelligence.xyz` accounts may use the company sign-in path.
- Each authenticated company user needs an explicit `owner`, `editor`, or `viewer` assignment.
- External viewers need a named invitation or an owner-created secure access code.
- Named invitations are the preferred default because they are attributable and individually revocable.
- Shared codes are an optional convenience for controlled event access. They are less attributable and can be forwarded.
- External access must be expiring or revocable.
- Editor pages, version history, private assets, administration, and write APIs require server-side authorization.

## Italian Tech Week design direction

Preserve:

- The room-to-body-to-vessel spatial journey
- Black, white, and Mosaic orange as the core color system
- Procedural linework and depth
- Deliberate silence and sparse beats
- Camera arrivals, vessel entry, vascular illumination, and crowd convergence

Refine:

- Repetitive centered statement screens
- Pill-shaped tags and badge-like labels
- Symmetrical three- and four-column feature layouts
- Tight mechanical spacing
- The long run of visually similar white slides
- Literal explainer graphics that break the cinematic language
- Slogan-like or generic AI-marketing copy

Do not use:

- Purple or indigo glow gradients
- Background meshes used only as decoration
- Neon accent rings
- Generic symmetrical feature-card grids
- Inter or SF Pro display headers
- Centered dual-button marketing calls to action
- Words such as "seamlessly," "empower," or "revolutionize"

The eventual typography refinement must pair a licensed high-contrast serif display face with a clean geometric body face. The exact families remain open until licensing and brand alignment are confirmed.

## Fluoroscopy asset requirement

Real fluoroscopy frames are a pending user-supplied dependency. Until they arrive:

- Preserve the current sequence and timing.
- Label the media dependency in planning and validation.
- Do not use generated, stock, or approximate clinical imagery.
- The future implementation must support missing-state fallback without broken-image indicators.
- Usage rights and patient-identification review must be confirmed before publication.

## Non-goals for the first release

- Arbitrary HTML or JavaScript editing in the browser
- Freeform vector drawing
- General-purpose layout authoring
- Collaborative multiplayer editing
- A marketplace or public template library
- Automatic generation of medical claims or clinical evidence
- Rebuilding every bespoke scene as generic editor components

## Quality bar

The release is acceptable only when the approved presentation remains visually faithful, an editor can complete the supported workflows without source changes, unauthorized users cannot mutate data, and a published version can be recovered from version history.

