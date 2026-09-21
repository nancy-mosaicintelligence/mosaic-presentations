import { getStore } from "@/lib/store";
import { ok, fail, actor } from "@/lib/api";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { const { id } = await ctx.params; return ok(await getStore().getDraft(id)); } catch (e) { return fail(e); }
}
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    return ok(await getStore().saveDraft(id, body.document, actor()));
  } catch (e) { return fail(e); }
}
