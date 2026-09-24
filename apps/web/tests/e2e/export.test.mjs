// Export to Google Slides: the bar's Export makes a .pptx in which every station in the chosen range is one slide —
// the scene as a picture behind editable text boxes in the deck's fonts and colours, the speaker note, a fade between
// slides — and the stage comes back untouched. Exports stations 1–3 of the test copy and reads the package.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { startApp, ensureUsers, resetPresentation, signIn, USERS, TEST_SLUG } from "./fixtures.mjs";
const { chromium } = createRequire((process.env.PW_MODULES || process.env.NODE_PATH || "") + "/")("playwright");
const require = createRequire(import.meta.url);
const JSZip = require("jszip");

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", ".."), PORT = 3131, BASE = `http://localhost:${PORT}`, ID = TEST_SLUG;
let server, browser, page;
const frame = () => page.frame({ url: /\/player\// });
const stageReady = async () => { await page.waitForSelector(".loading", { state: "detached", timeout: 60000 }); await page.waitForSelector(".filmstrip .card", { timeout: 30000 }); await page.waitForTimeout(400); };
const content = JSON.parse(readFileSync(join(APP, "..", "..", "presentations", "italian-tech-week", "content", "presentation.json"), "utf8"));
const setNumber = async (locator, v) => { await locator.fill(String(v)); };

before(async () => {
  server = await startApp(spawn, APP, PORT);
  browser = await chromium.launch({ executablePath: process.env.PW_EXEC });
  page = await (await browser.newContext({ viewport: { width: 1600, height: 900 }, acceptDownloads: true })).newPage();
  page.on("pageerror", e => console.error("pageerror:", e.message));
  await ensureUsers(); await resetPresentation();
  const r = await signIn(page, BASE, USERS.owner); assert.equal(r.status, 200, JSON.stringify(r.body));
  await page.goto(`${BASE}/presentations/${ID}/edit`); await stageReady();
}, { timeout: 180000 });
after(async () => { await browser?.close(); server?.kill(); });

let zip, slides;
test("stations 1–3 export as three slides, and the stage is itself again afterwards", async () => {
  await page.locator(".filmstrip .card[data-i='4']").click();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const dlg = page.locator(".share.export"); await dlg.waitFor();
  await setNumber(dlg.getByLabel("from station"), 1); await setNumber(dlg.getByLabel("to station"), 3);
  const download = page.waitForEvent("download", { timeout: 120000 });
  await dlg.locator("button.primary").click();
  const file = await download;
  assert.equal(file.suggestedFilename(), "E2E keynote.pptx");
  const path = await file.path(); const buf = readFileSync(path);
  await dlg.locator("text=/Done:/").waitFor({ timeout: 20000 });
  zip = await JSZip.loadAsync(buf);
  slides = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort();
  assert.equal(slides.length, 3);
  // the stage: no leftovers of the export, back on the station we were at, still editable
  const left = await frame().evaluate(() => ({ still: !!document.getElementById("glstill"), gl: document.getElementById("gl").style.display, exporting: document.body.classList.contains("exporting"), editing: document.body.classList.contains("editing"),
    transparent: [].filter.call(document.querySelectorAll("[data-id], [data-id] *"), e => e.style.color === "transparent").length, pos: document.getElementById("pos").textContent }));
  assert.deepEqual(left, { still: false, gl: "", exporting: false, editing: true, transparent: 0, pos: "05 / " + content.stations.length });
  const dir = join(APP, "test-results"); mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, "export-1-3.pptx"), buf);
}, { timeout: 180000 });

