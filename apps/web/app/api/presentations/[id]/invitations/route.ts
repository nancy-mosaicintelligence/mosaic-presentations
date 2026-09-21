import { StoreError } from "@/lib/store";
import { requireRole, listInvitations, createInvitation, revokeInvitation } from "@/lib/auth/access";
import { supabaseServer } from "@/lib/auth/server";
import { fileMode } from "@/lib/auth/config";
import { ok, fail } from "@/lib/api";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { const { id } = await ctx.params; const a = await requireRole(id, "owner"); if (fileMode()) return ok([]); return ok(await listInvitations(await supabaseServer(), a.presentationId)); } catch (e) { return fail(e); }
}
/** A named invitation. The link is returned once; only its hash is stored. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; const a = await requireRole(id, "owner"); if (fileMode()) throw new StoreError(501, "invitations need the database store");
    const body = await req.json();
    const { invitation, token } = await createInvitation(await supabaseServer(), a.presentationId, String(body.email || ""), body.role, a.user);
    return ok({ invitation, link: `${new URL(req.url).origin}/invite/${token}` }, 201);
  } catch (e) { return fail(e); }
}
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; const a = await requireRole(id, "owner"); if (fileMode()) throw new StoreError(501, "invitations need the database store");
    const body = await req.json();
    if (typeof body.id !== "string") throw new StoreError(422, "id is required");
    await revokeInvitation(await supabaseServer(), a.presentationId, body.id, a.user); return ok({ ok: true });
  } catch (e) { return fail(e); }
}
