import { getStore } from "@/lib/store";
import { ok, fail, actor } from "@/lib/api";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { const { id } = await ctx.params; return ok(await getStore().listVersions(id)); } catch (e) { return fail(e); }
}
/** Create a named version. With `document` in the body the snapshot is that document (the editor's current state); without, the stored draft. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    return ok(await getStore().createVersion(id, { name: body.name, note: body.note }, actor(), body.document), 201);
  } catch (e) { return fail(e); }
}
