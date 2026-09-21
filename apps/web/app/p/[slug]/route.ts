import { promises as fs } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "@/lib/repo";
import { getPresentation } from "@/lib/presentations";
import { storeFor } from "@/lib/store-for";
import { StoreError } from "@/lib/store";

// The presentation as the room sees it: the published version, for any member (viewer, editor, owner).
// Nothing about drafts or history leaves this route; an unpublished presentation is not found.
// A station deep link is `#s=<n>`, honoured by the deck and clamped there.
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const def = getPresentation(slug);
  if (!def) return new Response("not found", { status: 404 });
  try {
    const { store } = await storeFor(slug, "viewer");
    if (!store.published) return new Response("nothing is published", { status: 404 });
    const p = await store.published();
    if (!p) return new Response("nothing is published yet", { status: 404 });
    let html = await fs.readFile(join(repoRoot(), def.deckFile), "utf8");
    const json = JSON.stringify(p.document).replace(/<\//g, "<\\/");
    html = html.replace(/<script type="application\/json" id="itw-content">[\s\S]*?<\/script>/, () => `<script type="application/json" id="itw-content">${json}</script>`);
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Frame-Options": "SAMEORIGIN", "Content-Security-Policy": "frame-ancestors 'self'" } });
  } catch (e) {
    if (e instanceof StoreError) return e.status === 401 ? Response.redirect(new URL(`/sign-in?next=${encodeURIComponent(`/p/${slug}`)}`, _req.url), 302) : new Response(e.message, { status: e.status });
    throw e;
  }
}
