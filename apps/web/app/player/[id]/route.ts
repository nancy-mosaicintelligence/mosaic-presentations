import { getPresentation, deckWithDocument } from "@/lib/presentations";
import { storeFor } from "@/lib/store-for";
import { StoreError } from "@/lib/store";

// The player the editor frames: the deck with the requested document embedded — `source=draft` (default),
// `version:<id>` or `committed` need the editor role; `published` needs any membership. Never cached.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const p = await getPresentation(id);
  if (!p) return new Response("unknown presentation", { status: 404 });
  if (p.kind !== "deck") return new Response("not an editable deck", { status: 400 });
  const source = new URL(req.url).searchParams.get("source") || "draft";
  try {
    let document: unknown = null;
    if (source === "published") { const { store } = await storeFor(id, "viewer"); const pub = store.published ? await store.published() : null; if (!pub) return new Response("nothing is published yet", { status: 404 }); document = pub.document; }
    else {
      const { store } = await storeFor(id, "editor");
      if (source === "draft") document = (await store.getDraft(id)).document;
      else if (source.startsWith("version:")) document = (await store.getVersion(id, source.slice(8))).document;
      else if (source !== "committed") return new Response("unknown source", { status: 400 });
    }
    const html = await deckWithDocument(p, document);
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Frame-Options": "SAMEORIGIN", "Content-Security-Policy": "frame-ancestors 'self'" } });
  } catch (e) { if (e instanceof StoreError) return new Response(e.message, { status: e.status }); throw e; }
}
