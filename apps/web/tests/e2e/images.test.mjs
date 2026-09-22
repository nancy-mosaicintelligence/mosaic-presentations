// Images: upload into the presentation's library (private storage, members only), place on a station, see it on
// the stage, crop and adjust as data, remove; the stored document keeps storage:// paths, the stage gets /img/.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { startApp, ensureUsers, resetPresentation, signIn, USERS, TEST_SLUG } from "./fixtures.mjs";
const { chromium } = createRequire((process.env.PW_MODULES || process.env.NODE_PATH || "") + "/")("playwright");

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", ".."), PORT = 3128, BASE = `http://localhost:${PORT}`, ID = TEST_SLUG, API = `${BASE}/api/presentations/${ID}`;
let server, browser, page;
const frame = () => page.frame({ url: /\/player\// });
const draft = async () => (await (await page.request.get(`${API}/draft`)).json()).document;
const untilDraft = async (pred, what) => { const t0 = Date.now(); while (Date.now() - t0 < 15000) { const d = await draft(); if (pred(d)) return d; await new Promise(r => setTimeout(r, 250)); } throw new Error("timed out waiting for " + what); };
const stageReady = async () => { await page.waitForSelector(".loading", { state: "detached", timeout: 60000 }); await page.waitForSelector(".filmstrip .card", { timeout: 30000 }); await page.waitForTimeout(400); };
// a 4×3 PNG (red), made by hand: signature, IHDR, IDAT (zlib stored), IEND
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAAFklEQVR4nGP4z8DwHwyBFBhCWFAlYAAAtQ8Xg2gTMh0AAAAASUVORK5CYII=", "base64");

before(async () => {
  server = await startApp(spawn, APP, PORT);
  browser = await chromium.launch({ executablePath: process.env.PW_EXEC });
  page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  page.on("pageerror", e => console.error("pageerror:", e.message));
  await ensureUsers(); await resetPresentation();
  const r = await signIn(page, BASE, USERS.owner); assert.equal(r.status, 200, JSON.stringify(r.body));
}, { timeout: 180000 });
after(async () => { await browser?.close(); server?.kill(); });

test("an upload becomes an image asset with its size; wrong files are refused; the file is served to members only", async () => {
  const r = await page.request.post(`${API}/images`, { multipart: { file: { name: "room.png", mimeType: "image/png", buffer: PNG } } });
  const a = await r.json(); assert.equal(r.status(), 201, JSON.stringify(a));
  assert.equal(a.kind, "image"); assert.equal(a.width, 4); assert.equal(a.height, 3); assert.equal(a.mime, "image/png"); assert.match(a.src, /^storage:\/\/images\/[0-9a-f-]{36}\/[0-9a-f]{64}\.png$/); assert.match(a.url, new RegExp(`^/img/${ID}/[0-9a-f]{64}\\.png$`));
  const lib = await (await page.request.get(`${API}/images`)).json(); assert.equal(lib.length, 1);
  const bad = await page.request.post(`${API}/images`, { multipart: { file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("not an image") } } }); assert.equal(bad.status(), 422);
  const svg = await page.request.post(`${API}/images`, { multipart: { file: { name: "x.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") } } }); assert.equal(svg.status(), 422);
  const got = await page.request.get(BASE + a.url); assert.equal(got.status(), 200); assert.equal(got.headers()["content-type"], "image/png");
  const stranger = await (await browser.newContext()).newPage(); assert.equal((await stranger.request.get(BASE + a.url, { maxRedirects: 0 })).status(), 401, "signed out: no image");
  const c = await (await browser.newContext()).newPage(); await signIn(c, BASE, USERS.colleague); assert.equal((await c.request.get(BASE + a.url)).status(), 403, "no role: no image");
  globalThis.__img = a;
});

