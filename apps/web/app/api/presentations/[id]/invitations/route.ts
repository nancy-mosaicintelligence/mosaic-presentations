import { StoreError } from "@/lib/store";
import { requireRole, listInvitations, share, revokeInvitation } from "@/lib/auth/access";
import { supabaseServer } from "@/lib/auth/server";
import { fileMode } from "@/lib/auth/config";
import { ok, fail } from "@/lib/api";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { const { id } = await ctx.params; const a = await requireRole(id, "owner"); if (fileMode()) return ok([]); return ok(await listInvitations(await supabaseServer(), a.presentationId)); } catch (e) { return fail(e); }
}
/** Share with an address: a member at once when the account exists, otherwise granted at their first sign-in. The same address again sets the role. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; const a = await requireRole(id, "owner"); if (fileMode()) throw new StoreError(501, "sharing needs the database store");
    const body = await req.json();
    const origin = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;   // the site's own address, not a deploy permalink
    return ok(await share(a.presentationId, String(body.email || ""), body.role, a.user, origin.replace(/\/$/, "")), 201);
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
