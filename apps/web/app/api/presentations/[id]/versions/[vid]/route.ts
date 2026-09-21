import { getStore } from "@/lib/store";
import { ok, fail } from "@/lib/api";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; vid: string }> }) {
  try { const { id, vid } = await ctx.params; return ok(await getStore().getVersion(id, vid)); } catch (e) { return fail(e); }
}
