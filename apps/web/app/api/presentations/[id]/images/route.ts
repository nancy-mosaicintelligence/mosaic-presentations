import { createHash } from "node:crypto";
import { StoreError } from "@/lib/store";
import { requireRole } from "@/lib/auth/access";
import { supabaseServer } from "@/lib/auth/server";
import { fileMode } from "@/lib/auth/config";
import { imageDims } from "@/lib/image-dims";
import { ok, fail } from "@/lib/api";

const assetId = (sha: string) => "img-" + sha.slice(0, 10);
const record = (slug: string, r: any) => ({ id: assetId(r.sha256), kind: "image", src: `storage://images/${r.presentation_id}/${r.sha256}.${r.storage_path.split(".").pop()}`, sha256: r.sha256, width: r.width, height: r.height, mime: r.mime, bytes: r.bytes, name: r.name, url: `/img/${slug}/${r.sha256}.${r.storage_path.split(".").pop()}`, createdAt: r.created_at });

/** The presentation's image library (members). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; const a = await requireRole(id, "viewer"); if (fileMode()) return ok([]);
    const sb = await supabaseServer();
    const { data, error } = await sb.from("presentation_assets").select("presentation_id, storage_path, name, sha256, bytes, mime, width, height, created_at").eq("presentation_id", a.presentationId).eq("kind", "image").order("created_at", { ascending: false });
    if (error) throw new StoreError(500, error.message);
    return ok((data || []).map(r => record(id, r)));
  } catch (e) { return fail(e); }
}
/** Upload an image (png, jpeg, webp, gif; ≤ 15 MB); editors. Returns the asset record for the document. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; const a = await requireRole(id, "editor"); if (fileMode()) throw new StoreError(501, "images need the database store");
    const form = await req.formData(); const file = form.get("file");
    if (!(file instanceof File)) throw new StoreError(422, "send the image as the `file` field");
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length > 15 * 1024 * 1024) throw new StoreError(422, "the image is larger than 15 MB");
    const dims = imageDims(bytes); if (!dims) throw new StoreError(422, "only PNG, JPEG, WebP or GIF images");
    if (dims.width > 20000 || dims.height > 20000) throw new StoreError(422, "the image is too large in pixels");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const objectPath = `${a.presentationId}/${sha256}.${dims.ext}`;
    const sb = await supabaseServer();
    const { error } = await sb.storage.from("images").upload(objectPath, bytes, { contentType: dims.mime, upsert: true });
    if (error) throw new StoreError(/row-level|policy|unauthorized/i.test(error.message) ? 403 : 500, error.message);
    const row = { presentation_id: a.presentationId, storage_path: objectPath, name: file.name, sha256, bytes: bytes.length, uploaded_by: a.user.id, kind: "image", mime: dims.mime, width: dims.width, height: dims.height };
    const { data, error: e2 } = await sb.from("presentation_assets").upsert(row, { onConflict: "storage_path" }).select("presentation_id, storage_path, name, sha256, bytes, mime, width, height, created_at").single();
    if (e2) throw new StoreError(500, e2.message);
    await sb.from("audit_events").insert({ presentation_id: a.presentationId, actor_id: a.user.id, actor_email: a.user.email, action: "image.uploaded", detail: { name: file.name, sha256, bytes: bytes.length, width: dims.width, height: dims.height } });
    return ok(record(id, data), 201);
  } catch (e) { return fail(e); }
}
