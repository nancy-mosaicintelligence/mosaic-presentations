import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/config";
import { supabaseServer } from "@/lib/auth/server";
import { currentUser, admitted, bootstrapOwner, acceptPending } from "@/lib/auth/access";

// The browser tests' way in: an email + password sign-in that goes through the same admission as the
// Google callback. Exists only when ITW_TEST_AUTH=1 and never in production.
export async function POST(req: Request) {
  if (!authConfig.testAuth) return new NextResponse("not found", { status: 404 });
  const { email, password } = await req.json();
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return NextResponse.json({ error: error.message }, { status: 401 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "no session" }, { status: 401 });
  const a = await admitted(user);
  if (!a.ok) { await sb.auth.signOut(); return NextResponse.json({ error: a.reason }, { status: 403 }); }
  await bootstrapOwner(user); await acceptPending(user);   /* as the Google callback does */
  return NextResponse.json({ ok: true, email: user.email });
}
