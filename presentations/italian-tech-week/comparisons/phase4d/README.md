# Phase 4D comparison set: the review pass, chrome, and the vessel rail

Captured 2026-09-20 with Playwright Chromium 151 (headless shell), device scale factor 1, Present mode, `prefers-reduced-motion: reduce` for settled captures.

`before/` is the Phase 4C result (`snapshots/phase4c/index.html`, SHA-256 `44287e60…`). `after/` is the root `index.html` after Phase 4D. Every pair is the same station at the same viewport.

| Directory | Stations | Purpose |
|---|---|---|
| `1440x810/`, `1366x768/`, `1280x800/`, `1512x982/` — `before/` and `after/` | before 1–52, after 1–54 | full matched set; the type system and the bar change every station. The chain became three stations (D-024), so from 47 on the after set is offset by two |
| `1440x810/close-motion/` | 51 → 52 | full-motion frames labelled by real elapsed time |
| `rail/` | 1, 30, 52 | close-ups of the bar at 2× on black, on white, and with the buttons awake |

## What to look at

- Every station: the bar — counter, chapter, clock, the vessel rail; the buttons only appear when the mouse moves.
- Every station: the Wave by Vento W mark top-right in place of the venue line; the Mosaic lockup at 30px.
- 4, 13: labels in DM Sans at reading size; no pills on the organ tags.
- 16–17: the organ tags land one by one, each with a ring.
- 18: the therapies as pills with icons, arriving one by one.
- 24–28: the tunnel lines one under the other.
- 21: one sentence, one voice.
- 29: small sans lead-in above the serif statement. 34: both questions equal, on one line.
- 31–32: team labels readable.
- 36–37: icon captions readable; nothing overlaps.
- 38–39: the chalkboard is back; bubbles arrive one at a time.
- 41: three stages, serif numbers.
- 21: the setup, then the point lands large.
- 46–48: the chain, one line per station, each earlier line fainter.
- `close-motion/`: the crowd takes nine seconds to become the mark.

`verification-report.json` holds the automated checks, console capture, and request log.
