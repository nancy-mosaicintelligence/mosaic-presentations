import { StoreError } from "@/lib/store";
import { requireRole, listMembers, setMemberRole, removeMember, type Role } from "@/lib/auth/access";
import { supabaseServer } from "@/lib/auth/server";
import { fileMode } from "@/lib/auth/config";
import { ok, fail } from "@/lib/api";

const ROLES: Role[] = ["owner", "editor", "viewer"];
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try { const { id } = await ctx.params; const a = await requireRole(id, "owner"); if (fileMode()) return ok([]); return ok(await listMembers(await supabaseServer(), a.presentationId)); } catch (e) { return fail(e); }
}
/** Change a member's role. */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; const a = await requireRole(id, "owner"); if (fileMode()) throw new StoreError(501, "members need the database store");
    const body = await req.json();
    if (typeof body.userId !== "string" || !ROLES.includes(body.role)) throw new StoreError(422, "userId and a role of owner, editor or viewer");
    await setMemberRole(await supabaseServer(), a.presentationId, body.userId, body.role, a.user); return ok({ ok: true });
  } catch (e) { return fail(e); }
}
/** Revoke a membership. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; const a = await requireRole(id, "owner"); if (fileMode()) throw new StoreError(501, "members need the database store");
    const body = await req.json();
    if (typeof body.userId !== "string") throw new StoreError(422, "userId is required");
    await removeMember(await supabaseServer(), a.presentationId, body.userId, a.user); return ok({ ok: true });
  } catch (e) { return fail(e); }
}
