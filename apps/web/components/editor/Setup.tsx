"use client";
import { useRef, useState } from "react";
import type { Doc, Command } from "@/lib/doc";
import MARKS from "@/lib/marks.json";

const MARK_KEY = "wave-by-vento-w";   /* the renderer's slot for the event mark (its name is the keynote's; the picture is the document's) */

/** The deck's own set-up: the event mark in the header (a built-in mark or an uploaded SVG) and the header's logo sizes. */
export function SetupPanel({ doc, slug, apply }: { doc: Doc; slug: string; apply: (c: Command) => void }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const input = useRef<HTMLInputElement | null>(null);
  const current = doc.assets?.[MARK_KEY] as any; const sc = (doc.tokens as any)?.scale || {};
  const pick = (m: (typeof MARKS)[number]) => apply({ path: ["assets", MARK_KEY], value: { ...m.asset, use: `the event mark in the header — ${m.name}` }, label: `event mark: ${m.name}` });
  const upload = async (file: File) => {
    setBusy(true); setErr(null);
    try { const fd = new FormData(); fd.append("file", file); const r = await fetch(`/api/presentations/${slug}/assets`, { method: "POST", body: fd }); const body = await r.json(); if (!r.ok) throw new Error(body.error || r.statusText); apply({ path: ["assets", MARK_KEY], value: { ...body, use: `the event mark in the header — ${file.name}` }, label: `event mark: ${file.name}` }); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };
  const setScale = (k: "brand" | "partner", v: number) => { const next = { ...sc, [k]: v }; if (v === 1) delete next[k]; apply({ path: ["tokens", "scale"], value: Object.keys(next).length ? next : undefined, label: `${k === "brand" ? "Mosaic logo" : "event mark"} size`, coalesce: `scale.${k}` }); };
  const isCurrent = (m: (typeof MARKS)[number]) => !!current && current.sources?.[0]?.sha256 === m.asset.sources[0].sha256;
  return <div className="panel setup">
    <section><h4>Event mark</h4>
      <p className="muted small">The mark that turns in the header, beside the event line (type the line itself on the stage). A built-in mark, or your own SVG drawn from paths.</p>
      {err && <p className="error">{err}</p>}
      <div className="marks">
        {MARKS.map(m => <button type="button" key={m.id} className={"mark" + (isCurrent(m) ? " on" : "")} onClick={() => pick(m)} title={m.about}><img src={m.url} alt="" /><span>{m.name}</span></button>)}
        <button type="button" className="mark upload" disabled={busy} onClick={() => input.current?.click()}><span>{busy ? "Uploading…" : "Upload an SVG…"}</span></button>
        <input type="file" accept=".svg,image/svg+xml" hidden ref={input} onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      </div>
      {current && !MARKS.some(isCurrent) && <p className="muted small">Current: {current.use}</p>}
      {!current && <p className="muted small">This deck shows no mark, only its event line.</p>}
    </section>
    <section><h4>Header sizes</h4>
      {(["brand", "partner"] as const).map(k => <div className="row" key={k}><span className="lab">{k === "brand" ? "Mosaic logo" : "Event mark"}<small>× the usual size</small></span>
        <span className="slider"><input type="range" data-scale={k} min={0.5} max={3} step={0.05} value={sc[k] ?? 1} onChange={e => setScale(k, Number(e.target.value))} /><span className="val">{(sc[k] ?? 1).toFixed(2)}×</span></span></div>)}
    </section>
  </div>;
}

/** A selected header logo: its size and offset, like any element's inspector; Put back returns it to the renderer's place and size. */
export function ChromePanel({ name, doc, apply, onDeselect }: { name: "brand" | "partner"; doc: Doc; apply: (c: Command) => void; onDeselect: () => void }) {
  const sc = (doc.tokens as any)?.scale || {}; const off = (doc as any).offsets?.[`chrome.${name}`];
  const label = name === "brand" ? "Mosaic logo" : "Event mark";
  const setScale = (v: number) => { const next = { ...sc, [name]: v }; if (v === 1) delete next[name]; apply({ path: ["tokens", "scale"], value: Object.keys(next).length ? next : undefined, label: `${label} size`, coalesce: `scale.${name}` }); };
  return <div className="panel chrome-panel">
    <header className="ph"><span className="kind">{label}</span><code>chrome.{name}</code><button type="button" className="ghost" onClick={onDeselect}>Deselect</button></header>
    <p className="muted small">Drag it on the stage to move it, pull a corner to resize it, or use the arrow keys. It stays part of the header wherever it goes.</p>
    <section><h4>Size</h4><div className="row"><span className="lab">{label}<small>× the usual size</small></span><span className="slider"><input type="range" data-scale={name} min={0.5} max={3} step={0.05} value={sc[name] ?? 1} onChange={e => setScale(Number(e.target.value))} /><span className="val">{(sc[name] ?? 1).toFixed(2)}×</span></span></div></section>
    <section><h4>Position</h4><p className="muted small">{off ? `Moved ${off.dx > 0 ? "right" : "left"} ${Math.abs(off.dx).toFixed(1)}% and ${off.dy > 0 ? "down" : "up"} ${Math.abs(off.dy).toFixed(1)}% of the stage.` : "Where the renderer puts it."}</p>
      <button type="button" className="ghost" disabled={!off && !sc[name]} onClick={() => { if (off) apply({ path: ["offsets", `chrome.${name}`], value: undefined, label: `${label}: put back` }); if (sc[name]) setScale(1); }}>Put back</button></section>
  </div>;
}
