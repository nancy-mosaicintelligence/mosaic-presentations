// Proof that the deck reads layout, role, style and animation from the document, not from its markup:
// mutate each in a copy of the document, embed it into a copy of the deck under output/mutation/, and
// observe every change in the browser; the unmutated deck is the control. Needs the static server
// (python3 -m http.server 4173) at the repository root.
//   node tools/check-binding.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const { chromium } = createRequire((process.env.PW_MODULES || process.env.NODE_PATH || "") + "/")("playwright");
const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(REPO, "output/mutation"), { recursive: true });
const doc = JSON.parse(readFileSync(REPO + "/presentations/italian-tech-week/content/presentation.json", "utf8"));
const open = doc.sections.find(s => s.key === "open"), nx2 = doc.sections.find(s => s.key === "nx2");
open.layout.variants = ["right", "lowcol"]; open.layout.until = 0.0123; open.layout.width = "min(500px,40%)";
open.elements[0].role = ["lede"]; open.elements[0].style = { color: "rgb(1, 2, 3)", maxWidth: "9ch" };
nx2.elements[2].style = {};                       // drop its inline overrides entirely
doc.animation.revealSpacing = 3; doc.animation.revealFade = 0.2; doc.animation.stepMin = 3000;
const html = readFileSync(REPO + "/index.html", "utf8").replace(/<script type="application\/json" id="itw-content">[\s\S]*?<\/script>/, () => `<script type="application/json" id="itw-content">${JSON.stringify(doc).replace(/<\//g, "<\\/")}</script>`);
writeFileSync(REPO + "/output/mutation/index.html", html);
const browser = await chromium.launch({ executablePath: process.env.PW_EXEC });
async function probe(url) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage();
  await page.goto(url + "?watchdog=off"); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const sec = document.querySelector('#stagec section.beat[data-k="open"]'), mv = sec.querySelector(":scope > .mv"), h = document.querySelector('[data-id="open.1"]'), n = document.querySelector('[data-id="nx2.3"]');
    return { secClass: sec.className, until: sec.dataset.until, mvWidth: mv.style.width, heroClass: h.className, heroColor: getComputedStyle(h).color, heroMax: getComputedStyle(h).maxWidth, nx2Margin: n.style.margin, nx2Font: n.style.fontSize };
  });
  // animation: walk to the station where the therapy pills (a chips element, seq 1.3, 2.1, …) land; once the first pill
  // has fully faded in, wait 1 s: with the deck's spacing (.46 s) the second pill is at 1, with 3 s it is still 0
  const target = (() => { for (let i = 0; i < doc.stations.length; i++) { const st = doc.stations[i], sec = doc.sections.find(x => x.key === st.section); if (!sec) continue;
    const ch = sec.elements.find(e => e.type === "chips" && e.items[0].reveal.p <= st.p + .012); if (ch) return { i, key: st.section, s0: ch.items[0].reveal.seq, s1: ch.items[1].reveal.seq }; } })();
  for (let k = 0; k < target.i; k++) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(150); }
  const sel = (seq) => 'section.beat[data-k="' + target.key + '"] .chips .rv[data-seq="' + seq + '"]';
  await page.waitForFunction((q) => { const e = document.querySelector(q); return e && parseFloat(e.style.opacity) >= 1; }, sel(target.s0), { timeout: 60000 });
  await page.waitForTimeout(1000);
  r.station = target.i + 1; r.seq1Opacity = await page.evaluate((q) => document.querySelector(q).style.opacity, sel(target.s1));
  await page.close(); return r;
}
const control = await probe("http://localhost:4173/index.html"), mutated = await probe("http://localhost:4173/output/mutation/index.html");
console.log("control:", JSON.stringify(control)); console.log("mutated:", JSON.stringify(mutated));
const ok = mutated.secClass === "beat right lowcol" && mutated.until === "0.0123" && mutated.mvWidth === "min(500px, 40%)" && mutated.heroClass === "lede" && mutated.heroColor === "rgb(1, 2, 3)" && parseFloat(mutated.heroMax) < 200 && mutated.nx2Margin === "" && mutated.nx2Font === "" && parseFloat(control.seq1Opacity) >= 1 && parseFloat(mutated.seq1Opacity) === 0;
console.log(ok ? "BINDING: layout, role, style and reveal spacing all follow the document" : "BINDING FAILED: a mutated value did not reach the page");
await browser.close(); process.exit(ok ? 0 : 1);
