// The Slides-like layer: free text and image boxes, moving by drag and resizing by handle, nudging flow lines,
// images dropped from the library or from files, image boxes filled by click or drop (the keynote's fluoroscopy
// frames among them), the renderer's own copy typed in place, and the bar: Save, History, Present, Publish, Share.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { startApp, ensureUsers, resetPresentation, signIn, USERS, TEST_SLUG, frameBox } from "./fixtures.mjs";
const { chromium } = createRequire((process.env.PW_MODULES || process.env.NODE_PATH || "") + "/")("playwright");

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", ".."), PORT = 3130, BASE = `http://localhost:${PORT}`, ID = TEST_SLUG, API = `${BASE}/api/presentations/${ID}`;
let server, browser, page;
const frame = () => page.frame({ url: /\/player\// });
const api = async (path, init) => { const r = await page.request.fetch(API + path, { maxRedirects: 0, ...init }); return { status: r.status(), body: await r.json().catch(() => ({})) }; };
const draft = async () => (await api("/draft")).body.document;
const el = (d, id) => { for (const s of d.sections) { const e = s.elements.find(x => x.id === id); if (e) return e; } return null; };
const untilDraft = async (pred, what) => { const t0 = Date.now(); while (Date.now() - t0 < 15000) { const d = await draft(); if (pred(d)) return d; await new Promise(r => setTimeout(r, 250)); } throw new Error("timed out waiting for " + what + " — save: " + JSON.stringify(await page.locator(".bar .save").textContent().catch(() => null)) + " — messages: " + JSON.stringify(await page.evaluate(() => (window.__msgs || []).slice(-12)))); };
const stageReady = async () => { await page.waitForSelector(".loading", { state: "detached", timeout: 60000 }); await page.waitForSelector(".filmstrip .card", { timeout: 30000 }); await page.waitForTimeout(400); };
const landed = async (id) => frame().waitForFunction((i) => { const e = document.querySelector(`[data-id="${i}"]`); const b = e && e.closest("section.beat"); return e && parseFloat(getComputedStyle(b || e).opacity) > 0.95; }, id, { timeout: 20000 });
const goto = async (i) => { await page.locator(`.filmstrip .card[data-i="${i}"]`).click(); await page.waitForFunction((k) => document.querySelector(".filmstrip .card.current")?.dataset.i === String(k), i, { timeout: 15000 }); };
const centre = async (id) => { const b = await frameBox(page, frame(), `[data-id="${id}"]`); return { x: b.x + b.width / 2, y: b.y + b.height / 2, b }; };
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
  const h = await page.locator(".canvas").boundingBox(); const hb = await frameBox(page, frame(), "#editHandles i[data-h=se]");
  await dragBy(hb.x + hb.width / 2, hb.y + hb.height / 2, 80, 0);
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
  await page.waitForSelector(".panel .fill"); await page.click(".imggrid:not(.brand) .imgcell");   /* the upload, not a brand mark */
  await untilDraft(d => el(d, box.id).asset === globalThis.__img.id, "the fill");
  await frame().waitForSelector(`figure[data-id="${box.id}"]:not([data-empty]) img`, { timeout: 15000 });
  assert.deepEqual(await frame().evaluate((id) => { const i = document.querySelector(`figure[data-id="${id}"] img`); return { fit: i.style.objectFit, covers: parseFloat(i.style.width) >= 99.9 && parseFloat(i.style.height) >= 99.9 }; }, box.id), { fit: "fill", covers: true }, "the picture is laid out to cover the frame");
}, { timeout: 90000 });

