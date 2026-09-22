import { currentUser, isCompany } from "@/lib/auth/access";
import { supabaseServer, supabaseAdmin } from "@/lib/auth/server";
import { fileMode } from "@/lib/auth/config";
import { listLibrary, createPresentation, SEEDS, type Kind } from "@/lib/presentations";
import { StoreError } from "@/lib/store";
import { ok, fail } from "@/lib/api";

/** The library: everything the signed-in user holds a role on. */
export async function GET() {
  try {
    const user = await currentUser(); if (!user) throw new StoreError(401, "sign in first");
    if (fileMode()) return ok(Object.entries(SEEDS).map(([slug, s]) => ({ id: slug, slug, title: s.title, kind: s.kind, renderer: s.renderer, description: s.description, role: "owner", published: false, updatedAt: "" })));
    return ok(await listLibrary(await supabaseServer(), user.id));
  } catch (e) { return fail(e); }
}
/** Create or import: JSON {kind, title, description?, url?} or multipart with `file` (an .html) + `title`. Company accounts only. */
export async function POST(req: Request) {
  try {
    const user = await currentUser(); if (!user) throw new StoreError(401, "sign in first");
    if (fileMode()) throw new StoreError(501, "the library needs the database store");
    if (!isCompany(user.email)) throw new StoreError(403, "only company accounts create presentations");
    const ct = req.headers.get("content-type") || "";
    let input: { kind: Kind; title: string; description?: string; url?: string; html?: Buffer; fileName?: string; renderer?: string };
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData(); const file = form.get("file");
      if (!(file instanceof File)) throw new StoreError(422, "send the HTML as the `file` field");
      if (!/\.html?$/i.test(file.name) && file.type !== "text/html") throw new StoreError(422, "only .html files can be imported");
      const bytes = Buffer.from(await file.arrayBuffer()); if (bytes.length > 25 * 1024 * 1024) throw new StoreError(422, "the file is larger than 25 MB");
      input = { kind: "html", title: String(form.get("title") || file.name.replace(/\.html?$/i, "")), description: String(form.get("description") || "") || undefined, html: bytes, fileName: file.name };
    } else { const b = await req.json(); input = { kind: b.kind, title: b.title, description: b.description, url: b.url, renderer: typeof b.renderer === "string" ? b.renderer : undefined }; }
    return ok(await createPresentation(supabaseAdmin(), user, input), 201);
  } catch (e) { return fail(e); }
}
