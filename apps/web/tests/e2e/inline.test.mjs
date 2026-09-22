// The Canva-like layer: the filmstrip and arrows move between stations; a double click on the stage opens
// a line for typing; the toolbar applies marks, size and alignment; everything lands in the draft as runs.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { startApp, ensureUsers, resetPresentation, signIn, USERS, TEST_SLUG } from "./fixtures.mjs";
const { chromium } = createRequire((process.env.PW_MODULES || process.env.NODE_PATH || "") + "/")("playwright");

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", ".."), PORT = 3125, BASE = `http://localhost:${PORT}`, ID = TEST_SLUG;
let server, browser, page;
const frame = () => page.frame({ url: /\/player\// });
const draft = async () => (await (await page.request.get(`${BASE}/api/presentations/${ID}/draft`)).json()).document;
/** Wait until the stored draft satisfies `pred` (autosave lands within a second or two). */
const untilDraft = async (pred, what = "draft change") => { const t0 = Date.now(); while (Date.now() - t0 < 15000) { const d = await draft(); if (pred(d)) return d; await new Promise(r => setTimeout(r, 250)); } throw new Error("timed out waiting for " + what + " — save state: " + JSON.stringify(await page.locator(".bar .save").textContent().catch(() => null)) + " — issues: " + JSON.stringify(await page.locator(".issues").textContent().catch(() => null)) + " — stage line: " + JSON.stringify(await frame().evaluate(() => document.querySelector('[contenteditable="true"]')?.innerHTML ?? document.querySelector('[data-id="open.1"]')?.innerHTML))); };
const savedSoon = async () => { await page.waitForTimeout(900); await page.waitForFunction(() => /^Saved /.test(document.querySelector(".bar .save")?.textContent || ""), null, { timeout: 15000 }); };
const stageReady = async () => { await page.waitForSelector(".loading", { state: "detached", timeout: 60000 }); await page.waitForSelector(".filmstrip .card", { timeout: 30000 }); await page.waitForTimeout(400); };
const pos = () => frame().evaluate(() => document.getElementById("pos").textContent);
const caretEnd = () => frame().evaluate(() => { const el = document.querySelector('[contenteditable="true"]'); const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
const dblclickOn = async (id) => {
  const el = frame().locator(`[data-id="${id}"]`); await el.waitFor({ state: "visible" });
  await frame().waitForFunction((i) => { const e = document.querySelector('[data-id="' + i + '"]'); const b = e.closest("section.beat"); return parseFloat(getComputedStyle(b || e).opacity) > 0.95; }, id, { timeout: 15000 });   // the beat has landed
  const b = await el.boundingBox();
  await page.evaluate(() => { window.__msgs = []; window.addEventListener("message", e => window.__msgs.push(e.data && e.data.type)); });
  await page.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2);
  try { await page.waitForSelector(".inline-toolbar", { timeout: 5000 }); }
  catch (e) { const diag = { msgs: await page.evaluate(() => window.__msgs), deck: await frame().evaluate(() => ({ editing: document.querySelector(".editing")?.getAttribute("data-id"), editsel: document.querySelector(".editsel")?.getAttribute("data-id"), body: document.body.className, hasDbl: document.documentElement.outerHTML.includes("lastDownEl") })), box: b }; throw new Error("no toolbar after a double click: " + JSON.stringify(diag)); }
};

before(async () => {
  server = await startApp(spawn, APP, PORT);
  browser = await chromium.launch({ executablePath: process.env.PW_EXEC });
  page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  page.on("pageerror", e => console.error("pageerror:", e.message));
  await ensureUsers(); await resetPresentation();
  const r = await signIn(page, BASE, USERS.owner); assert.equal(r.status, 200, JSON.stringify(r.body));
  await page.goto(`${BASE}/presentations/${ID}/edit`); await stageReady();
}, { timeout: 180000 });
after(async () => { await browser?.close(); server?.kill(); });

test("the filmstrip lists every station by chapter; a card, the arrows and the keys move the stage", async () => {
  assert.equal(await page.locator(".filmstrip .card").count(), 55);
  assert.ok((await page.locator(".filmstrip .chap").allTextContents()).includes("The network"));
  await page.locator('.filmstrip .card[data-i="9"]').click();
  await page.waitForFunction(() => document.querySelector('.filmstrip .card.current')?.dataset.i === "9", null, { timeout: 15000 });
  assert.ok((await pos()).startsWith("10"));
  await page.click('.preview-nav button[aria-label="next station"]'); await page.waitForFunction(() => document.querySelector('.filmstrip .card.current')?.dataset.i === "10", null, { timeout: 15000 });
  await page.locator(".stage-fit").click({ position: { x: 4, y: 4 } });   /* focus the parent document, off the frame */ await page.keyboard.press("ArrowLeft"); await page.waitForFunction(() => document.querySelector('.filmstrip .card.current')?.dataset.i === "9", null, { timeout: 15000 });
  await page.keyboard.press("Home"); await page.waitForFunction(() => document.querySelector('.filmstrip .card.current')?.dataset.i === "0", null, { timeout: 15000 });
  assert.ok((await pos()).startsWith("01"));
}, { timeout: 90000 });

test("a double click opens the line; typing lands in the draft as runs with the marks kept", async () => {
  await dblclickOn("open.1");
  assert.equal(await frame().evaluate(() => document.querySelector('[data-id="open.1"]').getAttribute("contenteditable")), "true");
  await caretEnd(); await page.keyboard.type(" — typed on the stage");
  const runs = (await untilDraft(d => d.sections[0].elements[0].runs.map(r => r.t || "").join("").includes("typed on the stage"), "the typed text")).sections[0].elements[0].runs;
  assert.ok(runs.some(r => r.marks?.includes("em") && r.t === "modern medicine"), "the emphasis survived: " + JSON.stringify(runs));
  assert.ok(runs.map(r => r.t || "").join("").endsWith("typed on the stage"), JSON.stringify(runs));
  await page.keyboard.press("Enter");
  await page.waitForSelector(".inline-toolbar", { state: "detached" });
  assert.equal(await frame().evaluate(() => document.querySelector('[data-id="open.1"]').getAttribute("contenteditable")), null);
  assert.ok((await frame().locator('[data-id="open.1"]').textContent()).includes("typed on the stage"));
}, { timeout: 90000 });

test("the toolbar: a mark on a selection, size and alignment on the element", async () => {
  await dblclickOn("open.1");
  await frame().evaluate(() => { const el = document.querySelector('[data-id="open.1"]'); const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let node; while ((node = w.nextNode())) if (node.nodeValue.includes("typed")) break; const r = document.createRange(); const i = node.nodeValue.indexOf("typed"); r.setStart(node, i); r.setEnd(node, i + 5); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
  await page.click(".inline-toolbar .mk.hl");
  let runs = (await untilDraft(d => d.sections[0].elements[0].runs.some(r => r.marks?.includes("hl")), "the highlight")).sections[0].elements[0].runs;
  assert.ok(runs.some(r => r.t === "typed" && r.marks?.includes("hl")), JSON.stringify(runs));
  await page.click('.inline-toolbar button[title="larger"]'); await page.click('.inline-toolbar button[title="right"]');
  const el = (await untilDraft(d => d.sections[0].elements[0].style?.textAlign === "right", "the alignment")).sections[0].elements[0];
  assert.match(el.style.fontSize, /^\d+px$/); assert.equal(el.style.textAlign, "right");
  assert.equal(await frame().evaluate(() => document.querySelector('[data-id="open.1"]').style.textAlign), "right");
  await page.click(".inline-toolbar .done"); await page.waitForSelector(".inline-toolbar", { state: "detached" });
  // undo walks the alignment back and the stage follows
  await page.locator(".stage-fit").click({ position: { x: 4, y: 4 } });   /* focus the parent document, off the frame */ await page.keyboard.press("Meta+z");
  await untilDraft(d => d.sections[0].elements[0].style?.textAlign === undefined, "the undo");
}, { timeout: 90000 });

test("a list item edits on its own; a second station's line too", async () => {
  await page.locator('.filmstrip .card[data-i="10"]').click(); await page.waitForFunction(() => document.querySelector('.filmstrip .card.current')?.dataset.i === "10", null, { timeout: 15000 });
  const key = (await draft()).stations[10].section, sel = `section.beat[data-k="${key}"] ul.pts li`;
  const li = frame().locator(sel).first(); await li.waitFor({ state: "visible" });
  await frame().waitForFunction((q) => { const li = document.querySelector(q); return parseFloat(getComputedStyle(li.closest("section.beat")).opacity) > 0.95 && parseFloat(getComputedStyle(li).opacity) > 0.95; }, sel, { timeout: 15000 });
  const b = await li.boundingBox(); await page.mouse.dblclick(b.x + 20, b.y + b.height / 2); await page.waitForSelector(".inline-toolbar", { timeout: 5000 });
  await caretEnd(); await page.keyboard.type(" (edited)"); await page.keyboard.press("Enter");
  await untilDraft(d => { const sec = d.sections.find(s => s.key === d.stations[10].section); const list = sec.elements.find(e => e.type === "list"); return list.items[0].runs.map(r => r.t || "").join("").endsWith("(edited)"); }, "the list item");
}, { timeout: 90000 });
