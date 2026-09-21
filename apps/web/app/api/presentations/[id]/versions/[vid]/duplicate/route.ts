import { storeFor } from "@/lib/store-for";
import { ok, fail } from "@/lib/api";

export async function POST(req: Request, ctx: { params: Promise<{ id: string; vid: string }> }) {
  try {
    const { id, vid } = await ctx.params; const { store, access } = await storeFor(id, "editor");
    const body = await req.json().catch(() => ({}));
    return ok(await store.duplicateVersion(id, vid, body.name, access.user.email), 201);
  } catch (e) { return fail(e); }
}
