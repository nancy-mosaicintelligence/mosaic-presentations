import { getPresentation, deckWithDocument } from "@/lib/presentations";
import { storeFor } from "@/lib/store-for";
import { requireRole } from "@/lib/auth/access";
import { StoreError } from "@/lib/store";
import { withExit, shellPage } from "@/lib/player-chrome";

// The presentation as the room sees it, for any member (viewer, editor, owner):
//  - an editable deck: the current document (what the editor shows), or `?source=published` for the published version;
//  - a static HTML deck: a full-window frame of the sandboxed file (see /raw/[slug]);
//  - a link: sent on to it.
// Versions and history never leave this route. A station deep link is `#s=<n>`.
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
      return new Response(withExit(shell, "/", "Library"), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } });
    }
    const { store } = await storeFor(slug, "viewer");
    const url = new URL(req.url); const published = url.searchParams.get("source") === "published";
    // the page people open is a shell: the deck at its canvas size, scaled to fit; `raw=1` is the deck itself, for the shell's frame
    if (published && store.published && !(await store.published())) return new Response("nothing is published yet", { status: 404 });
    if (url.searchParams.get("raw") !== "1") return new Response(shellPage({ title: p.title, src: `/p/${p.slug}?raw=1${published ? "&source=published" : ""}`, back: "/", label: "Library" }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } });
    let document: unknown;
    if (published) {
      if (!store.published) return new Response("nothing is published", { status: 404 });
      const pub = await store.published(); if (!pub) return new Response("nothing is published yet", { status: 404 });
      document = pub.document;
    } else {
      // the current document — what the editor shows — for every member; a deck no editor has opened yet is its starting document
      try { document = (await store.getDraft(slug)).document; } catch (e) { if (e instanceof StoreError && (e.status === 403 || e.status === 404)) document = null; else throw e; }
    }
    const html = await deckWithDocument(p, document);
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Frame-Options": "SAMEORIGIN", "Content-Security-Policy": "frame-ancestors 'self'" } });
  } catch (e) {
    if (e instanceof StoreError) return e.status === 401 ? Response.redirect(new URL(`/sign-in?next=${encodeURIComponent(`/p/${slug}`)}`, req.url), 302) : new Response(e.message, { status: e.status });
    throw e;
  }
}
