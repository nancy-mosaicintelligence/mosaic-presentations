"use client";
// Export to Google Slides: a .pptx in which every station is a slide — the scene as a still picture behind editable
// text boxes in the deck's own fonts and colours, the speaker note, and a fade between slides. The deck settles each
// station and hands over its words (itw:export → itw:exportReady); the rest of the frame is rasterised here.
import { useEffect, useRef, useState } from "react";
import type { PlayerBridge } from "./bridge";

export type ExportRun = { br: true } | { t: string; font: string; size: number; bold: boolean; italic: boolean; color: string; opacity: number; spacing: number };
export type ExportPill = { x: number; y: number; w: number; h: number; fill: string; stroke: string; strokeW: number; radius: number; inset: { l: number; t: number; r: number; b: number } };
export type ExportText = { id: string; x: number; y: number; w: number; h: number; lines: number; maxLine: number; line: number; lineHeight: number; fontSize: number; align: string; opacity: number; runs: ExportRun[]; pill: ExportPill | null };
export type ExportObject = { n: number; x: number; y: number; w: number; h: number; svg: boolean };
export type ExportReady = { index: number; w: number; h: number; texts: ExportText[]; objects: ExportObject[]; note: string; chapter: string };

const SLIDE = { w: 10, h: 5.625 };   // inches: the 16:9 layout

/** "rgb(252, 100, 82)" / "rgba(…, .5)" → pptx hex and alpha */
const colour = (c: string) => {
  const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?/.exec(c || "");
  if (!m) return { hex: "FFFFFF", a: 1 };
  const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  return { hex: [m[1], m[2], m[3]].map(v => (+v).toString(16).padStart(2, "0")).join("").toUpperCase(), a };
};

const PAINT = ["fill", "fill-opacity", "fill-rule", "stroke", "stroke-width", "stroke-opacity", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "opacity", "font-family", "font-size", "font-weight", "letter-spacing", "text-anchor"];

/** html2canvas serialises inline SVG without the stylesheet, so strokes and fills set by CSS (currentColor, the icon
 *  rows, the road) vanish. Inline every SVG's computed paint under `root` for the duration; returns the undo. */
function inlineSvgPaint(root: Element): () => void {
  const win = root.ownerDocument.defaultView!; const undo: { el: Element; was: string | null }[] = [];
  const svgs = root.tagName.toLowerCase() === "svg" ? [root] : Array.from(root.querySelectorAll("svg"));
  for (const svg of svgs) for (const e of [svg, ...Array.from(svg.querySelectorAll("*"))]) {
    const cs = win.getComputedStyle(e); if (cs.display === "none") continue;
    undo.push({ el: e, was: e.getAttribute("style") });
    e.setAttribute("style", (e.getAttribute("style") || "").replace(/;?\s*$/, ";") + PAINT.map(k => `${k}:${cs.getPropertyValue(k)}`).join(";"));
  }
  return () => { for (const u of undo) { if (u.was === null) u.el.removeAttribute("style"); else u.el.setAttribute("style", u.was); } };
}

/** An inline SVG as a PNG: a clone with its computed paint inlined (currentColor and the stylesheet resolved), drawn at `scale`. */
async function rasterSvg(svg: SVGElement, scale: number): Promise<string> {
  const win = svg.ownerDocument.defaultView!;
  const r = svg.getBoundingClientRect();
  const clone = svg.cloneNode(true) as SVGElement;
  const src = [svg, ...Array.from(svg.querySelectorAll("*"))], dst = [clone, ...Array.from(clone.querySelectorAll("*"))];
  src.forEach((e, i) => { const cs = win.getComputedStyle(e); dst[i].setAttribute("style", PAINT.map(k => `${k}:${cs.getPropertyValue(k)}`).join(";")); });
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(r.width)); clone.setAttribute("height", String(r.height));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error("svg")); im.src = url; });
    const cv = document.createElement("canvas"); cv.width = Math.max(1, Math.round(r.width * scale)); cv.height = Math.max(1, Math.round(r.height * scale));
    cv.getContext("2d")!.drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL("image/png");
  } finally { URL.revokeObjectURL(url); }
}

