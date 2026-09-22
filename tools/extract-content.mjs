// Extract the Italian Tech Week keynote's authored content into the structured document
// (presentations/italian-tech-week/content/presentation.json) and a binding map
// (content/bindings.json) that ties each element id to its start tag in index.html.
//
// Source of truth for copy is the rendered DOM (headless Chromium), so nothing is
// guessed from regexes over markup; stations, tokens and JS-authored lists are read
// from the source text. Run with PW_EXEC/NODE_PATH as documented in docs/STATUS.md.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
// Playwright is a tool, not a dependency of the deck: it is resolved from PW_MODULES (or NODE_PATH), never installed here.
const { chromium } = createRequire((process.env.PW_MODULES || process.env.NODE_PATH || "") + "/")("playwright");
const REPO = join(here, "..");
const SRC = process.argv[2] || join(REPO, "index.html");
const OUT_DIR = join(REPO, "presentations/italian-tech-week/content");
const URL = process.env.DECK_URL || "http://localhost:4173/index.html?watchdog=off";

const html = readFileSync(SRC, "utf8");
const embeddedMatch = html.match(/<script type="application\/json" id="itw-content">([\s\S]*?)<\/script>/);
const EMBEDDED = embeddedMatch ? JSON.parse(embeddedMatch[1]) : null;

/* ---------- from the source text ---------- */
function literal(name, open = "[", close = "];") {
  const s = html.indexOf(`  var ${name} = ${open}`);
  if (s < 0) throw new Error(`no ${name} literal`);
  const e = html.indexOf(close, s);
  return html.slice(s + `  var ${name} = `.length, e + close.length - 1);
}
const decode = (s) => s.replace(/&rsquo;/g, "’").replace(/&middot;/g, "·").replace(/&#8209;/g, "‑").replace(/&rarr;/g, "→").replace(/&#39;/g, "'").replace(/&amp;/g, "&");

const stations = EMBEDDED ? EMBEDDED.stations : new Function(`return ${literal("STATIONS")}`)().map(s => {
  const o = { p: s.p, section: s.k, camera: s.o, chapter: s.c, note: s.n };
  if (s.dur !== undefined) o.dur = s.dur;
  for (const f of ["black", "road", "lite", "vessel"]) if (s[f]) o[f] = true;
  return o;
});

const rootCss = html.slice(html.indexOf(":root{"), html.indexOf("}", html.indexOf(":root{")));
const tok = (name) => { const m = rootCss.match(new RegExp(`--${name}:([^;]+);`)); if (!m) throw new Error(`token --${name}`); return m[1].trim(); };
const tokens = {
  colors: Object.fromEntries(["black", "white", "grey", "warm", "room", "signal", "signal2", "ink", "ink-2", "ink-3", "hair", "hair-2", "chip"].map(n => [n, tok(n)])),
  fonts: Object.fromEntries([["serif", "f-serif"], ["body", "f-body"], ["chalk", "f-chalk"], ["mono", "f-mono"]].map(([k, n]) => [k, tok(n)]))
};

/* ---------- HTML string → runs (for the few JS-authored strings with inline tags) ---------- */
function htmlToRuns(s) {
  const runs = [];
  const re = /<(\/?)(b|em|i)>/g; let last = 0, stack = [], m;
  const push = (t) => { if (!t) return; const r = { t: decode(t) }; if (stack.length) r.marks = stack.map(x => x === "b" ? "strong" : x); runs.push(r); };
  while ((m = re.exec(s))) { push(s.slice(last, m.index)); if (m[1]) stack.pop(); else stack.push(m[2]); last = re.lastIndex; }
  push(s.slice(last));
  return runs;
}

// global animation values: from the embedded document once bound, else read off the source constants
const num = (re) => { const m = html.match(re); if (!m) throw new Error("animation constant " + re); return +m[1]; };
const animation = EMBEDDED && EMBEDDED.animation ? EMBEDDED.animation : {
  revealSpacing: num(/R\.seq\*\(REDUCED\?0:(\.\d+)\)\) \/ \(REDUCED\?\.01:\.\d+\)/), revealFade: num(/R\.seq\*\(REDUCED\?0:\.\d+\)\) \/ \(REDUCED\?\.01:(\.\d+)\)/),
  stepMin: num(/Math\.max\((\d+), Math\.min\(\d+, Math\.abs\(PT - P\)/), stepMax: num(/Math\.max\(\d+, Math\.min\((\d+), Math\.abs\(PT - P\)/),
  stepPerUnit: num(/Math\.abs\(PT - P\) \* (\d+)\)/), stepEaseOut: num(/return lerp\(smooth\(k\), o, (\.\d+)\)/)
};

// JS-authored copy: from the source literals before the deck is bound, from the embedded document after
let jsCopy;
if (EMBEDDED) {
  const c = EMBEDDED.copy, tun = EMBEDDED.sections.find(s => s.key === "tun");
  jsCopy = { road: c.road, tunnel: tun.elements, team: c.team, sites: c.sites, impactBars: c.impactBars, senseNature: c.senseNature, senseEngineering: c.senseEngineering };
} else {
  // MILE holds [year-html, text-html, ICON.x]; strip the icon reference before evaluating
  const mileText = literal("MILE").replace(/,\s*ICON\.[a-z]+\s*\]/g, "]");
  const MILE = new Function(`return ${mileText}`)();
  const DRIVE = new Function(`return ${literal("DRIVE")}`)();
  const SEE = html.match(/var SEE = "([^"]+)";/)[1];
  const icoSrc = html.slice(html.indexOf("  var ICO = {"), html.indexOf("  (function buildIcons()"));
  const icoLabels = (key) => [...icoSrc.slice(icoSrc.indexOf(`${key}: [`), icoSrc.indexOf("]\n", icoSrc.indexOf(`${key}: [`) + 8) + 1).matchAll(/\["([^"]+)","M/g)].map(m => m[1]);
  jsCopy = {
    road: MILE.map(m => ({ year: htmlToRuns(m[0]), text: htmlToRuns(m[1]) })),
    tunnel: [{ id: "tun.1", type: "text", runs: htmlToRuns(SEE) }, { id: "tun.2", type: "list", items: DRIVE.map(t => ({ runs: [{ t }] })) }],
    team: new Function(`return ${literal("ROLES")}`)().map(r => r.t),
    sites: new Function(`return ${literal("SITES")}`)().map(s => s.k),
    impactBars: new Function(`return ${literal("IMPB")}`)().map(b => b.t.join(" ")),
    senseNature: icoLabels("nature"), senseEngineering: icoLabels("eng")
  };
}

