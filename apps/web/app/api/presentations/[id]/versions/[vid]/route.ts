import { storeFor } from "@/lib/store-for";
import { ok, fail } from "@/lib/api";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; vid: string }> }) {
  try { const { id, vid } = await ctx.params; const { store } = await storeFor(id, "editor"); return ok(await store.getVersion(id, vid)); } catch (e) { return fail(e); }
}