test("placed from the Images tab, the picture appears on the stage and in the document; crop and adjustments are data the stage applies", async () => {
  await page.goto(`${BASE}/presentations/${ID}/edit`); await stageReady();
  await page.click('.tabs button:has-text("Images")'); await page.waitForSelector(".imgcell");
  await page.click(".imgcell");
  const d = await untilDraft(d => d.sections[0].elements.some(e => e.type === "image"), "the image element");
  const el = d.sections[0].elements.find(e => e.type === "image"); assert.equal(el.asset, globalThis.__img.id); assert.equal(d.assets[el.asset].kind, "image"); assert.match(d.assets[el.asset].src, /^storage:\/\//, "the stored document keeps the storage path");
  await frame().waitForSelector(`figure.pic[data-id="${el.id}"] img`, { timeout: 15000 });
  const src = await frame().locator(`figure.pic[data-id="${el.id}"] img`).getAttribute("src"); assert.match(src, new RegExp(`^/img/${ID}/`), "the stage loads it from the served route");
  await page.waitForSelector('.ph code:has-text("' + el.id + '")');
  // adjust: brightness, a crop, a turn
  await page.locator('.row:has(.lab:has-text("Brightness")) input[type=range]').fill("1.4");
  await untilDraft(d => d.sections[0].elements.find(e => e.type === "image")?.adjust?.brightness === 1.4, "brightness");
  await page.click('.turns button:has-text("↻ 90°")');
  await untilDraft(d => d.sections[0].elements.find(e => e.type === "image")?.adjust?.rotate === 90, "rotation");
  const win = page.locator(".cropstage .win .se"); const b = await win.boundingBox(); await page.mouse.move(b.x + 6, b.y + 6); await page.mouse.down(); await page.mouse.move(b.x - 40, b.y - 30, { steps: 5 }); await page.mouse.up();
  let cropped; try { cropped = await untilDraft(d => { const c = d.sections[0].elements.find(e => e.type === "image")?.adjust?.crop; return c && c.w < 1 && c.h < 1; }, "the crop"); }
  catch (e) { throw new Error("crop did not land: adjust=" + JSON.stringify((await draft()).sections[0].elements.find(e => e.type === "image")?.adjust) + " win=" + JSON.stringify(await page.locator(".cropstage .win").getAttribute("style")) + " handle=" + JSON.stringify(b) + " stage=" + JSON.stringify(await page.locator(".cropstage").boundingBox())); }
  const c = cropped.sections[0].elements.find(e => e.type === "image").adjust.crop; assert.ok(c.x >= 0 && c.x + c.w <= 1.0001 && c.y + c.h <= 1.0001);
  const css = await frame().evaluate((id) => { const f = document.querySelector(`figure.pic[data-id="${id}"]`); return { filter: f.querySelector("img").style.filter, transform: f.querySelector(".crop").style.transform, imgW: f.querySelector("img").style.width }; }, el.id);
  assert.match(css.filter, /brightness\(1\.4\)/); assert.match(css.transform, /rotate\(90deg\)/); assert.notEqual(css.imgW, "100%", "the crop widens the picture inside its window");
  // width and side
  // a picture picked from the library is a free box on the stage: its width lives in Position
  await page.locator('.row:has(.lab:has-text("Width")) input.num').nth(1).fill("80");
  await untilDraft(d => d.sections[0].elements.find(e => e.type === "image")?.place?.w === 80, "the width");
  assert.equal(await frame().evaluate((id) => document.querySelector(`figure.pic[data-id="${id}"]`).style.width, el.id), "80%");
  globalThis.__el = el.id;
}, { timeout: 120000 });

test("undo walks the adjustments back; remove takes the picture off the stage but keeps the file", async () => {
  await page.click(".bar .title"); await page.keyboard.press("Meta+z");
  await untilDraft(d => d.sections[0].elements.find(e => e.type === "image")?.place?.w !== 80, "the undo");
  page.once("dialog", d => d.accept());
  await page.click('button:has-text("Remove from the station")');
  await untilDraft(d => !d.sections[0].elements.some(e => e.type === "image"), "the removal");
  await frame().waitForSelector(`figure.pic[data-id="${globalThis.__el}"]`, { state: "detached", timeout: 15000 });
  assert.equal((await (await page.request.get(`${API}/images`)).json()).length, 1, "the library keeps the file");
  assert.equal((await draft()).assets[globalThis.__img.id].kind, "image", "the asset record stays in the document (versions may still use it)");
}, { timeout: 60000 });
