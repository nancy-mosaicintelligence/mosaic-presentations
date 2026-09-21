import { StoreError } from "@/lib/store";
import { storeFor } from "@/lib/store-for";
import { ok, fail } from "@/lib/api";

/** What is published: any member may ask (name and time only; the document travels through the player route). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; const { store } = await storeFor(id, "viewer");
    if (!store.published) return ok(null);
    const p = await store.published(); return ok(p ? { versionId: p.versionId, publishedAt: p.publishedAt, name: p.name } : null);
  } catch (e) { return fail(e); }
}
/** Publish a version: owners only. The previous publication is retired, never deleted. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; const { store } = await storeFor(id, "owner");
    if (!store.publish) throw new StoreError(501, "publication needs the database store");
    const body = await req.json();
    if (typeof body.versionId !== "string") throw new StoreError(422, "versionId is required");
    return ok(await store.publish(body.versionId), 201);
  } catch (e) { return fail(e); }
}
