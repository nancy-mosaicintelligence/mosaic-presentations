import { requireRole } from "@/lib/auth/access";
import { supabaseServer } from "@/lib/auth/server";
import { StoreError } from "@/lib/store";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };
/** An image of a presentation, for its members: streamed from private storage, cacheable only by the browser. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string; file: string }> }) {
  const { slug, file } = await ctx.params;
  const m = /^([0-9a-f]{64})\.(png|jpe?g|webp|gif)$/.exec(file); if (!m) return new Response("not found", { status: 404 });
  try {
    const a = await requireRole(slug, "viewer");
    const sb = await supabaseServer();
    const { data, error } = await sb.storage.from("images").download(`${a.presentationId}/${file}`);
    if (error || !data) return new Response("not found", { status: 404 });
    return new Response(new Uint8Array(await data.arrayBuffer()), { headers: { "Content-Type": TYPES[m[2]], "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" } });
  } catch (e) { if (e instanceof StoreError) return new Response(e.message, { status: e.status }); throw e; }
}
