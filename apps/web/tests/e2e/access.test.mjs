// Every role and access path, through the real sign-in admission (password stands in for Google locally):
// unauthenticated, a stranger, a company account with no role, an invited external viewer, an editor,
// an owner — against the pages, the APIs, the player and the published route.
//   PW_EXEC=… PW_MODULES=… node --test tests/e2e/access.test.mjs
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { startApp, ensureUsers, resetPresentation, signIn, signOut, USERS, admin, TEST_SLUG } from "./fixtures.mjs";
const { chromium } = createRequire((process.env.PW_MODULES || process.env.NODE_PATH || "") + "/")("playwright");

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", ".."), PORT = 3124, BASE = `http://localhost:${PORT}`, ID = TEST_SLUG, API = `${BASE}/api/presentations/${ID}`, KEYNOTE = "italian-tech-week";
let server, browser, users; const pages = {};
const as = async (who) => { if (pages[who]) return pages[who]; const p = await (await browser.newContext({ viewport: { width: 1400, height: 800 } })).newPage(); pages[who] = p; if (who !== "nobody") { const r = await signIn(p, BASE, USERS[who]); assert.equal(r.status, 200, `${who}: ${JSON.stringify(r.body)}`); } return p; };
const status = async (p, path, init) => (await p.request.fetch(BASE + path, { maxRedirects: 0, ...init })).status();
const json = async (p, path, init) => { const r = await p.request.fetch(BASE + path, { maxRedirects: 0, ...init }); return { status: r.status(), body: await r.json().catch(() => ({})), headers: r.headers() }; };

before(async () => {
  server = await startApp(spawn, APP, PORT);
  browser = await chromium.launch({ executablePath: process.env.PW_EXEC });
  users = await ensureUsers(); await resetPresentation();
}, { timeout: 180000 });
after(async () => { await browser?.close(); server?.kill(); });

test("signed out: pages redirect to sign-in, APIs answer 401, the player and the published route are closed", async () => {
  const p = await as("nobody");
  for (const path of [`/presentations/${ID}/edit`, `/presentations/${ID}/people`, `/p/${ID}`, `/player/${ID}`, `/invite/anything`]) {
    const r = await p.request.get(BASE + path, { maxRedirects: 0 }); assert.equal(r.status(), 307, path); assert.ok(r.headers()["location"].startsWith("/sign-in?next="), path);
  }
  for (const path of ["/draft", "/versions", "/members", "/invitations", "/publication"]) assert.equal(await status(p, `/api/presentations/${ID}${path}`), 401, path);
  assert.equal(await status(p, `/api/presentations/${ID}/draft`, { method: "PUT", data: { document: {} } }), 401);
});

test("a stranger's Google account is refused at admission; a colleague without a role signs in but reaches nothing", async () => {
  const s = await (await browser.newContext()).newPage();
  const r = await signIn(s, BASE, USERS.stranger); assert.equal(r.status, 403); assert.match(r.body.error, /not a mosaicintelligence\.xyz account/);
  assert.equal(await status(s, `/api/presentations/${ID}/draft`), 401, "no session was left behind");
  const c = await as("colleague");
  const edit = await c.request.get(`${BASE}/presentations/${ID}/edit`, { maxRedirects: 0 }); assert.equal(edit.status(), 307); assert.ok(edit.headers()["location"].startsWith("/no-access"), "domain membership grants no role");
  for (const path of ["/draft", "/versions", "/members", "/publication"]) assert.equal(await status(c, `/api/presentations/${ID}${path}`), 403, path);
  assert.equal(await status(c, `/p/${ID}`), 403);
  assert.equal(await status(c, `/player/${ID}?source=published`), 403);
});

