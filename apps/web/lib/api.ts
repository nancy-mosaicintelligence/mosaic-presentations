import { NextResponse } from "next/server";
import { StoreError } from "./store";

export function ok(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } }); }
export function fail(e: unknown) {
  if (e instanceof StoreError) return NextResponse.json({ error: e.message, issues: e.issues }, { status: e.status, headers: { "Cache-Control": "no-store" } });
  console.error(e);
  return NextResponse.json({ error: "internal error" }, { status: 500, headers: { "Cache-Control": "no-store" } });
}
/** The acting user. Phase 7 replaces this with the authenticated session; until then every write is attributed to the local operator. */
export function actor(): string { return "local"; }
