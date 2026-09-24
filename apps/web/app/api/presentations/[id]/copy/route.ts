import { requireRole } from "@/lib/auth/access";
import { supabaseServer, supabaseAdmin } from "@/lib/auth/server";
import { fileMode } from "@/lib/auth/config";
import { getPresentation, copyPresentation } from "@/lib/presentations";
import { storeFor } from "@/lib/store-for";
import { StoreError } from "@/lib/store";
import { ok, fail } from "@/lib/api";

/** POST: a copy of this deck for the caller — its current document and pictures, in a new presentation they own. Editors and owners. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; const a = await requireRole(id, "editor"); if (fileMode()) throw new StoreError(501, "copying needs the database store");
    const p = await getPresentation(id); if (!p) throw new StoreError(404, "unknown presentation");
    const { store } = await storeFor(id, "editor"); const draft = await store.getDraft(id);
    const made = await copyPresentation(await supabaseServer(), supabaseAdmin(), a.user, p, draft.document);
    return ok({ id: made.id, slug: made.slug, title: made.title }, 201);
  } catch (e) { return fail(e); }
}
