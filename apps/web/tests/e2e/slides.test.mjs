// The Slides-like layer: free text and image boxes, moving by drag and resizing by handle, nudging flow lines,
// images dropped from the library or from files, image boxes filled by click or drop (the keynote's fluoroscopy
// frames among them), the renderer's own copy typed in place, and the bar: Save, History, Present, Publish, Share.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { startApp, ensureUsers, resetPresentation, signIn, USERS } from "./fixtures.mjs";
const { chromium } = createRequire((process.env.PW_MODULES || process.env.NODE_PATH || "") + "/")("playwright");

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", ".."), PORT = 3130, BASE = `http://localhost:${PORT}`, ID = "italian-tech-week", API = `${BASE}/api/presentations/${ID}`;
let server, browser, page;
const frame = () => page.frame({ url: /\/player\// });
const api = async (path, init) => { const r = await page.request.fetch(API + path, { maxRedirects: 0, ...init }); return { status: r.status(), body: await r.json().catch(() => ({})) }; };
const draft = async () => (await api("/draft")).body.document;
const el = (d, id) => { for (const s of d.sections) { const e = s.elements.find(x => x.id === id); if (e) return e; } return null; };
const untilDraft = async (pred, what) => { const t0 = Date.now(); while (Date.now() - t0 < 15000) { const d = await draft(); if (pred(d)) return d; await new Promise(r => setTimeout(r, 250)); } throw new Error("timed out waiting for " + what + " — save: " + JSON.stringify(await page.locator(".bar .save").textContent().catch(() => null)) + " — messages: " + JSON.stringify(await page.evaluate(() => (window.__msgs || []).slice(-12)))); };
const stageReady = async () => { await page.waitForSelector(".loading", { state: "detached", timeout: 60000 }); await page.waitForSelector(".filmstrip .card", { timeout: 30000 }); await page.waitForTimeout(400); };
const landed = async (id) => frame().waitForFunction((i) => { const e = document.querySelector(`[data-id="${i}"]`); const b = e && e.closest("section.beat"); return e && parseFloat(getComputedStyle(b || e).opacity) > 0.95; }, id, { timeout: 20000 });
const goto = async (i) => { await page.locator(`.filmstrip .card[data-i="${i}"]`).click(); await page.waitForFunction((k) => document.querySelector(".filmstrip .card.current")?.dataset.i === String(k), i, { timeout: 15000 }); };
const centre = async (id) => { const b = await frame().locator(`[data-id="${id}"]`).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, b }; };
const dragBy = async (x, y, dx, dy) => { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 4 }); await page.mouse.move(x + dx, y + dy, { steps: 4 }); await page.mouse.up(); };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAAFklEQVR4nGP4z8DwHwyBFBhCWFAlYAAAtQ8Xg2gTMh0AAAAASUVORK5CYII=", "base64");

before(async () => {
  server = await startApp(spawn, APP, PORT);
  browser = await chromium.launch({ executablePath: process.env.PW_EXEC });
  page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  page.on("pageerror", e => console.error("pageerror:", e.message)); page.on("dialog", d => d.accept("Named"));
  await ensureUsers(); await resetPresentation();
  const r = await signIn(page, BASE, USERS.owner); assert.equal(r.status, 200, JSON.stringify(r.body));
  const up = await page.request.post(`${API}/images`, { multipart: { file: { name: "frame.png", mimeType: "image/png", buffer: PNG } } }); assert.equal(up.status(), 201); globalThis.__img = await up.json();
  await page.goto(`${BASE}/presentations/${ID}/edit`); await stageReady();
  await page.evaluate(() => { window.__msgs = []; window.addEventListener("message", e => window.__msgs.push(e.data && e.data.type + (e.data && e.data.nudge ? JSON.stringify(e.data.nudge) : ""))); });
}, { timeout: 180000 });
const msgs = () => page.evaluate(() => (window.__msgs || []).slice(-12));
after(async () => { await browser?.close(); server?.kill(); });