/* ---------- from the DOM ---------- */
const browser = await chromium.launch({ executablePath: process.env.PW_EXEC });
const page = await browser.newPage();
await page.goto(URL, { waitUntil: "load" });
const dom = await page.evaluate(() => {
  const MARK = (el) => {
    const tag = el.tagName.toLowerCase(), cls = el.classList;
    if (tag === "em") return cls.contains("hl") ? "hl" : "em";
    if (tag === "b") return cls.contains("lead") ? "lead" : cls.contains("x2") ? "x2" : "strong";
    if (tag === "i") return "i";
    return null;
  };
  const ICON_BY_LABEL = { "drugs": "drugs", "radiation": "radiation", "energy": "energy", "embolic agents": "embolic-agents", "other therapies": "other-therapies" };
  const norm = (s) => s.replace(/\s+/g, " ");
  // walk an element's children into runs; marks and reveals nest
  function runsOf(el, marks = [], reveal = null) {
    const out = [];
    for (const n of el.childNodes) {
      if (n.nodeType === 3) { const t = norm(n.nodeValue); if (!t.trim() && out.length === 0) continue; if (!t.trim() && n === el.lastChild) continue; const r = { t }; if (marks.length) r.marks = [...marks]; if (reveal) r.reveal = reveal; out.push(r); continue; }
      if (n.nodeType !== 1) continue;
      const tag = n.tagName.toLowerCase();
      if (tag === "svg") { const label = norm(el.textContent).trim(); const r = { icon: ICON_BY_LABEL[label] || label }; if (reveal) r.reveal = reveal; out.push(r); continue; }
      const m = MARK(n);
      let rv = reveal;
      if (n.classList.contains("rv")) rv = { p: +n.dataset.p, ...(n.dataset.seq !== undefined ? { seq: +n.dataset.seq } : {}) };
      if (m || tag === "span") out.push(...runsOf(n, m ? [...marks, m] : marks, rv));
      else throw new Error("unexpected child <" + tag + "> in " + el.outerHTML.slice(0, 80));
    }
    // trim the element's leading/trailing whitespace
    if (out.length && out[0].t !== undefined) out[0].t = out[0].t.replace(/^\s+/, "");
    if (out.length && out[out.length - 1].t !== undefined) out[out.length - 1].t = out[out.length - 1].t.replace(/\s+$/, "");
    return out.filter(r => r.icon || r.t !== "");
  }
  // nth among the SOURCE elements of that tag in the section: anything the renderer generates at run time
  // (icons, chart, board, bubbles, arrows, loop, tie sketch) lives inside these containers and is skipped
  const GENERATED = "#icoNature, #icoEng, #impchart, .boardsk, .bub, .marrow, .loopsvg, .sensetie";
  const tagNth = (sec, el) => { const tag = el.tagName.toLowerCase(); const all = [...sec.querySelectorAll(tag)].filter(x => !x.parentElement.closest(GENERATED)); return { tag, nth: all.indexOf(el) }; };
  const reveal = (el) => el.dataset.p !== undefined ? { p: +el.dataset.p, ...(el.dataset.seq !== undefined ? { seq: +el.dataset.seq } : {}) } : undefined;
  const STYLE_KEYS = ["maxWidth", "margin", "marginTop", "marginBottom", "textAlign", "fontSize", "lineHeight", "color"];
  // the shorthand wins over the longhands the CSSOM derives from it
  const styleOf = (el) => { const o = {}; for (const k of STYLE_KEYS) if (el.style[k]) o[k] = el.style[k]; if (o.margin) { delete o.marginTop; delete o.marginBottom; } return Object.keys(o).length ? o : undefined; };
  const sections = [], bindings = [];
  for (const sec of document.querySelectorAll("#stagec section.beat")) {
    const key = sec.dataset.k, elements = []; let n = 0;
    const layout = { variants: [...sec.classList].filter(c => c !== "beat") };
    if (sec.dataset.until !== undefined) layout.until = +sec.dataset.until;
    const mv = sec.querySelector(":scope > .mv");
    if (mv) { if (mv.style.width) layout.width = mv.style.width.replace(/\s+/g, ""); const box = [...mv.classList].find(c => c !== "mv"); if (box) layout.box = box; }
    const bind = (el, id) => { const { tag, nth } = tagNth(sec, el); bindings.push({ id, section: key, tag, nth }); };
    const add = (el, type, extra) => { const id = key + "." + (++n); const e = { id, type, ...extra }; const rv = reveal(el); if (rv && type !== "chips") e.reveal = rv;
      const role = [...el.classList].filter(Boolean); if (role.length) e.role = role; const st = styleOf(el); if (st) e.style = st; if (el.style.display === "none") e.hidden = true;
      elements.push(e); bind(el, id); return e; };
    // document order over the copy-bearing and scene elements
    const walker = document.createTreeWalker(sec, NodeFilter.SHOW_ELEMENT);
    const handled = new Set();
    for (let el = walker.nextNode(); el; el = walker.nextNode()) {
      if ([...handled].some(h => h.contains(el))) continue;
      const tag = el.tagName.toLowerCase();
      if (el.matches("ul.pts")) { add(el, "list", { items: [...el.children].map(li => { const it = { runs: runsOf(li) }; const rv = reveal(li); if (rv) it.reveal = rv; return it; }) }); handled.add(el); continue; }
      if (el.matches(".chips")) { add(el, "chips", { items: [...el.children].map(sp => { const it = { runs: runsOf(sp) }; const rv = reveal(sp); if (rv) it.reveal = rv; return it; }) }); handled.add(el); continue; }
      if (el.matches(".chain")) { add(el, "chain", { items: [...el.children].map(p => ({ runs: runsOf(p) })) }); handled.add(el); continue; }
      if (el.matches(".loop")) { add(el, "loop-labels", { items: [...el.querySelectorAll(".lp")].map(p => { const it = { runs: runsOf(p) }; const rv = reveal(p); if (rv) it.reveal = rv; return it; }) }); handled.add(el); continue; }
      if (el.matches("#impchart")) { add(el, "custom-scene", { scene: "itw-impact-chart" }); handled.add(el); continue; }
      if (el.matches("#icoNature")) { add(el, "custom-scene", { scene: "itw-sense-icons", params: { set: "nature" } }); handled.add(el); continue; }
      if (el.matches("#icoEng")) { add(el, "custom-scene", { scene: "itw-sense-icons", params: { set: "engineering" } }); handled.add(el); continue; }
      if (el.matches(".sensetie")) { add(el, "custom-scene", { scene: "itw-sense-tie" }); handled.add(el); continue; }
      if (el.matches(".boardsk")) { add(el, "custom-scene", { scene: "itw-chalkboard" }); handled.add(el); continue; }
      if (el.matches(".bub")) { handled.add(el); continue; }   /* drawn by the chalkboard scene */
      /* a structural container with its own reveal: a group; its children follow as elements of their own */
      if (el.matches(".acts, .sense, .mnode, .marrow, .mv1")) { add(el, "group", {}); continue; }
      if (tag === "p" || el.matches("span.mk") || el.matches(".cue")) { add(el, "text", { runs: runsOf(el) }); handled.add(el); continue; }
    }
    sections.push({ key, layout, elements });
  }
  const text = (sel) => document.querySelector(sel).textContent.replace(/\s+/g, " ").trim();
  const copy = {
    annotations: [...document.querySelectorAll("#annot .ant")].map(a => text.call(null, "#annot .ant") && a.textContent.trim()),
    substitution: runsOf(document.getElementById("subst")),
    fluoroscopyPlaceholders: [...document.querySelectorAll(".fluo .ph span")].map(s => s.textContent.trim()),
    partnerLine: text("#partner .when"),
    notesLabel: text("#notes .lab"),
    safeNote: text("#safenote"),
    hud: { safe: "Safe", notes: "Notes", present: "Present", explore: "Explore", fullscreen: document.getElementById("btnFull").firstChild.textContent.trim() },
    cue: text("#cue")
  };
  // the cue lives inside the open section but is chrome, not copy of the section: drop it from the section's elements
  for (const s of sections) s.elements = s.elements.filter(e => !(s.key === "open" && e.type === "text" && e.runs.length === 1 && e.runs[0].t === copy.cue));
  const psvg = document.querySelector("#partner svg");
  const partner = { viewBox: psvg.getAttribute("viewBox"), paths: [...psvg.querySelectorAll("path")].map(p => ({ d: p.getAttribute("d") })) };
  return { sections, bindings, copy, partner };
});

