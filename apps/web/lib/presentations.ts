import { contentHash } from "@mosaic/presentation-core";
import "server-only";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { repoRoot } from "./repo";
import { fileMode } from "./auth/config";
import { StoreError } from "./store";

/** Renderers: the deck file that draws a document, and the document a new presentation starts from. Paths are repository-relative. */
export const RENDERERS: Record<string, { deckFile: string; templateContent: string; compose?: boolean; label: string }> = {
  "itw-keynote": { deckFile: "index.html", templateContent: "presentations/italian-tech-week/content/presentation.json", label: "The Room and the Vessel (V2 engine)" },
  // the same engine, starting empty: the composer's beats on a plain scene, with the keynote's tokens, motion and lockup
  "mosaic-deck": { deckFile: "index.html", templateContent: "presentations/italian-tech-week/content/presentation.json", compose: true, label: "A new deck (V2 engine)" }
};
/** Presentations the application seeds into the library on first use (the committed ones). */
export const SEEDS: Record<string, { title: string; renderer: string; kind: "deck"; description: string }> = {
  "italian-tech-week": { title: "The Room and the Vessel — Italian Tech Week 2026", renderer: "itw-keynote", kind: "deck", description: "The keynote, editable" }
};

export type Kind = "deck" | "html" | "link";
export interface Presentation { id: string; slug: string; title: string; kind: Kind; renderer: string | null; description: string | null; sourceUrl: string | null; storagePath: string | null; createdBy: string | null; createdAt: string; updatedAt: string; archivedAt: string | null; }
export interface LibraryEntry extends Presentation { role: "owner" | "editor" | "viewer"; published: boolean; builtIn?: boolean; }

const row = (r: any): Presentation => ({ id: r.id, slug: r.slug, title: r.title, kind: r.kind, renderer: r.renderer || null, description: r.description ?? null, sourceUrl: r.source_url ?? null, storagePath: r.storage_path ?? null, createdBy: r.created_by ?? null, createdAt: r.created_at, updatedAt: r.updated_at, archivedAt: r.archived_at ?? null });
const SELECT = "id, slug, title, kind, renderer, description, source_url, storage_path, created_by, created_at, updated_at, archived_at";

/** The deck file and template for a presentation's renderer. */
export function rendererOf(p: Presentation) { const r = p.renderer ? RENDERERS[p.renderer] : null; if (!r) throw new StoreError(500, `unknown renderer ${p.renderer}`); return r; }

/** A presentation by slug: from the database (seeded on first use), or the static seed in file mode. Null when unknown or archived. */
export async function getPresentation(slug: string, admin?: SupabaseClient): Promise<Presentation | null> {
  if (!/^[a-z0-9][a-z0-9-]{1,80}$/.test(slug)) return null;
  if (fileMode()) { const s = SEEDS[slug]; return s ? { id: slug, slug, title: s.title, kind: s.kind, renderer: s.renderer, description: s.description, sourceUrl: null, storagePath: null, createdBy: null, createdAt: "", updatedAt: "", archivedAt: null } : null; }
  const sb = admin ?? (await import("./auth/server")).supabaseAdmin();
  const { data, error: e1 } = await sb.from("presentations").select(SELECT).eq("slug", slug).maybeSingle();
  if (e1) throw new StoreError(500, `presentations: ${e1.message}`);
  if (data) return data.archived_at ? null : row(data);
  const seed = SEEDS[slug]; if (!seed) return null;
  // the seeded row is made on first use; concurrent first requests all upsert-ignore and then read the one row
  const { error } = await sb.from("presentations").upsert({ slug, title: seed.title, renderer: seed.renderer, kind: seed.kind, description: seed.description }, { onConflict: "slug", ignoreDuplicates: true });
  if (error) throw new StoreError(500, `presentations: ${error.message}`);
  const { data: made, error: e2 } = await sb.from("presentations").select(SELECT).eq("slug", slug).maybeSingle();
  if (e2 || !made) throw new StoreError(500, `presentations: ${e2 ? e2.message : "the seeded row is not readable"}`);
  return made.archived_at ? null : row(made);
}

