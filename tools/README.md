# Tools

Node scripts for the keynote. None are runtime dependencies of the deck. Playwright is resolved from an existing install (`PW_MODULES` or `NODE_PATH`), never installed here; `PW_EXEC` points at the Chromium binary (see `docs/STATUS.md`).

| Script | What it does |
|---|---|
| `extract-content.mjs [index.html]` | Reads the deck (rendered DOM for copy, section layout, element roles and inline overrides; source or the embedded document for stations, renderer copy and animation values) and writes `presentations/italian-tech-week/content/presentation.json` and `bindings.json`. |
| `embed-content.mjs [--check]` | Validates `presentation.json` against the schema and writes it into `index.html`'s `itw-content` block. `--check` reports whether the deck embeds the current document. |
| `check-parity.mjs <urlA> <urlB>` | Samples the layout once (section classes and boxes; each bound element's classes and computed type, size, spacing and colour, located through `bindings.json` so an unbound build compares too), then walks every station of both builds and reports any difference in visible text, reveal timings, notes, overlays, chrome or tokens. |
| `check-binding.mjs` | Mutates layout, role, style and animation values in a copy of the document, embeds it into a copy of the deck under `output/mutation/`, and confirms in the browser that every change reaches the page (the unmutated deck is the control). |

Typical edit loop: change `presentation.json` → `node tools/embed-content.mjs` → open the deck. Run `node --test packages/presentation-core/test/*.test.js` for the schema, validator, migration, hash and renderer tests.
