# Official Mosaic logo assets

Copied unchanged from the brand-assets library on 2026-09-18. These are the only two lockups the keynote uses.

| File | Use | SHA-256 |
|---|---|---|
| `mosaic_logo_white.svg` | dark stage: header and the closing lockup | `586db456e5ce8c506cca926eda0cc6dcbe8f8559a51c03f4cef82499859b58a3` |
| `mosaic_logo_fullcolor.svg` | white stage (`body.lite`): header | `d369451fa20a7ae5e53de014408cff27b55e78bf8027bb6bf8800f45b7f0522c` |

Both files share the same geometry: viewBox `687.0 465.64971923828125 545.991 149.990`, first path the icon (122.066 units wide), second path the wordmark. They differ only in fill (`#FFFFFF` / `#FFFFFF` versus `#FC6452` / `#1A1815`).

## How the keynote consumes them

The root `index.html` stays a single self-contained file, so it does not request these SVGs at runtime. Instead the two path strings and the viewBox are embedded verbatim as `LOGO_VB`, `LOGO_ICON_D`, and `LOGO_WORD_D`, and one `lockup()` helper builds the same two-path SVG for the header and for the close. Fill colours are applied per surface to match the file above that the surface would use.

If the brand library updates these files, re-extract the path data into `index.html` and update the hashes here. Do not hand-edit the path strings.

Brand rules that apply (from the visual identity guide): icon stays left of the wordmark, never stretched, rotated, outlined, or recoloured outside the official variants; keep clear space of roughly one icon width on all sides.