/** Everything the user holds a role on, newest first (the query runs as the user, so RLS decides). */
export async function listLibrary(sb: SupabaseClient, userId: string): Promise<LibraryEntry[]> {
  const { data, error } = await sb.from("presentation_memberships").select(`role, presentations!inner(${SELECT})`).eq("user_id", userId);
  if (error) throw error;
  const entries = (data as any[]).filter(m => !m.presentations.archived_at).map(m => ({ ...row(m.presentations), role: m.role as LibraryEntry["role"], published: false, builtIn: !!SEEDS[m.presentations.slug] }));
  if (entries.length) { const { data: pubs } = await sb.from("publication_records").select("presentation_id").eq("active", true).in("presentation_id", entries.map(e => e.id)); const set = new Set((pubs || []).map(p => p.presentation_id)); for (const e of entries) e.published = e.kind !== "deck" || set.has(e.id); }
  return entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

const slugify = (title: string) => title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "presentation";
async function freeSlug(admin: SupabaseClient, base: string): Promise<string> {
  for (let i = 0; i < 20; i++) { const slug = i === 0 ? base : `${base}-${randomBytes(2).toString("hex")}`; const { data } = await admin.from("presentations").select("id").eq("slug", slug).maybeSingle(); if (!data) return slug.length > 1 ? slug : slug + "-1"; }
  throw new StoreError(500, "could not find a free slug");
}
/** Basic SSRF guard for imports by URL: http(s) only, no local or private hosts. */
function checkUrl(u: string): URL {
  let url: URL; try { url = new URL(u); } catch { throw new StoreError(422, "that is not a valid URL"); }
  if (!/^https?:$/.test(url.protocol)) throw new StoreError(422, "only http(s) links");
  const h = url.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^(127\.|10\.|192\.168\.|169\.254\.|0\.|\[?::1\]?$|fc|fd)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) throw new StoreError(422, "that address is not reachable from here");
  return url;
}

export interface CreateInput { kind: Kind; title: string; description?: string; renderer?: string; url?: string; html?: Buffer; fileName?: string; }
/**
 * Create a presentation for `user` (a company account; the caller checks), who becomes its owner. A deck starts from its
 * renderer's template document; an HTML deck is stored privately (from an upload or fetched from a link); a link is kept as is.
 */
