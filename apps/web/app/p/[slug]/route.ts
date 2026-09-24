import { getPresentation, deckWithDocument, publishedPublic } from "@/lib/presentations";
import { storeFor } from "@/lib/store-for";
import { requireRole, accessFor } from "@/lib/auth/access";
import { supabaseAdmin } from "@/lib/auth/server";
import { StoreError } from "@/lib/store";
import { withExit, shellPage } from "@/lib/player-chrome";

// The presentation as the room sees it, for any member (viewer, editor, owner):
//  - an editable deck: for people with access the current document (what the editor shows), or `?source=published` for the
//    frozen one; for everyone else on the internet the published version — publishing is what makes a link public;
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
    const url = new URL(req.url); const wantPublished = url.searchParams.get("source") === "published";
    // people with access see the current document (or the frozen one on request); anyone else — signed in or not — sees the published version, if there is one
    const access = await accessFor(slug); const member = !!access.role;
    let document: unknown;
    if (member && !wantPublished) {
      const { store } = await storeFor(slug, "viewer");
      try { document = (await store.getDraft(slug)).document; } catch (e) { if (e instanceof StoreError && (e.status === 403 || e.status === 404)) document = null; else throw e; }
    } else {
      const pub = await publishedPublic(supabaseAdmin(), p.id);
      if (!pub) { if (!access.user) return Response.redirect(new URL(`/sign-in?next=${encodeURIComponent(`/p/${slug}`)}`, req.url), 302); return new Response(member ? "nothing is published yet" : "you have no access to this presentation, and nothing is published", { status: member ? 404 : 403 }); }
      document = pub.document;
    }
    // the page people open is a shell: the deck at its canvas size, scaled to fit; `raw=1` is the deck itself, for the shell's frame
    if (url.searchParams.get("raw") !== "1") return new Response(shellPage({ title: p.title, src: `/p/${p.slug}?raw=1${wantPublished ? "&source=published" : ""}`, back: member ? "/" : "/sign-in", label: member ? "Library" : "Sign in" }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" } });
    const html = await deckWithDocument(p, document);
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Frame-Options": "SAMEORIGIN", "Content-Security-Policy": "frame-ancestors 'self'" } });
  } catch (e) {
    if (e instanceof StoreError) return e.status === 401 ? Response.redirect(new URL(`/sign-in?next=${encodeURIComponent(`/p/${slug}`)}`, req.url), 302) : new Response(e.message, { status: e.status });
    throw e;
  }
}
