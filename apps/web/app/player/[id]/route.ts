import { promises as fs } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "@/lib/repo";
import { getPresentation } from "@/lib/presentations";
import { storeFor } from "@/lib/store-for";
import { StoreError } from "@/lib/store";

// The player the editor frames: the deck with the requested document embedded — `source=draft` (default),
// `version:<id>` or `committed` need the editor role; `published` needs any membership. Never cached.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const def = getPresentation(id);
  if (!def) return new Response("unknown presentation", { status: 404 });
  const source = new URL(req.url).searchParams.get("source") || "draft";
  try {
    let document: unknown = null;
    if (source === "published") { const { store } = await storeFor(id, "viewer"); const p = store.published ? await store.published() : null; if (!p) return new Response("nothing is published yet", { status: 404 }); document = p.document; }
    else {
      const { store } = await storeFor(id, "editor");
      if (source === "draft") document = (await store.getDraft(id)).document;
      else if (source.startsWith("version:")) document = (await store.getVersion(id, source.slice(8))).document;
      else if (source !== "committed") return new Response("unknown source", { status: 400 });
    }
    let html = await fs.readFile(join(repoRoot(), def.deckFile), "utf8");
    if (document) {
      const json = JSON.stringify(document).replace(/<\//g, "<\\/");
      const re = /<script type="application\/json" id="itw-content">[\s\S]*?<\/script>/;
      if (!re.test(html)) return new Response("the deck has no content block", { status: 500 });
      html = html.replace(re, () => `<script type="application/json" id="itw-content">${json}</script>`);
    }
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Frame-Options": "SAMEORIGIN", "Content-Security-Policy": "frame-ancestors 'self'" } });
  } catch (e) { if (e instanceof StoreError) return new Response(e.message, { status: e.status }); throw e; }
}