test("each slide has the scene as its background, the words as text boxes in the deck's fonts, a fade, and its note", async () => {
  for (let i = 0; i < 3; i++) {
    const xml = await zip.file(slides[i]).async("string");
    assert.match(xml, /<p:bg>/, `slide ${i + 1} background`);
    assert.match(xml, /<p:transition spd="med"><p:fade\/><\/p:transition>/, `slide ${i + 1} transition`);
    assert.ok(xml.includes('typeface="DM Sans"') || xml.includes('typeface="Fraunces"'), `slide ${i + 1} in the deck's fonts`);
    const rels = await zip.file(`ppt/slides/_rels/slide${i + 1}.xml.rels`).async("string");
    const media = /Target="\.\.\/media\/([^"]+)"/.exec(rels); assert.ok(media, `slide ${i + 1} picture`);
    const img = await zip.file(`ppt/media/${media[1]}`).async("nodebuffer"); assert.ok(img.length > 5000, `slide ${i + 1} picture has content`);
    writeFileSync(join(APP, "test-results", `export-slide${i + 1}.jpeg`), img);
    const notes = /<Relationship[^>]+Target="\.\.\/notesSlides\/(notesSlide\d+\.xml)"/.exec(rels); assert.ok(notes, `slide ${i + 1} notes`);
    const nx = await zip.file(`ppt/notesSlides/${notes[1]}`).async("string");
    const want = content.stations[i].note.slice(0, 40).replace(/&/g, "&amp;");
    assert.ok(nx.includes(want), `slide ${i + 1} note: ${want}`);
  }
  const s1 = await zip.file(slides[0]).async("string");
  assert.ok(s1.includes("Surgery is the closest") && s1.includes("modern medicine") && s1.includes('typeface="Fraunces"'), "the opening line, in runs, in the serif");
  assert.ok(/<a:solidFill><a:srgbClr val="FC6452"/.test(s1), "the accent colour on its run");
  // the words line for line, as the deck breaks them; the header marks as pictures of their own
  const hero = /<p:sp>(?:(?!<\/p:sp>).)*Surgery is the closest(?:(?!<\/p:sp>).)*<\/p:sp>/s.exec(s1); assert.ok(hero && hero[0].includes("<a:br/>"), "the opening line breaks where the deck breaks it");
  assert.equal((hero[0].match(/<a:p>/g) || []).length, 1, "one paragraph"); assert.equal((hero[0].match(/<a:pPr/g) || []).length, 1, "its properties once");
  assert.ok(hero[0].includes('<a:spcPts val='), "an exact line pitch");
  assert.ok((s1.match(/<p:pic>/g) || []).length >= 2, "the Mosaic logo and the event mark are pictures");
  const rels1 = await zip.file("ppt/slides/_rels/slide1.xml.rels").async("string"); const pngs = [...rels1.matchAll(/Target="\.\.\/media\/([^"]+\.png)"/g)].map(m => m[1]);
  assert.ok(pngs.length >= 3, "the background and two transparent pictures");
  writeFileSync(join(APP, "test-results", "export-mark.png"), await zip.file(`ppt/media/${pngs[pngs.length - 1]}`).async("nodebuffer"));
  const s3 = await zip.file(slides[2]).async("string");
  assert.ok(s3.includes("150 years"), "the third station's line");
});

