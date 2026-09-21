import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/auth/server";
export async function POST(req: Request) { const sb = await supabaseServer(); await sb.auth.signOut(); return NextResponse.redirect(new URL("/sign-in", new URL(req.url).origin), { status: 303 }); }
