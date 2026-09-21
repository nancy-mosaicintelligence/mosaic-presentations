import { getPresentation, deckWithDocument } from "@/lib/presentations";
import { storeFor } from "@/lib/store-for";
import { requireRole } from "@/lib/auth/access";
import { StoreError } from "@/lib/store";

// The presentation as the room sees it, for any member (viewer, editor, owner):
//  - an editable deck: its published version, embedded in the renderer (unpublished = not found);
//  - a static HTML deck: a full-window frame of the sandboxed file (see /raw/[slug]);
//  - a link: sent on to it.
// Nothing about drafts or history leaves this route. A station deep link is `#s=<n>`.
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const p = await getPresentation(slug);
  if (!p) return new Response("not found", { status: 404 });
  try {
    if (p.kind === "link") { await requireRole(slug, "viewer"); return Response.redirect(p.sourceUrl!, 302); }
    if (p.kind === "html") {
      await requireRole(slug, "viewer");
      const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
      const shell = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(p.title)}</title><meta name="robots" content="noindex"><style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%;display:block}</style></head><body><iframe src="/raw/${esc(p.slug)}${new URL(req.url).hash || ""}" title="${esc(p.title)}" sandbox="allow-scripts allow-pointer-lock" allow="fullscreen" allowfullscreen></iframe></body></html>`;
      return new Response(shell, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } });
    }
    const { store } = await storeFor(slug, "viewer");
    if (!store.published) return new Response("nothing is published", { status: 404 });
    const pub = await store.published();
    if (!pub) return new Response("nothing is published yet", { status: 404 });
    const html = await deckWithDocument(p, pub.document);
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Frame-Options": "SAMEORIGIN", "Content-Security-Policy": "frame-ancestors 'self'" } });
  } catch (e) {
    if (e instanceof StoreError) return e.status === 401 ? Response.redirect(new URL(`/sign-in?next=${encodeURIComponent(`/p/${slug}`)}`, req.url), 302) : new Response(e.message, { status: e.status });
    throw e;
  }
}
