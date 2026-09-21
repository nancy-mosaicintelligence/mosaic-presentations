import { getStore } from "@/lib/store";
import { ok, fail, actor } from "@/lib/api";

export async function POST(req: Request, ctx: { params: Promise<{ id: string; vid: string }> }) {
  try {
    const { id, vid } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    return ok(await getStore().duplicateVersion(id, vid, body.name, actor()), 201);
  } catch (e) { return fail(e); }
}
