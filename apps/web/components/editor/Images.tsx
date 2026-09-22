"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ABSENT } from "@mosaic/presentation-core";
import type { Doc, Command, Element } from "@/lib/doc";
import { Row, NumberField, TextField } from "./fields";

export type ImageAsset = { id: string; kind: "image"; src: string; sha256: string; width: number; height: number; mime: string; bytes?: number; name?: string; alt?: string; url?: string; createdAt?: string };
export const imageUrl = (slug: string, a: { src: string }) => a.src.replace(/^storage:\/\/images\/[0-9a-f-]{36}\//, `/img/${slug}/`);

/** The presentation's image library: upload, and place an image on the current station. */
export function ImagesPanel({ doc, slug, station, apply, onPlaced }: { doc: Doc; slug: string; station: number; apply: (c: Command) => void; onPlaced: (id: string) => void }) {
  const [items, setItems] = useState<ImageAsset[]>([]); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement | null>(null);
  const load = useCallback(async () => { const r = await fetch(`/api/presentations/${slug}/images`, { cache: "no-store" }); if (r.ok) setItems(await r.json()); }, [slug]);
  useEffect(() => { load(); }, [load]);
  const upload = async (file: File) => {
    setBusy(true); setErr(null);
    try { const fd = new FormData(); fd.append("file", file); const r = await fetch(`/api/presentations/${slug}/images`, { method: "POST", body: fd }); const body = await r.json(); if (!r.ok) throw new Error(body.error || r.statusText); await load(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  /** Place: the asset goes into the document (if not there yet) and a new image element is appended to the station's section. */
  const place = (a: ImageAsset) => {
    const st = doc.stations[station]; const si = doc.sections.findIndex(s => s.key === st.section);
    if (si < 0) { setErr("this station has no section to hold an image; move to a station with content"); return; }
    // the document's asset record: only the schema's fields (the route also returns url and createdAt)
    if (!doc.assets?.[a.id]) { const { url: _u, createdAt: _c, id: _i, ...asset } = a; apply({ path: ["assets", a.id], value: asset, label: `add image ${a.name || a.id}` }); }
    const sec = doc.sections[si]; let n = sec.elements.length + 1; while (sec.elements.some(e => e.id === `${sec.key}.${n}`)) n++;
    const id = `${sec.key}.${n}`;
    const el: Element = { id, type: "image", asset: a.id, alt: a.name?.replace(/\.[a-z0-9]+$/i, "") || "", size: { width: "50%", align: "center", radius: 0 }, reveal: { p: st.p } } as Element;
    apply({ path: ["sections", si, "elements", sec.elements.length], value: el, label: `place image on station ${station + 1}` });
    onPlaced(id);
  };
  return <div className="panel">
    <p className="muted">Images of this presentation. Place one on the current station, then click it on the stage to crop, adjust and size it.</p>
    {err && <p className="error">{err}</p>}
    <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden ref={input} onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
    <button type="button" className="primary" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Uploading…" : "Upload an image"}</button>
    <div className="imggrid">
      {items.map(a => <button type="button" key={a.sha256} className="imgcell" title={`${a.name || a.id} · ${a.width}×${a.height}`} onClick={() => place(a)}>
        <img src={a.url || imageUrl(slug, a)} alt={a.name || ""} loading="lazy" />
        <span className="imgname">{a.name || a.id}</span>
      </button>)}
      {items.length === 0 && <p className="muted small">No images yet.</p>}
    </div>
  </div>;
}

/** The inspector for an image element: alt, box, and the editor (crop, rotate, flips, filters). */
export function ImageInspector({ doc, slug, si, ei, element, apply }: { doc: Doc; slug: string; si: number; ei: number; element: Element; apply: (c: Command) => void }) {
  const a = doc.assets?.[element.asset as string] as ImageAsset | undefined;
  const base = ["sections", si, "elements", ei];
  const size: Record<string, any> = element.size || {}; const adj: Record<string, any> = element.adjust || {};
  const setSize = (k: string, v: any, label?: string) => { const n = { ...size }; if (v === undefined || v === "") delete n[k]; else n[k] = v; apply({ path: [...base, "size"], value: Object.keys(n).length ? n : undefined, label: label || `${k} of ${element.id}`, coalesce: `${element.id}.size.${k}` }); };
  const setAdj = (k: string, v: any, label?: string) => { const n = { ...adj }; if (v === undefined) delete n[k]; else n[k] = v; apply({ path: [...base, "adjust"], value: Object.keys(n).length ? n : undefined, label: label || `${k} of ${element.id}`, coalesce: `${element.id}.adjust.${k}` }); };
  const slider = (k: "brightness" | "contrast" | "saturate" | "opacity" | "blur", label: string, min: number, max: number, step: number, def: number) => <Row key={k} label={label}><span className="slider"><input type="range" min={min} max={max} step={step} value={adj[k] ?? def} onChange={e => setAdj(k, Number(e.target.value))} /><span className="val">{(adj[k] ?? def).toFixed(k === "blur" ? 0 : 2)}</span></span></Row>;
  const remove = () => { if (window.confirm("Remove this image from the station? The file stays in the library.")) apply({ path: base, value: ABSENT, label: `remove ${element.id}` }); };
  return <>
    <section><h4>Image</h4>
      {a ? <p className="muted small">{a.name || a.id} · {a.width}×{a.height}</p> : <p className="error">the asset is missing from the document</p>}
      <Row label="Alt text" hint="for screen readers"><TextField value={element.alt || ""} onChange={v => apply({ path: [...base, "alt"], value: v, label: `alt of ${element.id}`, coalesce: `${element.id}.alt` })} /></Row>
      <Row label="Width" hint="% of the content box"><NumberField value={parseFloat(size.width || "50")} step={5} min={5} max={100} onChange={v => { if (v !== undefined) setSize("width", Math.max(5, Math.min(100, v)) + "%"); }} /></Row>
      <Row label="Side"><select className="field" value={size.align || "center"} onChange={e => setSize("align", e.target.value)}><option value="left">left</option><option value="center">centre</option><option value="right">right</option></select></Row>
      <Row label="Corners" hint="px"><NumberField value={size.radius ?? 0} step={2} min={0} max={80} onChange={v => setSize("radius", v === undefined ? undefined : Math.max(0, Math.min(80, v)))} /></Row>
    </section>
    {a && <section><h4>Crop &amp; turn</h4>
      <CropBox asset={a} slug={slug} crop={adj.crop} onChange={c => setAdj("crop", c, `crop ${element.id}`)} />
      <div className="turns">
        <button type="button" className="ghost" onClick={() => setAdj("rotate", ((adj.rotate || 0) + 270) % 360 || undefined, `turn ${element.id}`)}>↺ 90°</button>
        <button type="button" className="ghost" onClick={() => setAdj("rotate", ((adj.rotate || 0) + 90) % 360 || undefined, `turn ${element.id}`)}>↻ 90°</button>
        <button type="button" className={"ghost" + (adj.flipH ? " on" : "")} onClick={() => setAdj("flipH", adj.flipH ? undefined : true, `flip ${element.id}`)}>⇋ flip</button>
        <button type="button" className={"ghost" + (adj.flipV ? " on" : "")} onClick={() => setAdj("flipV", adj.flipV ? undefined : true, `flip ${element.id}`)}>⇅ flip</button>
        <button type="button" className="ghost" onClick={() => apply({ path: [...base, "adjust"], value: undefined, label: `reset ${element.id}` })}>Reset all</button>
      </div>
    </section>}
    <section><h4>Adjust</h4>
      {slider("brightness", "Brightness", 0, 2, 0.02, 1)}{slider("contrast", "Contrast", 0, 2, 0.02, 1)}{slider("saturate", "Saturation", 0, 2, 0.02, 1)}{slider("opacity", "Opacity", 0, 1, 0.02, 1)}{slider("blur", "Blur", 0, 20, 1, 0)}
    </section>
    <section><button type="button" className="ghost danger" onClick={remove}>Remove from the station</button></section>
  </>;
}

type Crop = { x: number; y: number; w: number; h: number };
/** A window dragged over the picture: corners resize, the inside moves; fractions of the source go to the document. */
function CropBox({ asset, slug, crop, onChange }: { asset: ImageAsset; slug: string; crop?: Crop; onChange: (c: Crop | undefined) => void }) {
  const box = useRef<HTMLDivElement | null>(null);
  const c = crop || { x: 0, y: 0, w: 1, h: 1 };
  const drag = useRef<{ mode: string; sx: number; sy: number; start: Crop } | null>(null);
  const clampCrop = (n: Crop): Crop => { const w = Math.max(0.05, Math.min(1, n.w)), h = Math.max(0.05, Math.min(1, n.h)); return { x: Math.max(0, Math.min(1 - w, n.x)), y: Math.max(0, Math.min(1 - h, n.y)), w, h }; };
  const onDown = (mode: string) => (e: React.PointerEvent) => { e.preventDefault(); e.stopPropagation(); (e.target as HTMLElement).setPointerCapture(e.pointerId); drag.current = { mode, sx: e.clientX, sy: e.clientY, start: c }; };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current, el = box.current; if (!d || !el) return;
    const r = el.getBoundingClientRect(); const dx = (e.clientX - d.sx) / r.width, dy = (e.clientY - d.sy) / r.height; const s = d.start; let n: Crop = { ...s };
    if (d.mode === "move") n = { ...s, x: s.x + dx, y: s.y + dy };
    else { if (d.mode.includes("e")) n.w = s.w + dx; if (d.mode.includes("s")) n.h = s.h + dy; if (d.mode.includes("w")) { n.x = s.x + dx; n.w = s.w - dx; } if (d.mode.includes("n")) { n.y = s.y + dy; n.h = s.h - dy; } }
    onChange(clampCrop(n));
  };
  const onUp = () => { drag.current = null; };
  const full = c.x === 0 && c.y === 0 && c.w === 1 && c.h === 1;
  return <div className="cropbox">
    <div className="cropstage" ref={box} style={{ aspectRatio: `${asset.width} / ${asset.height}` }} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <img src={asset.url || imageUrl(slug, asset)} alt="" draggable={false} />
      <div className="shade" />
      <div className="win" style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%`, width: `${c.w * 100}%`, height: `${c.h * 100}%` }} onPointerDown={onDown("move")}>
        {["nw", "ne", "sw", "se"].map(h => <span key={h} className={"h " + h} onPointerDown={onDown(h)} />)}
      </div>
    </div>
    <div className="cropinfo"><span className="muted small">{Math.round(c.w * asset.width)}×{Math.round(c.h * asset.height)} px</span>{!full && <button type="button" className="ghost" onClick={() => onChange(undefined)}>Uncrop</button>}</div>
  </div>;
}