export async function exportToSlides(o: { frame: HTMLIFrameElement; bridge: PlayerBridge; ask: (index: number) => Promise<ExportReady>; from: number; to: number; title: string; onProgress: (done: number, total: number) => void }): Promise<Blob> {
  const [{ default: html2canvas }, { default: PptxGenJS }, { default: JSZip }] = await Promise.all([import("html2canvas"), import("pptxgenjs"), import("jszip")]);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9"; pptx.title = o.title;
  const total = o.to - o.from + 1;
  for (let i = o.from; i <= o.to; i++) {
    const r = await o.ask(i);
    const doc = o.frame.contentDocument; if (!doc) throw new Error("the stage is gone");
    const kx = SLIDE.w / r.w, ky = SLIDE.h / r.h, pt = 720 / r.w;   // 10 in = 720 pt across the deck's width
    let picture: string;
    const pictures: { data: string; x: number; y: number; w: number; h: number }[] = [];
    const hidden: { el: HTMLElement; was: string }[] = [];
    try {
      // the objects first, each from the live stage; then they and the pills leave the picture of everything else
      for (const ob of r.objects) {
        const el = doc.querySelector(`[data-export="${ob.n}"]`) as HTMLElement | null; if (!el) continue;
        const inner = el.tagName.toLowerCase() === "svg" ? el : (el.children.length === 1 && el.firstElementChild!.tagName.toLowerCase() === "svg" && !el.textContent!.trim() ? el.firstElementChild as HTMLElement : null);
        const scale = Math.max(2, Math.min(4, Math.ceil(600 / Math.max(ob.w, ob.h))));
        try {
          let data: string, box = { x: ob.x, y: ob.y, w: ob.w, h: ob.h };
          if (inner) { const ir = inner.getBoundingClientRect(); box = { x: ir.left, y: ir.top, w: ir.width, h: ir.height }; data = await rasterSvg(inner as unknown as SVGElement, scale); }
          else { const undo = inlineSvgPaint(el); try { data = (await html2canvas(el, { scale, backgroundColor: null, logging: false, useCORS: true, imageTimeout: 0 })).toDataURL("image/png"); } finally { undo(); } }
          pictures.push({ data, ...box });
          hidden.push({ el, was: el.style.visibility }); el.style.visibility = "hidden";
        } catch { /* it stays in the picture */ }
      }
      for (const el of Array.from(doc.querySelectorAll("[data-export-hide]")) as HTMLElement[]) { hidden.push({ el, was: el.style.visibility }); el.style.visibility = "hidden"; }
      const undoPaint = inlineSvgPaint(doc.body);
      try {
        const cv = await html2canvas(doc.body, { scale: 1, width: r.w, height: r.h, windowWidth: r.w, windowHeight: r.h, x: 0, y: 0, scrollX: 0, scrollY: 0,
          backgroundColor: getComputedStyle(doc.body).backgroundColor || "#000000", logging: false, useCORS: true, imageTimeout: 0 });
        picture = cv.toDataURL("image/jpeg", 0.9);
      } finally { undoPaint(); }
    } finally {
      for (const h of hidden) h.el.style.visibility = h.was;
      o.bridge.send({ type: "itw:exportDone" });
    }
    const slide = pptx.addSlide();
    slide.background = { data: picture.replace(/^data:/, "") };
    for (const p of pictures) slide.addImage({ data: p.data, x: p.x * kx, y: p.y * ky, w: p.w * kx, h: p.h * ky });
    for (const t of r.texts) {
      // one paragraph; a soft break (shift-enter) where the deck starts a new line
      const runs: { text: string; options: Record<string, unknown> }[] = []; let br = false;
      for (const u of t.runs) {
        if ("br" in u) { br = true; continue; }
        const c = colour(u.color), op = c.a * u.opacity;
        runs.push({ text: u.t, options: { fontFace: u.font, fontSize: +(u.size * pt).toFixed(1), bold: u.bold, italic: u.italic, color: c.hex, ...(br ? { softBreakBefore: true } : {}),
          ...(op < 0.995 ? { transparency: Math.round((1 - op) * 100) } : {}), ...(u.spacing ? { charSpacing: +(u.spacing * pt).toFixed(2) } : {}) } });
        br = false;
      }
      if (!runs.length) continue;
      const align = t.align === "center" ? "center" : t.align === "right" || t.align === "end" ? "right" : t.align === "justify" ? "justify" : "left";
      const half = Math.max(0, (t.lineHeight - t.line) / 2);   // CSS centres a line in its line box; the box starts at the line box
      const common = { valign: "top" as const, align: align as "left" | "center" | "right" | "justify", wrap: true, autoFit: false, lineSpacing: +(t.lineHeight * pt).toFixed(2),
        ...(t.opacity < 0.995 ? { transparency: Math.round((1 - t.opacity) * 100) } : {}) };
      if (t.pill) {
        // a pill: the element's own box, its fill and edge, the words at their inset (room on the right for a wider face)
        const f = colour(t.pill.fill), e = colour(t.pill.stroke), extra = Math.max(0, t.maxLine * 0.25);
        const w = t.pill.w + extra, ml = t.pill.inset.l, mr = Math.max(0, t.pill.inset.r), mt = Math.max(0, t.pill.inset.t - half), mb = Math.max(0, t.pill.inset.b);
        slide.addText(runs as never, { ...common, x: t.pill.x * kx, y: t.pill.y * ky, w: w * kx, h: t.pill.h * ky, margin: [ml * pt, mr * pt, mb * pt, mt * pt],
          shape: pptx.ShapeType.roundRect, rectRadius: Math.min(t.pill.radius, t.pill.h / 2) * kx,
          ...(f.a > 0 ? { fill: { color: f.hex, transparency: Math.round((1 - f.a) * 100) } } : {}),
          ...(t.pill.strokeW > 0 && e.a > 0 ? { line: { color: e.hex, width: +(t.pill.strokeW * pt).toFixed(2), transparency: Math.round((1 - e.a) * 100) } } : {}) });
        continue;
      }
      // the lines break where the deck breaks them; the box is wide enough that a wider face cannot wrap a line early
      const w = t.maxLine * 1.3 + 12, x = t.x - (align === "center" ? (w - t.w) / 2 : align === "right" ? w - t.w : 0);
      slide.addText(runs as never, { ...common, x: x * kx, y: (t.y - half) * ky, w: w * kx, h: (t.lines * t.lineHeight + 4) * ky, margin: 0 });
    }
    if (r.note) slide.addNotes(r.note);
    o.onProgress(i - o.from + 1, total);
  }
  const blob = (await pptx.write({ outputType: "blob" })) as Blob;
  // a fade between slides: pptxgenjs has no transitions, the package format does
  const zip = await JSZip.loadAsync(blob);
  for (const name of Object.keys(zip.files)) {
    if (!/^ppt\/slides\/slide\d+\.xml$/.test(name)) continue;
    const xml = await zip.file(name)!.async("string");
    let out = xml;
    if (!/<p:transition/.test(out)) out = out.replace("</p:clrMapOvr>", '</p:clrMapOvr><p:transition spd="med"><p:fade/></p:transition>');
    // pptxgenjs repeats the paragraph properties before later runs of a paragraph; only the first is valid
    out = out.replace(/<a:p>(<a:pPr\b[^>]*>(?:(?!<\/a:pPr>).)*<\/a:pPr>|<a:pPr\b[^>]*\/>)?((?:(?!<\/a:p>).)*)<\/a:p>/gs, (_m, first: string | undefined, rest: string) => "<a:p>" + (first || "") + rest.replace(/<a:pPr\b[^>]*>(?:(?!<\/a:pPr>).)*<\/a:pPr>|<a:pPr\b[^>]*\/>/gs, "") + "</a:p>");
    if (out !== xml) zip.file(name, out);
  }
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
}

