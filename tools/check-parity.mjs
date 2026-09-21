// Station-by-station parity between two builds of the deck: for every station, the visible
// text of the live beat(s), the chapter and counter, the speaker note, the reveal attributes,
// the room annotations and the overlay copy must be identical. Used to prove that binding the
// deck to structured content (Phase 5) changed nothing the audience or presenter sees.
//   node tools/check-parity.mjs <urlA> <urlB>
import { createRequire } from "node:module";
const { chromium } = createRequire((process.env.PW_MODULES || process.env.NODE_PATH || "") + "/")("playwright");
const [A, B] = process.argv.slice(2);
if (!A || !B) { console.error("usage: check-parity <urlA> <urlB>"); process.exit(2); }
const browser = await chromium.launch({ executablePath: process.env.PW_EXEC });
async function snapshot(url) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 810 }, reducedMotion: "reduce" })).newPage();
  await page.goto(url + (url.includes("?") ? "&" : "?") + "watchdog=off"); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(500);
  const total = await page.evaluate(() => parseInt(document.getElementById("pos").textContent.split("/")[1], 10));
  const out = [];
  for (let n = 1; n <= total; n++) {
    if (n > 1) await page.keyboard.press("ArrowRight");
    // settle: the counter shows this station and no beat is mid-fade (software rendering can be slow)
    await page.waitForFunction((n) => parseInt(document.getElementById("pos").textContent, 10) === n && [...document.querySelectorAll("section.beat")].every(b => { const o = parseFloat(b.style.opacity || 0); return o < .02 || o > .98; }), n, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(150);
    out.push(await page.evaluate(() => {
      const norm = (s) => s.replace(/\s+/g, " ").trim();
      const live = [...document.querySelectorAll("section.beat")].filter(b => parseFloat(getComputedStyle(b).opacity) > .5)
        .map(b => b.dataset.k + ": " + norm(b.innerText) + " | rv=" + [...b.querySelectorAll("[data-p]")].map(e => String(parseFloat(e.dataset.p)) + (e.dataset.seq ? "/" + String(parseFloat(e.dataset.seq)) : "")).join(","));
      const tokens = ["signal", "ink", "f-serif", "f-body"].map(t => getComputedStyle(document.documentElement).getPropertyValue("--" + t).trim());
      const cs = getComputedStyle(document.querySelector(".hero, .big, p"));
      return {
        pos: document.getElementById("pos").textContent.trim(), chap: document.getElementById("chap").textContent.trim(),
        note: norm(document.getElementById("notesBody").innerText), live,
        overlays: [norm(document.getElementById("subst").innerText), ...[...document.querySelectorAll("#annot .ant")].map(a => norm(a.textContent)), norm(document.getElementById("labL").innerText), norm(document.getElementById("subL").innerText), norm(document.getElementById("subR").innerText), ...[...document.querySelectorAll("#tlbox .yr, #tlbox .tx")].map(e => norm(e.innerHTML))],
        chrome: [norm(document.getElementById("hud").innerText).replace(/\b\d\d:\d\d\b/, "mm:ss"), norm(document.querySelector("#partner .when").textContent), norm(document.getElementById("safenote").textContent), norm(document.querySelector("#notes .lab").textContent)],
        tokens, font: cs.fontFamily
      };
    }));
  }
  await page.close();
  return out;
}
const a = await snapshot(A); const b = await snapshot(B);   /* one at a time: two software-rendered pages contend for the CPU */
await browser.close();
let diffs = 0;
for (let i = 0; i < Math.max(a.length, b.length); i++) {
  const sa = JSON.stringify(a[i]), sb = JSON.stringify(b[i]);
  if (sa !== sb) { diffs++; let j = 0; while (sa[j] === sb[j]) j++; console.log(`station ${i + 1} differs at char ${j}:\n  A: ${sa.slice(Math.max(0, j - 80), j + 120)}\n  B: ${sb.slice(Math.max(0, j - 80), j + 120)}`); }
}
console.log(diffs === 0 ? `PARITY: all ${a.length} stations identical (text, reveals, notes, overlays, chrome, tokens)` : `${diffs} station(s) differ`);
process.exit(diffs === 0 ? 0 : 1);
