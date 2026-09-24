// The library: what a company account and an invited guest see; creating an editable deck from the engine's
// template (its own draft, its own roles); importing a static HTML deck (stored privately, served in a
// sandbox to members only); adding a link; archiving.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { startApp, ensureUsers, resetPresentation, signIn, USERS, admin } from "./fixtures.mjs";
const { chromium } = createRequire((process.env.PW_MODULES || process.env.NODE_PATH || "") + "/")("playwright");

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", ".."), PORT = 3126, BASE = `http://localhost:${PORT}`;
let server, browser; const pages = {};
const as = async (who) => { if (pages[who]) return pages[who]; const p = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage(); pages[who] = p; const r = await signIn(p, BASE, USERS[who]); assert.equal(r.status, 200, `${who}: ${JSON.stringify(r.body)}`); return p; };
const json = async (p, path, init) => { const r = await p.request.fetch(BASE + path, { maxRedirects: 0, ...init }); return { status: r.status(), body: await r.json().catch(() => ({})), headers: r.headers() }; };
const HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Imported deck</title></head><body><h1 id="h">Imported deck</h1><script>document.getElementById("h").textContent += " · scripts run in the sandbox: " + (function(){ try { return document.cookie === "" ? "no cookies" : "COOKIES"; } catch (e) { return "no cookies"; } })();</script></body></html>`;

before(async () => {
  server = await startApp(spawn, APP, PORT);
  browser = await chromium.launch({ executablePath: process.env.PW_EXEC });
  await ensureUsers(); await resetPresentation();
  // any presentation left by a previous run of this suite goes away too
  const sb = admin(); const { data } = await sb.from("presentations").select("id, slug, created_by"); const users = await ensureUsers(); const mine = new Set(Object.values(users).map(u => u.id));
  for (const p of data || []) if (p.slug !== "italian-tech-week" && p.slug !== "e2e-keynote" && mine.has(p.created_by)) await sb.from("presentations").delete().eq("id", p.id);   // only what the test accounts made
}, { timeout: 180000 });
after(async () => { await browser?.close(); server?.kill(); });

test("the home page is the library; a company colleague with no role sees an empty one and may create; a guest may not", async () => {
  const c = await as("colleague");
  const home = await c.request.get(BASE + "/", { maxRedirects: 0 }); assert.equal(home.status(), 200); assert.ok((await home.text()).includes("New presentation"));
  assert.deepEqual((await json(c, "/api/presentations")).body, []);
  const o = await as("owner");
  const lib = (await json(o, "/api/presentations")).body; assert.ok(lib.some(p => p.slug === "italian-tech-week" && p.role === "owner" && p.kind === "deck"), "the keynote, as owner"); assert.ok(lib.some(p => p.slug === "e2e-keynote"));
  // the guest is admitted only through an invitation (from the access suite's rules); here they hold none → refused at sign-in
  const g = await (await browser.newContext()).newPage(); const r = await signIn(g, BASE, USERS.guest); assert.equal(r.status, 403);
});

test("the library's Present shows the working document with a way back; the editor's frame never gets the exit pill", async () => {
  const o = await as("owner");
  const home = await (await o.request.get(BASE + "/")).text();
  assert.ok(home.includes("/player/e2e-keynote?source=draft&amp;back=%2F") || home.includes("/player/e2e-keynote?source=draft&back=%2F"), "Present is the draft player with a way back");
  const top = await o.request.get(`${BASE}/player/e2e-keynote?source=draft&back=%2F`); assert.equal(top.status(), 200);
  const html = await top.text(); assert.ok(html.includes('id="itwExit"') && html.includes('href="/"'), "the exit pill, back to the library");
  assert.ok(!(await (await o.request.get(`${BASE}/player/e2e-keynote?source=draft`)).text()).includes("itwExit"), "no pill inside the editor's frame");
  assert.ok(!(await (await o.request.get(`${BASE}/player/e2e-keynote?source=draft&back=https%3A%2F%2Fexample.com`)).text()).includes("itwExit"), "another origin is never a way back");
  // in the browser: the pill is there, Escape leaves for the library
  await o.goto(`${BASE}/player/e2e-keynote?source=draft&back=%2F`); await o.waitForSelector("#itwExit.show"); await o.mouse.move(300, 300);
  await o.keyboard.press("Escape"); await o.waitForURL(`${BASE}/`, { timeout: 10000 });
});

test("a presentation is renamed on its card; the API takes owners and editors, refuses viewers and empty titles", async () => {
  const o = await as("owner");
  const bad = await json(o, `/api/presentations/e2e-keynote`, { method: "PATCH", data: { title: "   " } }); assert.equal(bad.status, 422);
  const c = await as("colleague"); assert.equal((await json(c, `/api/presentations/e2e-keynote`, { method: "PATCH", data: { title: "x" } })).status, 403, "no role: no rename");
  await o.goto(BASE + "/"); await o.waitForSelector(".pcard"); await o.waitForLoadState("networkidle");   /* hydrated: the buttons have their handlers */
  const card = o.locator('.pcard[data-slug="e2e-keynote"]'); await card.hover();   /* by slug: while the box is open the title text is gone from the card */
  for (let i = 0; i < 5 && (await card.locator("input.rename").count()) === 0; i++) { await card.locator(".rename-btn").click(); await o.waitForTimeout(300); }
  await card.locator("input.rename").fill("E2E keynote, renamed"); await o.keyboard.press("Enter");
  await o.waitForSelector('.pcard h3:has-text("E2E keynote, renamed")');
  const lib = (await json(o, "/api/presentations")).body; assert.equal(lib.find(p => p.slug === "e2e-keynote").title, "E2E keynote, renamed");
  assert.equal((await json(o, `/api/presentations/e2e-keynote`, { method: "PATCH", data: { title: "E2E keynote" } })).status, 200);
});

test("delete removes a presentation for everyone — rows and files; owners only; the built-in decks refuse and stay archivable", async () => {
  const c = await as("colleague");
  const made = await json(c, "/api/presentations", { method: "POST", data: { kind: "deck", title: "Short-lived deck", renderer: "itw-keynote" } }); assert.equal(made.status, 201);
  const slug = made.body.slug; assert.equal((await json(c, `/api/presentations/${slug}/draft`)).status, 200, "it has a draft");
  const o = await as("owner"); assert.equal((await json(o, `/api/presentations/${slug}`, { method: "DELETE" })).status, 403, "no role on it: no delete");
  // from the card, with the warning accepted
  await c.goto(BASE + "/"); await c.waitForSelector(`.pcard[data-slug="${slug}"]`); await c.waitForLoadState("networkidle");
  c.once("dialog", d => { assert.match(d.message(), /no undo/); d.accept(); });
  await c.locator(`.pcard[data-slug="${slug}"] button:has-text("Delete")`).click();
  await c.waitForSelector(`.pcard[data-slug="${slug}"]`, { state: "detached", timeout: 10000 });
  assert.equal((await json(c, `/api/presentations/${slug}/draft`)).status, 404, "gone"); assert.equal((await c.request.get(`${BASE}/p/${slug}`)).status(), 404);
  assert.ok(!(await json(c, "/api/presentations")).body.some(p => p.slug === slug));
  // the keynote is built in: no Delete on its card, and the API refuses
  assert.equal((await json(o, `/api/presentations/italian-tech-week`, { method: "DELETE" })).status, 409);
  await o.goto(BASE + "/"); await o.waitForSelector('.pcard[data-slug="italian-tech-week"]');
  assert.equal(await o.locator('.pcard[data-slug="italian-tech-week"] button:has-text("Delete")').count(), 0); assert.equal(await o.locator('.pcard[data-slug="italian-tech-week"] button:has-text("Archive")').count(), 1);
});

test("Make a copy: a new deck of the caller's own, whose draft is the source's current document, pictures copied along", async () => {
  const o = await as("owner");
  // the source: the test keynote with an edit and a picture in its library
  const d = (await json(o, "/api/presentations/e2e-keynote/draft")).body.document; d.stations[0].note = "copied along";
  const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAAFklEQVR4nGP4z8DwHwyBFBhCWFAlYAAAtQ8Xg2gTMh0AAAAASUVORK5CYII=", "base64");
  const up = await o.request.post(`${BASE}/api/presentations/e2e-keynote/images`, { multipart: { file: { name: "room.png", mimeType: "image/png", buffer: PNG } } }); const img = await up.json(); assert.ok([200, 201].includes(up.status()), JSON.stringify(img));
  const { url: _u, createdAt: _c, id: _i, ...asset } = img; d.assets[img.id] = asset; d.sections[0].elements.push({ id: "open.90", type: "image", asset: img.id, place: { x: 10, y: 10, w: 20 }, reveal: { p: d.stations[0].p } });
  assert.equal((await json(o, "/api/presentations/e2e-keynote/draft", { method: "PUT", data: { document: d } })).status, 200);
  const made = await json(o, "/api/presentations/e2e-keynote/copy", { method: "POST" }); assert.equal(made.status, 201, JSON.stringify(made.body)); assert.equal(made.body.title, "Copy of E2E keynote");
  const lib = (await json(o, "/api/presentations")).body.find(p => p.slug === made.body.slug); assert.equal(lib.role, "owner");
  const copy = (await json(o, `/api/presentations/${made.body.slug}/draft`)).body.document;
  assert.equal(copy.stations[0].note, "copied along", "the current document, edits included");
  const a = copy.assets[img.id]; assert.ok(a.src.includes(`storage://images/${made.body.id}/`), "the picture now lives under the copy: " + a.src);
  assert.equal((await o.request.get(`${BASE}/img/${made.body.slug}/${a.src.split("/").pop()}`)).status(), 200, "served from the copy's own storage");
  assert.ok(copy.sections[0].elements.some(e => e.id === "open.90" && e.asset === img.id));
  // an editor may copy; a viewer may not
  const c = await as("colleague"); assert.equal((await json(c, "/api/presentations/e2e-keynote/copy", { method: "POST" })).status, 403);
  await o.goto(BASE + "/"); await o.waitForSelector('.pcard[data-slug="e2e-keynote"] button:has-text("Make a copy")');
});