export function ExportDialog({ total, title, onClose, run }: { total: number; title: string; onClose: () => void; run: (from: number, to: number, onProgress: (done: number, total: number) => void) => Promise<Blob> }) {
  const [from, setFrom] = useState(1); const [to, setTo] = useState(total);
  const [state, setState] = useState<{ kind: "idle" } | { kind: "busy"; done: number; total: number } | { kind: "done"; file: string } | { kind: "error"; message: string }>({ kind: "idle" });
  const alive = useRef(true); useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const busy = state.kind === "busy";
  const clamp = (v: number) => Math.max(1, Math.min(total, Math.round(v) || 1));
  const go = async () => {
    const a = Math.min(clamp(from), clamp(to)), b = Math.max(clamp(from), clamp(to));
    setState({ kind: "busy", done: 0, total: b - a + 1 });
    try {
      const blob = await run(a - 1, b - 1, (done, n) => { if (alive.current) setState({ kind: "busy", done, total: n }); });
      const file = `${title.replace(/[\\/:*?"<>|]+/g, " ").trim() || "presentation"}.pptx`;
      const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = file; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      if (alive.current) setState({ kind: "done", file });
    } catch (e) { if (alive.current) setState({ kind: "error", message: e instanceof Error ? e.message : String(e) }); }
  };
  return <div className="share export" role="dialog" aria-label="Export to Google Slides">
    <header><strong>Export to Google Slides</strong><button type="button" className="ghost" onClick={onClose} disabled={busy}>×</button></header>
    <p className="muted small">Makes a PowerPoint file (.pptx) that Google Slides opens: in Slides, File → Import slides. Every station becomes one slide: the scene as a picture behind it; the logos, pictures, charts and icons as images you can move and resize; the words as text boxes you can edit, line for line; the speaker note with it; and a fade from slide to slide.</p>
    <p className="muted small">Movement inside a station — the camera, the reveals, the animated figures — does not carry over. Slides has nothing to play it with; the live link keeps it.</p>
    <div className="range"><span className="lab">Stations</span>
      <input className="field" type="number" min={1} max={total} value={from} disabled={busy} onChange={e => setFrom(+e.target.value)} aria-label="from station" />
      <span className="lab">to</span>
      <input className="field" type="number" min={1} max={total} value={to} disabled={busy} onChange={e => setTo(+e.target.value)} aria-label="to station" />
      <button type="button" className="primary" onClick={go} disabled={busy}>{busy ? "Exporting…" : "Export"}</button>
    </div>
    {state.kind === "busy" && <p className="muted small" aria-live="polite">Rendering station {Math.min(state.done + 1, state.total)} of {state.total}… keep this tab in front; it takes a couple of seconds per station.</p>}
    {state.kind === "done" && <p className="small" aria-live="polite">Done: <strong>{state.file}</strong> is in your downloads.</p>}
    {state.kind === "error" && <p className="small error" aria-live="polite">Export failed: {state.message}</p>}
  </div>;
}