test("the owner (bootstrapped from OWNER_EMAILS) manages people: roles, invitations, the last-owner rule", async () => {
  const o = await as("owner");
  // OWNER_EMAILS bootstraps the test owner onto the keynote (alongside whoever else owns it); the test deck is theirs alone
  const kn = await json(o, `/api/presentations/${KEYNOTE}/members`); assert.equal(kn.status, 200); assert.ok(kn.body.some(m => m.email === USERS.owner && m.role === "owner"), "bootstrapped onto the keynote");
  const members = await json(o, `/api/presentations/${ID}/members`); assert.equal(members.status, 200); assert.deepEqual(members.body.map(m => [m.email, m.role]), [[USERS.owner, "owner"]]);
  // the owner cannot demote or remove the last owner
  assert.equal((await json(o, `/api/presentations/${ID}/members`, { method: "PUT", data: { userId: users.owner.id, role: "editor" } })).status, 409);
  assert.equal((await json(o, `/api/presentations/${ID}/members`, { method: "DELETE", data: { userId: users.owner.id } })).status, 409);
  // an invitation for the editor colleague (company account) and one for the external guest (viewer)
  const inv1 = await json(o, `/api/presentations/${ID}/invitations`, { method: "POST", data: { email: USERS.editor, role: "editor" } }); assert.equal(inv1.status, 201); assert.match(inv1.body.link, /\/invite\/[A-Za-z0-9_-]{40,}$/);
  const inv2 = await json(o, `/api/presentations/${ID}/invitations`, { method: "POST", data: { email: USERS.guest.toUpperCase(), role: "viewer" } }); assert.equal(inv2.status, 201); assert.equal(inv2.body.invitation.email, USERS.guest, "addresses are normalised");
  assert.equal((await json(o, `/api/presentations/${ID}/invitations`, { method: "POST", data: { email: "nobody", role: "viewer" } })).status, 422);
  assert.equal((await json(o, `/api/presentations/${ID}/invitations`, { method: "POST", data: { email: "x@y.z", role: "owner" } })).status, 422, "an invitation never grants owner");
  const list = await json(o, `/api/presentations/${ID}/invitations`); assert.equal(list.body.filter(i => i.status === "pending").length, 2);
  // a token is stored hashed, never returned again
  const { data } = await admin().from("invitations").select("token_hash").eq("email", USERS.guest).single(); assert.match(data.token_hash, /^[0-9a-f]{64}$/); assert.ok(!inv2.body.link.includes(data.token_hash));
  globalThis.__links = { editor: inv1.body.link, guest: inv2.body.link, guestId: inv2.body.invitation.id };
});

test("an invitation binds to its address: the wrong account is refused, the right one is granted the role", async () => {
  const { editor: editorLink, guest: guestLink } = globalThis.__links;
  const g = await as("guest");
  // the guest tries the editor's link: refused, and their own link: admitted as viewer
  let r = await g.request.get(editorLink, { maxRedirects: 0 }); assert.equal(r.status(), 200); assert.match(await r.text(), /was sent to editor@mosaicintelligence\.xyz/);
  r = await g.request.get(guestLink, { maxRedirects: 0 }); assert.equal(r.status(), 307); assert.equal(r.headers()["location"], `/p/${ID}`);
  r = await g.request.get(guestLink, { maxRedirects: 0 }); assert.match(await r.text(), /was accepted/, "a link is single use");
  const e = await as("editor");
  r = await e.request.get(editorLink, { maxRedirects: 0 }); assert.equal(r.status(), 307); assert.equal(r.headers()["location"], `/presentations/${ID}/edit`);
  const o = await as("owner");
  const members = (await json(o, `/api/presentations/${ID}/members`)).body.map(m => [m.email, m.role]).sort();
  assert.deepEqual(members, [[USERS.editor, "editor"], [USERS.guest, "viewer"], [USERS.owner, "owner"]]);
});

