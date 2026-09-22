import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer, supabaseAdmin } from "./server";
import { authConfig, fileMode } from "./config";
import { getPresentation, SEEDS } from "../presentations";
import { StoreError } from "../store";

export type Role = "owner" | "editor" | "viewer";
const RANK: Record<Role, number> = { viewer: 1, editor: 2, owner: 3 };
export const atLeast = (role: Role | null, min: Role) => !!role && RANK[role] >= RANK[min];

export interface SessionUser { id: string; email: string; name: string | null; }
export interface Access { user: SessionUser | null; role: Role | null; presentationId: string | null; }

/** The signed-in user, from the session cookies (null when signed out). In file mode there is one local operator. */
export async function currentUser(): Promise<SessionUser | null> {
  if (fileMode()) return { id: "local", email: "local", name: "Local operator" };
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user || !data.user.email) return null;
  return { id: data.user.id, email: data.user.email.toLowerCase(), name: (data.user.user_metadata?.full_name as string) || (data.user.user_metadata?.name as string) || null };
}

/** The presentation row for a slug (seeded decks are created on first use; the row is not user data). */
export async function presentationRow(slug: string): Promise<{ id: string; slug: string } | null> {
  const p = await getPresentation(slug, supabaseAdmin()); return p ? { id: p.id, slug: p.slug } : null;
}

/** On sign-in: a company owner listed in OWNER_EMAILS becomes an owner of every registered presentation. */
export async function bootstrapOwner(user: SessionUser): Promise<void> {
  if (!authConfig.ownerEmails.includes(user.email) || !user.email.endsWith("@" + authConfig.companyDomain)) return;
  const admin = supabaseAdmin();
  for (const slug of Object.keys(SEEDS)) {
    const row = await presentationRow(slug); if (!row) continue;
    const { data: existing } = await admin.from("presentation_memberships").select("role").eq("presentation_id", row.id).eq("user_id", user.id).maybeSingle();
    if (existing?.role === "owner") continue;
    await admin.from("presentation_memberships").upsert({ presentation_id: row.id, user_id: user.id, role: "owner", granted_by: user.id });
    await admin.from("audit_events").insert({ presentation_id: row.id, actor_id: user.id, actor_email: user.email, action: "owner.bootstrapped", detail: { from: "OWNER_EMAILS" } });
  }
}

/** Who the current user is for a presentation and what they may do there. */
export async function accessFor(slug: string): Promise<Access> {
  const user = await currentUser();
  if (fileMode()) return { user, role: "owner", presentationId: slug };
  if (!user) return { user: null, role: null, presentationId: null };
  const row = await presentationRow(slug); if (!row) return { user, role: null, presentationId: null };
  const sb = await supabaseServer();
  const { data } = await sb.from("presentation_memberships").select("role").eq("presentation_id", row.id).eq("user_id", user.id).maybeSingle();
  return { user, role: (data?.role as Role) || null, presentationId: row.id };
}

/** Throws 401 (signed out) or 403 (no such role) unless the user holds at least `min` on the presentation. */
export async function requireRole(slug: string, min: Role): Promise<Access & { user: SessionUser; presentationId: string }> {
  const a = await accessFor(slug);
  if (!a.user) throw new StoreError(401, "sign in first");
  if (!(await getPresentation(slug))) throw new StoreError(404, "unknown presentation");
  if (!atLeast(a.role, min) || !a.presentationId) throw new StoreError(403, `this needs the ${min} role`);
  return a as Access & { user: SessionUser; presentationId: string };
}

/** A company account: may sign in without an invitation and may create presentations of its own. */
export const isCompany = (email: string) => email.endsWith("@" + authConfig.companyDomain);
/** Does this signed-in account belong on the company path, or hold any membership or open invitation? Decided once, after sign-in. */
export async function admitted(user: SessionUser): Promise<{ ok: boolean; reason?: string }> {
  if (user.email.endsWith("@" + authConfig.companyDomain)) return { ok: true };
  const admin = supabaseAdmin();
  const { count: members } = await admin.from("presentation_memberships").select("*", { count: "exact", head: true }).eq("user_id", user.id);
  if (members && members > 0) return { ok: true };
  const { count: invites } = await admin.from("invitations").select("*", { count: "exact", head: true }).eq("email", user.email).is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString());
  if (invites && invites > 0) return { ok: true };
  return { ok: false, reason: `${user.email} is not a ${authConfig.companyDomain} account and holds no invitation` };
}

/* ---------- members and invitations (owners; every query runs under RLS as the owner) ---------- */
export interface Member { userId: string; email: string; name: string | null; role: Role; createdAt: string; }
export interface Invitation { id: string; email: string; role: Exclude<Role, "owner">; expiresAt: string; createdAt: string; acceptedAt: string | null; revokedAt: string | null; status: "pending" | "accepted" | "revoked" | "expired"; }

