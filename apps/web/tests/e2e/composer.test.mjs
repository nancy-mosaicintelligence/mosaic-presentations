// The composer: a new deck from the library starts with an opening and a close on a plain scene; beats are added
// from the picker, the deck renders sections it never had in its markup; stations move and go; the deck presents.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { startApp, ensureUsers, resetPresentation, signIn, USERS, admin } from "./fixtures.mjs";
const { chromium } = createRequire((process.env.PW_MODULES || process.env.NODE_PATH || "") + "/")("playwright");

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", ".."), PORT = 3129, BASE = `http://localhost:${PORT}`;
let server, browser, page, slug;
const frame = () => page.frame({ url: /\/player\// });
const api = async (path, init) => { const r = await page.request.fetch(BASE + path, { maxRedirects: 0, ...init }); return { status: r.status(), body: await r.json().catch(() => ({})) }; };
const draft = async () => (await api(`/api/presentations/${slug}/draft`)).body.document;
const untilDraft = async (pred, what) => { const t0 = Date.now(); while (Date.now() - t0 < 15000) { const d = await draft(); if (pred(d)) return d; await new Promise(r => setTimeout(r, 250)); } throw new Error("timed out waiting for " + what + ": " + JSON.stringify((await draft()).stations.map(s => s.section))); };
const stageReady = async () => { await page.waitForSelector(".loading", { state: "detached", timeout: 60000 }); await page.waitForSelector(".filmstrip .card", { timeout: 30000 }); await page.waitForTimeout(400); };
const landed = async (key) => frame().waitForFunction((k) => { const b = document.querySelector(`section.beat[data-k="${k}"]`); return b && parseFloat(getComputedStyle(b).opacity) > 0.95; }, key, { timeout: 20000 });

before(async () => {
  server = await startApp(spawn, APP, PORT);
  browser = await chromium.launch({ executablePath: process.env.PW_EXEC });
  page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  page.on("pageerror", e => console.error("pageerror:", e.message));
  page.on("dialog", d => d.accept());
  await ensureUsers(); await resetPresentation();
  const sb = admin(); const { data } = await sb.from("presentations").select("id, slug").neq("slug", "italian-tech-week"); for (const p of data || []) await sb.from("presentations").delete().eq("id", p.id);
  const r = await signIn(page, BASE, USERS.owner); assert.equal(r.status, 200, JSON.stringify(r.body));
}, { timeout: 180000 });
after(async () => { await browser?.close(); server?.kill(); });

test("a new deck starts with an opening carrying its title, a close, a plain scene and the lockup", async () => {
  const made = await api("/api/presentations", { method: "POST", data: { kind: "deck", title: "Series B story", description: "Milan, March 2027" } });
  assert.equal(made.status, 201, JSON.stringify(made.body)); slug = made.body.slug; assert.equal(made.body.renderer, "mosaic-deck");
  const d = await draft();
  assert.equal(d.scene.kind, "plain"); assert.equal(d.stations.length, 2); assert.equal(d.stations[1].close, true);
  assert.equal(d.sections[0].elements[0].runs[0].t, "Series B story"); assert.equal(d.copy.partnerLine, "Milan, March 2027"); assert.ok(d.assets["mosaic-lockup"]); assert.equal(d.assets["wave-by-vento-w"], undefined);
});

test("the stage draws the generated sections: the opening on a plain black stage, the event line, no event mark, the close's lockup", async () => {
  await page.goto(`${BASE}/presentations/${slug}/edit`); await stageReady();
  await landed("opening1");
  const seen = await frame().evaluate(() => ({ title: document.querySelector('section.beat[data-k="opening1"] p').textContent, gen: !!document.querySelector('section.beat[data-k="opening1"][data-gen]'), partner: document.querySelector("#partner .when").textContent, markHidden: document.querySelector("#partner span[role=img]").hidden, gl: document.getElementById("stage3d").style.opacity, cue: document.getElementById("cue").textContent }));
  assert.equal(seen.title, "Series B story"); assert.ok(seen.gen); assert.equal(seen.partner, "Milan, March 2027"); assert.equal(seen.markHidden, true); assert.equal(seen.gl, "0"); assert.equal(seen.cue, "Press → to begin");
  await page.click('.preview-nav button[aria-label="next station"]'); await landed("close1");
  await frame().waitForFunction(() => parseFloat(document.getElementById("lock").style.opacity) > 0.9, null, { timeout: 20000 });
}, { timeout: 90000 });

test("beats from the picker: each adds its section and stations after the current one, re-spaced; the stage shows them", async () => {
  await page.locator('.filmstrip .card[data-i="0"]').click(); await page.waitForFunction(() => document.querySelector(".filmstrip .card.current")?.dataset.i === "0");
  for (const [type, key] of [["chapter", "chapter1"], ["statement", "statement1"], ["list", "list1"], ["pills", "pills1"], ["point", "point1"], ["number", "number1"], ["columns", "columns1"], ["image", "image1"]]) {
    await page.click('.station-tools button:has-text("+ Add station")');
    await page.click(`.beatpicker .beat[data-type="${type}"]`);
    await untilDraft(d => d.sections.some(s => s.key === key), key);
    await landed(key);
  }
  const d = await draft();
  assert.equal(d.stations.length, 2 + 1 + 1 + 3 + 1 + 2 + 1 + 1 + 1, "opening + chapter + statement + list(3) + pills + point(2) + number + columns + image + close");
  const ps = d.stations.map(s => s.p); assert.deepEqual(ps, ps.map((_, i) => +(i * 0.04).toFixed(4)), "re-spaced at 0.04");
  assert.equal(d.stations[d.stations.length - 1].close, true, "the close stays last");
  assert.equal(d.stations[d.stations.length - 2].section, "image1", "the newest beat sits before the close");
  const list = d.sections.find(s => s.key === "list1"); const listStations = d.stations.filter(s => s.section === "list1").map(s => s.p);
  assert.deepEqual(list.elements[1].items.map(i => i.reveal.p), listStations, "each list item reveals on its own station");
  const cols = await frame().evaluate(() => { const g = document.querySelector('section.beat[data-k="columns1"] .cols'); return g ? { cols: g.children.length, left: g.children[0].querySelector("p").textContent } : null; });
  assert.deepEqual(cols, { cols: 2, left: "Left" }, "nested groups render as two columns");
  assert.equal(await page.locator(".filmstrip .card").count(), d.stations.length);
}, { timeout: 240000 });

test("a beat moves as a whole and a station can be removed; undo restores the structure", async () => {
  let d = await draft(); const iList = d.stations.findIndex(s => s.section === "list1");
  await page.locator(`.filmstrip .card[data-i="${iList}"]`).click(); await page.waitForFunction((i) => document.querySelector(".filmstrip .card.current")?.dataset.i === String(i), iList);
  await page.click('.station-tools button[title="move this beat earlier"]');
  d = await untilDraft(d => d.stations.findIndex(s => s.section === "list1") < iList, "the move");
  assert.deepEqual(d.stations.filter(s => s.section === "list1").length, 3, "the list's three stations moved together");
  assert.equal(d.stations[d.stations.findIndex(s => s.section === "list1") + 3].section, "statement1", "the statement now follows the list");
  const n = d.stations.length; const iNum = d.stations.findIndex(s => s.section === "number1");
  await page.locator(`.filmstrip .card[data-i="${iNum}"]`).click(); await page.waitForFunction((i) => document.querySelector(".filmstrip .card.current")?.dataset.i === String(i), iNum);
  await page.click('.station-tools button:has-text("Remove")');
  d = await untilDraft(d => d.stations.length === n - 1, "the removal");
  assert.ok(!d.sections.some(s => s.key === "number1"), "an unused section leaves with its station");
  await frame().waitForSelector('section.beat[data-k="number1"]', { state: "detached", timeout: 15000 });
  await page.click(".bar .title"); await page.keyboard.press("Meta+z");
  d = await untilDraft(d => d.stations.length === n, "the undo");
  assert.ok(d.sections.some(s => s.key === "number1"));
}, { timeout: 120000 });

test("the composed deck versions, publishes and presents like any other", async () => {
  const v = await api(`/api/presentations/${slug}/versions`, { method: "POST", data: { name: "First cut", document: await draft() } }); assert.equal(v.status, 201);
  assert.equal((await api(`/api/presentations/${slug}/publication`, { method: "POST", data: { versionId: v.body.id } })).status, 201);
  const pub = await page.request.get(`${BASE}/p/${slug}`); assert.equal(pub.status(), 200); const html = await pub.text(); assert.ok(html.includes('"kind":"plain"')); assert.ok(html.includes("Series B story"));
});
