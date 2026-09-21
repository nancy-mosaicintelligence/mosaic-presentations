import { storeFor } from "@/lib/store-for";
import { ok, fail } from "@/lib/api";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { const { id } = await ctx.params; const { store } = await storeFor(id, "editor"); return ok(await store.listVersions(id)); } catch (e) { return fail(e); }
}
/** Create a named version. With `document` in the body the snapshot is that document (the editor's current state); without, the stored draft. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; const { store, access } = await storeFor(id, "editor");
    const body = await req.json();
    return ok(await store.createVersion(id, { name: body.name, note: body.note }, access.user.email, body.document), 201);
  } catch (e) { return fail(e); }
}
