# Phase 4B comparison set: typography pair and the white act

Captured 2026-09-18 with Playwright Chromium 151 (headless shell), device scale factor 1, Present mode, `prefers-reduced-motion: reduce` for settled captures.

`before/` is the Phase 4A result (`snapshots/phase4a/index.html`, SHA-256 `815abd72…`). `after/` is the root `index.html` after Phase 4B. Every pair is the same station at the same viewport.

| Directory | Stations | Purpose |
|---|---|---|
| `1440x810/`, `1366x768/`, `1280x800/`, `1512x982/` — `before/` and `after/` | 1–52 | full matched set at every supported viewport; the type change touches most stations |
| `1440x810/white-act-motion/` | 29–33 | full-motion (not reduced) captures 2.6 s after arrival |

## What to look at

- Any station with a large statement (1, 17–19, 29, 32, 33, 40–41, 47, 49–51): the display voice is now Fraunces; running copy is DM Sans.
- Station 29: the setup line top-right, the statement bottom-left.
- Station 30–31: the ×2 multipliers are bare serif numerals, no chips; the second paragraph steps in.
- Station 32: "labor-to-output" sets on one line.
- Station 34: the nav question in the serif (the rest of 34–41 waits for 4C).

`verification-report.json` holds the automated checks, console capture, and request log.
