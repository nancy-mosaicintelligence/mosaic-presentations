# Mosaic — Italian Tech Week keynote

One self-contained `index.html`. No build step, no dependencies, no network.
Fonts (Fraunces, DM Sans, IBM Plex Mono, Architects Daughter — all SIL OFL) and three.js r128
are embedded in the file, so it renders identically offline and on any host.

## Run it locally

Open `index.html` in a browser. (Double-clicking works; a local server is not needed.)

## Controls

| Key | Action |
|---|---|
| → / ↓ / Space / Enter / Page Down / Tab / click / tap / swipe left / scroll down | next station |
| ← / ↑ / Page Up / Backspace / Shift+Tab / right-click / swipe right / scroll up | previous station |
| Home / End | first / last station |
| `M` | Present ↔ Explore mode |
| `N` | speaker notes |
| `S` | safe mode (3D scene off, all text intact) |
| `F` | fullscreen (`Esc` leaves) |

55 stations. Advancing works on a general click anywhere on the screen —
nothing has to be targeted — and on a presentation clicker (Page Down / Page
Up), a trackpad swipe, or the mouse wheel. The bar at the bottom shows the route as a
vessel with one node per chapter; click or drag along it to go anywhere.
The Safe / Notes / Present / Fullscreen buttons appear when the mouse moves
and hide again after a couple of seconds.

If the frame rate is low for the first few seconds the deck switches itself
to Safe mode (`S` toggles it back). Append `?watchdog=off` to the URL to keep
that guard out of automated screenshot runs.

The header and the closing lockup use the official Mosaic logo, embedded from
`presentations/italian-tech-week/assets/brand/`.

## Deploy

```bash
cd itw-keynote
git init
git add .
git commit -m "Italian Tech Week keynote"
git branch -M main
git remote add origin git@github.com:<you>/itw-keynote.git
git push -u origin main
```

**Vercel** — import the repo, framework preset **Other**, leave build command
and output directory empty. It serves `index.html` at the root.

**Netlify** — import the repo, leave build command empty, publish directory `.`.

Either one can also take the file by drag-and-drop without GitHub:
Netlify Drop (app.netlify.com/drop) or `vercel deploy` from this folder.
