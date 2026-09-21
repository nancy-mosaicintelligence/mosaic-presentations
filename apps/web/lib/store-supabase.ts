import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validate, migrate, contentHash, SCHEMA_VERSION } from "@mosaic/presentation-core";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./repo";
import { getPresentation, rendererOf } from "./presentations";
import { StoreError, type Store, type Draft, type Version, type VersionMeta, type AuditEvent } from "./store";
import type { SessionUser } from "./auth/access";

const nowISO = () => new Date().toISOString();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function checked(document: unknown): { doc: any; hash: string } {
  if (typeof document !== "object" || document === null) throw new StoreError(422, "document must be an object");
  let doc: any = document;
  if (typeof doc.schemaVersion === "number" && doc.schemaVersion < SCHEMA_VERSION) doc = migrate(doc);
  const v = validate(doc);
  if (!v.ok) throw new StoreError(422, "document is invalid", v.errors);
  return { doc, hash: contentHash(doc) };
}
const meta = (v: any): VersionMeta => ({ id: v.id, presentationId: v.presentation_id, schemaVersion: v.schema_version, name: v.name, note: v.note ?? undefined, author: v.author_email || v.author_id || "", createdAt: v.created_at, contentHash: v.content_hash, duplicatedFrom: v.duplicated_from ?? undefined });
/** A Postgres error under RLS reads as a permission problem; anything else is a server fault. */
const dbFail = (e: { code?: string; message: string }): never => { if (e.code === "42501" || /row-level security/.test(e.message)) throw new StoreError(403, "not allowed for your role"); throw new StoreError(500, e.message); };

/**
 * The database-backed store. Every query runs as the signed-in user through the session client, so row-level
 * security decides what each role may read or write; the caller's `requireRole` is the first gate, RLS the last.
 */
export class SupabaseStore implements Store {
  constructor(private sb: SupabaseClient, private presentationId: string, private slug: string, private user: SessionUser) {}
  private async log(action: string, detail?: Record<string, unknown>) { await this.sb.from("audit_events").insert({ presentation_id: this.presentationId, actor_id: this.user.id, actor_email: this.user.email, action, detail }); }
  private draftOf(row: any): Draft { return { document: row.document, contentHash: row.content_hash, updatedAt: row.updated_at, basedOn: row.based_on ?? undefined }; }

