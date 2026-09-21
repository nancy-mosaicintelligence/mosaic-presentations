// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate, migrate, contentHash, canonicalJSON, renderRuns, SCHEMA_VERSION } from "../src/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..", "..", "..");

/** A minimal valid document. */
function minimal() {
  return {
    schemaVersion: SCHEMA_VERSION, id: "t", title: "T", renderer: "itw",
    tokens: { colors: { signal: "#FC6452", hair: "rgba(171,167,164,.16)" }, fonts: { body: '"DM Sans",sans-serif' } },
    copy: {
      road: [{ year: [{ t: "y" }], text: [{ t: "x" }] }],
      team: ["a"], sites: ["a"], impactBars: ["a"], senseNature: ["a"], senseEngineering: ["a"], annotations: ["a"],
      substitution: [{ t: "s" }], fluoroscopyPlaceholders: ["f"], partnerLine: "p", cue: "c", notesLabel: "n", safeNote: "s",
      hud: { safe: "Safe", notes: "Notes", present: "Present", explore: "Explore", fullscreen: "Fullscreen" }
    },
    animation: { revealSpacing: .46, revealFade: .8, stepMin: 480, stepMax: 1900, stepPerUnit: 16000, stepEaseOut: .72 },
    assets: { "mark": { kind: "svg-paths", use: "t", viewBox: "0 0 10 10", paths: [{ d: "M0 0L10 10Z" }], sources: [{ path: "presentations/x/mark.svg", sha256: "a".repeat(64) }] } },
    sections: [{ key: "open", layout: { variants: ["mid"], width: "min(940px,76%)", until: 0.05 }, elements: [
      { id: "open.1", type: "text", role: ["hero", "strong"], style: { maxWidth: "17ch", margin: "22px 0 0" }, runs: [{ t: "Hello " }, { t: "world", marks: ["em"] }] },
      { id: "open.2", type: "group", role: ["acts", "rv"], reveal: { p: 0.03 }, hidden: false }
    ] }],
    stations: [{ p: 0, section: "open", camera: "none", chapter: "Open", note: "n" }, { p: 0.03, section: "", camera: "acc", chapter: "Open", note: "n", dur: 2400, black: true }]
  };
}

test("a minimal document validates", () => {
  const r = validate(minimal());
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
});

test("unknown element type is rejected", () => {
  const d = minimal(); d.sections[0].elements.push({ id: "x", type: "video", runs: [] });
  const r = validate(d);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some(e => e.path === "sections[0].elements[2].type"));
});

test("unsupported properties are rejected at every level", () => {
  const d = minimal();
  d.extra = 1; d.sections[0].elements[0].onclick = "x"; d.stations[0].script = "x"; d.sections[0].elements[0].runs[0].html = "<b>";
  const r = validate(d);
  const paths = r.errors.map(e => e.path);
  assert.ok(paths.includes("extra"));
  assert.ok(paths.includes("sections[0].elements[0].onclick"));
  assert.ok(paths.includes("stations[0].script"));
  assert.ok(paths.includes("sections[0].elements[0].runs[0].html"));
});

test("markup in text, unknown marks, unknown icons and unknown scenes are rejected", () => {
  const d = minimal();
  d.sections[0].elements[0].runs = [{ t: "<script>" }, { t: "x", marks: ["blink"] }, { icon: "skull" }];
  d.sections[0].elements.push({ id: "s", type: "custom-scene", scene: "itw-whatever" });
  d.sections[0].elements.push({ id: "s2", type: "custom-scene", scene: "itw-sense-icons", params: { set: "nature", code: "alert(1)" } });
  const r = validate(d);
  const paths = r.errors.map(e => e.path);
  assert.ok(paths.includes("sections[0].elements[0].runs[0].t"));
  assert.ok(paths.includes("sections[0].elements[0].runs[1].marks[0]"));
  assert.ok(paths.includes("sections[0].elements[0].runs[2].icon"));
  assert.ok(paths.includes("sections[0].elements[2].scene"));
  assert.ok(paths.includes("sections[0].elements[3].params.code"));
});

test("stations must reference sections and increase in progress", () => {
  const d = minimal();
  d.stations.push({ p: 0.01, section: "nope", camera: "none", chapter: "c", note: "n" });
  const r = validate(d);
  const paths = r.errors.map(e => e.path);
  assert.ok(paths.includes("stations[2].p"));
  assert.ok(paths.includes("stations[2].section"));
});