const tokenHash = (t: string) => createHash("sha256").update(t).digest("hex");
const inviteStatus = (i: { accepted_at: string | null; revoked_at: string | null; expires_at: string }): Invitation["status"] =>
  i.accepted_at ? "accepted" : i.revoked_at ? "revoked" : new Date(i.expires_at) < new Date() ? "expired" : "pending";

export async function listMembers(sb: SupabaseClient, presentationId: string): Promise<Member[]> {
  const { data, error } = await sb.from("presentation_memberships").select("user_id, role, created_at, profiles!presentation_memberships_user_id_fkey!inner(email, full_name)").eq("presentation_id", presentationId).order("created_at");
  if (error) throw error;
  return (data as any[]).map(m => ({ userId: m.user_id, email: m.profiles.email, name: m.profiles.full_name, role: m.role, createdAt: m.created_at }));
}
export async function setMemberRole(sb: SupabaseClient, presentationId: string, userId: string, role: Role, actor: SessionUser): Promise<void> {
  const { error } = await sb.from("presentation_memberships").update({ role, granted_by: actor.id }).eq("presentation_id", presentationId).eq("user_id", userId);
  if (error) throw new StoreError(error.message.includes("one owner") ? 409 : 403, error.message);
  await sb.from("audit_events").insert({ presentation_id: presentationId, actor_id: actor.id, actor_email: actor.email, action: "member.role", detail: { userId, role } });
}
export async function removeMember(sb: SupabaseClient, presentationId: string, userId: string, actor: SessionUser): Promise<void> {
  const { error, count } = await sb.from("presentation_memberships").delete({ count: "exact" }).eq("presentation_id", presentationId).eq("user_id", userId);
  if (error) throw new StoreError(error.message.includes("one owner") ? 409 : 403, error.message);
  if (!count) throw new StoreError(404, "no such member");
  await sb.from("audit_events").insert({ presentation_id: presentationId, actor_id: actor.id, actor_email: actor.email, action: "member.removed", detail: { userId } });
}
export async function listInvitations(sb: SupabaseClient, presentationId: string): Promise<Invitation[]> {
  const { data, error } = await sb.from("invitations").select("id, email, role, expires_at, created_at, accepted_at, revoked_at").eq("presentation_id", presentationId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data as any[]).map(i => ({ id: i.id, email: i.email, role: i.role, expiresAt: i.expires_at, createdAt: i.created_at, acceptedAt: i.accepted_at, revokedAt: i.revoked_at, status: inviteStatus(i) }));
}
/** A named invitation: bound to one address, one presentation, one role, valid 14 days. The token is returned once and stored hashed. */
export async function createInvitation(sb: SupabaseClient, presentationId: string, email: string, role: "editor" | "viewer", actor: SessionUser): Promise<{ invitation: Invitation; token: string }> {
  email = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new StoreError(422, "that is not an email address");
  if (role !== "editor" && role !== "viewer") throw new StoreError(422, "an invitation grants editor or viewer");
  const token = randomBytes(32).toString("base64url");
  const expires_at = new Date(Date.now() + 14 * 86400_000).toISOString();
  const { data, error } = await sb.from("invitations").insert({ presentation_id: presentationId, email, role, token_hash: tokenHash(token), expires_at, created_by: actor.id }).select("id, email, role, expires_at, created_at, accepted_at, revoked_at").single();
  if (error) throw new StoreError(403, error.message);
  await sb.from("audit_events").insert({ presentation_id: presentationId, actor_id: actor.id, actor_email: actor.email, action: "invitation.created", detail: { id: data.id, email, role, expires_at } });
  return { invitation: { id: data.id, email: data.email, role: data.role, expiresAt: data.expires_at, createdAt: data.created_at, acceptedAt: null, revokedAt: null, status: "pending" }, token };
}
export async function revokeInvitation(sb: SupabaseClient, presentationId: string, id: string, actor: SessionUser): Promise<void> {
  const { error, count } = await sb.from("invitations").update({ revoked_at: new Date().toISOString() }, { count: "exact" }).eq("presentation_id", presentationId).eq("id", id).is("accepted_at", null);
  if (error) throw new StoreError(403, error.message);
  if (!count) throw new StoreError(404, "no open invitation with that id");
  await sb.from("audit_events").insert({ presentation_id: presentationId, actor_id: actor.id, actor_email: actor.email, action: "invitation.revoked", detail: { id } });
}
/** Share with an address (owners). An account that has signed in before holds the role at once; one that has not gets an open
 *  invitation the first sign-in turns into the membership by itself (see acceptPending). Sharing the same address again sets the role. */
