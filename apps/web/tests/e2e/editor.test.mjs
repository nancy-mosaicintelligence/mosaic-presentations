// Browser tests for the editor: the draft, editing through the stage, undo/redo, visibility, motion,
// autosave, preview, versions (create, preview, duplicate, restore) and the player route. Runs the dev
// server on its own port against a temporary data directory, so nothing in apps/web/data is touched.
//   PW_EXEC=… PW_MODULES=… node --test tests/e2e/editor.test.mjs
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { startApp, ensureUsers, resetPresentation, signIn, USERS } from "./fixtures.mjs";
const { chromium } = createRequire((process.env.PW_MODULES || process.env.NODE_PATH || "") + "/")("playwright");

const here = dirname(fileURLToPath(import.meta.url)), APP = join(here, "..", "..");
const PORT = 3123, BASE = `http://localhost:${PORT}`, ID = "italian-tech-week";
let server, browser, page, data; const answers = [];
// API calls go through the signed-in page's context so they carry the session cookies
const api = async (path, init = {}) => { const r = await page.request.fetch(BASE + "/api/presentations/" + ID + path, { method: init.method || "GET", headers: init.headers, data: init.body }); return { status: r.status(), body: await r.json().catch(() => ({})) }; };
const get = async (path) => { const r = await page.request.get(BASE + path); return { status: r.status(), text: await r.text() }; };
const json = (o) => ({ method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(o) });
const frame = () => page.frame({ url: /\/player\// });
const savedSoon = async () => { await page.waitForFunction(() => /^Saved /.test(document.querySelector(".bar .save")?.textContent || ""), null, { timeout: 15000 }); };
/** Click a bound element on the stage (a real pointer press inside the frame) and wait for the inspector to show it. */
const selectOnStage = async (id) => {
  const el = frame().locator(`[data-id="${id}"]`);
  await el.waitFor({ state: "visible" });
  const box = await el.boundingBox();   // already relative to the page's viewport, frame offset included
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  try { await page.waitForSelector(`.ph code:has-text("${id}")`, { timeout: 5000 }); }
  catch (e) { const diag = await frame().evaluate(() => ({ body: document.body.className, editsel: document.querySelector(".editsel")?.getAttribute("data-id") })); throw new Error(`selection of ${id} did not reach the inspector: ${JSON.stringify(diag)}`); }
};
const stageReady = async () => { await page.waitForSelector(".loading", { state: "detached", timeout: 60000 }); await page.waitForTimeout(400); };

before(async () => {
  data = mkdtempSync(join(tmpdir(), "itw-editor-"));
  server = await startApp(spawn, APP, PORT, { ITW_DATA_DIR: data });
  browser = await chromium.launch({ executablePath: process.env.PW_EXEC });
  page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  page.on("pageerror", e => console.error("pageerror:", e.message));
  page.on("dialog", d => d.accept(answers.shift() ?? ""));
  // a clean presentation; the owner signs in (bootstrapped from OWNER_EMAILS) and works as the editor here
  await ensureUsers(); await resetPresentation();
  const r = await signIn(page, BASE, USERS.owner); assert.equal(r.status, 200, JSON.stringify(r.body));
}, { timeout: 180000 });
after(async () => { await browser?.close(); server?.kill(); rmSync(data, { recursive: true, force: true }); });

test("the root is the library, and the keynote is in it", async () => {
  const r = await page.request.get(BASE + "/", { maxRedirects: 0 });
  assert.equal(r.status(), 200); assert.ok((await r.text()).includes("Italian Tech Week"));
});

test("the draft is seeded from the committed document and an invalid draft never replaces it", async () => {
  const d = await api("/draft");
  assert.equal(d.status, 200); assert.equal(d.body.document.schemaVersion, 6); assert.equal(d.body.document.stations.length, 55); assert.equal(d.body.basedOn, "source");
  const bad = structuredClone(d.body.document); bad.sections[0].elements[0].runs = [{ t: "<script>" }]; bad.sections[0].elements[0].onclick = "x";
  const r = await api("/draft", json({ document: bad }));
  assert.equal(r.status, 422); assert.ok(r.body.issues.some(i => i.path === "sections[0].elements[0].runs[0].t")); assert.ok(r.body.issues.some(i => i.path === "sections[0].elements[0].onclick"));
  assert.equal((await api("/draft")).body.contentHash, d.body.contentHash);
});

test("selecting on the stage, editing copy, autosave and reload", async () => {
  await page.goto(BASE + "/presentations/" + ID + "/edit"); await stageReady();
  await selectOnStage("open.1");
  const first = page.locator(".runs .run input.field").first();
  await first.fill("Hello from the editor");
  await savedSoon();
  const d = await api("/draft");
  assert.equal(d.body.document.sections[0].elements[0].runs[0].t, "Hello from the editor");
  assert.ok((await frame().locator('[data-id="open.1"]').textContent()).includes("Hello from the editor"), "the stage shows the edit live");
  await page.reload(); await stageReady();
  assert.ok((await frame().locator('[data-id="open.1"]').textContent()).includes("Hello from the editor"), "the edit survives a reload");
}, { timeout: 120000 });

test("undo and redo walk the edit; the stage follows", async () => {
  await selectOnStage("open.1");
  await page.locator(".runs .run input.field").first().fill("Second edit"); await savedSoon();
  await page.keyboard.press("Meta+z"); await savedSoon();
  assert.equal((await api("/draft")).body.document.sections[0].elements[0].runs[0].t, "Hello from the editor");
  await page.keyboard.press("Meta+Shift+z"); await savedSoon();
  assert.equal((await api("/draft")).body.document.sections[0].elements[0].runs[0].t, "Second edit");
  await page.click('button:has-text("Undo")'); await savedSoon();
  assert.equal((await api("/draft")).body.document.sections[0].elements[0].runs[0].t, "Hello from the editor");
}, { timeout: 60000 });

test("visibility, roles and a style override reach the draft and the stage", async () => {
  await stageReady();
  await page.locator('.row:has(.lab:text-is("Visible")) input[type=checkbox]').uncheck(); await savedSoon();
  assert.equal((await api("/draft")).body.document.sections[0].elements[0].hidden, true);
  assert.equal(await frame().locator('[data-id="open.1"]').evaluate(e => getComputedStyle(e).display), "none");
  await page.locator('.row:has(.lab:text-is("Visible")) input[type=checkbox]').check(); await savedSoon();
  await page.locator('.row:has(.lab:text-is("Measure")) input').fill("12ch"); await savedSoon();
  const d = (await api("/draft")).body.document.sections[0].elements[0];
  assert.equal(d.hidden, false); assert.equal(d.style.maxWidth, "12ch");
  assert.equal(await frame().locator('[data-id="open.1"]').evaluate(e => e.style.maxWidth), "12ch");
  await page.locator('.row:has(.lab:text-is("Measure")) input').fill("url(x)");   // refused by the grammar: not applied
  await page.waitForTimeout(900);
  assert.equal((await api("/draft")).body.document.sections[0].elements[0].style.maxWidth, "12ch");
}, { timeout: 60000 });

test("motion values are range-checked and saved", async () => {
  await stageReady();
  await page.click('.tabs button:has-text("Motion")');
  const spacing = page.locator('.row:has(.lab:has-text("Reveal spacing")) input');
  await spacing.fill("0.9"); await savedSoon();
  assert.equal((await api("/draft")).body.document.animation.revealSpacing, 0.9);
  await spacing.fill("99"); await page.waitForTimeout(900);
  assert.equal((await api("/draft")).body.document.animation.revealSpacing, 0.9);
}, { timeout: 60000 });

test("a named version is immutable; later edits, restore, duplicate and preview", async () => {
  answers.push("First cut", "before the review");
  await page.click('button:has-text("New version")');
  await page.waitForSelector('.versions li:has-text("First cut")');
  const list = (await api("/versions")).body; assert.equal(list.length, 1); assert.equal(list[0].note, "before the review");
  const v = (await api("/versions/" + list[0].id)).body; assert.equal(v.document.sections[0].elements[0].runs[0].t, "Hello from the editor");
  // a later edit, then restore: the draft returns to the snapshot and the version list keeps everything
  await page.click('.tabs button:has-text("Element")'); await selectOnStage("open.1");
  await page.locator(".runs .run input.field").first().fill("After the version"); await savedSoon();
  answers.push("Second cut", "");
  await page.click('button:has-text("New version")'); await page.waitForSelector('.versions li:has-text("Second cut")');
  const li = page.locator('.versions li:has-text("First cut")');
  await li.locator('button:has-text("Restore")').click(); await li.locator('.confirm button:has-text("Restore")').click();
  await page.waitForFunction(() => [...document.querySelectorAll(".versions .tag")].some(t => t.textContent === "restored"), null, { timeout: 15000 });
  const d = await api("/draft"); assert.equal(d.body.document.sections[0].elements[0].runs[0].t, "Hello from the editor"); assert.equal(d.body.basedOn, list[0].id);
  assert.equal((await api("/versions")).body.length, 2, "restoring deletes nothing");
  assert.equal((await api("/versions/" + (await api("/versions")).body.find(x => x.name === "Second cut").id)).body.document.sections[0].elements[0].runs[0].t, "After the version", "the later version is untouched");
  answers.push("First cut (copy)");
  await li.locator('button:has-text("Duplicate")').click(); await page.waitForSelector('.versions li:has-text("First cut (copy)")');
  assert.equal((await api("/versions")).body.length, 3);
  // previewing a version frames the player with that version embedded, read only
  await page.locator('.versions li:has-text("Second cut") button:has-text("Preview")').click();
  await page.waitForSelector(".editor.preview"); await stageReady();
  assert.ok((await frame().locator('[data-id="open.1"]').textContent()).includes("After the version"));
  assert.equal(await page.locator(".side").count(), 0);
  await page.click('button:has-text("Back to draft")'); await page.waitForSelector(".editor:not(.preview)"); await stageReady();
  assert.ok((await frame().locator('[data-id="open.1"]').textContent()).includes("Hello from the editor"));
}, { timeout: 180000 });

test("preview hides the editor and returns without losing work", async () => {
  await page.click('button:has-text("Preview")'); await page.waitForSelector(".editor.preview");
  assert.equal(await page.locator(".side").count(), 0); assert.ok(page.url().includes("preview=1"));
  await page.click('button:has-text("Back to editor")'); await page.waitForSelector(".editor:not(.preview)");
  assert.equal(await page.locator(".side").count(), 2);
  assert.equal((await api("/draft")).body.document.sections[0].elements[0].runs[0].t, "Hello from the editor");
}, { timeout: 60000 });

test("the player route embeds the requested document and refuses others", async () => {
  assert.ok((await get("/player/" + ID)).text.includes("Hello from the editor"));
  assert.ok(!(await get("/player/" + ID + "?source=committed")).text.includes("Hello from the editor"));
  const vid = (await api("/versions")).body.find(x => x.name === "Second cut").id;
  assert.ok((await get("/player/" + ID + "?source=version:" + vid)).text.includes("After the version"));
  assert.equal((await get("/player/" + ID + "?source=version:nope")).status, 404);
  assert.equal((await get("/player/nope")).status, 404);
  assert.equal((await get("/player/" + ID + "?source=../etc")).status, 400);
  assert.equal((await get("/player/" + ID + "?source=published")).status, 404, "nothing is published yet");
});

test("an SVG upload becomes an svg-paths asset stored privately; anything but paths is refused", async () => {
  const good = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>alert(1)</script><path d="M0 0 L10 10 Z"/><path d="M5 5 h2"/></svg>';
  const r = await page.request.post(BASE + "/api/presentations/" + ID + "/assets", { multipart: { file: { name: "mark.svg", mimeType: "image/svg+xml", buffer: Buffer.from(good) } } });
  const body = await r.json();
  assert.equal(r.status(), 201, JSON.stringify(body)); assert.equal(body.kind, "svg-paths"); assert.equal(body.viewBox, "0 0 10 10"); assert.equal(body.paths.length, 2);
  assert.match(body.sources[0].sha256, /^[0-9a-f]{64}$/); assert.match(body.sources[0].path, /^storage:\/\/assets\/[0-9a-f-]{36}\/[0-9a-f]{64}\.svg$/);
  const none = await page.request.post(BASE + "/api/presentations/" + ID + "/assets", { multipart: { file: { name: "x.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg viewBox="0 0 1 1"><rect/></svg>') } } });
  assert.equal(none.status(), 422);
});
