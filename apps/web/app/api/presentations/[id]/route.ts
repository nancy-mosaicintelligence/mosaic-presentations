import { requireRole } from "@/lib/auth/access";
import { supabaseServer, supabaseAdmin } from "@/lib/auth/server";
import { fileMode } from "@/lib/auth/config";
import { getPresentation, renamePresentation, deletePresentation, setSlug } from "@/lib/presentations";
import { StoreError } from "@/lib/store";
import { ok, fail } from "@/lib/api";

/** PATCH { title } renames (owners and editors); PATCH { slug } gives the presentation its address (owners). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; const body = await req.json().catch(() => ({}));
    const a = await requireRole(id, typeof body.slug === "string" ? "owner" : "editor"); if (fileMode()) throw new StoreError(501, "this needs the database store");
    const p = await getPresentation(id); if (!p) throw new StoreError(404, "unknown presentation");
    if (typeof body.title !== "string" && typeof body.slug !== "string") throw new StoreError(422, "title or slug must be a string");
    const sb = await supabaseServer(), admin = supabaseAdmin();
    const title = typeof body.title === "string" ? await renamePresentation(sb, admin, p, a.user, body.title) : p.title;
    const slug = typeof body.slug === "string" ? await setSlug(sb, admin, p, a.user, body.slug) : p.slug;
    return ok({ id: p.id, slug, title });
  } catch (e) { return fail(e); }
}

/** DELETE: owners delete the presentation for everyone — rows and files; there is no undo. Built-in decks answer 409. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; await requireRole(id, "owner"); if (fileMode()) throw new StoreError(501, "deleting needs the database store");
    const p = await getPresentation(id); if (!p) throw new StoreError(404, "unknown presentation");
    await deletePresentation(supabaseAdmin(), p); return ok({ ok: true });
  } catch (e) { return fail(e); }
}
