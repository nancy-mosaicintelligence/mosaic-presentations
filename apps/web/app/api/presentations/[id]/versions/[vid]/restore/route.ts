import { getStore } from "@/lib/store";
import { ok, fail, actor } from "@/lib/api";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string; vid: string }> }) {
  try { const { id, vid } = await ctx.params; return ok(await getStore().restoreVersion(id, vid, actor())); } catch (e) { return fail(e); }
}
