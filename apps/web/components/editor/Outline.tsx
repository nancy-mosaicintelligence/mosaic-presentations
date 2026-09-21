"use client";
import type { Doc, Command } from "@/lib/doc";
import { Row, TextField, NumberField } from "./fields";

/** The stations, grouped by chapter; the current one is highlighted and editable beneath. */
export function Outline({ doc, station, onGoto, apply }: { doc: Doc; station: number; onGoto: (i: number) => void; apply: (c: Command) => void }) {
  const st = doc.stations[station];
  let lastChapter = "";
  return <div className="outline">
    <ol className="stations">
      {doc.stations.map((s, i) => {
        const chapter = s.chapter.replace(/^\d+ · /, "");
        const head = chapter !== lastChapter; lastChapter = chapter;
        return <li key={i} className={head ? "head" : ""}>
          {head && <div className="chapter">{chapter}</div>}
          <button type="button" className={"station" + (i === station ? " current" : "")} onClick={() => onGoto(i)} aria-current={i === station ? "step" : undefined}>
            <span className="n">{String(i + 1).padStart(2, "0")}</span><span className="t">{s.section || "—"}{s.black ? " · black" : ""}{s.lite ? " · white" : ""}</span>
          </button>
        </li>;
      })}
    </ol>
    {st && <div className="station-edit">
      <h4>Station {station + 1}</h4>
      <Row label="Chapter"><TextField value={st.chapter} onChange={v => apply({ path: ["stations", station, "chapter"], value: v, label: `chapter of station ${station + 1}`, coalesce: `st.${station}.c` })} /></Row>
      <Row label="Note" hint="speaker notes"><TextField multiline value={st.note} onChange={v => apply({ path: ["stations", station, "note"], value: v, label: `note of station ${station + 1}`, coalesce: `st.${station}.n` })} /></Row>
      <Row label="Progress"><NumberField value={st.p} onChange={v => { if (v !== undefined) apply({ path: ["stations", station, "p"], value: v, label: `progress of station ${station + 1}` }); }} /></Row>
      <Row label="Duration" hint="ms, cinematic moves"><NumberField value={st.dur} step={100} min={0} onChange={v => apply({ path: ["stations", station, "dur"], value: v, label: `duration of station ${station + 1}` })} /></Row>
    </div>}
  </div>;
}
