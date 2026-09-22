import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/auth/server";
import { currentUser, admitted, bootstrapOwner, acceptPending } from "@/lib/auth/access";

// After Google: exchange the code for a session, then decide admission once — company accounts pass,
// anyone else needs a membership or an open invitation; otherwise the session is ended on the spot.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const sb = await supabaseServer();
  if (code) { const { error } = await sb.auth.exchangeCodeForSession(code); if (error) return NextResponse.redirect(new URL(`/sign-in?error=${encodeURIComponent(error.message)}`, url.origin)); }
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in?error=sign-in%20did%20not%20complete", url.origin));
  const a = await admitted(user);
  if (!a.ok) { await sb.auth.signOut(); return NextResponse.redirect(new URL(`/no-access?reason=${encodeURIComponent(a.reason || "")}`, url.origin)); }
  await bootstrapOwner(user); await acceptPending(user);
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
