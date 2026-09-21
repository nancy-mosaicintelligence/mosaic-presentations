"use client";
import { useEffect, useState } from "react";

/** A text field that keeps local state while typing and reports each change (the history coalesces them). */
export function TextField({ value, onChange, multiline, placeholder, invalid, mono, id }: { value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string; invalid?: boolean; mono?: boolean; id?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);
  const cls = "field" + (invalid ? " invalid" : "") + (mono ? " mono" : "");
  return multiline
    ? <textarea id={id} className={cls} value={v} placeholder={placeholder} rows={3} onChange={e => { setV(e.target.value); onChange(e.target.value); }} />
    : <input id={id} className={cls} value={v} placeholder={placeholder} onChange={e => { setV(e.target.value); onChange(e.target.value); }} />;
}

export function NumberField({ value, onChange, step = 0.005, min, max, id }: { value: number | undefined; onChange: (v: number | undefined) => void; step?: number; min?: number; max?: number; id?: string }) {
  const [v, setV] = useState(value === undefined ? "" : String(value));
  useEffect(() => { setV(value === undefined ? "" : String(value)); }, [value]);
  return <input id={id} className="field num" type="number" step={step} min={min} max={max} value={v} onChange={e => { setV(e.target.value); const n = e.target.value === "" ? undefined : Number(e.target.value); if (n === undefined || Number.isFinite(n)) onChange(n); }} />;
}

export function Row({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="row"><span className="lab">{label}{hint && <small>{hint}</small>}</span><span className="ctl">{children}</span></label>;
}

/** A closed-vocabulary multi-select as removable chips plus an add menu. */
export function Tokens({ value, options, onChange, fixed = [] }: { value: string[]; options: readonly string[]; onChange: (v: string[]) => void; fixed?: string[] }) {
  return <span className="tokens">
    {value.map(t => <span key={t} className={"tok" + (fixed.includes(t) ? " fixed" : "")}>{t}{!fixed.includes(t) && <button type="button" aria-label={`remove ${t}`} onClick={() => onChange(value.filter(x => x !== t))}>×</button>}</span>)}
    <select className="add" value="" onChange={e => { if (e.target.value) onChange([...value, e.target.value]); }} aria-label="add">
      <option value="">+</option>
      {options.filter(o => !value.includes(o)).map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </span>;
}
