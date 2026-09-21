// The store behind the editor: one mutable draft per presentation, immutable named versions, uploaded
// asset files and an audit log. This is the file-backed implementation for local work; Phase 7 adds the
// database-backed one behind the same interface. Documents are validated before they are written, and a
// draft that fails validation never replaces the last valid one.
import { promises as fs } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { join } from "node:path";
import { validate, migrate, contentHash, SCHEMA_VERSION } from "@mosaic/presentation-core";
import { repoRoot } from "./repo";
import { getPresentation } from "./presentations";

export interface VersionMeta { id: string; presentationId: string; schemaVersion: number; name: string; note?: string; author: string; createdAt: string; contentHash: string; duplicatedFrom?: string; }
export interface Version extends VersionMeta { document: unknown; }
export interface Draft { document: unknown; contentHash: string; updatedAt: string; basedOn?: string; }
export interface AuditEvent { at: string; actor: string; action: string; detail?: Record<string, unknown>; }

export class StoreError extends Error {
  constructor(public status: number, message: string, public issues?: { path: string; message: string }[]) { super(message); }
}

export interface Store {
  getDraft(id: string): Promise<Draft>;
  saveDraft(id: string, document: unknown, actor: string): Promise<Draft>;
  listVersions(id: string): Promise<VersionMeta[]>;
  getVersion(id: string, vid: string): Promise<Version>;
  createVersion(id: string, input: { name: string; note?: string }, actor: string, document?: unknown): Promise<VersionMeta>;
  duplicateVersion(id: string, vid: string, name: string | undefined, actor: string): Promise<VersionMeta>;
  restoreVersion(id: string, vid: string, actor: string): Promise<Draft>;
  putAsset(id: string, file: { name: string; bytes: Buffer }, actor: string): Promise<{ path: string; sha256: string }>;
  audit(id: string): Promise<AuditEvent[]>;
}

const nowISO = () => new Date().toISOString();
const newId = () => nowISO().replace(/[-:.TZ]/g, "").slice(0, 14) + "-" + randomBytes(3).toString("hex");

function checked(document: unknown): { doc: any; hash: string } {
  if (typeof document !== "object" || document === null) throw new StoreError(422, "document must be an object");
  let doc: any = document;
  if (typeof doc.schemaVersion === "number" && doc.schemaVersion < SCHEMA_VERSION) doc = migrate(doc);
  const v = validate(doc);
  if (!v.ok) throw new StoreError(422, "document is invalid", v.errors);
  return { doc, hash: contentHash(doc) };
}

export class FileStore implements Store {
  constructor(private root = process.env.ITW_DATA_DIR || join(repoRoot(), "apps/web/data")) {}
  private dir(id: string) { if (!getPresentation(id)) throw new StoreError(404, "unknown presentation"); return join(this.root, id); }
  private async readJSON<T>(p: string): Promise<T | null> { try { return JSON.parse(await fs.readFile(p, "utf8")) as T; } catch (e: any) { if (e.code === "ENOENT") return null; throw e; } }
  private async writeJSON(p: string, v: unknown) { await fs.mkdir(join(p, ".."), { recursive: true }); const tmp = p + "." + randomBytes(3).toString("hex") + ".tmp"; await fs.writeFile(tmp, JSON.stringify(v, null, 2)); await fs.rename(tmp, p); }
  private async log(id: string, ev: AuditEvent) { const p = join(this.dir(id), "audit.jsonl"); await fs.mkdir(this.dir(id), { recursive: true }); await fs.appendFile(p, JSON.stringify(ev) + "\n"); }