test("the keynote's fluoroscopy frame is an empty box: a click on it opens the library, a pick fills it", async () => {
  const d0 = await draft(); const i = d0.stations.findIndex(s => s.chapter.includes("What they")); const labIdx = (i >= 0 ? i : 23) + 1;
  await goto(labIdx);
  await frame().waitForFunction(() => { const f = document.querySelector('[data-id="lab.1"]'); return f && parseFloat(getComputedStyle(f).opacity) > 0.9; }, null, { timeout: 30000 });
  const c = await centre("lab.1"); await page.mouse.click(c.x, c.y);
  try { await page.waitForSelector('.panel .fill:has-text("lab.1")', { timeout: 10000 }); }
  catch (e) { throw new Error("the press did not open the fill: " + JSON.stringify(await frame().evaluate((k) => { const f = document.querySelector('[data-id="lab.1"]'), b = f.getBoundingClientRect(); return { sel: document.querySelector(".editsel")?.getAttribute("data-id") || null, under: document.elementsFromPoint(b.x + b.width / 2, b.y + b.height / 2).slice(0, 5).map(n => n.tagName + "." + String(n.className).slice(0, 24) + "[" + (n.getAttribute("data-id") || "") + "]"), editing: document.body.classList.contains("editing"), k }; }, c.b.k)) + " — inspector: " + (await page.locator(".side.right").innerText().catch(() => "?")).slice(0, 80).replace(/\n/g, " | ")); }
  await page.click(".imggrid:not(.brand) .imgcell");   /* the upload, not a brand mark */
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
  const b = await frameBox(page, frame(), "#partner .when");
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
  await page.waitForFunction((slug) => document.querySelector(".share")?.textContent.includes("/p/" + slug), ID, { timeout: 15000 });
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

test("the road's milestone copy opens on a press and lands in copy.road; a selected line opens on a still press", async () => {
  await goto(3);
  try { await frame().waitForFunction(() => parseFloat(getComputedStyle(document.getElementById("tlbox")).opacity) > 0.9 && document.querySelector("#tlbox .tx")?.getAttribute("data-copy"), null, { timeout: 30000 }); }
  catch (e) { throw new Error("road box not ready: " + JSON.stringify(await frame().evaluate(() => { const tl = document.getElementById("tlbox"), tx = document.querySelector("#tlbox .tx"); return { pos: document.getElementById("pos").textContent, body: document.body.className, road: getComputedStyle(document.getElementById("road")).opacity, tl: tl && getComputedStyle(tl).opacity, txCopy: tx && tx.getAttribute("data-copy"), txText: tx && tx.textContent.slice(0, 30), url: location.href }; })) + " editor: " + JSON.stringify({ preview: !!document.querySelector(".editor.preview"), loading: !!document.querySelector(".loading") })); }
  const tx = await frameBox(page, frame(), "#tlbox .tx"); await page.mouse.click(tx.x + tx.width / 2, tx.y + tx.height / 2);
  await page.waitForSelector(".inline-toolbar", { timeout: 5000 });
  await frame().evaluate(() => { const e = document.querySelector('[contenteditable="true"]'); const r = document.createRange(); r.selectNodeContents(e); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
  await page.keyboard.type(" Edited."); await page.keyboard.press("Enter");
  await untilDraft(d => d.copy.road[0].text.map(r => r.t || "").join("").endsWith("Edited."), "the milestone copy");
  // a line: one press selects, a second still press (any time later) opens it
  await goto(0); await landed("open.1");
  // the free boxes from earlier tests sit over the middle of the stage: press the hero near its top edge
  let c = await centre("open.1"); await page.mouse.click(c.b.x + 5, c.y);
  try { await page.waitForSelector('.ph code:has-text("open.1")', { timeout: 8000 }); }
  catch (e) { throw new Error("the press did not select the hero: " + JSON.stringify(await frame().evaluate((pt) => ({ sel: document.querySelector(".editsel")?.getAttribute("data-id"), under: document.elementsFromPoint(pt.x, pt.y).slice(0, 5).map(n => n.tagName + "#" + (n.getAttribute("data-id") || "") + "." + n.className) }), { x: c.b.x + 5 - (await page.locator("iframe").boundingBox()).x, y: c.y - (await page.locator("iframe").boundingBox()).y }))); }
  await page.waitForTimeout(900);
  c = await centre("open.1"); await page.mouse.click(c.b.x + 5, c.y); await page.waitForSelector(".inline-toolbar", { timeout: 5000 });
  assert.equal(await frame().evaluate(() => document.querySelector('[data-id="open.1"]').getAttribute("contenteditable")), "true");
  await page.keyboard.press("Escape"); await page.waitForSelector(".inline-toolbar", { state: "detached" });
}, { timeout: 120000 });

test("the side panels fold away by hand and on a narrow window, and the stage takes the room", async () => {
  assert.equal(await page.locator(".side").count(), 2);
  const w0 = (await page.locator(".canvas").boundingBox()).width;
  await page.click(".bar .side-toggle >> nth=0"); await page.waitForSelector(".editor.no-left"); assert.equal(await page.locator(".side.left").count(), 0);
  await page.click(".bar .side-toggle >> nth=1"); await page.waitForSelector(".editor.no-right"); assert.equal(await page.locator(".side").count(), 0);
  assert.ok((await page.locator(".canvas").boundingBox()).width > w0, "the stage grew");
  await page.click(".bar .side-toggle >> nth=0"); await page.click(".bar .side-toggle >> nth=1"); await page.waitForSelector(".editor:not(.no-left):not(.no-right)"); assert.equal(await page.locator(".side").count(), 2);
  await page.setViewportSize({ width: 1000, height: 700 }); await page.waitForSelector(".editor.no-left.no-right", { timeout: 5000 }); assert.equal(await page.locator(".side").count(), 0);
  await page.setViewportSize({ width: 1600, height: 900 }); await page.waitForSelector(".editor:not(.no-left):not(.no-right)", { timeout: 5000 });
}, { timeout: 60000 });

test("Delete removes the selection (a free box, then a keynote line which is hidden, not lost); arrows nudge; Escape lets go; undo brings back", async () => {
  await goto(0); await landed("open.1");
  const had = new Set((await draft()).sections[0].elements.map(e => e.id));   /* earlier tests left boxes of their own */
  await page.click('.station-tools button:has-text("+ Text box")');
  const d0 = await untilDraft(d => d.sections[0].elements.some(e => !had.has(e.id) && e.place && e.type === "text"), "a fresh text box");
  const box = d0.sections[0].elements.find(e => !had.has(e.id) && e.place && e.type === "text");
  await page.waitForSelector(`.ph code:has-text("${box.id}")`); await page.locator(".stage-fit").click({ position: { x: 4, y: 4 } });   /* focus the parent document, off the frame */
  await page.keyboard.press("ArrowRight"); await page.keyboard.press("Shift+ArrowDown");
  const nudged = await untilDraft(d => { const e = el(d, box.id); return e && e.place.x === 31 && e.place.y === 45; }, "the arrow nudge");
  assert.ok(nudged);
  await page.keyboard.press("Delete");
  await untilDraft(d => !el(d, box.id), "the deletion");
  await frame().waitForSelector(`[data-id="${box.id}"]`, { state: "detached", timeout: 15000 });
  assert.equal(await page.locator(".ph code").count(), 0, "nothing selected afterwards");
  // the inspector's Remove on a keynote line hides its node; undo restores the element and the node
  const c = await centre("open.1"); await page.mouse.click(c.b.x + 5, c.y); await page.waitForSelector('.ph code:has-text("open.1")');
  await page.click('.ph button:has-text("Remove")');
  await untilDraft(d => !el(d, "open.1"), "the keynote line's removal");
  await frame().waitForFunction(() => document.querySelector('[data-id="open.1"]').style.display === "none", null, { timeout: 15000 });
  await page.locator(".stage-fit").click({ position: { x: 4, y: 4 } });   /* focus the parent document, off the frame */ await page.keyboard.press("Meta+z");
  await untilDraft(d => !!el(d, "open.1"), "the undo");
  await frame().waitForFunction(() => document.querySelector('[data-id="open.1"]').style.display !== "none", null, { timeout: 15000 });
  // Escape in the frame lets go of the selection
  const c2 = await centre("open.1"); await page.mouse.click(c2.b.x + 5, c2.y); await page.waitForSelector('.ph code:has-text("open.1")');
  await page.keyboard.press("Escape"); await page.waitForSelector(".ph code", { state: "detached", timeout: 5000 });
}, { timeout: 120000 });

test("every bound line takes the press: the substitution line under the patient opens for typing and drags to an offset the document keeps; the bar renames", async () => {
  await goto(14); await stageReady();   /* station 15: the network; the line under the patient fades in as the progress settles */
  await frame().waitForFunction(() => parseFloat(getComputedStyle(document.getElementById("subst")).opacity) > 0.9, null, { timeout: 20000 });
  const sb = await frameBox(page, frame(), "#subst"); const x = sb.x + sb.width / 2, y = sb.y + sb.height / 2;   /* the page-relative centre of the line */
  for (let i = 0; i < 3 && (await page.locator(".inline-toolbar").count()) === 0; i++) { await page.mouse.click(x, y); await page.waitForSelector(".inline-toolbar", { timeout: 4000 }).catch(() => {}); }   /* a press right after a step can land while the line is still settling */
  await page.waitForSelector(".inline-toolbar", { timeout: 5000 });
  await page.keyboard.press("End"); await page.keyboard.type(" Truly."); await page.keyboard.press("Enter");
  await untilDraft(d => d.copy.substitution.some(r => (r.t || "").includes("Truly.")), "the substitution line's edit");
  // a press that moves drags the line; the offset lands under its path
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 60, y - 40, { steps: 8 }); await page.mouse.up();
  const d = await untilDraft(d => d.offsets && d.offsets.substitution && d.offsets.substitution.dy < -2, "the line's offset");
  assert.ok(d.offsets.substitution.dx > 2, "moved right"); await page.waitForSelector(".inline-toolbar", { state: "detached", timeout: 5000 });
  await page.locator(".stage-fit").click({ position: { x: 4, y: 4 } });   /* focus the parent document, off the frame */ await page.keyboard.press("Meta+z"); await untilDraft(d => !d.offsets || !d.offsets.substitution, "undo puts it back");
  // the title in the bar
  await page.click(".bar button.title"); await page.fill(".bar .title-edit", "Renamed from the bar"); await page.keyboard.press("Enter");
  await page.waitForSelector('.bar button.title:has-text("Renamed from the bar")');
  const lib = await (await page.request.get(`${BASE}/api/presentations`)).json(); assert.equal(lib.find(p => p.slug === ID).title, "Renamed from the bar");
  await page.request.fetch(`${API}`, { method: "PATCH", data: { title: "E2E keynote" } });
}, { timeout: 90000 });

test("a box on a station the renderer draws itself (the tunnel) lands on the stage; ⌘C ⌘V and ⌘D make free copies a step aside, from either frame", async () => {
  await goto(24); await stageReady();   /* station 25 — the tunnel: no beat node of its own until a box needs one */
  const sect = (await draft()).stations[24].section; assert.equal(sect, "tun");
  const had = new Set((await draft()).sections.find(s => s.key === sect).elements.map(e => e.id));
  await page.click('.station-tools button:has-text("+ Text box")');
  const d0 = await untilDraft(d => d.sections.find(s => s.key === sect).elements.some(e => !had.has(e.id) && e.place), "the box in the tunnel section");
  const box = d0.sections.find(s => s.key === sect).elements.find(e => !had.has(e.id) && e.place);
  await frame().waitForSelector(`section.beat.placed-host[data-k="${sect}"] [data-id="${box.id}"]`, { timeout: 15000 });
  await page.waitForSelector(`.ph code:has-text("${box.id}")`, { timeout: 10000 });
  assert.ok(parseFloat(await frame().evaluate(k => getComputedStyle(document.querySelector(`section.beat.placed-host[data-k="${k}"]`)).opacity, sect)) > 0.5, "the host layer is on with its stations");
  // the parent's keys
  await page.locator(".stage-fit").click({ position: { x: 4, y: 4 } });
  await page.keyboard.press("Meta+c"); await page.keyboard.press("Meta+v");
  const d1 = await untilDraft(d => d.sections.find(s => s.key === sect).elements.some(e => e.place && e.id !== box.id && !had.has(e.id) && Math.abs(e.place.x - (box.place.x + 2)) < 0.01), "the paste, a step aside");
  const pasted = d1.sections.find(s => s.key === sect).elements.find(e => e.place && e.id !== box.id && !had.has(e.id));
  assert.equal(pasted.runs[0].t, box.runs[0].t); await page.waitForSelector(`.ph code:has-text("${pasted.id}")`, { timeout: 10000 });
  await page.keyboard.press("Meta+d");
  await untilDraft(d => d.sections.find(s => s.key === sect).elements.filter(e => e.place && !had.has(e.id)).length === 3, "the duplicate");
  // the keys inside the frame: select the first box there, copy, paste
  const c = await centre(box.id); await page.mouse.click(c.b.x + 6, c.b.y + 6);   /* its top-left corner: the copies sit a step to the right and down */
  await page.waitForSelector(`.ph code:has-text("${box.id}")`, { timeout: 10000 });
  await page.keyboard.press("Meta+c"); await page.keyboard.press("Meta+v");
  await untilDraft(d => d.sections.find(s => s.key === sect).elements.filter(e => e.place && !had.has(e.id)).length === 4, "a paste from inside the frame");
}, { timeout: 90000 });

test("a framed picture is cropped on the stage: double-click, scroll to zoom, drag to pan, Escape; the crop is in the document and one undo takes it back", async () => {
  const d0 = await draft(); const ci = d0.stations.findIndex(st => st.chapter.includes("What they")); const li = (ci >= 0 ? ci : 23) + 1;   /* the frames' station, as the fill test finds it */
  assert.ok(d0.sections.find(s => s.key === "lab").elements[0].asset, "lab.1 holds a picture from the fill test");
  await goto(li); await stageReady();
  await frame().waitForFunction(() => { const f = document.querySelector('[data-id="lab.1"]'); return f && parseFloat(getComputedStyle(f).opacity) > 0.9 && !!f.__cropState; }, null, { timeout: 30000 });
  const lb = await frameBox(page, frame(), 'figure[data-id="lab.1"]'); const x = lb.x + 12, y = lb.y + 12;   /* a corner of the frame: boxes from the earlier tests sit over its middle */
  const under = await frame().evaluate((k) => { const f = document.querySelector('figure[data-id="lab.1"]'), b = f.getBoundingClientRect(); return { under: document.elementsFromPoint(b.x + 12 / k, b.y + 12 / k).slice(0, 5).map(n => n.tagName + "#" + (n.id || "") + "." + n.className + "[" + (n.getAttribute("data-id") || "") + "]"), crop: !!f.__cropState, opacity: getComputedStyle(f).opacity }; }, lb.k);
  for (let i = 0; i < 3 && (await frame().locator('figure[data-id="lab.1"].cropping').count()) === 0; i++) { await page.mouse.dblclick(x, y); await frame().waitForSelector('figure[data-id="lab.1"].cropping', { timeout: 4000 }).catch(() => {}); }
  try { await frame().waitForSelector('figure[data-id="lab.1"].cropping', { timeout: 5000 }); } catch (e) { throw new Error("no crop mode — under the point: " + JSON.stringify(under)); }
  await page.waitForSelector(".cropping-hint");
  const stageCrop = () => frame().evaluate(() => document.querySelector('figure[data-id="lab.1"]').__cropState.c);
  await page.mouse.move(x, y); await page.mouse.wheel(0, -240);
  await frame().waitForFunction(() => document.querySelector('figure[data-id="lab.1"]').__cropState.c.w < 0.95, null, { timeout: 5000 });   /* the stage paints the session live */
  const c1 = await stageCrop();
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 60, y + 10, { steps: 6 }); await page.mouse.up();
  await frame().waitForFunction((x0) => Math.abs(document.querySelector('figure[data-id="lab.1"]').__cropState.c.x - x0) > 0.01, c1.x, { timeout: 5000 });
  assert.equal((await draft()).sections.find(s => s.key === "lab").elements[0].adjust?.crop, undefined, "the document waits for the session to close");
  await page.keyboard.press("Escape"); await frame().waitForSelector('figure[data-id="lab.1"].cropping', { state: "detached", timeout: 5000 }); await page.waitForSelector(".cropping-hint", { state: "detached" });
  await untilDraft(d => { const c = d.sections.find(s => s.key === "lab").elements[0].adjust?.crop; return c && c.w < 0.95 && Math.abs(c.x - c1.x) > 0.01; }, "the crop in the document, once, when the session closed");
  const shown = await frame().evaluate(() => { const i = document.querySelector('figure[data-id="lab.1"] .crop img'); return { w: parseFloat(i.style.width), fit: i.style.objectFit }; });
  assert.ok(shown.w > 100 && shown.fit === "fill", "the picture is laid out larger than the frame, showing the region: " + JSON.stringify(shown));
  await page.locator(".stage-fit").click({ position: { x: 4, y: 4 } }); await page.keyboard.press("Meta+z");
  await untilDraft(d => { const c = d.sections.find(s => s.key === "lab").elements[0].adjust?.crop; return !c || c.w === 1; }, "one undo for the whole crop session");
}, { timeout: 90000 });

test("leaving with unsaved changes asks; Save and leave writes the draft first", async () => {
  await goto(0); await stageReady();
  await page.route("**/api/presentations/*/draft", async route => { if (route.request().method() === "PUT") await new Promise(r => setTimeout(r, 1500)); await route.continue(); });   /* a slow save keeps the changes unsaved for a moment */
  const before = (await draft()).sections[0].elements.length;
  await page.click('.station-tools button:has-text("+ Text box")'); await page.waitForSelector(".bar .save.dirty, .bar .save.saving", { timeout: 5000 });
  await page.click(".bar a.brand"); await page.waitForSelector(".modal", { timeout: 5000 });
  await page.click('.modal button:has-text("Save and leave")'); await page.waitForURL(`${BASE}/`, { timeout: 15000 });
  await page.unroute("**/api/presentations/*/draft");
  assert.equal((await draft()).sections[0].elements.length, before + 1, "saved before leaving");
  await page.goto(`${BASE}/presentations/${ID}/edit`); await stageReady();
}, { timeout: 60000 });

test("several elements: shift-click adds to the selection; right-click opens the menu; Align top, Match width and Distribute change all of them, one undo step each; a group drag moves them together", async () => {
  await goto(0); await stageReady();
  // three free boxes of different widths, well apart, through the document
  const d0 = await draft(); const sec = d0.sections[0]; const next = JSON.parse(JSON.stringify(d0)); const ids = [];
  [[10, 20, 14], [40, 30, 20], [70, 26, 10]].forEach(([x, y, w], i) => { let n = next.sections[0].elements.length + 1; while (next.sections[0].elements.some(e => e.id === `${sec.key}.${n}`)) n++; const id = `${sec.key}.${n}`; ids.push(id); next.sections[0].elements.push({ id, type: "text", role: ["lede"], runs: [{ t: "Box " + (i + 1) }], place: { x, y, w }, reveal: { p: d0.stations[0].p } }); });
  assert.equal((await page.request.put(`${API}/draft`, { data: { document: next } })).status(), 200);
  await page.reload(); await stageReady(); await goto(0); for (const id of ids) await frame().waitForSelector(`[data-id="${id}"].placed`, { timeout: 15000 });
  const c0 = await centre(ids[0]); await page.mouse.click(c0.x, c0.y); await page.waitForSelector(`.ph code:has-text("${ids[0]}")`);
  const shiftClick = async (x, y) => { await page.keyboard.down("Shift"); await page.mouse.click(x, y); await page.keyboard.up("Shift"); };   /* a raw mouse click takes no modifiers option */
  const c1 = await centre(ids[1]); await shiftClick(c1.x, c1.y);
  const c2 = await centre(ids[2]); await shiftClick(c2.x, c2.y);
  await page.waitForSelector('.panel.multi .kind:has-text("3 elements")', { timeout: 10000 });
  assert.equal(await frame().locator(".editsel").count(), 3, "three selected on the stage");
  // the menu on a right click, on one of them
  await page.mouse.click(c1.x, c1.y, { button: "right" }); await page.waitForSelector(".ctx-menu", { timeout: 5000 });
  await page.click('.ctx-menu button:has-text("Top")');
  const dTop = await untilDraft(d => { const ys = ids.map(i => el(d, i).place.y); return ys.every(y => Math.abs(y - ys[0]) < 0.05); }, "aligned to the top");
  assert.ok(Math.abs(el(dTop, ids[0]).place.y - 20) < 0.6, "the top is the topmost box's top");
  await page.waitForSelector('.panel.multi .kind:has-text("3 elements")', { timeout: 10000 }); await frame().waitForFunction(() => document.querySelectorAll(".editsel").length === 3, null, { timeout: 10000 });   /* the selection survives the change */
  await page.click('.panel.multi button:has-text("Width")');
  const dW = await untilDraft(d => ids.every(i => Math.abs(el(d, i).place.w - 14) < 0.3), "the same width as the first");
  const threeAgain = async () => { await page.waitForSelector('.panel.multi .kind:has-text("3 elements")', { timeout: 10000 }); await frame().waitForFunction(() => document.querySelectorAll(".editsel").length === 3, null, { timeout: 10000 }); };
  await threeAgain();   /* the stage re-announces the selection after every change */
  await page.mouse.click(c2.x, c2.y, { button: "right" }); await page.waitForSelector(".ctx-menu"); await page.click('.ctx-group:has(.ctx-title:has-text("Distribute")) button:has-text("Horizontally")');
  await untilDraft(d => { const xs = ids.map(i => el(d, i).place.x).sort((a, b) => a - b); const g1 = xs[1] - (xs[0] + 14), g2 = xs[2] - (xs[1] + 14); return Math.abs(g1 - g2) < 0.3 && g1 > 1; }, "equal gaps");
  // one undo step per operation
  await page.locator(".stage-fit").click({ position: { x: 4, y: 4 } }); await page.keyboard.press("Meta+z");
  await untilDraft(d => ids.every(i => Math.abs(el(d, i).place.w - 14) < 0.3) && Math.abs(el(d, ids[1]).place.x - 40) < 0.05, "undo takes back the distribute only");
  await frame().waitForFunction((id) => Math.abs(parseFloat(document.querySelector(`[data-id="${id}"]`)?.style.left) - 40) < 0.05, ids[1], { timeout: 15000 }); await page.waitForTimeout(400);   /* the stage has taken the undone document */
  // a group drag, from a fresh selection of two
  await page.keyboard.press("Escape"); await frame().waitForFunction(() => document.querySelectorAll(".editsel").length === 0);
  const cA = await centre(ids[0]); await page.mouse.click(cA.x, cA.y); await frame().waitForFunction(() => document.querySelectorAll(".editsel").length === 1); const cB = await centre(ids[1]); await shiftClick(cB.x, cB.y);
  await frame().waitForFunction(() => document.querySelectorAll(".editsel").length === 2);
  await page.mouse.move(cB.x, cB.y); await page.mouse.down(); await page.mouse.move(cB.x + 60, cB.y + 40, { steps: 8 }); await page.mouse.up();
  await untilDraft(d => el(d, ids[0]).place.x > 12 && el(d, ids[1]).place.x > 42 && Math.abs((el(d, ids[0]).place.x - 10) - (el(d, ids[1]).place.x - 40)) < 0.3, "both moved by the same amount");
  await page.keyboard.press("Escape");
}, { timeout: 120000 });

test("Setup: the event mark is picked from the built-in marks (Fundomo) and the header logos are sized; the deck shows both", async () => {
  await goto(0); await stageReady();
  await page.click('.tabs button:has-text("Setup")'); await page.waitForSelector(".marks .mark");
  await page.click('.marks .mark:has-text("Fundomo")');
  await untilDraft(d => d.assets["wave-by-vento-w"].viewBox === "0 0 107.75 16.3608" && d.assets["wave-by-vento-w"].paths.length === 7, "the Fundomo mark in the document");
  await frame().waitForFunction(() => document.querySelector("#partner svg")?.getAttribute("viewBox") === "0 0 107.75 16.3608", null, { timeout: 15000 });
  const setRange = (sel, v) => page.evaluate(([q, val]) => { const i = document.querySelector(q); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(i, val); i.dispatchEvent(new Event("input", { bubbles: true })); i.dispatchEvent(new Event("change", { bubbles: true })); }, [sel, String(v)]);
  const brandSel = '.setup input[data-scale="brand"]', markSel = '.setup input[data-scale="partner"]';
  await page.waitForSelector(brandSel); await setRange(brandSel, 1.6); await setRange(markSel, 2);
  await untilDraft(d => d.tokens.scale && d.tokens.scale.brand === 1.6 && d.tokens.scale.partner === 2, "the sizes in the document");
  await frame().waitForFunction(() => Math.round(document.querySelector("#brand svg").getBoundingClientRect().height) === 48 && Math.round(document.querySelector("#partner svg").getBoundingClientRect().height) === 52, null, { timeout: 15000 });
  await page.click('.marks .mark:has-text("Wave by Vento")'); await untilDraft(d => d.assets["wave-by-vento-w"].viewBox === "0 0 122.57 89", "back to the Vento mark");
  await setRange(brandSel, 1); await setRange(markSel, 1); await untilDraft(d => !d.tokens.scale, "the usual sizes again");
}, { timeout: 90000 });

test("History offers a reset of the draft to the committed document", async () => {
  await page.click('.bar button:has-text("History")'); await page.waitForSelector('button:has-text("Reset the draft")');
  await page.click('button:has-text("Reset the draft")');
  const d = await untilDraft(d => d.copy.partnerLine === "October 2026, Italy" && !d.sections.some(s => s.elements.some(e => e.place || e.nudge)), "the reset");
  assert.equal(d.sections.find(s => s.key === "lab").elements[0].asset, undefined, "the fluoroscopy frame is empty again");
  await stageReady();
}, { timeout: 90000 });