/* ---------- assets: the geometry the renderer draws, from the embedded document once bound, else from the source constants
   and the rendered header; the files each was taken from are hashed from disk either way ---------- */
const ASSET_SOURCES = {
  "mosaic-lockup": ["presentations/italian-tech-week/assets/brand/mosaic_logo_white.svg", "presentations/italian-tech-week/assets/brand/mosaic_logo_fullcolor.svg"],
  "wave-by-vento-w": ["presentations/italian-tech-week/assets/partners/wave-by-vento-w.svg"]
};
const str = (name) => { const m = html.match(new RegExp(`  var ${name} = "([^"]*)";`)); if (!m) throw new Error(`no ${name} constant`); return m[1]; };
const assets = EMBEDDED && EMBEDDED.assets ? EMBEDDED.assets : {
  "mosaic-lockup": { kind: "svg-paths", use: "the header lockup on both stages and the closing lockup; the icon then the wordmark, filled per surface", viewBox: str("LOGO_VB"), paths: [{ d: str("LOGO_ICON_D") }, { d: str("LOGO_WORD_D") }], sources: [] },
  "wave-by-vento-w": { kind: "svg-paths", use: "the event mark in the header", viewBox: dom.partner.viewBox, paths: dom.partner.paths, sources: [] }
};
for (const [id, files] of Object.entries(ASSET_SOURCES)) assets[id].sources = files.map(path => ({ path, sha256: createHash("sha256").update(readFileSync(join(REPO, path))).digest("hex") }));
await browser.close();

