# Mosaic Presentation Studio Agent Guide

This repository contains a preserved interactive keynote and the planned presentation editing platform around it. Preserve the working presentation before improving the design or extracting content.

## Required reading order

Before changing code or presentation content, read these files in order:

1. `docs/PRODUCT_SPEC.md`
2. `docs/ARCHITECTURE.md`
3. `docs/DESIGN_AUDIT.md`
4. `docs/ACCEPTANCE_TESTS.md`
5. `docs/DECISIONS.md`
6. `docs/STATUS.md`

Then inspect every source file relevant to the proposed change.

## Baseline protection

- Treat `presentations/italian-tech-week/baseline/original/index.html` as immutable.
- Its expected SHA-256 is `60a128e668c02f7d41df6607c1c773b839ecaf9825acf9b562b8fe952eed7837`.
- Do not overwrite baseline screenshots. Add a new comparison set when a visual change is made.
- Keep the root `index.html` runnable until a replacement player has achieved visual and interaction parity.
- Do not replace bespoke scenes with generic slide or component-library layouts.

## Change workflow

Before editing:

1. Run the current experience.
2. State which files will change and why.
3. Identify the baseline states affected by the change.

After editing:

1. Run the relevant automated checks.
2. Verify the experience in a real browser.
3. Capture before-and-after screenshots at matching viewport sizes and states for visual changes.
4. Verify keyboard and click navigation when presentation behavior is touched.
5. Record what passed, failed, and remains unverified in `docs/STATUS.md`.
6. Record material product, design, architecture, security, and data decisions in `docs/DECISIONS.md`.

## Design constraints

- Preserve the room, vascular network, vessel-entry, and crowd-to-mark narrative.
- Remove repetitive centered statements, pill labels, symmetrical feature grids, and generic dashboard styling when refining the deck.
- Never introduce purple or indigo glow effects, neon rings, or decorative background meshes.
- Use dramatic whitespace and asymmetry with a clear narrative purpose.
- Use direct, human copy. Do not add AI-marketing language.
- Use official Mosaic SVG lockups. Never reconstruct the logo from text and a separate symbol.
- Do not fabricate fluoroscopy, clinical evidence, performance data, citations, or medical claims.

## Security and data

- The approved Google Workspace domain is `mosaicintelligence.xyz`.
- A matching email domain never grants a role automatically.
- Protect editor routes and editing APIs on the server.
- Store access-code verifiers as strong hashes, never plaintext.
- Keep credentials and service keys in environment variables.
- Never commit real credentials, local-machine paths as runtime dependencies, temporary WhatsApp files, private uploads, or production data.

## External actions

Do not create a remote repository, deploy externally, provision paid services, modify DNS, or perform irreversible database operations without explicit user approval. Prepare and show the exact proposed action first.

