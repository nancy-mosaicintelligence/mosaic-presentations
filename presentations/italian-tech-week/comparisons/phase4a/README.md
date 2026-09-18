# Phase 4A comparison set: official lockup and fullscreen

Captured 2026-09-18 with Playwright Chromium 151 (headless shell), device scale factor 1, Present mode, `prefers-reduced-motion: reduce` for the settled station captures, matching the Phase 3 baseline method.

`before/` is the untouched baseline (`baseline/original/index.html`, SHA-256 `60a128e6…`). `after/` is the root `index.html` after Phase 4A. Same station, same viewport, same motion setting in every pair.

| Directory | Stations | Purpose |
|---|---|---|
| `1440x810/before`, `1440x810/after` | 1–52 | projector baseline; full regression |
| `1440x810/after/station-52-safe-mode.png` | 52 | Safe Mode still shows the close |
| `1440x810/close-sequence/` | 51 → 52 | full-motion frames every 280 ms, plus `settled.png` |
| `1366x768/`, `1280x800/`, `1512x982/` | 1, 23, 34, 52 | laptop checks: header on black, white stage, final lockup |

The Phase 3 baseline screenshots under `baseline/screenshots/1440x810/` were not touched.

## What to look at

- Station 1, any viewport: header now carries the official white lockup at the left; the separate centred icon and text wordmark are gone.
- Station 23 and 34: on the white stage the header switches to the official full-colour lockup.
- Station 52: the close settles on the official white-on-dark horizontal lockup, centred, at the source aspect ratio.
- `close-sequence/frame-06` to `frame-08`: the crowd still resolves into the icon at screen centre; then the wordmark comes in, the icon lets go of the orange, and the pair glides to centre.
- HUD: a fourth button, `Fullscreen · F`, in the existing button style.

`verification-report.json` holds the automated checks, console capture, and request log from the same run.