  async getDraft(id: string): Promise<Draft> {
    const p = join(this.dir(id), "draft.json");
    const existing = await this.readJSON<Draft>(p);
    if (existing) {
      // a draft written under an older schema is migrated on read, never silently rewritten
      const doc: any = existing.document;
      if (doc && typeof doc.schemaVersion === "number" && doc.schemaVersion < SCHEMA_VERSION) { const m = migrate(doc); return { ...existing, document: m, contentHash: contentHash(m) }; }
      return existing;
    }
    // first use: the committed document seeds the draft
    const def = getPresentation(id)!;
    const seed = JSON.parse(await fs.readFile(join(repoRoot(), def.contentFile), "utf8"));
    const { doc, hash } = checked(seed);
    const draft: Draft = { document: doc, contentHash: hash, updatedAt: nowISO(), basedOn: "source" };
    await this.writeJSON(p, draft);
    await this.log(id, { at: draft.updatedAt, actor: "system", action: "draft.seeded", detail: { from: def.contentFile, contentHash: hash } });
    return draft;
  }
  async saveDraft(id: string, document: unknown, actor: string): Promise<Draft> {
    const { doc, hash } = checked(document);
    const draft: Draft = { document: doc, contentHash: hash, updatedAt: nowISO() };
    await this.writeJSON(join(this.dir(id), "draft.json"), draft);
    return draft;
  }
  async listVersions(id: string): Promise<VersionMeta[]> {
    const dir = join(this.dir(id), "versions");
    let files: string[] = []; try { files = await fs.readdir(dir); } catch (e: any) { if (e.code !== "ENOENT") throw e; }
    const out: VersionMeta[] = [];
    for (const f of files.filter(f => f.endsWith(".json"))) { const v = await this.readJSON<Version>(join(dir, f)); if (v) { const { document: _d, ...meta } = v; out.push(meta); } }
    return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getVersion(id: string, vid: string): Promise<Version> {
    if (!/^[0-9]{14}-[0-9a-f]{6}$/.test(vid)) throw new StoreError(404, "unknown version");
    const v = await this.readJSON<Version>(join(this.dir(id), "versions", vid + ".json"));
    if (!v) throw new StoreError(404, "unknown version");
    return v;
  }
  async createVersion(id: string, input: { name: string; note?: string }, actor: string, document?: unknown): Promise<VersionMeta> {
    const name = (input.name || "").trim(); if (!name || name.length > 120) throw new StoreError(422, "a version needs a name of up to 120 characters");
    const note = input.note?.trim() || undefined; if (note && note.length > 2000) throw new StoreError(422, "the note is too long");
    const source = document ?? (await this.getDraft(id)).document;
    const { doc, hash } = checked(source);
    const v: Version = { id: newId(), presentationId: id, schemaVersion: doc.schemaVersion, name, note, author: actor, createdAt: nowISO(), contentHash: hash, document: doc };
    await this.writeJSON(join(this.dir(id), "versions", v.id + ".json"), v);
    await this.log(id, { at: v.createdAt, actor, action: "version.created", detail: { id: v.id, name, contentHash: hash } });
    const { document: _d, ...meta } = v; return meta;
  }
  async duplicateVersion(id: string, vid: string, name: string | undefined, actor: string): Promise<VersionMeta> {
    const src = await this.getVersion(id, vid);
    const v: Version = { ...src, id: newId(), name: name?.trim() || src.name + " (copy)", author: actor, createdAt: nowISO(), duplicatedFrom: src.id };
    await this.writeJSON(join(this.dir(id), "versions", v.id + ".json"), v);
    await this.log(id, { at: v.createdAt, actor, action: "version.duplicated", detail: { id: v.id, from: src.id } });
    const { document: _d, ...meta } = v; return meta;
  }
  async restoreVersion(id: string, vid: string, actor: string): Promise<Draft> {
    // the snapshot becomes the working draft; every version, including those made later, stays
    const src = await this.getVersion(id, vid);
    const { doc, hash } = checked(src.document);
    const draft: Draft = { document: doc, contentHash: hash, updatedAt: nowISO(), basedOn: src.id };
    await this.writeJSON(join(this.dir(id), "draft.json"), draft);
    await this.log(id, { at: draft.updatedAt, actor, action: "version.restored", detail: { from: src.id, name: src.name, contentHash: hash } });
    return draft;
  }
  async putAsset(id: string, file: { name: string; bytes: Buffer }, actor: string): Promise<{ path: string; sha256: string }> {
    const sha256 = createHash("sha256").update(file.bytes).digest("hex");
    const rel = `apps/web/data/${id}/uploads/${sha256}.svg`;
    await fs.mkdir(join(this.dir(id), "uploads"), { recursive: true });
    await fs.writeFile(join(repoRoot(), rel), file.bytes);
    await this.log(id, { at: nowISO(), actor, action: "asset.uploaded", detail: { name: file.name, sha256, bytes: file.bytes.length } });
    return { path: rel, sha256 };
  }
  async audit(id: string): Promise<AuditEvent[]> {
    try { return (await fs.readFile(join(this.dir(id), "audit.jsonl"), "utf8")).split("\n").filter(Boolean).map(l => JSON.parse(l)); } catch (e: any) { if (e.code === "ENOENT") return []; throw e; }
  }
}

let store: Store | null = null;
export function getStore(): Store { return store ?? (store = new FileStore()); }