test("the address: owners set the slug in every link; taken, built-in and malformed ones are refused; editors may not", async () => {
  const o = await as("owner");
  const made = await json(o, "/api/presentations", { method: "POST", data: { kind: "deck", title: "Address test", renderer: "itw-keynote" } }); assert.equal(made.status, 201); assert.equal(made.body.slug, "address-test");
  assert.equal((await json(o, "/api/presentations/address-test", { method: "PATCH", data: { slug: "Bad Slug!" } })).status, 422);
  assert.equal((await json(o, "/api/presentations/address-test", { method: "PATCH", data: { slug: "italian-tech-week" } })).status, 409, "a built-in deck's address");
  assert.equal((await json(o, "/api/presentations/address-test", { method: "PATCH", data: { slug: "e2e-keynote" } })).status, 409, "taken");
  const moved = await json(o, "/api/presentations/address-test", { method: "PATCH", data: { slug: "fundomo-agm-2026" } }); assert.equal(moved.status, 200, JSON.stringify(moved.body)); assert.equal(moved.body.slug, "fundomo-agm-2026");
  assert.equal((await json(o, "/api/presentations/fundomo-agm-2026/draft")).status, 200, "the deck answers at its new address"); assert.equal((await json(o, "/api/presentations/address-test/draft")).status, 404, "and no longer at the old one");
  const c = await as("colleague"); assert.equal((await json(c, "/api/presentations/fundomo-agm-2026", { method: "PATCH", data: { slug: "x" } })).status, 403);
  await json(o, "/api/presentations/fundomo-agm-2026", { method: "DELETE" });
});

