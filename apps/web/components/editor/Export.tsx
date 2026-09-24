"use client";
// Export to Google Slides: a .pptx in which every station is a slide — the scene as a still picture behind editable
// text boxes in the deck's own fonts and colours, the speaker note, and a fade between slides. The deck settles each
// station and hands over its words (itw:export → itw:exportReady); the rest of the frame is rasterised here.
import { useEffect, useRef, useState } from "react";
import type { PlayerBridge } from "./bridge";

export type ExportRun = { br: true } | { t: string; font: string; size: number; bold: boolean; italic: boolean; color: string; opacity: number; spacing: number };
export type ExportText = { id: string; x: number; y: number; w: number; h: number; line: number; lineHeight: number; fontSize: number; align: string; opacity: number; runs: ExportRun[] };
export type ExportReady = { index: number; w: number; h: number; texts: ExportText[]; note: string; chapter: string };

const SLIDE = { w: 10, h: 5.625 };   // inches: the 16:9 layout

/** "rgb(252, 100, 82)" / "rgba(…, .5)" → pptx hex and alpha */
const colour = (c: string) => {
  const m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?/.exec(c || "");
  if (!m) return { hex: "FFFFFF", a: 1 };
  const a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  return { hex: [m[1], m[2], m[3]].map(v => (+v).toString(16).padStart(2, "0")).join("").toUpperCase(), a };
};

export async function exportToSlides(o: { frame: HTMLIFrameElement; bridge: PlayerBridge; ask: (index: number) => Promise<ExportReady>; from: number; to: number; title: string; onProgress: (done: number, total: number) => void }): Promise<Blob> {
  const [{ default: html2canvas }, { default: PptxGenJS }, { default: JSZip }] = await Promise.all([import("html2canvas"), import("pptxgenjs"), import("jszip")]);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9"; pptx.title = o.title;
  const total = o.to - o.from + 1;
  for (let i = o.from; i <= o.to; i++) {
    const r = await o.ask(i);
    const doc = o.frame.contentDocument; if (!doc) throw new Error("the stage is gone");
    let picture: string;
    try {
      const cv = await html2canvas(doc.body, { scale: 1, width: r.w, height: r.h, windowWidth: r.w, windowHeight: r.h, x: 0, y: 0, scrollX: 0, scrollY: 0,
        backgroundColor: getComputedStyle(doc.body).backgroundColor || "#000000", logging: false, useCORS: true, imageTimeout: 0 });
      picture = cv.toDataURL("image/jpeg", 0.9);
    } finally { o.bridge.send({ type: "itw:exportDone" }); }
    const slide = pptx.addSlide();
    slide.background = { data: picture.replace(/^data:/, "") };
    const kx = SLIDE.w / r.w, ky = SLIDE.h / r.h, pt = 720 / r.w;   // 10 in = 720 pt across the deck's width
    for (const t of r.texts) {
      const half = Math.max(0, (t.lineHeight - t.line) / 2);   // CSS centres a line in its line box; the box starts at the line box
      const slack = t.w * 0.04 + 6;                             // room for slightly different font metrics, so no word wraps early
      const align = t.align === "center" ? "center" : t.align === "right" || t.align === "end" ? "right" : t.align === "justify" ? "justify" : "left";
      const x = t.x - (align === "center" ? slack / 2 : align === "right" ? slack : 0);
      const runs: { text: string; options: Record<string, unknown> }[] = [];
      for (const u of t.runs) {
        if ("br" in u) { const last = runs[runs.length - 1]; if (last && !last.options.breakLine) last.options.breakLine = true; else runs.push({ text: "", options: { breakLine: true } }); continue; }
        const c = colour(u.color), op = c.a * u.opacity;
        runs.push({ text: u.t, options: { fontFace: u.font, fontSize: +(u.size * pt).toFixed(1), bold: u.bold, italic: u.italic, color: c.hex,
          ...(op < 0.995 ? { transparency: Math.round((1 - op) * 100) } : {}), ...(u.spacing ? { charSpacing: +(u.spacing * pt).toFixed(2) } : {}) } });
      }
      if (!runs.length) continue;
      slide.addText(runs as never, { x: x * kx, y: (t.y - half) * ky, w: (t.w + slack) * kx, h: (t.h + half * 2 + 2) * ky, margin: 0, valign: "top", align, wrap: true, autoFit: false,
        lineSpacingMultiple: +(t.lineHeight / t.fontSize).toFixed(3), ...(t.opacity < 0.995 ? { transparency: Math.round((1 - t.opacity) * 100) } : {}) });
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
    if (!/<p:transition/.test(xml)) zip.file(name, xml.replace("</p:clrMapOvr>", '</p:clrMapOvr><p:transition spd="med"><p:fade/></p:transition>'));
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
    <p className="muted small">Makes a PowerPoint file (.pptx) that Google Slides opens: in Slides, File → Import slides. Every station becomes one slide: the scene as a picture behind it, the words on top as text boxes you can edit, the speaker note with it, and a fade from slide to slide.</p>
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
