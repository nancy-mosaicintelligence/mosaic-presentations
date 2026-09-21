"use client";
import { useRef, useState } from "react";
import { ANIMATION_FIELDS } from "@mosaic/presentation-core";
import type { Doc, Command, Run } from "@/lib/doc";
import { Row, TextField, NumberField } from "./fields";
import { RunsEditor } from "./RunsEditor";

const ANIM_LABEL: Record<string, [string, string]> = {
  revealSpacing: ["Reveal spacing", "seconds between sequenced reveals"], revealFade: ["Reveal fade", "seconds"],
  stepMin: ["Shortest step", "ms"], stepMax: ["Longest step", "ms"], stepPerUnit: ["Step per unit", "ms per unit of progress"], stepEaseOut: ["Ease-out", "0 smooth · 1 cubic"]
};

export function AnimationPanel({ doc, apply }: { doc: Doc; apply: (c: Command) => void }) {
  const a = doc.animation || {};
  return <div className="panel"><h4>Motion</h4><p className="muted">The values every reveal and every step use. Ranges are enforced by the schema.</p>
    {Object.entries(ANIMATION_FIELDS as Record<string, { min: number; max: number }>).map(([k, spec]) => <Row key={k} label={ANIM_LABEL[k]?.[0] || k} hint={ANIM_LABEL[k]?.[1]}>
      <NumberField value={a[k]} min={spec.min} max={spec.max} step={spec.max > 10 ? 10 : 0.01} onChange={v => { if (v === undefined || v < spec.min || v > spec.max) return; apply({ path: ["animation", k], value: v, label: `${ANIM_LABEL[k]?.[0] || k}`, coalesce: `anim.${k}` }); }} />
    </Row>)}
  </div>;
}

/** The copy the renderer draws itself (road, team, organ sites, chart, sense icons, annotations, chrome). The player reloads for these. */
export function CopyPanel({ doc, apply }: { doc: Doc; apply: (c: Command) => void }) {
  const c = doc.copy;
  const list = (key: string, title: string) => <section key={key}><h4>{title}</h4>{(c[key] as string[]).map((s, i) => <Row key={i} label={String(i + 1)}><TextField value={s} onChange={v => apply({ path: ["copy", key, i], value: v, label: `${title} ${i + 1}`, coalesce: `copy.${key}.${i}` })} /></Row>)}</section>;
  const str = (key: string, title: string) => <Row key={key} label={title}><TextField value={c[key]} onChange={v => apply({ path: ["copy", key], value: v, label: title, coalesce: `copy.${key}` })} /></Row>;
  return <div className="panel">
    <p className="muted">Words the renderer draws on its own canvases. The stage reloads after each saved change.</p>
    <section><h4>Road</h4>{(c.road as { year: Run[]; text: Run[] }[]).map((m, i) => <div key={i} className="item"><Row label="Year"><RunsEditor runs={m.year} coalesceKey={`road.${i}.y`} onChange={(runs, co) => apply({ path: ["copy", "road", i, "year"], value: runs, label: `road ${i + 1}`, coalesce: co ? `road.${i}.y` : undefined })} /></Row><Row label="Text"><RunsEditor runs={m.text} coalesceKey={`road.${i}.t`} onChange={(runs, co) => apply({ path: ["copy", "road", i, "text"], value: runs, label: `road ${i + 1}`, coalesce: co ? `road.${i}.t` : undefined })} /></Row></div>)}</section>
    {list("team", "Team")}{list("sites", "Organ sites")}{list("impactBars", "Impact bars")}{list("senseNature", "Senses · nature")}{list("senseEngineering", "Senses · engineering")}{list("annotations", "Room annotations")}{list("fluoroscopyPlaceholders", "Fluoroscopy placeholders")}
    <section><h4>Substitution</h4><RunsEditor runs={c.substitution} coalesceKey="subst" onChange={(runs, co) => apply({ path: ["copy", "substitution"], value: runs, label: "substitution", coalesce: co ? "subst" : undefined })} /></section>
    <section><h4>Chrome</h4>{str("partnerLine", "Event line")}{str("cue", "Cue")}{str("notesLabel", "Notes label")}{str("safeNote", "Safe-mode note")}
      {Object.keys(c.hud).map(k => <Row key={k} label={`Button · ${k}`}><TextField value={c.hud[k]} onChange={v => apply({ path: ["copy", "hud", k], value: v, label: `button ${k}`, coalesce: `hud.${k}` })} /></Row>)}</section>
  </div>;
}

/** The vector assets: what they are, where they came from, and a replacement by SVG upload. */
export function AssetsPanel({ doc, apply, presentationId }: { doc: Doc; apply: (c: Command) => void; presentationId: string }) {
  const [busy, setBusy] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});
  const upload = async (id: string, file: File) => {
    setBusy(id); setErr(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await fetch(`/api/presentations/${presentationId}/assets`, { method: "POST", body: fd });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || r.statusText);
      apply({ path: ["assets", id], value: { ...body, use: doc.assets?.[id]?.use || body.use }, label: `replace ${id}` });
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  };
  return <div className="panel"><p className="muted">Marks the deck draws from path data. Replace one with an SVG: only its viewBox and paths are taken; the stage reloads after the save.</p>
    {err && <p className="error">{err}</p>}
    {Object.entries(doc.assets || {}).map(([id, a]) => <section key={id}><h4>{id}</h4>
      <p className="muted small">{a.use}</p>
      <dl className="kv"><dt>viewBox</dt><dd><code>{a.viewBox}</code></dd><dt>paths</dt><dd>{a.paths.length}</dd>{a.sources.map((s, i) => <span key={i} className="src"><dt>source</dt><dd><code>{s.path}</code> <span className="muted">{s.sha256.slice(0, 12)}</span></dd></span>)}</dl>
      <input type="file" accept=".svg,image/svg+xml" hidden ref={el => { inputs.current[id] = el; }} onChange={e => { const f = e.target.files?.[0]; if (f) upload(id, f); e.target.value = ""; }} />
      <button type="button" disabled={busy === id} onClick={() => inputs.current[id]?.click()}>{busy === id ? "Uploading…" : "Replace with SVG…"}</button>
    </section>)}
  </div>;
}
