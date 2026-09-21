import { storeFor } from "@/lib/store-for";
import { ok, fail } from "@/lib/api";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { const { id } = await ctx.params; const { store } = await storeFor(id, "editor"); return ok(await store.getDraft(id)); } catch (e) { return fail(e); }
}
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; const { store, access } = await storeFor(id, "editor");
    const body = await req.json();
    return ok(await store.saveDraft(id, body.document, access.user.email));
  } catch (e) { return fail(e); }
}
