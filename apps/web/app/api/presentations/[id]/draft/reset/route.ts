import { storeFor } from "@/lib/store-for";
import { ok, fail } from "@/lib/api";
import { StoreError } from "@/lib/store";

/** Replace the draft with the presentation's starting document again (editors). Versions stay. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; const { store, access } = await storeFor(id, "editor");
    if (!store.resetDraft) throw new StoreError(501, "a reset needs the database store");
    return ok(await store.resetDraft(access.user.email));
  } catch (e) { return fail(e); }
}