// the cue was numbered in the walk; renumber the open section so ids stay dense
const bindingsOut = dom.bindings.filter(b => !(b.section === "open" && !dom.sections[0].elements.some(e => e.id === b.id)));

const doc = {
  schemaVersion: 6,
  id: "italian-tech-week-2026",
  title: "The Room and the Vessel",
  renderer: "itw-keynote",
  meta: { extractedFrom: "index.html", extractedAt: new Date().toISOString().slice(0, 10) },
  tokens,
  animation,
  assets,
  copy: {
    road: jsCopy.road,
    team: jsCopy.team,
    sites: jsCopy.sites,
    impactBars: jsCopy.impactBars,
    senseNature: jsCopy.senseNature,
    senseEngineering: jsCopy.senseEngineering,
    annotations: dom.copy.annotations,
    substitution: dom.copy.substitution,
    fluoroscopyPlaceholders: dom.copy.fluoroscopyPlaceholders,
    partnerLine: dom.copy.partnerLine,
    cue: dom.copy.cue,
    notesLabel: dom.copy.notesLabel,
    safeNote: dom.copy.safeNote,
    hud: dom.copy.hud
  },
  sections: (() => { const out = [...dom.sections]; const at = out.findIndex(s => s.key === "ves2") + 1; out.splice(at, 0, { key: "tun", elements: jsCopy.tunnel }); return out; })(),
  stations
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "presentation.json"), JSON.stringify(doc, null, 2) + "\n");
writeFileSync(join(OUT_DIR, "bindings.json"), JSON.stringify(bindingsOut, null, 2) + "\n");
console.log(`sections ${doc.sections.length}, elements ${doc.sections.reduce((a, s) => a + s.elements.length, 0)}, stations ${doc.stations.length}, bindings ${bindingsOut.length}`);
