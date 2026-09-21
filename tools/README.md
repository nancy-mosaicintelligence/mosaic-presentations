# Tools

Node scripts for the keynote. None are runtime dependencies of the deck. Playwright is resolved from an existing install (`PW_MODULES` or `NODE_PATH`), never installed here; `PW_EXEC` points at the Chromium binary (see `docs/STATUS.md`).

| Script | What it does |
|---|---|
| `extract-content.mjs [index.html]` | Reads the deck (rendered DOM for copy, source for the rest, or the embedded document once bound) and writes `presentations/italian-tech-week/content/presentation.json` and `bindings.json`. |
| `embed-content.mjs [--check]` | Validates `presentation.json` against the schema and writes it into `index.html`'s `itw-content` block. `--check` reports whether the deck embeds the current document. |
| `check-parity.mjs <urlA> <urlB>` | Walks every station of two builds and reports any difference in visible text, reveal timings, notes, overlays, chrome or tokens. |

Typical edit loop: change `presentation.json` → `node tools/embed-content.mjs` → open the deck. Run `node --test packages/presentation-core/test/*.test.js` for the schema, validator, migration, hash and renderer tests.