test("bad tokens are rejected", () => {
  const d = minimal();
  d.tokens.colors.Signal = "#FC6452"; d.tokens.colors.bad = "red"; d.tokens.fonts.body = "url(x)";
  const r = validate(d);
  const paths = r.errors.map(e => e.path);
  assert.ok(paths.includes("tokens.colors.Signal"));
  assert.ok(paths.includes("tokens.colors.bad"));
  assert.ok(paths.includes("tokens.fonts.body"));
});

test("layout, role, style and animation are allow-listed and range-checked", () => {
  const d = minimal();
  d.sections[0].layout.variants.push("float"); d.sections[0].layout.width = "min(10px,5%) url(x)"; d.sections[0].layout.box = "grid";
  d.sections[0].elements[0].role.push("btn-primary"); d.sections[0].elements[0].style.background = "red"; d.sections[0].elements[0].style.color = "url(javascript:x)"; d.sections[0].elements[0].style.maxWidth = "url(x)"; d.sections[0].elements[0].style.fontSize = "clamp(22px, 2.6vw, 38px)";
  d.animation.stepEaseOut = 2; d.animation.stepMax = 100; d.animation.bounce = 1;
  const paths = validate(d).errors.map(e => e.path);
  assert.ok(!paths.includes("sections[0].elements[0].style.fontSize"), "clamp() is allowed");
  for (const p of ["sections[0].layout.variants[1]", "sections[0].layout.width", "sections[0].layout.box", "sections[0].elements[0].role[2]", "sections[0].elements[0].style.background", "sections[0].elements[0].style.color", "sections[0].elements[0].style.maxWidth", "animation.stepEaseOut", "animation.stepMax", "animation.bounce"]) assert.ok(paths.includes(p), p);
});

