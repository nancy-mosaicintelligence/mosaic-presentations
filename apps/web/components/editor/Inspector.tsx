"use client";
import { ROLES, STYLE_KEYS, safeCss, LAYOUT_VARIANTS, MV_VARIANTS, WIDTH_RE } from "@mosaic/presentation-core";
import type { Doc, Command, Element, Reveal } from "@/lib/doc";
import { locate, plain } from "@/lib/doc";
import { RunsEditor } from "./RunsEditor";
import { ImageInspector } from "./Images";
import { Row, TextField, NumberField, Tokens } from "./fields";

const TYPE_LABEL: Record<string, string> = { text: "Text", list: "List", chips: "Chips", chain: "Chain", "loop-labels": "Loop labels", "custom-scene": "Scene", group: "Group", image: "Image" };

export function Inspector({ doc, slug, selectedId, apply, onDeselect, onFill, onRemove }: { doc: Doc; slug: string; selectedId: string | null; apply: (c: Command) => void; onDeselect: () => void; onFill?: (id: string) => void; onRemove?: (id: string) => void }) {
  const hit = locate(doc, selectedId);
  if (!hit) return <div className="panel empty"><p>Click anything on the stage to select it; double-click a line to type into it.</p><p className="muted">The filmstrip under the stage and the arrow keys move between stations. This panel holds the finer controls of whatever is selected.</p></div>;
  const { si, ei, section, element: e } = hit;
  const base = ["sections", si, "elements", ei];
  const setField = (k: keyof Element, v: any, label?: string) => apply({ path: [...base, k], value: v, label: label || `${k} of ${e.id}` });
  const reveal = (rv: Reveal | undefined, set: (r: Reveal | undefined) => void) => <>
    <Row label="Reveal at" hint="progress"><NumberField value={rv?.p} onChange={p => set(p === undefined ? undefined : { ...(rv || { p: 0 }), p })} /></Row>
    <Row label="Sequence" hint="seconds after"><NumberField value={rv?.seq} step={0.1} onChange={seq => { if (!rv) return; const n = { ...rv }; if (seq === undefined) delete n.seq; else n.seq = seq; set(n); }} /></Row>
  </>;
  return <div className="panel">
    <header className="ph"><span className="kind">{TYPE_LABEL[e.type] || e.type}</span><code>{e.id}</code><button type="button" className="ghost danger" title="Delete key" onClick={() => onRemove?.(e.id)}>Remove</button><button type="button" className="ghost" onClick={onDeselect}>Deselect</button></header>

    {e.type === "text" && <section><h4>Copy</h4><RunsEditor runs={e.runs || []} coalesceKey={e.id} onChange={(runs, co) => apply({ path: [...base, "runs"], value: runs, label: `copy of ${e.id}`, coalesce: co ? e.id : undefined })} /></section>}
    {(e.type === "list" || e.type === "chips" || e.type === "chain" || e.type === "loop-labels") && <section><h4>Items</h4>
      {(e.items || []).map((it, k) => <div key={k} className="item">
        <RunsEditor runs={it.runs} coalesceKey={`${e.id}.${k}`} onChange={(runs, co) => apply({ path: [...base, "items", k, "runs"], value: runs, label: `item ${k + 1} of ${e.id}`, coalesce: co ? `${e.id}.${k}` : undefined })} />
        {it.reveal && <div className="sub">{reveal(it.reveal, r => apply({ path: [...base, "items", k, "reveal"], value: r, label: `reveal of item ${k + 1}` }))}</div>}
      </div>)}
    </section>}
    {e.type === "custom-scene" && <section><h4>Scene</h4><p className="muted">{e.scene}{e.params && " · " + Object.entries(e.params).map(([k, v]) => `${k}=${v}`).join(", ")}. Drawn by the renderer; only its reveal is editable here.</p></section>}
    {e.type === "image" && e.frame && !e.asset && <section><h4>Image box</h4><p className="muted">An empty frame ({e.frame.w}:{e.frame.h}). Drop a picture onto it on the stage, or pick one from the library.</p><button type="button" className="primary" onClick={() => onFill?.(e.id)}>Fill from the library</button></section>}
    {e.type === "image" && <ImageInspector doc={doc} slug={slug} si={si} ei={ei} element={e} apply={apply} />}
    <section><h4>Position</h4>
      {e.place
        ? <>
          <Row label="Free box" hint="% of the stage"><span className="muted small">drag it on the stage; corners resize</span></Row>
          <Row label="Left"><NumberField value={e.place.x} step={1} onChange={v => { if (v !== undefined) setField("place", { ...e.place!, x: v }, `move ${e.id}`); }} /></Row>
          <Row label="Top"><NumberField value={e.place.y} step={1} onChange={v => { if (v !== undefined) setField("place", { ...e.place!, y: v }, `move ${e.id}`); }} /></Row>
          <Row label="Width"><NumberField value={e.place.w} step={1} min={1} max={100} onChange={v => { if (v !== undefined) setField("place", { ...e.place!, w: Math.max(1, Math.min(100, v)) }, `resize ${e.id}`); }} /></Row>
          <Row label=" "><button type="button" className="ghost" onClick={() => setField("place", undefined, `back into the flow ${e.id}`)}>Back into the flow</button></Row>
        </>
        : <>
          <Row label="In the flow" hint="drag to nudge"><span className="muted small">{e.nudge ? `moved ${e.nudge.dx.toFixed(1)}% × ${e.nudge.dy.toFixed(1)}%` : "at its place"}</span></Row>
          {e.nudge && <Row label=" "><button type="button" className="ghost" onClick={() => setField("nudge", undefined, `reset ${e.id}`)}>Put back</button></Row>}
          <Row label=" "><button type="button" className="ghost" onClick={() => setField("place", { x: 30, y: 35, w: 40 }, `free ${e.id}`)}>Make it a free box</button></Row>
        </>}
    </section>
    {e.type === "group" && <section><h4>Container</h4><p className="muted">Holds {section.elements.filter(x => x !== e).length ? "the elements that follow it" : "nothing"}; its reveal times the whole block.</p></section>}

    {e.type !== "chips" && <section><h4>Timing</h4>{reveal(e.reveal, r => setField("reveal", r, `reveal of ${e.id}`))}</section>}
    {e.type === "image" && <section><h4>Appearance</h4><Row label="Visible"><input type="checkbox" checked={!e.hidden} onChange={ev => setField("hidden", !ev.target.checked, ev.target.checked ? `show ${e.id}` : `hide ${e.id}`)} /></Row></section>}

    {e.type !== "image" && <section><h4>Appearance</h4>
      <Row label="Visible"><input type="checkbox" checked={!e.hidden} onChange={ev => setField("hidden", !ev.target.checked, ev.target.checked ? `show ${e.id}` : `hide ${e.id}`)} /></Row>
      <Row label="Roles" hint="the deck's named styles"><Tokens value={e.role || []} options={ROLES} fixed={["rv"]} onChange={v => setField("role", v, `roles of ${e.id}`)} /></Row>
      {STYLE_KEYS.map((k: string) => {
        const v = e.style?.[k] ?? "";
        const invalid = v !== "" && !safeCss(v);
        return <Row key={k} label={k === "maxWidth" ? "Measure" : k === "fontSize" ? "Size" : k === "lineHeight" ? "Leading" : k === "textAlign" ? "Align" : k[0].toUpperCase() + k.slice(1).replace(/([A-Z])/g, " $1").toLowerCase()} hint={k === "maxWidth" ? "e.g. 21ch" : k === "fontSize" ? "e.g. clamp(22px, 2.6vw, 38px)" : undefined}>
          {k === "textAlign"
            ? <select className="field" value={v} onChange={ev => { const st = { ...(e.style || {}) }; if (ev.target.value) st[k] = ev.target.value; else delete st[k]; setField("style", Object.keys(st).length ? st : undefined, `align of ${e.id}`); }}><option value="">inherit</option><option>left</option><option>center</option><option>right</option></select>
            : <TextField value={v} invalid={invalid} mono onChange={nv => { if (nv !== "" && !safeCss(nv)) return; const st = { ...(e.style || {}) }; if (nv) st[k] = nv; else delete st[k]; apply({ path: [...base, "style"], value: Object.keys(st).length ? st : undefined, label: `${k} of ${e.id}`, coalesce: `${e.id}.${k}` }); }} />}
        </Row>;
      })}
    </section>}

    <section><h4>Section <code>{section.key}</code></h4>
      <Row label="Layout" hint="beat variants"><Tokens value={section.layout?.variants || []} options={LAYOUT_VARIANTS} onChange={v => apply({ path: ["sections", si, "layout", "variants"], value: v, label: `layout of ${section.key}` })} /></Row>
      <Row label="Box"><select className="field" value={section.layout?.box || ""} onChange={ev => apply({ path: ["sections", si, "layout", "box"], value: ev.target.value || undefined, label: `box of ${section.key}` })}><option value="">default</option>{MV_VARIANTS.map((b: string) => <option key={b}>{b}</option>)}</select></Row>
      <Row label="Width" hint="min(Npx,N%)"><TextField mono value={section.layout?.width || ""} invalid={!!section.layout?.width && !WIDTH_RE.test(section.layout.width)} onChange={v => { if (v && !WIDTH_RE.test(v)) return; apply({ path: ["sections", si, "layout", "width"], value: v || undefined, label: `width of ${section.key}`, coalesce: `${section.key}.width` }); }} /></Row>
      <Row label="Leaves at" hint="progress"><NumberField value={section.layout?.until} onChange={v => apply({ path: ["sections", si, "layout", "until"], value: v, label: `exit of ${section.key}` })} /></Row>
    </section>
    <p className="muted small">First words: “{plain(e.runs || e.items?.[0]?.runs).slice(0, 60)}”</p>
  </div>;
}
