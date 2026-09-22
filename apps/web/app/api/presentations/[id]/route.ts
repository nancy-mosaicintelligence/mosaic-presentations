import { requireRole } from "@/lib/auth/access";
import { supabaseServer, supabaseAdmin } from "@/lib/auth/server";
import { fileMode } from "@/lib/auth/config";
import { getPresentation, renamePresentation } from "@/lib/presentations";
import { StoreError } from "@/lib/store";
import { ok, fail } from "@/lib/api";

/** PATCH { title }: owners and editors rename the presentation (the library's and the bar's title). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; const a = await requireRole(id, "editor"); if (fileMode()) throw new StoreError(501, "renaming needs the database store");
    const p = await getPresentation(id); if (!p) throw new StoreError(404, "unknown presentation");
    const body = await req.json().catch(() => ({})); if (typeof body.title !== "string") throw new StoreError(422, "title must be a string");
    const title = await renamePresentation(await supabaseServer(), supabaseAdmin(), p, a.user, body.title);
    return ok({ id: p.id, slug: p.slug, title });
  } catch (e) { return fail(e); }
}