export async function createPresentation(admin: SupabaseClient, user: { id: string; email: string }, input: CreateInput): Promise<Presentation> {
  const title = (input.title || "").trim(); if (!title || title.length > 140) throw new StoreError(422, "a title of up to 140 characters is needed");
  const description = input.description?.trim() || null; if (description && description.length > 500) throw new StoreError(422, "the description is too long");
  if (!["deck", "html", "link"].includes(input.kind)) throw new StoreError(422, "kind is deck, html or link");
  const slug = await freeSlug(admin, slugify(title));
  const base: Record<string, unknown> = { slug, title, kind: input.kind, description, created_by: user.id };
  let html: Buffer | null = null;
  if (input.kind === "deck") { const r = input.renderer || "mosaic-deck"; if (!RENDERERS[r]) throw new StoreError(422, "unknown renderer"); base.renderer = r; }
  else if (input.kind === "link") { base.source_url = checkUrl(input.url || "").toString(); }
  else {
    if (input.html) html = input.html;
    else if (input.url) {
      const url = checkUrl(input.url);
      const res = await fetch(url, { redirect: "follow", headers: { accept: "text/html" }, signal: AbortSignal.timeout(20000) }).catch(e => { throw new StoreError(422, `could not fetch that link: ${e.message}`); });
      if (!res.ok) throw new StoreError(422, `that link answered ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer()); if (buf.length > 25 * 1024 * 1024) throw new StoreError(422, "that file is larger than 25 MB");
      html = buf; base.source_url = url.toString();
    } else throw new StoreError(422, "an HTML deck needs a file or a link");
    if (!html.length || !/<html[\s>]|<!doctype html/i.test(html.subarray(0, 4096).toString("utf8"))) throw new StoreError(422, "that does not look like an HTML document");
  }
  const { data, error } = await admin.from("presentations").insert(base).select(SELECT).single();
  if (error) throw new StoreError(500, error.message);
  const { error: e2 } = await admin.from("presentation_memberships").insert({ presentation_id: data.id, user_id: user.id, role: "owner", granted_by: user.id });
  if (e2) throw new StoreError(500, e2.message);
  if (html) {
    const path = `${data.id}/index.html`;
    const { error: e3 } = await admin.storage.from("decks").upload(path, html, { contentType: "text/html", upsert: true });
    if (e3) throw new StoreError(500, e3.message);
    await admin.from("presentations").update({ storage_path: path }).eq("id", data.id);
    data.storage_path = path;
  }
  await admin.from("audit_events").insert({ presentation_id: data.id, actor_id: user.id, actor_email: user.email, action: "presentation.created", detail: { kind: input.kind, slug, from: input.url || input.fileName || (input.kind === "deck" ? base.renderer : null), sha256: html ? createHash("sha256").update(html).digest("hex") : undefined } });
  return row(data);
}

/** Archive (soft-delete): it leaves the library; the rows stay for the audit trail. */
export async function archivePresentation(sb: SupabaseClient, admin: SupabaseClient, p: Presentation, user: { id: string; email: string }): Promise<void> {
  const { error } = await admin.from("presentations").update({ archived_at: new Date().toISOString() }).eq("id", p.id);
  if (error) throw new StoreError(500, error.message);
  await sb.from("audit_events").insert({ presentation_id: p.id, actor_id: user.id, actor_email: user.email, action: "presentation.archived" });
}

/** A copy of an editable deck for the caller: a new presentation they own, whose draft is the source's *current* document
 *  (what the editor shows), with the source's pictures copied into the new presentation's own storage. */
export async function copyPresentation(sb: SupabaseClient, admin: SupabaseClient, user: { id: string; email: string }, src: Presentation, sourceDoc: unknown): Promise<Presentation> {
  if (src.kind !== "deck") throw new StoreError(422, "only an editable deck can be copied");
  const made = await createPresentation(admin, user, { kind: "deck", renderer: src.renderer || "itw-keynote", title: `Copy of ${src.title}`.slice(0, 140), description: src.description || undefined });
  // the pictures: the same objects under the new presentation's folder, the library rows with them, the document pointing at them
  const { data: rows } = await admin.from("presentation_assets").select("storage_path, name, sha256, bytes, mime, width, height, kind").eq("presentation_id", src.id);
  for (const r of rows || []) {
    const file = r.storage_path.slice(r.storage_path.indexOf("/") + 1); const to = `${made.id}/${file}`;
    const { error } = await admin.storage.from("images").copy(r.storage_path, to); if (error && !/already exists/i.test(error.message)) throw new StoreError(500, `could not copy ${r.name}: ${error.message}`);
    await admin.from("presentation_assets").upsert({ ...r, presentation_id: made.id, storage_path: to, uploaded_by: user.id }, { onConflict: "storage_path" });
  }
  const doc = JSON.parse(JSON.stringify(sourceDoc).split(`storage://images/${src.id}/`).join(`storage://images/${made.id}/`));
  doc.id = made.slug; doc.title = made.title;
  const { error } = await admin.from("presentation_drafts").upsert({ presentation_id: made.id, document: doc, content_hash: contentHash(doc), based_on: null, updated_at: new Date().toISOString(), updated_by: user.id });
  if (error) throw new StoreError(500, error.message);
  await sb.from("audit_events").insert({ presentation_id: made.id, actor_id: user.id, actor_email: user.email, action: "presentation.copied", detail: { from: src.slug } });
  return made;
}

/** Owners and editors rename a presentation: the title the library and the bar show (a deck's own text is its own). */
export async function renamePresentation(sb: SupabaseClient, admin: SupabaseClient, p: Presentation, user: { id: string; email: string }, title: string): Promise<string> {
  const t = title.replace(/\s+/g, " ").trim(); if (!t) throw new StoreError(422, "a title is needed"); if (t.length > 160) throw new StoreError(422, "a title is at most 160 characters");
  const { error } = await admin.from("presentations").update({ title: t }).eq("id", p.id);
  if (error) throw new StoreError(500, error.message);
  await sb.from("audit_events").insert({ presentation_id: p.id, actor_id: user.id, actor_email: user.email, action: "presentation.renamed", detail: { from: p.title, to: t } });
  return t;
}

/** Owners delete a presentation for everyone: its rows (draft, versions, people, invitations, publication, audit trail — by cascade)
 *  and its stored files (images, an imported deck). The built-in decks cannot be deleted, only archived: they would only be seeded again. */
export async function deletePresentation(admin: SupabaseClient, p: Presentation): Promise<void> {
  if (SEEDS[p.slug]) throw new StoreError(409, "this presentation is built in; archive it instead");
  const { data: files } = await admin.storage.from("images").list(p.id, { limit: 1000 });
  if (files?.length) await admin.storage.from("images").remove(files.map(f => `${p.id}/${f.name}`));
  if (p.storagePath) await admin.storage.from("decks").remove([p.storagePath]);
  const { error } = await admin.from("presentations").delete().eq("id", p.id);
  if (error) throw new StoreError(500, error.message);
}

/** The static HTML of an `html` presentation, read as the user (storage policies apply). */
export async function readStaticDeck(sb: SupabaseClient, p: Presentation): Promise<Buffer> {
  if (!p.storagePath) throw new StoreError(404, "this presentation has no file");
  const { data, error } = await sb.storage.from("decks").download(p.storagePath);
  if (error || !data) throw new StoreError(403, "not allowed to read this presentation");
  return Buffer.from(await data.arrayBuffer());
}
/** Image assets are stored as `storage://images/<presentation>/<file>` and rendered from `/img/<slug>/<file>`. */
export function forRendering<T>(p: { id: string; slug: string }, document: T): T {
  const s = JSON.stringify(document); const re = new RegExp(`storage://images/${p.id}/`, "g");
  return JSON.parse(s.replace(re, `/img/${p.slug}/`));
}
/** The renderer's deck file with a document embedded in place of the committed one. */
export async function deckWithDocument(p: Presentation, document: unknown | null): Promise<string> {
  let html = await fs.readFile(join(repoRoot(), rendererOf(p).deckFile), "utf8");
  if (document) {
    const json = JSON.stringify(forRendering(p, document)).replace(/<\//g, "<\\/");
    const re = /<script type="application\/json" id="itw-content">[\s\S]*?<\/script>/;
    if (!re.test(html)) throw new StoreError(500, "the deck has no content block");
    html = html.replace(re, () => `<script type="application/json" id="itw-content">${json}</script>`);
  }
  return html;
}