test("an editable copy of the keynote starts from its document, with its own draft and its creator as owner", async () => {
  const c = await as("colleague");
  const made = await json(c, "/api/presentations", { method: "POST", data: { kind: "deck", title: "Series A narrative", renderer: "itw-keynote" } });
  assert.equal(made.status, 201, JSON.stringify(made.body)); assert.equal(made.body.slug, "series-a-narrative"); assert.equal(made.body.kind, "deck");
  const lib = (await json(c, "/api/presentations")).body; assert.equal(lib.length, 1); assert.equal(lib[0].role, "owner");
  const draft = await json(c, "/api/presentations/series-a-narrative/draft"); assert.equal(draft.status, 200); assert.equal(draft.body.document.stations.length, 55);
  // its draft is separate from the keynote's
  const doc = draft.body.document; doc.stations[0].note = "series A note"; assert.equal((await json(c, "/api/presentations/series-a-narrative/draft", { method: "PUT", data: { document: doc } })).status, 200);
  const o = await as("owner");
  assert.equal((await json(o, "/api/presentations/series-a-narrative/draft")).status, 403, "the keynote's owner has no role on the colleague's deck");
  assert.notEqual((await json(o, "/api/presentations/e2e-keynote/draft")).body.document.stations[0].note, "series A note");
  assert.equal((await c.request.get(`${BASE}/presentations/series-a-narrative/edit`)).status(), 200);
  // a second with the same title gets a different slug
  const again = await json(c, "/api/presentations", { method: "POST", data: { kind: "deck", title: "Series A narrative" } }); assert.equal(again.status, 201); assert.notEqual(again.body.slug, "series-a-narrative");
});