test("a text box is added, dragged to a new place and resized by a corner handle; all of it in the document", async () => {
  await page.click('.station-tools button:has-text("+ Text box")');
  const d = await untilDraft(d => d.sections[0].elements.some(e => e.place && e.type === "text"), "the text box");
  const box = d.sections[0].elements.find(e => e.place && e.type === "text"); assert.deepEqual(box.place, { x: 30, y: 40, w: 40 }); assert.equal(box.runs[0].t, "New text");
  await frame().waitForSelector(`[data-id="${box.id}"].placed`, { timeout: 15000 }); await landed(box.id);
  await page.waitForSelector(`.ph code:has-text("${box.id}")`);
  const c = await centre(box.id); await dragBy(c.x, c.y, 120, 60);
  const moved = await untilDraft(d => { const e = el(d, box.id); return e.place.x > 31 && e.place.y > 41; }, "the move"); const p1 = el(moved, box.id).place;
  const h = await page.locator("iframe").boundingBox(); const hb = await frame().locator("#editHandles i[data-h=se]").boundingBox();
  await dragBy(hb.x + 6, hb.y + 6, 80, 0);
  const sized = await untilDraft(d => el(d, box.id).place.w > p1.w + 1, "the resize");
  assert.ok(el(sized, box.id).place.w > 40 && h, "wider than before");
  assert.equal(await frame().evaluate((id) => document.querySelector(`[data-id="${id}"]`).style.position, box.id), "absolute");
}, { timeout: 120000 });

test("a flow line dragged off its place gets a nudge; Put back clears it", async () => {
  await goto(0); await landed("open.1");
  let c = await centre("open.1"); await page.mouse.click(c.x, c.y); await page.waitForSelector('.ph code:has-text("open.1")');
  c = await centre("open.1"); await dragBy(c.x, c.y, 0, -90);
  const d = await untilDraft(d => el(d, "open.1").nudge && el(d, "open.1").nudge.dy < -5, "the nudge (deck: " + JSON.stringify(await frame().evaluate(() => ({ sel: document.querySelector(".editsel")?.getAttribute("data-id"), transform: document.querySelector('[data-id="open.1"]').style.transform, handles: document.getElementById("editHandles")?.style.display }))) + ")");
  assert.ok(Math.abs(el(d, "open.1").nudge.dx) < 2);
  assert.match(await frame().evaluate(() => document.querySelector('[data-id="open.1"]').style.transform), /translate\(/);
  await page.click('button:has-text("Put back")');
  await untilDraft(d => !el(d, "open.1").nudge, "the reset");
}, { timeout: 90000 });

test("an image box is added and filled from the library; the picture covers its frame", async () => {
  await page.click('.station-tools button:has-text("+ Image box")');
  const d = await untilDraft(d => d.sections[0].elements.some(e => e.type === "image" && e.frame && !e.asset && e.place), "the image box");
  const box = d.sections[0].elements.find(e => e.type === "image" && e.frame && e.place);
  await frame().waitForSelector(`figure[data-id="${box.id}"][data-empty]`, { timeout: 15000 });
  await page.waitForSelector(".panel .fill"); await page.click(".imgcell");
  await untilDraft(d => el(d, box.id).asset === globalThis.__img.id, "the fill");
  await frame().waitForSelector(`figure[data-id="${box.id}"]:not([data-empty]) img`, { timeout: 15000 });
  assert.equal(await frame().evaluate((id) => document.querySelector(`figure[data-id="${id}"] img`).style.objectFit, box.id), "cover");
}, { timeout: 90000 });

test("the keynote's fluoroscopy frame is an empty box: a click on it opens the library, a pick fills it", async () => {
  const d0 = await draft(); const i = d0.stations.findIndex(s => s.chapter.includes("What they")); const labIdx = (i >= 0 ? i : 23) + 1;
  await goto(labIdx);
  await frame().waitForFunction(() => { const f = document.querySelector('[data-id="lab.1"]'); return f && parseFloat(getComputedStyle(f).opacity) > 0.9; }, null, { timeout: 30000 });
  const c = await centre("lab.1"); await page.mouse.click(c.x, c.y);
  await page.waitForSelector('.panel .fill:has-text("lab.1")', { timeout: 10000 }); await page.click(".imgcell");
  await untilDraft(d => el(d, "lab.1").asset === globalThis.__img.id, "the frame's picture");
  await frame().waitForSelector('figure[data-id="lab.1"] img', { timeout: 15000 });
  assert.equal(await frame().evaluate(() => document.querySelector('figure[data-id="lab.1"] .ph')), null, "the placeholder is gone");
}, { timeout: 120000 });

test("a picture dragged from the library lands where it is dropped; a file dropped on the stage is uploaded and placed", async () => {
  await goto(0); await landed("open.1");
  const n0 = (await draft()).sections[0].elements.length;
  await frame().evaluate((asset) => { const dt = new DataTransfer(); dt.setData("application/x-itw-asset", JSON.stringify(asset)); document.body.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, clientX: innerWidth * 0.92, clientY: innerHeight * 0.9, dataTransfer: dt })); }, globalThis.__img);
  const d = await untilDraft(d => d.sections[0].elements.length === n0 + 1, "the dropped picture");
  const dropped = d.sections[0].elements[n0]; assert.equal(dropped.type, "image"); assert.equal(dropped.asset, globalThis.__img.id); assert.ok(dropped.place.x > 50 && dropped.place.y > 60, JSON.stringify(dropped.place));
  await frame().evaluate((png) => { const dt = new DataTransfer(); const bytes = Uint8Array.from(atob(png), c => c.charCodeAt(0)); dt.items.add(new File([bytes], "dropped.png", { type: "image/png" })); document.body.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, clientX: innerWidth * 0.08, clientY: innerHeight * 0.85, dataTransfer: dt })); }, PNG.toString("base64"));
  const d2 = await untilDraft(d => d.sections[0].elements.length === n0 + 2, "the dropped file");
  const fromFile = d2.sections[0].elements[n0 + 1]; assert.equal(fromFile.type, "image"); assert.ok(d2.assets[fromFile.asset], "the upload became an asset"); assert.ok(fromFile.place.x < 30);
}, { timeout: 120000 });

