# Phase 4C comparison set: navigation, the AV lesson, the thesis

Captured 2026-09-18 with Playwright Chromium 151 (headless shell), device scale factor 1, Present mode, `prefers-reduced-motion: reduce` for settled captures.

`before/` is the Phase 4B result (`snapshots/phase4b/index.html`, SHA-256 `c0b75b99…`). `after/` is the root `index.html` after Phase 4C. Every pair is the same station at the same viewport.

| Directory | Stations | Purpose |
|---|---|---|
| `1440x810/`, `1366x768/`, `1280x800/`, `1512x982/` — `before/` and `after/` | 1–52 | full matched set at every supported viewport |
| `1440x810/nav-av-motion/` | 34–41 | full-motion (not reduced) captures 2.6 s after arrival |

## What to look at

- 34: one dominant question, the second following it smaller and indented.
- 35: the connecting sentence in a narrow measure beneath.
- 36–37: nature first, engineering lower-right, one hand-drawn line with an orange node between them; no equals sign, no columns.
- 38: the AV lesson as an eyebrow and one serif statement; no chalkboard.
- 39: the three steps as a descending stair, the last rule orange with a node.
- 41: the claim top-left, the reason bottom-right; no 01/02/03 columns.
- 21–22: the vessel statements now in the serif.

`verification-report.json` holds the automated checks, console capture, and request log.
