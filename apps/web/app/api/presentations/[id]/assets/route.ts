import { StoreError } from "@/lib/store";
import { storeFor } from "@/lib/store-for";
import { ok, fail } from "@/lib/api";
import { svgToPaths } from "@/lib/svg-asset";

/** Upload an SVG for an `svg-paths` asset. Returns the asset record the editor puts into the draft. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; const { store, access } = await storeFor(id, "editor");
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new StoreError(422, "send the SVG as the `file` field");
    if (!/\.svg$/i.test(file.name) && file.type !== "image/svg+xml") throw new StoreError(422, "only SVG files can replace a mark");
    const bytes = Buffer.from(await file.arrayBuffer());
    let parsed; try { parsed = svgToPaths(bytes.toString("utf8")); } catch (e: any) { throw new StoreError(422, e.message); }
    const stored = await store.putAsset(id, { name: file.name, bytes }, access.user.email);
    return ok({ kind: "svg-paths", use: `uploaded ${file.name}`, viewBox: parsed.viewBox, paths: parsed.paths, sources: [{ path: stored.path, sha256: stored.sha256 }] }, 201);
  } catch (e) { return fail(e); }
}
