// Turn an uploaded SVG into an `svg-paths` asset: only the viewBox and the path data are taken, in
// document order; everything else in the file (styles, scripts, images, text) is ignored by construction.
// The schema's validator then checks the grammar of what was taken.
export function svgToPaths(svg: string): { viewBox: string; paths: { d: string }[] } {
  if (svg.length > 2_000_000) throw new Error("the SVG is larger than 2 MB");
  if (!/<svg[\s>]/i.test(svg)) throw new Error("not an SVG document");
  const vb = svg.match(/<svg[^>]*\sviewBox\s*=\s*"([^"]+)"/i);
  if (!vb) throw new Error("the SVG has no viewBox; the keynote needs one to scale the mark");
  const viewBox = vb[1].trim().replace(/[,\s]+/g, " ");
  const paths = [...svg.matchAll(/<path\b[^>]*?\sd\s*=\s*"([^"]+)"/gi)].map(m => ({ d: m[1].trim().replace(/\s+/g, " ") }));
  if (!paths.length) throw new Error("the SVG has no <path> elements; the keynote draws marks from path data only");
  return { viewBox, paths };
}
