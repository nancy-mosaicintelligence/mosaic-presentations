import { requireRole } from "@/lib/auth/access";
import { supabaseServer, supabaseAdmin } from "@/lib/auth/server";
import { fileMode } from "@/lib/auth/config";
import { getPresentation, archivePresentation } from "@/lib/presentations";
import { StoreError } from "@/lib/store";
import { ok, fail } from "@/lib/api";

/** Owners archive a presentation: it leaves the library, nothing is deleted. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; const a = await requireRole(id, "owner"); if (fileMode()) throw new StoreError(501, "the library needs the database store");
    const p = await getPresentation(id); if (!p) throw new StoreError(404, "unknown presentation");
    await archivePresentation(await supabaseServer(), supabaseAdmin(), p, a.user); return ok({ ok: true });
  } catch (e) { return fail(e); }
}
