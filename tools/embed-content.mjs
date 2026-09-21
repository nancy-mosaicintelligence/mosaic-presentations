// Validate presentations/italian-tech-week/content/presentation.json and write it into
// index.html's <script type="application/json" id="itw-content"> block. The deck reads
// its copy, tokens and stations from that block at start-up (see applyContent in index.html).
//
//   node tools/embed-content.mjs            # validate + embed
//   node tools/embed-content.mjs --check    # validate + report whether index.html is current
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate, contentHash } from "../packages/presentation-core/src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..");
const DOC = join(REPO, "presentations/italian-tech-week/content/presentation.json");
const HTML = join(REPO, "index.html");
const check = process.argv.includes("--check");

const doc = JSON.parse(readFileSync(DOC, "utf8"));
const v = validate(doc);
if (!v.ok) { console.error("presentation.json is invalid:"); for (const e of v.errors) console.error(`  ${e.path}: ${e.message}`); process.exit(1); }

// the embedded form: compact, and safe inside a <script> (no "</script" sequence can survive)
const json = JSON.stringify(doc).replace(/<\//g, "<\\/");
const block = `<script type="application/json" id="itw-content">${json}</script>`;
const html = readFileSync(HTML, "utf8");
const re = /<script type="application\/json" id="itw-content">[\s\S]*?<\/script>/;
if (!re.test(html)) { console.error("index.html has no itw-content block; run the Phase 5 binding first"); process.exit(1); }
const next = html.replace(re, () => block);
const hash = contentHash(doc).slice(0, 12);
if (check) {
  const same = next === html;
  console.log(same ? `index.html embeds the current document (content ${hash})` : `index.html is STALE: run node tools/embed-content.mjs (content ${hash})`);
  process.exit(same ? 0 : 2);
}
writeFileSync(HTML, next);
console.log(`embedded ${json.length} bytes of content (${hash}) into index.html`);
