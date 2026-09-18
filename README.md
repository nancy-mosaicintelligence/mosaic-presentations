# Mosaic — Italian Tech Week keynote

One self-contained `index.html`. No build step, no dependencies, no network.
Fonts (Hanken Grotesk, IBM Plex Mono, Architects Daughter) and three.js r128
are embedded in the file, so it renders identically offline and on any host.

## Run it locally

Open `index.html` in a browser. (Double-clicking works; a local server is not needed.)

## Controls

| Key | Action |
|---|---|
| → / Space / click anywhere | next station |
| ← | previous station |
| `M` | Present ↔ Explore mode |
| `N` | speaker notes |
| `S` | safe mode (3D scene off, all text intact) |
| `F` | fullscreen (also the `Fullscreen · F` button in the bottom bar; `Esc` leaves) |

52 stations. Advancing works on a general click anywhere on the screen —
nothing has to be targeted.

The header and the closing lockup use the official Mosaic logo, embedded from
`presentations/italian-tech-week/assets/brand/`.

## Deploy

- Production: <https://mosaic-itw-keynote.netlify.app>
- Source: <https://github.com/nancy-mosaicintelligence/mosaic-itw-keynote> (private)

This repository keeps the keynote source and internal project documentation
together, but Netlify publishes only the generated `dist/index.html`. The
deployed presentation is therefore byte-for-byte the same keynote without
exposing `docs/` or the preserved baseline files as public routes.

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

**Netlify** — import the repository. `netlify.toml` copies the current
`index.html` into `dist/` and publishes only that directory.

For a verified production deploy with the CLI:

```bash
npx netlify-cli deploy --build --prod
```
