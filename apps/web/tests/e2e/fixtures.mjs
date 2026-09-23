// Shared fixtures for the browser tests: the local Supabase stack's service role creates the test accounts
// and clears the presentation's data so every run starts from the committed document. Local keys only.
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
export const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
export const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
export const PASSWORD = "itw-test-password-1";
export const USERS = {
  owner: "owner@mosaicintelligence.xyz",      // listed in OWNER_EMAILS: becomes owner on first sign-in
  editor: "editor@mosaicintelligence.xyz",    // company account, granted editor by the owner in the tests
  colleague: "colleague@mosaicintelligence.xyz", // company account with no role: may sign in, may not edit or view
  guest: "guest@example.com",                 // external, invited as viewer in the tests
  stranger: "stranger@example.com"            // external, never invited: refused at sign-in
};
export const admin = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

/** Ensure every test account exists (confirmed, password set). */
export async function ensureUsers() {
  const sb = admin();
  const { data } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const byEmail = new Map((data?.users || []).map(u => [u.email, u]));
  const out = {};
  for (const [key, email] of Object.entries(USERS)) {
    let u = byEmail.get(email);
    if (!u) { const r = await sb.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: key[0].toUpperCase() + key.slice(1) } }); if (r.error) throw r.error; u = r.data.user; }
    out[key] = { id: u.id, email };
  }
  return out;
}

/** The tests' own copy of the keynote: made fresh for every run, owned by the test owner. The real keynote and the
 *  operator's own drafts are never touched (the local database is shared with the running app). */
export const TEST_SLUG = "e2e-keynote";
export async function resetPresentation(slug = TEST_SLUG) {
  if (slug === "italian-tech-week") throw new Error("the tests never reset the keynote");
  const sb = admin(); const users = await ensureUsers();
  const { data: old } = await sb.from("presentations").select("id").eq("slug", slug).maybeSingle();
  if (old) { for (const bucket of ["assets", "images"]) { const { data: files } = await sb.storage.from(bucket).list(old.id); if (files?.length) await sb.storage.from(bucket).remove(files.map(f => `${old.id}/${f.name}`)); } const { error } = await sb.from("presentations").delete().eq("id", old.id); if (error) throw error; }
  const { data: p, error: e2 } = await sb.from("presentations").insert({ slug, title: "E2E keynote", kind: "deck", renderer: "itw-keynote", created_by: users.owner.id }).select("id").single(); if (e2) throw e2;
  const { error: e3 } = await sb.from("presentation_memberships").insert({ presentation_id: p.id, user_id: users.owner.id, role: "owner", granted_by: users.owner.id }); if (e3) throw e3;
  // memberships and invitations the test accounts hold elsewhere from earlier runs go too (never the operator's)
  const ids = Object.values(users).map(u => u.id);
  await sb.from("presentation_memberships").delete().in("user_id", ids).neq("presentation_id", p.id);
  await sb.from("invitations").delete().in("email", Object.values(USERS));
  return p.id;
}

/** Sign a test account into a Playwright page through the app's own admission path. */
export async function signIn(page, base, email) {
  const r = await page.request.post(base + "/auth/test-sign-in", { data: { email, password: PASSWORD } });
  return { status: r.status(), body: await r.json().catch(() => ({})) };
}
export async function signOut(page, base) { await page.request.post(base + "/auth/sign-out", { maxRedirects: 0 }); }

/** Start the app on `port` with the local stack and its own build directory; resolve when the API answers. */
export async function startApp(spawn, appDir, port, extraEnv = {}) {
  const server = spawn(appDir + "/node_modules/.bin/next", ["dev", "-p", String(port)], { cwd: appDir, env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, COMPANY_DOMAIN: "mosaicintelligence.xyz", OWNER_EMAILS: USERS.owner, ITW_STORE: "supabase", ITW_TEST_AUTH: "1", NEXT_DIST_DIR: ".next-e2e", NEXT_TELEMETRY_DISABLED: "1", ...extraEnv }, stdio: ["ignore", "pipe", "pipe"] });
  server.stderr.on("data", d => { const s = String(d); if (/error/i.test(s) && !/Fast Refresh/.test(s)) process.stderr.write(s); });
  const t0 = Date.now();
  while (true) { try { const r = await fetch(`http://localhost:${port}/sign-in`); if (r.ok) break; } catch {} if (Date.now() - t0 > 90000) throw new Error("dev server did not start"); await new Promise(r => setTimeout(r, 500)); }
  return server;
}

/** A rectangle inside the stage's frame, in page coordinates: the frame is the 1920×1080 canvas scaled to fit (D-050),
 *  so a frame rectangle maps through the canvas scale and the frame's own place on the page. */
export async function frameBox(page, frame, selector) {
  const k = await page.evaluate(() => parseFloat(document.querySelector(".canvas")?.dataset.scale || "1"));
  const ib = await page.evaluate(() => { const r = document.querySelector(".stage iframe").getBoundingClientRect(); return { x: r.x, y: r.y }; });
  const r = await frame.locator(selector).first().evaluate(n => { const b = n.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
  return { x: ib.x + r.x * k, y: ib.y + r.y * k, width: r.w * k, height: r.h * k, k };
}