test("a station on the rendered scene and one on white export too", async () => {
  const dlg = page.locator(".share.export");   // still open from the first export
  const one = async (n) => {
    await setNumber(dlg.getByLabel("from station"), n); await setNumber(dlg.getByLabel("to station"), n);
    const download = page.waitForEvent("download", { timeout: 120000 }); await dlg.locator("button.primary").click(); const file = await download;
    await dlg.locator("text=/Done:/").waitFor({ timeout: 20000 });
    const z = await JSZip.loadAsync(readFileSync(await file.path()));
    const rels = await z.file("ppt/slides/_rels/slide1.xml.rels").async("string"); const media = /Target="\.\.\/media\/([^"]+)"/.exec(rels);
    writeFileSync(join(APP, "test-results", `export-station${n}.jpeg`), await z.file(`ppt/media/${media[1]}`).async("nodebuffer"));
    const pngs = [...rels.matchAll(/Target="\.\.\/media\/([^"]+\.png)"/g)].map(m => m[1]);
    for (const [k, name] of pngs.entries()) writeFileSync(join(APP, "test-results", `export-station${n}-pic${k}.png`), await z.file(`ppt/media/${name}`).async("nodebuffer"));
    last = z; return z.file("ppt/slides/slide1.xml").async("string");
  };
  let last;
  // safe mode (the watchdog's fallback, no scene) steps aside for the export and comes back afterwards
  await page.evaluate(() => { const w = document.querySelector("iframe").contentWindow; w.postMessage({ v: 1, type: "itw:safe", on: true }, location.origin); window.__safeSeen = []; window.addEventListener("message", e => { if (e.data && e.data.type === "itw:exportReady") window.__safeSeen.push(document.querySelector("iframe").contentDocument.body.classList.contains("safe")); }); });
  await frame().waitForFunction(() => document.body.classList.contains("safe"));
  const room = await one(8); assert.ok(room.includes("vascular system"), "station 8's line");
  assert.deepEqual(await page.evaluate(() => window.__safeSeen), [false], "the picture was taken with the scene on");
  assert.equal(await frame().evaluate(() => document.body.classList.contains("safe")), true, "safe mode is back");
  await page.evaluate(() => document.querySelector("iframe").contentWindow.postMessage({ v: 1, type: "itw:safe", on: false }, location.origin));
  const white = await one(24); assert.ok(white.includes('typeface="'), "station 24 has words");
  // the pills (chips) are filled, rounded text boxes with their icons as pictures; the staggered reveals have all landed
  const chips = await one(18);
  const pill = /<p:sp>(?:(?!<\/p:sp>).)*<a:t>drugs<\/a:t>(?:(?!<\/p:sp>).)*<\/p:sp>/s.exec(chips); assert.ok(pill, "the drugs pill");
  assert.ok(pill[0].includes('prst="roundRect"') && /<p:spPr>(?:(?!<\/p:spPr>).)*<a:ln/s.test(pill[0]), "a rounded box with an edge");
  assert.ok(["radiation", "energy"].every(t => chips.includes(`<a:t>${t}</a:t>`)), "every chip, however late it reveals");
  assert.ok((chips.match(/<p:pic>/g) || []).length >= 5, "the marks and the chip icons are pictures");
  // the icon rows: pictures of their own whose strokes come from the stylesheet — they must survive the raster
  const nature = await one(37); const rels37 = /<Relationship[^>]+Target="\.\.\/media\/([^"]+\.png)"/g; let m37, big = 0;
  const r37 = await last.file("ppt/slides/_rels/slide1.xml.rels").async("string");
  while ((m37 = rels37.exec(r37))) { const buf = await last.file(`ppt/media/${m37[1]}`).async("nodebuffer"); if (buf.length > big) { big = buf.length; writeFileSync(join(APP, "test-results", "export-icons.png"), buf); } }
  assert.ok(nature.includes("But nature") && nature.includes("<a:t>ultrasound</a:t>"), "station 37's lines, the icon labels among them");
  assert.ok((nature.match(/<p:pic>/g) || []).length >= 8, "the marks and every icon are pictures of their own");
  await dlg.getByRole("button", { name: "×" }).click();
}, { timeout: 240000 });

test("a text box sits where the words sit on the stage", async () => {
  const s1 = await zip.file(slides[0]).async("string");
  const sp = /<p:sp>(?:(?!<\/p:sp>).)*Surgery is the closest(?:(?!<\/p:sp>).)*<\/p:sp>/s.exec(s1); assert.ok(sp, "the opening box");
  const off = /<a:off x="(\d+)" y="(\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"\/>/.exec(sp[0]); assert.ok(off);
  const emu = 914400, box = { x: +off[1] / emu / 10, y: +off[2] / emu / 5.625, w: +off[3] / emu / 10, h: +off[4] / emu / 5.625 };   // fractions of the slide
  await page.locator(".filmstrip .card[data-i='0']").click(); await page.waitForTimeout(1500);
  // the words themselves (a centred line is narrower than its element)
  const on = await frame().evaluate(() => { const e = document.querySelector('[data-id="open.1"]'); const rg = document.createRange(); rg.selectNodeContents(e); const r = rg.getBoundingClientRect(); return { x: r.left / innerWidth, y: r.top / innerHeight, w: r.width / innerWidth, h: r.height / innerHeight }; });
  // a centred box is wider than its words (room for a wider face) and shares their centre and top
  assert.ok(Math.abs((box.x + box.w / 2) - (on.x + on.w / 2)) < 0.02 && Math.abs(box.y - on.y) < 0.04, `centre/top: pptx ${JSON.stringify(box)} stage ${JSON.stringify(on)}`);
  assert.ok(box.w > on.w && box.w < on.w * 1.5 && box.h > on.h * 0.8 && box.h < on.h * 1.4, `size: pptx ${JSON.stringify(box)} stage ${JSON.stringify(on)}`);
});
