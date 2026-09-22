"use client";
import { useState } from "react";
import { BEATS, makeBeat, nextKey, respace } from "@mosaic/presentation-core";
import type { Doc, Command } from "@/lib/doc";

/** Structural edits are whole-document commands: one undo step each. */
export function addBeat(doc: Doc, type: string, after: number): { doc: Doc; station: number } {
  const key = nextKey(doc, type);
  if (doc.stations[after]?.close && after > 0) after -= 1;   // the close stays last: a beat added from it goes before it
  const cur = doc.stations[after];
  // the new beat goes after the whole of the current beat (a list's stations stay together)
  let end = after; while (doc.stations[end + 1] && cur.section && doc.stations[end + 1].section === cur.section) end++;
  const next = doc.stations[end + 1], last = doc.stations[end];
  const p = doc.scene?.kind === "plain" ? last.p + 0.001 : next ? (last.p + next.p) / 2 : last.p + 0.035;   // between the neighbours; a plain deck is re-spaced anyway
  const made = makeBeat(type, { key, p, chapter: cur.chapter });
  const stations = [...doc.stations]; stations.splice(end + 1, 0, ...made.stations);
  let d: Doc = { ...doc, sections: [...doc.sections, made.section], stations };
  if (d.scene?.kind === "plain") d = respace(d) as Doc;
  return { doc: d, station: end + 1 };
}
export function removeStation(doc: Doc, i: number): Doc {
  const st = doc.stations[i]; if (doc.stations.length <= 1) return doc;
  const stations = doc.stations.filter((_, k) => k !== i);
  const stillUsed = stations.some(s => s.section === st.section);
  let d: Doc = { ...doc, stations, sections: stillUsed ? doc.sections : doc.sections.filter(s => s.key !== st.section) };
  if (!stillUsed && st.section) { /* the section's other stations went with it; nothing else references it */ }
  if (d.scene?.kind === "plain") d = respace(d) as Doc;
  return d;
}
/** Move a station's whole beat (all stations of its section stay together) one place earlier or later. */
export function moveStation(doc: Doc, i: number, dir: -1 | 1): { doc: Doc; station: number } | null {
  const key = doc.stations[i].section;
  const groups: { key: string; items: typeof doc.stations }[] = [];
  for (const s of doc.stations) { const g = groups[groups.length - 1]; if (g && g.key === s.section && s.section) g.items.push(s); else groups.push({ key: s.section, items: [s] }); }
  const gi = groups.findIndex(g => g.items.includes(doc.stations[i])); const gj = gi + dir; if (gj < 0 || gj >= groups.length) return null;
  const re = [...groups]; [re[gi], re[gj]] = [re[gj], re[gi]];
  const stations = re.flatMap(g => g.items);
  let d: Doc = { ...doc, stations };
  if (d.scene?.kind === "plain") d = respace(d) as Doc; else { /* hand-timed decks keep their p values: swap the timings of the two beats */ const ps = doc.stations.map(s => s.p); d = { ...d, stations: d.stations.map((s, k) => ({ ...s, p: ps[k] })) }; }
  const idx = d.stations.findIndex(s => s.section === key);
  return { doc: d, station: idx };
}

/** The beat picker: what the next station should be. */
export function BeatPicker({ onPick, onClose }: { onPick: (type: string) => void; onClose: () => void }) {
  return <div className="beatpicker" role="dialog" aria-label="Add a station">
    <header><strong>Add a station after this one</strong><button type="button" className="ghost" onClick={onClose}>×</button></header>
    <div className="beats">{BEATS.map((b: { type: string; label: string; hint: string }) => <button key={b.type} type="button" className="beat" data-type={b.type} onClick={() => onPick(b.type)}><span className="bl">{b.label}</span><span className="bh">{b.hint}</span></button>)}</div>
  </div>;
}

export function StationTools({ doc, station, onAdd, onRemove, onMove, onAddBox, onAddImage }: { doc: Doc; station: number; onAdd: (type: string) => void; onRemove: () => void; onMove: (dir: -1 | 1) => void; onAddBox: (kind: "text" | "imagebox") => void; onAddImage: () => void }) {
  const [picking, setPicking] = useState(false);
  return <div className="station-tools">
    <button type="button" className="primary" onClick={() => setPicking(p => !p)}>+ Add station</button>
    <span className="sep" />
    <button type="button" onClick={() => onAddBox("text")} title="a free text box on this station">+ Text box</button>
    <button type="button" onClick={() => onAddBox("imagebox")} title="an empty frame to fill with a picture">+ Image box</button>
    <button type="button" onClick={onAddImage} title="upload a picture and place it">+ Image</button>
    <span className="sep" />
    <button type="button" className="ghost" onClick={() => onMove(-1)} disabled={station === 0} title="move this beat earlier">◀</button>
    <button type="button" className="ghost" onClick={() => onMove(1)} disabled={station >= doc.stations.length - 1} title="move this beat later">▶</button>
    <button type="button" className="ghost danger" onClick={() => { if (window.confirm(`Remove station ${station + 1}?`)) onRemove(); }} disabled={doc.stations.length <= 1}>Remove</button>
    {picking && <BeatPicker onPick={t => { setPicking(false); onAdd(t); }} onClose={() => setPicking(false)} />}
  </div>;
}