export type ShareResult = { status: "member"; member: Member } | { status: "waiting"; invitation: Invitation; link: string };
export async function share(presentationId: string, email: string, role: "editor" | "viewer", actor: SessionUser, origin: string): Promise<ShareResult> {
  email = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new StoreError(422, "that is not an email address");
  if (role !== "editor" && role !== "viewer") throw new StoreError(422, "share as editor or viewer; owners are promoted in the members list");
  const admin = supabaseAdmin(); const now = new Date().toISOString();
  const { data: profile } = await admin.from("profiles").select("id, email, full_name").eq("email", email).maybeSingle();
  if (profile) {
    const { error } = await admin.from("presentation_memberships").upsert({ presentation_id: presentationId, user_id: profile.id, role, granted_by: actor.id });
    if (error) throw new StoreError(error.message.includes("one owner") ? 409 : 500, error.message);
    await admin.from("invitations").update({ accepted_at: now, accepted_by: profile.id }).eq("presentation_id", presentationId).eq("email", email).is("accepted_at", null).is("revoked_at", null);
    await admin.from("audit_events").insert({ presentation_id: presentationId, actor_id: actor.id, actor_email: actor.email, action: "member.shared", detail: { userId: profile.id, email, role } });
    return { status: "member", member: { userId: profile.id, email: profile.email, name: profile.full_name, role, createdAt: now } };
  }
  // not signed in yet: one open invitation per address, refreshed rather than duplicated (90 days to turn up)
  const token = randomBytes(32).toString("base64url"); const expires_at = new Date(Date.now() + 90 * 86400_000).toISOString();
  const { data: open } = await admin.from("invitations").select("id").eq("presentation_id", presentationId).eq("email", email).is("accepted_at", null).is("revoked_at", null).maybeSingle();
  const q = open
    ? admin.from("invitations").update({ role, token_hash: tokenHash(token), expires_at, created_by: actor.id }).eq("id", open.id)
    : admin.from("invitations").insert({ presentation_id: presentationId, email, role, token_hash: tokenHash(token), expires_at, created_by: actor.id });
  const { data, error } = await q.select("id, email, role, expires_at, created_at, accepted_at, revoked_at").single();
  if (error) throw new StoreError(500, error.message);
  await admin.from("audit_events").insert({ presentation_id: presentationId, actor_id: actor.id, actor_email: actor.email, action: "invitation.created", detail: { id: data.id, email, role, expires_at, refreshed: !!open } });
  return { status: "waiting", invitation: { id: data.id, email: data.email, role: data.role, expiresAt: data.expires_at, createdAt: data.created_at, acceptedAt: null, revokedAt: null, status: "pending" }, link: `${origin}/invite/${token}` };
}
/** On every sign-in and library visit: whatever was shared with this address before it had an account becomes a membership now (never lowering a role already held). */
export async function acceptPending(user: SessionUser): Promise<number> {
  const admin = supabaseAdmin();
  const { data: open } = await admin.from("invitations").select("id, presentation_id, role").eq("email", user.email).is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString());
  let n = 0;
  for (const inv of open || []) {
    const { data: existing } = await admin.from("presentation_memberships").select("role").eq("presentation_id", inv.presentation_id).eq("user_id", user.id).maybeSingle();
    const role: Role = existing && RANK[existing.role as Role] >= RANK[inv.role as Role] ? (existing.role as Role) : (inv.role as Role);
    const { error } = await admin.from("presentation_memberships").upsert({ presentation_id: inv.presentation_id, user_id: user.id, role, granted_by: null });
    if (error) continue;
    await admin.from("invitations").update({ accepted_at: new Date().toISOString(), accepted_by: user.id }).eq("id", inv.id);
    await admin.from("audit_events").insert({ presentation_id: inv.presentation_id, actor_id: user.id, actor_email: user.email, action: "invitation.accepted", detail: { id: inv.id, role, how: "sign-in" } });
    n++;
  }
  return n;
}
/** Accept an invitation with the signed-in account: the address must match, the invitation must be open. Grants the membership (never lowering an existing role). */
export async function acceptInvitation(token: string, user: SessionUser): Promise<{ slug: string; role: Role }> {
  const admin = supabaseAdmin();
  const { data: inv } = await admin.from("invitations").select("id, presentation_id, email, role, expires_at, accepted_at, revoked_at, presentations!inner(slug)").eq("token_hash", tokenHash(token)).maybeSingle();
  if (!inv) throw new StoreError(404, "this invitation link is not valid");
  const status = inviteStatus(inv as any);
  if (status !== "pending") throw new StoreError(410, `this invitation was ${status}`);
  if (inv.email !== user.email) throw new StoreError(403, `this invitation was sent to ${inv.email}; you are signed in as ${user.email}`);
  const { data: existing } = await admin.from("presentation_memberships").select("role").eq("presentation_id", inv.presentation_id).eq("user_id", user.id).maybeSingle();
  const role: Role = existing && RANK[existing.role as Role] >= RANK[inv.role as Role] ? (existing.role as Role) : (inv.role as Role);
  await admin.from("presentation_memberships").upsert({ presentation_id: inv.presentation_id, user_id: user.id, role, granted_by: null });
  await admin.from("invitations").update({ accepted_at: new Date().toISOString(), accepted_by: user.id }).eq("id", inv.id);
  await admin.from("audit_events").insert({ presentation_id: inv.presentation_id, actor_id: user.id, actor_email: user.email, action: "invitation.accepted", detail: { id: inv.id, role } });
  return { slug: (inv as any).presentations.slug, role };
}
