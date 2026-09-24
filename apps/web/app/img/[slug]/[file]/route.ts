import { accessFor } from "@/lib/auth/access";
import { supabaseServer, supabaseAdmin } from "@/lib/auth/server";
import { getPresentation, publishedPublic } from "@/lib/presentations";
import { StoreError } from "@/lib/store";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };
/** An image of a presentation: for its members, and for anyone once the presentation is published; streamed from private storage, cacheable only by the browser. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string; file: string }> }) {
  const { slug, file } = await ctx.params;
  const m = /^([0-9a-f]{64})\.(png|jpe?g|webp|gif)$/.exec(file); if (!m) return new Response("not found", { status: 404 });
  try {
    // members read through their own rights; anyone else only when the presentation is published (its pictures are part of what is public)
    const access = await accessFor(slug); const p = await getPresentation(slug, supabaseAdmin()); if (!p) return new Response("not found", { status: 404 });
    let client = await supabaseServer();
    if (!access.role) { if (!(await publishedPublic(supabaseAdmin(), p.id))) return new Response(access.user ? "no access" : "sign in first", { status: access.user ? 403 : 401 }); client = supabaseAdmin(); }
    const { data, error } = await client.storage.from("images").download(`${p.id}/${file}`);
    if (error || !data) return new Response("not found", { status: 404 });
    return new Response(new Uint8Array(await data.arrayBuffer()), { headers: { "Content-Type": TYPES[m[2]], "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" } });
  } catch (e) { if (e instanceof StoreError) return new Response(e.message, { status: e.status }); throw e; }
}
