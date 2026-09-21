import { storeFor } from "@/lib/store-for";
import { ok, fail } from "@/lib/api";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string; vid: string }> }) {
  try { const { id, vid } = await ctx.params; const { store, access } = await storeFor(id, "editor"); return ok(await store.restoreVersion(id, vid, access.user.email)); } catch (e) { return fail(e); }
}