test("the renderer's own copy is typed in place: the event line", async () => {
  const when = frame().locator("#partner .when"); const b = await when.boundingBox();
  await page.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2); await page.waitForSelector(".inline-toolbar", { timeout: 5000 });
  await frame().evaluate(() => { const e = document.querySelector('[contenteditable="true"]'); const r = document.createRange(); r.selectNodeContents(e); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
  await page.keyboard.type(" · Hall B"); await page.keyboard.press("Enter");
  await untilDraft(d => d.copy.partnerLine.endsWith("· Hall B"), "the event line");
  await page.waitForFunction(() => /^Saved /.test(document.querySelector(".bar .save")?.textContent || ""), null, { timeout: 15000 });
  await stageReady();
  await frame().waitForFunction(() => document.querySelector("#partner .when")?.textContent.endsWith("· Hall B"), null, { timeout: 30000 });
}, { timeout: 60000 });

test("the bar: Save, History, Present, Publish and Share", async () => {
  await page.click('.bar button:has-text("Save")', { timeout: 10000 }).catch(async e => { throw new Error("Save click failed: " + e.message.split("\n").slice(0, 6).join(" | ")); }); await page.waitForFunction(() => /^Saved /.test(document.querySelector(".bar .save")?.textContent || ""), null, { timeout: 15000 });
  await page.click('.bar button:has-text("History")', { timeout: 10000 }); await page.waitForSelector(".versions", { state: "attached", timeout: 10000 });
  await page.click('.bar button:has-text("Publish")', { timeout: 10000 }).catch(async e => { throw new Error("Publish click failed: " + e.message.split("\n").slice(0, 6).join(" | ") + " — bar: " + JSON.stringify(await page.locator(".bar").innerText())); });
  try { await page.waitForSelector(".share", { timeout: 30000 }); } catch (e) { throw new Error("no share dialog after Publish — save: " + await page.locator(".bar .save").textContent() + " versions: " + JSON.stringify((await api("/versions")).body.map(v => v.name))); }
  await page.waitForFunction(() => document.querySelector(".share")?.textContent.includes("/p/italian-tech-week"), null, { timeout: 15000 });
  const pub = await api("/publication"); assert.ok(pub.body && pub.body.versionId, "published"); assert.match(pub.body.name, /^Published /);
  const list = await api("/versions"); assert.equal(list.body.length, 1);
  await page.click('.share button:has-text("×")');
  await page.click('.bar button:has-text("Present")'); await page.waitForSelector(".editor.preview"); assert.equal(await page.locator(".side").count(), 0);
  // fullscreen arrives asynchronously (and a headless browser may refuse it); the presenter's Esc leaves it
  await page.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 4000 }).catch(() => {});
  await page.evaluate(() => document.fullscreenElement ? document.exitFullscreen() : null);
  await page.waitForFunction(() => !document.fullscreenElement, null, { timeout: 4000 });
  await page.click('button:has-text("Back to editor")'); await page.waitForSelector(".editor:not(.preview)");
}, { timeout: 90000 });