  async getDraft(_id?: string): Promise<Draft> {
    const { data, error } = await this.sb.from("presentation_drafts").select("document, content_hash, based_on, updated_at").eq("presentation_id", this.presentationId).maybeSingle();
    if (error) dbFail(error);
    if (data) {
      const doc: any = data.document;
      if (doc && typeof doc.schemaVersion === "number" && doc.schemaVersion < SCHEMA_VERSION) { const m = migrate(doc); return { ...this.draftOf(data), document: m, contentHash: contentHash(m) }; }
      return this.draftOf(data);
    }
    // first use: the committed document seeds the draft
    const p = await getPresentation(this.slug); if (!p) throw new StoreError(404, "unknown presentation");
    const def = { contentFile: rendererOf(p).templateContent };
    const { doc, hash } = checked(JSON.parse(await fs.readFile(join(repoRoot(), def.contentFile), "utf8")));
    const { data: made, error: e2 } = await this.sb.from("presentation_drafts").insert({ presentation_id: this.presentationId, document: doc, content_hash: hash, updated_by: this.user.id }).select("document, content_hash, based_on, updated_at").single();
    if (e2) dbFail(e2);
    await this.log("draft.seeded", { from: def.contentFile, contentHash: hash });
    return { ...this.draftOf(made), basedOn: "source" };
  }
  async saveDraft(_id: string, document: unknown): Promise<Draft> {
    const { doc, hash } = checked(document);
    const { data, error } = await this.sb.from("presentation_drafts").upsert({ presentation_id: this.presentationId, document: doc, content_hash: hash, based_on: null, updated_at: nowISO(), updated_by: this.user.id }).select("document, content_hash, based_on, updated_at").single();
    if (error) dbFail(error);
    return this.draftOf(data);
  }
  async listVersions(_id?: string): Promise<VersionMeta[]> {
    const { data, error } = await this.sb.from("presentation_versions").select("id, presentation_id, schema_version, name, note, author_id, author_email, created_at, content_hash, duplicated_from").eq("presentation_id", this.presentationId).order("created_at", { ascending: false });
    if (error) dbFail(error);
    return (data || []).map(meta);
  }
  async getVersion(_id: string, vid: string): Promise<Version> {
    if (!UUID.test(vid)) throw new StoreError(404, "unknown version");
    const { data, error } = await this.sb.from("presentation_versions").select("*").eq("presentation_id", this.presentationId).eq("id", vid).maybeSingle();
    if (error) dbFail(error);
    if (!data) throw new StoreError(404, "unknown version");
    return { ...meta(data), document: data.document };
  }
  async createVersion(_id: string, input: { name: string; note?: string }, _actor: string, document?: unknown): Promise<VersionMeta> {
    const name = (input.name || "").trim(); if (!name || name.length > 120) throw new StoreError(422, "a version needs a name of up to 120 characters");
    const note = input.note?.trim() || null; if (note && note.length > 2000) throw new StoreError(422, "the note is too long");
    const { doc, hash } = checked(document ?? (await this.getDraft()).document);
    const { data, error } = await this.sb.from("presentation_versions").insert({ presentation_id: this.presentationId, schema_version: doc.schemaVersion, name, note, author_id: this.user.id, author_email: this.user.email, content_hash: hash, document: doc }).select("*").single();
    if (error) dbFail(error);
    await this.log("version.created", { id: data.id, name, contentHash: hash });
    return meta(data);
  }
  async duplicateVersion(_id: string, vid: string, name: string | undefined): Promise<VersionMeta> {
    const src = await this.getVersion(_id, vid);
    const { data, error } = await this.sb.from("presentation_versions").insert({ presentation_id: this.presentationId, schema_version: src.schemaVersion, name: name?.trim() || src.name + " (copy)", note: src.note ?? null, author_id: this.user.id, author_email: this.user.email, content_hash: src.contentHash, document: src.document, duplicated_from: src.id }).select("*").single();
    if (error) dbFail(error);
    await this.log("version.duplicated", { id: data.id, from: src.id });
    return meta(data);
  }
  async restoreVersion(_id: string, vid: string): Promise<Draft> {
    const src = await this.getVersion(_id, vid);
    const { doc, hash } = checked(src.document);
    const { data, error } = await this.sb.from("presentation_drafts").upsert({ presentation_id: this.presentationId, document: doc, content_hash: hash, based_on: src.id, updated_at: nowISO(), updated_by: this.user.id }).select("document, content_hash, based_on, updated_at").single();
    if (error) dbFail(error);
    await this.log("version.restored", { from: src.id, name: src.name, contentHash: hash });
    return this.draftOf(data);
  }
  async putAsset(_id: string, file: { name: string; bytes: Buffer }): Promise<{ path: string; sha256: string }> {
    const sha256 = createHash("sha256").update(file.bytes).digest("hex");
    const objectPath = `${this.presentationId}/${sha256}.svg`;
    const { error } = await this.sb.storage.from("assets").upload(objectPath, file.bytes, { contentType: "image/svg+xml", upsert: true });
    if (error) throw new StoreError(/row-level|policy|unauthorized/i.test(error.message) ? 403 : 500, error.message);
    const { error: e2 } = await this.sb.from("presentation_assets").upsert({ presentation_id: this.presentationId, storage_path: objectPath, name: file.name, sha256, bytes: file.bytes.length, uploaded_by: this.user.id }, { onConflict: "storage_path" });
    if (e2) dbFail(e2);
    await this.log("asset.uploaded", { name: file.name, sha256, bytes: file.bytes.length });
    return { path: `storage://assets/${objectPath}`, sha256 };
  }
  async audit(_id?: string): Promise<AuditEvent[]> {
    const { data, error } = await this.sb.from("audit_events").select("at, actor_email, action, detail").eq("presentation_id", this.presentationId).order("at", { ascending: false }).limit(500);
    if (error) dbFail(error);
    return (data || []).map(e => ({ at: e.at, actor: e.actor_email || "", action: e.action, detail: e.detail ?? undefined }));
  }

  /* ---------- publication (owners publish; every member may read what is published) ---------- */
  async publish(vid: string): Promise<{ versionId: string; publishedAt: string }> {
    const v = await this.getVersion(this.slug, vid);
    const { error: e1 } = await this.sb.from("publication_records").update({ active: false }).eq("presentation_id", this.presentationId).eq("active", true);
    if (e1) dbFail(e1);
    const { data, error } = await this.sb.from("publication_records").insert({ presentation_id: this.presentationId, version_id: v.id, published_by: this.user.id }).select("version_id, published_at").single();
    if (error) dbFail(error);
    await this.log("version.published", { id: v.id, name: v.name, contentHash: v.contentHash });
    return { versionId: data!.version_id, publishedAt: data!.published_at };
  }
  async published(): Promise<{ versionId: string; publishedAt: string; name: string; document: unknown } | null> {
    const { data, error } = await this.sb.from("publication_records").select("version_id, published_at, presentation_versions!inner(name, document)").eq("presentation_id", this.presentationId).eq("active", true).maybeSingle();
    if (error) dbFail(error);
    if (!data) return null;
    const v = (data as any).presentation_versions;
    return { versionId: data.version_id, publishedAt: data.published_at, name: v.name, document: v.document };
  }
}