test("an imported HTML deck is stored privately and presented in a sandbox to members only; a link is kept as a link", async () => {
  const c = await as("colleague");
  const r = await c.request.post(BASE + "/api/presentations", { multipart: { title: "Board deck (static)", file: { name: "board.html", mimeType: "text/html", buffer: Buffer.from(HTML) } } });
  const made = await r.json(); assert.equal(r.status(), 201, JSON.stringify(made)); assert.equal(made.kind, "html"); assert.match(made.storagePath, /^[0-9a-f-]{36}\/index\.html$/);
  const shell = await c.request.get(`${BASE}/p/${made.slug}`); assert.equal(shell.status(), 200); const shellHtml = await shell.text(); assert.ok(shellHtml.includes(`/raw/${made.slug}`)); assert.ok(shellHtml.includes('id="itwExit"'), "the full-window page has its way back");
  const raw = await c.request.get(`${BASE}/raw/${made.slug}`); assert.equal(raw.status(), 200); assert.ok((await raw.text()).includes("Imported deck")); assert.match(raw.headers()["content-security-policy"], /sandbox allow-scripts/);
  // in the browser the file runs, but with an opaque origin: no cookies of ours
  await c.goto(`${BASE}/p/${made.slug}`); const inner = c.frame({ url: /\/raw\// }); await inner.waitForSelector("#h"); assert.match(await inner.locator("#h").textContent(), /no cookies/);
  const o = await as("owner");
  assert.equal((await o.request.get(`${BASE}/raw/${made.slug}`)).status(), 403); assert.equal((await o.request.get(`${BASE}/p/${made.slug}`)).status(), 403);
  assert.equal((await o.request.get(`${BASE}/presentations/${made.slug}/edit`, { maxRedirects: 0 })).status(), 307, "an HTML deck has no editor");
  const bad = await c.request.post(BASE + "/api/presentations", { multipart: { title: "x", file: { name: "x.html", mimeType: "text/html", buffer: Buffer.from("just text") } } }); assert.equal(bad.status(), 422);
  const link = await json(c, "/api/presentations", { method: "POST", data: { kind: "link", title: "Drive deck", url: "https://docs.google.com/presentation/d/abc/edit" } });
  assert.equal(link.status, 201); assert.equal(link.body.kind, "link");
  const go = await c.request.get(`${BASE}/p/${link.body.slug}`, { maxRedirects: 0 }); assert.equal(go.status(), 302); assert.equal(go.headers()["location"], "https://docs.google.com/presentation/d/abc/edit");
  assert.equal((await json(c, "/api/presentations", { method: "POST", data: { kind: "link", title: "bad", url: "http://127.0.0.1:54321/x" } })).status, 422, "private addresses are refused");
  assert.equal((await json(c, "/api/presentations", { method: "POST", data: { kind: "html", title: "bad", url: "ftp://x" } })).status, 422);
  const lib = (await json(c, "/api/presentations")).body; assert.deepEqual(lib.map(p => p.kind).sort(), ["deck", "deck", "html", "link"]);
});

test("archiving removes a presentation from the library without deleting it; only owners", async () => {
  const c = await as("colleague"), o = await as("owner");
  const lib = (await json(c, "/api/presentations")).body; const link = lib.find(p => p.kind === "link");
  assert.equal((await json(o, `/api/presentations/${link.slug}/archive`, { method: "POST" })).status, 403);
  assert.equal((await json(c, `/api/presentations/${link.slug}/archive`, { method: "POST" })).status, 200);
  assert.ok(!(await json(c, "/api/presentations")).body.some(p => p.slug === link.slug));
  assert.equal((await c.request.get(`${BASE}/p/${link.slug}`, { maxRedirects: 0 })).status(), 404);
  const { data } = await admin().from("presentations").select("archived_at").eq("slug", link.slug).single(); assert.ok(data.archived_at);
  const { data: ev } = await admin().from("audit_events").select("action").order("at", { ascending: false }).limit(20); assert.ok(ev.some(e => e.action === "presentation.archived") && ev.some(e => e.action === "presentation.created"));
});

test("the library page renders the cards and the create form in the browser", async () => {
  const c = await as("colleague");
  await c.goto(BASE + "/"); await c.waitForSelector(".pcard");
  assert.equal(await c.locator(".pcard").count(), 3);
  await c.click('button:has-text("New presentation")'); await c.fill(".add-form input.field", "From the browser"); await c.click('.add-form button[type="submit"]');
  await c.waitForURL(/\/presentations\/from-the-browser\/edit/, { timeout: 30000 });
  assert.equal((await json(c, "/api/presentations/from-the-browser/draft")).status, 200);
}, { timeout: 90000 });
