"use client";
import { useEffect, useRef } from "react";
import type { Doc } from "@/lib/doc";
import { plain } from "@/lib/doc";

/** The first words a station shows: the earliest copy in its section that has arrived by then. */
export function stationWords(doc: Doc, i: number): string {
  const st = doc.stations[i]; const sec = doc.sections.find(s => s.key === st.section);
  if (!sec) return st.note.split(/[.\n]/)[0].slice(0, 60);
  const arrived = (rv?: { p: number }) => !rv || rv.p <= st.p + 0.012;
  for (const e of sec.elements) {
    if (e.hidden) continue;
    if (e.type === "text" && arrived(e.reveal)) { const t = plain(e.runs).trim(); if (t) return t.slice(0, 70); }
    if ((e.type === "list" || e.type === "chips") && e.items) { const it = e.items.find(x => arrived(x.reveal)); if (it) return plain(it.runs).slice(0, 70); }
  }
  return st.chapter.replace(/^\d+ · /, "");
}

/** One card per station, grouped by chapter; the current one is marked and kept in view. */
export function Filmstrip({ doc, station, onGoto }: { doc: Doc; station: number; onGoto: (i: number) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => { const el = ref.current?.querySelector<HTMLElement>(`[data-i="${station}"]`); el?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); }, [station]);
  let last = "";
  return <div className="filmstrip" ref={ref} role="listbox" aria-label="Stations">
    {doc.stations.map((s, i) => {
      const chapter = s.chapter.replace(/^\d+ · /, ""); const head = chapter !== last; last = chapter;
      return <div key={i} className={"cell" + (head ? " head" : "")}>
        {head && <div className="chap">{chapter}</div>}
        <button type="button" data-i={i} role="option" aria-selected={i === station} className={"card" + (i === station ? " current" : "") + (s.lite ? " lite" : s.black ? " black" : "")} onClick={() => onGoto(i)} title={`Station ${i + 1} · ${chapter}`}>
          <span className="n">{String(i + 1).padStart(2, "0")}</span>
          <span className="w">{stationWords(doc, i)}</span>
        </button>
      </div>;
    })}
  </div>;
}
