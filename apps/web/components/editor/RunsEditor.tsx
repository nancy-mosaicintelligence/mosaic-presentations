"use client";
import { MARKS, ICONS } from "@mosaic/presentation-core";
import type { Run } from "@/lib/doc";
import { TextField } from "./fields";

/** Runs are the text model: each run is a string with named marks, or an icon. The editor edits them as such. */
export function RunsEditor({ runs, onChange, coalesceKey }: { runs: Run[]; onChange: (runs: Run[], coalesce?: boolean) => void; coalesceKey: string }) {
  const set = (i: number, r: Run, coalesce = false) => onChange(runs.map((x, k) => (k === i ? r : x)), coalesce);
  return <div className="runs" data-coalesce={coalesceKey}>
    {runs.map((r, i) => <div key={i} className="run">
      {r.icon !== undefined
        ? <select className="field" value={r.icon} onChange={e => set(i, { ...r, icon: e.target.value })} aria-label="icon">{ICONS.map((ic: string) => <option key={ic} value={ic}>{ic}</option>)}</select>
        : <TextField value={r.t ?? ""} onChange={t => set(i, { ...r, t }, true)} placeholder="text" />}
      <span className="marks">
        {r.icon === undefined && MARKS.map((m: string) => <label key={m} className={"mark" + ((r.marks || []).includes(m) ? " on" : "")}><input type="checkbox" checked={(r.marks || []).includes(m)} onChange={e => { const marks = e.target.checked ? [...(r.marks || []), m] : (r.marks || []).filter(x => x !== m); const nr = { ...r }; if (marks.length) nr.marks = marks; else delete nr.marks; set(i, nr); }} />{m}</label>)}
        <button type="button" className="ghost" title="remove run" onClick={() => onChange(runs.filter((_, k) => k !== i))}>×</button>
      </span>
    </div>)}
    <div className="runs-add">
      <button type="button" className="ghost" onClick={() => onChange([...runs, { t: "" }])}>+ text</button>
      <button type="button" className="ghost" onClick={() => onChange([...runs, { icon: ICONS[0] }])}>+ icon</button>
    </div>
  </div>;
}
