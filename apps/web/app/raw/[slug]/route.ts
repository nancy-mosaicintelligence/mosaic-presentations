import { getPresentation, readStaticDeck } from "@/lib/presentations";
import { requireRole } from "@/lib/auth/access";
import { supabaseServer } from "@/lib/auth/server";
import { StoreError } from "@/lib/store";

// A static HTML deck, byte for byte, for members — delivered inside a CSP sandbox so the file runs with an
// opaque origin: it cannot read this application's cookies or storage, and it can only be framed by us.
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const p = await getPresentation(slug);
  if (!p || p.kind !== "html") return new Response("not found", { status: 404 });
  try {
    await requireRole(slug, "viewer");
    const bytes = await readStaticDeck(await supabaseServer(), p);
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "Content-Security-Policy": "sandbox allow-scripts allow-pointer-lock; frame-ancestors 'self'", "X-Frame-Options": "SAMEORIGIN", "Referrer-Policy": "no-referrer" } });
  } catch (e) { if (e instanceof StoreError) return new Response(e.message, { status: e.status }); throw e; }
}