test("the editor edits and versions but cannot manage people or publish; the viewer reaches only what is published", async () => {
  const e = await as("editor"), v = await as("guest"), o = await as("owner");
  assert.equal(await status(e, `/presentations/${ID}/edit`), 200);
  const draft = await json(e, `/api/presentations/${ID}/draft`); assert.equal(draft.status, 200); assert.equal(draft.body.document.stations.length, 55);
  const doc = draft.body.document; doc.stations[0].note = "edited by the editor";
  assert.equal((await json(e, `/api/presentations/${ID}/draft`, { method: "PUT", data: { document: doc } })).status, 200);
  const ver = await json(e, `/api/presentations/${ID}/versions`, { method: "POST", data: { name: "Editor's cut" } }); assert.equal(ver.status, 201); assert.equal(ver.body.author, USERS.editor);
  for (const [path, init] of [["/members", {}], ["/invitations", {}], ["/members", { method: "PUT", data: { userId: users.guest.id, role: "editor" } }], ["/publication", { method: "POST", data: { versionId: ver.body.id } }]]) assert.equal(await status(e, `/api/presentations/${ID}${path}`, init), 403, path);
  const people = await e.request.get(`${BASE}/presentations/${ID}/people`, { maxRedirects: 0 }); assert.equal(people.status(), 307); assert.ok(people.headers()["location"].startsWith("/no-access"));
  // the viewer: no editor page, no draft API, no history, no player sources but the published one; the shared link shows the current document
  const edit = await v.request.get(`${BASE}/presentations/${ID}/edit`, { maxRedirects: 0 }); assert.equal(edit.status(), 307); assert.equal(edit.headers()["location"], `/p/${ID}`);
  for (const path of ["/draft", "/versions", `/versions/${ver.body.id}`, "/members"]) assert.equal(await status(v, `/api/presentations/${ID}${path}`), 403, path);
  assert.equal(await status(v, `/player/${ID}`), 403); assert.equal(await status(v, `/player/${ID}?source=version:${ver.body.id}`), 403);
  assert.equal(await status(v, `/p/${ID}`), 200, "the shared link shows the current document even before anything is published");
  assert.equal(await status(v, `/p/${ID}?source=published`), 404, "nothing published yet");
  assert.equal((await json(v, `/api/presentations/${ID}/publication`)).body, null);
  // the owner publishes; the viewer now gets the deck with that version and nothing else
  const pub = await json(o, `/api/presentations/${ID}/publication`, { method: "POST", data: { versionId: ver.body.id } }); assert.equal(pub.status, 201);
  const page = await v.request.get(`${BASE}/p/${ID}?source=published`); assert.equal(page.status(), 200);
  const html = await page.text(); assert.ok(html.includes("edited by the editor")); assert.ok(html.includes('id="itw-content"'));
  assert.equal(await status(v, `/player/${ID}?source=published`), 200);
  assert.equal((await json(v, `/api/presentations/${ID}/publication`)).body.name, "Editor's cut");
  // the draft moves on: the shared link moves with it, the published deck does not
  doc.stations[0].note = "moved on"; await json(e, `/api/presentations/${ID}/draft`, { method: "PUT", data: { document: doc } });
  assert.ok((await (await v.request.get(`${BASE}/p/${ID}`)).text()).includes("moved on"), "the shared link is the current document");
  assert.ok(!(await (await v.request.get(`${BASE}/p/${ID}?source=published`)).text()).includes("moved on"), "the published version is frozen");
  // the viewer still has no draft API, no player draft source, no versions
  assert.equal(await status(v, `/api/presentations/${ID}/draft`), 403); assert.equal(await status(v, `/player/${ID}?source=draft`), 403);
});

test("revocation takes effect at once: a removed viewer and a revoked invitation are locked out", async () => {
  const o = await as("owner"), v = await as("guest");
  assert.equal(await status(v, `/p/${ID}`), 200);
  assert.equal((await json(o, `/api/presentations/${ID}/members`, { method: "DELETE", data: { userId: users.guest.id } })).status, 200);
  assert.equal(await status(v, `/p/${ID}`), 403);
  const inv = await json(o, `/api/presentations/${ID}/invitations`, { method: "POST", data: { email: USERS.guest, role: "viewer" } });
  assert.equal((await json(o, `/api/presentations/${ID}/invitations`, { method: "DELETE", data: { id: inv.body.invitation.id } })).status, 200);
  const r = await v.request.get(inv.body.link, { maxRedirects: 0 }); assert.match(await r.text(), /was revoked/);
  assert.equal(await status(v, `/p/${ID}`), 403);
  // the audit trail names every step; only the owner reads it (through the members' view it is not exposed to editors)
  const { data: events } = await admin().from("audit_events").select("action").order("at");
  for (const a of ["owner.bootstrapped", "invitation.created", "invitation.accepted", "version.created", "version.published", "member.removed", "invitation.revoked"]) assert.ok(events.some(e => e.action === a), a);
  await signOut(v, BASE); assert.equal(await status(v, `/api/presentations/${ID}/publication`), 401, "signed out");
});

test("the deck honours a station deep link and clamps it", async () => {
  const o = await as("owner");
  // a fragment-only change is a same-document navigation, so each link is opened from a blank page
  for (const [hash, expect] of [["#s=7", "07"], ["#s=999", "55"], ["#s=0", "01"], ["", "01"]]) {
    await o.goto("about:blank"); await o.goto(`${BASE}/p/${ID}${hash}`);
    await o.waitForFunction((e) => document.getElementById("pos")?.textContent.startsWith(e), expect, { timeout: 30000 });
  }
}, { timeout: 120000 });