test("a v1 document migrates to the current version unchanged apart from the version, deterministically", () => {
  const v1 = minimal(); v1.schemaVersion = 1; delete v1.animation; delete v1.assets; delete v1.sections[0].layout; delete v1.sections[0].elements[0].role; delete v1.sections[0].elements[0].style; v1.sections[0].elements.pop();
  const a = migrate(v1), b = migrate(v1);
  assert.deepEqual(a, b);
  assert.equal(a.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual({ ...a, schemaVersion: 1 }, v1);
  assert.equal(validate(a).ok, true);
  const v2 = { ...minimal(), schemaVersion: 2 }; delete v2.assets;
  assert.equal(validate(migrate(v2)).ok, true);
  const v3 = { ...minimal(), schemaVersion: 3 };
  assert.equal(migrate(v3).schemaVersion, 4); assert.equal(validate(migrate(v3)).ok, true);
});

test("assets and groups are checked: path grammar, hashes, repo-relative files, no copy on a group", () => {
  const d = minimal();
  d.assets.mark.paths[0].d = "M0 0<script>"; d.assets.mark.sources[0].sha256 = "xyz"; d.assets.mark.sources.push({ path: "../../etc/passwd.svg", sha256: "b".repeat(64) });
  d.assets["Bad Id"] = { kind: "png", viewBox: "x", paths: [], sources: [] };
  d.sections[0].elements[1].runs = [{ t: "no" }];
  const paths = validate(d).errors.map(e => e.path);
  for (const p of ["assets.mark.paths[0].d", "assets.mark.sources[0].sha256", "assets.mark.sources[1].path", "assets.Bad Id", "assets.Bad Id.kind", "assets.Bad Id.viewBox", "assets.Bad Id.paths", "assets.Bad Id.sources", "sections[0].elements[1]"]) assert.ok(paths.includes(p), p);
});

test("migrate is deterministic, returns a copy, and refuses future versions", () => {
  const d = minimal();
  const a = migrate(d), b = migrate(d);
  assert.deepEqual(a, b);
  assert.notEqual(a, d);
  assert.equal(a.schemaVersion, SCHEMA_VERSION);
  assert.throws(() => migrate({ ...d, schemaVersion: SCHEMA_VERSION + 1 }));
  assert.throws(() => migrate({ ...d, schemaVersion: undefined }));
});

test("the package's SHA-256 agrees with Node's crypto", async () => {
  const { sha256Hex } = await import("../src/hash.js");
  for (const s of ["", "abc", "The quick brown fox jumps over the lazy dog", "é ü 日本語 🚀", "x".repeat(55), "y".repeat(56), "z".repeat(64), "w".repeat(1000), canonicalJSON(minimal())])
    assert.equal(sha256Hex(s), createHash("sha256").update(s, "utf8").digest("hex"), JSON.stringify(s.slice(0, 20)));
});

test("contentHash is stable and independent of key order", () => {
  const d = minimal();
  const reorder = (v) => Array.isArray(v) ? v.map(reorder) : (v && typeof v === "object") ? Object.fromEntries(Object.keys(v).reverse().map(k => [k, reorder(v[k])])) : v;
  const shuffled = reorder(d);
  assert.equal(contentHash(d), contentHash(shuffled));
  assert.equal(canonicalJSON({ b: 1, a: [{ d: 1, c: 2 }] }), '{"a":[{"c":2,"d":1}],"b":1}');
  const e = minimal(); e.sections[0].elements[0].runs[0].t = "Hello, ";
  assert.notEqual(contentHash(d), contentHash(e));
});

test("renderRuns escapes text and only emits known marks and icons", () => {
  const html = renderRuns([{ t: "a <b> & \"q\"" }, { t: "x", marks: ["em", "strong"] }, { icon: "drugs" }, { t: "y", reveal: { p: 0.5, seq: 2 } }, { t: "z", marks: ["nope"] }]);
  assert.equal(html, 'a &lt;b&gt; &amp; &quot;q&quot;<em><b>x</b></em>' + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 3.5l12 12a3.5 3.5 0 0 1-5 5l-12-12a3.5 3.5 0 0 1 5-5zM9.5 9.5l5 5"/></svg>' + '<span class="rv" data-p="0.5" data-seq="2">y</span>z');
});

test("the keynote's embedded renderRuns is the reference implementation, byte for byte", { skip: !existsSync(join(REPO, "index.html")) }, () => {
  const html = readFileSync(join(REPO, "index.html"), "utf8");
  const ref = readFileSync(join(here, "..", "src", "render-runs.js"), "utf8");
  const start = html.indexOf("  /* renderRuns: reference copy of packages/presentation-core/src/render-runs.js */");
  if (start < 0) { assert.fail("index.html does not embed renderRuns yet"); }
  const body = html.slice(start, html.indexOf("  /* end renderRuns */", start));
  // compare the function bodies with the module's export keyword and indentation stripped
  const norm = (s) => s.replace(/^\s*export /m, "").replace(/\s+/g, " ").trim();
  const refFn = ref.slice(ref.indexOf("const MARK_TAGS"), ref.lastIndexOf("}") + 1);
  const embFn = body.slice(body.indexOf("var MARK_TAGS"));
  // the embedded copy declares its two tables with `var` (the deck is ES5); inside the functions both sides use var
  assert.equal(norm(embFn.replace(/^\s*var (MARK_TAGS|ICON_SVG)/gm, "const $1")), norm(refFn));
});

test("the extracted Italian Tech Week document validates", { skip: !existsSync(join(REPO, "presentations/italian-tech-week/content/presentation.json")) }, () => {
  const doc = JSON.parse(readFileSync(join(REPO, "presentations/italian-tech-week/content/presentation.json"), "utf8"));
  const r = validate(doc);
  assert.deepEqual(r.errors, []);
  assert.equal(doc.stations.length, 55);
  assert.equal(doc.sections.length, 27);
  assert.equal(doc.sections.reduce((a, s) => a + s.elements.length, 0), 70);
  assert.equal(doc.sections.reduce((a, s) => a + s.elements.filter(e => e.type === "group").length, 0), 11);
});

test("the extracted document's assets are the geometry of the files they name, and the hashes match", { skip: !existsSync(join(REPO, "presentations/italian-tech-week/content/presentation.json")) }, () => {
  const doc = JSON.parse(readFileSync(join(REPO, "presentations/italian-tech-week/content/presentation.json"), "utf8"));
  assert.deepEqual(Object.keys(doc.assets), ["mosaic-lockup", "wave-by-vento-w"]);
  for (const [id, a] of Object.entries(doc.assets)) {
    assert.ok(a.sources.length >= 1, id);
    for (const src of a.sources) {
      const file = readFileSync(join(REPO, src.path));
      assert.equal(createHash("sha256").update(file).digest("hex"), src.sha256, `${id}: ${src.path} hash`);
      const svg = file.toString("utf8");
      assert.equal(svg.match(/viewBox="([^"]+)"/)[1], a.viewBox, `${id}: ${src.path} viewBox`);
      assert.deepEqual([...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map(m => m[1]), a.paths.map(p => p.d), `${id}: ${src.path} paths`);
    }
  }
});
