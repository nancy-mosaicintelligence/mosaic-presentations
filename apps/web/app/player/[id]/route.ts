import { promises as fs } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "@/lib/repo";
import { getPresentation } from "@/lib/presentations";
import { getStore, StoreError } from "@/lib/store";

// The player: the deck itself, served from the repository so the editor can frame it on the same origin,
// with the requested document embedded in place of the committed one — `source=draft` (default),
// `source=version:<id>`, or `source=committed`. Everything the deck reads at start-up (renderer copy,
// assets, the lockup) is then faithful to that document; the bridge carries live edits on top.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const def = getPresentation(id);
  if (!def) return new Response("unknown presentation", { status: 404 });
  const source = new URL(req.url).searchParams.get("source") || "draft";
  let html = await fs.readFile(join(repoRoot(), def.deckFile), "utf8");
  try {
    let document: unknown = null;
    if (source === "draft") document = (await getStore().getDraft(id)).document;
    else if (source.startsWith("version:")) document = (await getStore().getVersion(id, source.slice(8))).document;
    else if (source !== "committed") return new Response("unknown source", { status: 400 });
    if (document) {
      const json = JSON.stringify(document).replace(/<\//g, "<\\/");
      const re = /<script type="application\/json" id="itw-content">[\s\S]*?<\/script>/;
      if (!re.test(html)) return new Response("the deck has no content block", { status: 500 });
      html = html.replace(re, () => `<script type="application/json" id="itw-content">${json}</script>`);
    }
  } catch (e) { if (e instanceof StoreError) return new Response(e.message, { status: e.status }); throw e; }
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Frame-Options": "SAMEORIGIN", "Content-Security-Policy": "frame-ancestors 'self'" } });
}
