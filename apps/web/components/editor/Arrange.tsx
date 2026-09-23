"use client";
import { useEffect } from "react";

export type Rect = { x: number; y: number; w: number; h: number };
export type ArrangeOp = "left" | "hcenter" | "right" | "top" | "vmiddle" | "bottom" | "hdist" | "vdist" | "page-h" | "page-v" | "same-w" | "same-h" | "same-both";

/** New positions and widths (in % of the stage) for the selection, from its current rectangles. Alignment uses the
 *  selection's own bounds; one element aligns to the page. Match size takes the first selected as the reference. */
export function arrange(op: ArrangeOp, ids: string[], rects: Record<string, Rect>): Record<string, { x?: number; y?: number; w?: number; h?: number }> {
  const rs = ids.filter(i => rects[i]).map(i => ({ id: i, ...rects[i] })); if (!rs.length) return {};
  const out: Record<string, { x?: number; y?: number; w?: number; h?: number }> = {};
  const single = rs.length === 1;
  const minX = single ? 0 : Math.min(...rs.map(r => r.x)), maxR = single ? 100 : Math.max(...rs.map(r => r.x + r.w));
  const minY = single ? 0 : Math.min(...rs.map(r => r.y)), maxB = single ? 100 : Math.max(...rs.map(r => r.y + r.h));
  const put = (id: string, v: { x?: number; y?: number; w?: number; h?: number }) => { out[id] = { ...(out[id] || {}), ...v }; };
  switch (op) {
    case "left": rs.forEach(r => put(r.id, { x: minX })); break;
    case "hcenter": rs.forEach(r => put(r.id, { x: (minX + maxR) / 2 - r.w / 2 })); break;
    case "right": rs.forEach(r => put(r.id, { x: maxR - r.w })); break;
    case "top": rs.forEach(r => put(r.id, { y: minY })); break;
    case "vmiddle": rs.forEach(r => put(r.id, { y: (minY + maxB) / 2 - r.h / 2 })); break;
    case "bottom": rs.forEach(r => put(r.id, { y: maxB - r.h })); break;
    case "hdist": { if (rs.length < 3) break; const s = [...rs].sort((a, b) => a.x - b.x); const gap = ((s[s.length - 1].x + s[s.length - 1].w) - s[0].x - s.reduce((t, r) => t + r.w, 0)) / (s.length - 1); let x = s[0].x; s.forEach(r => { put(r.id, { x }); x += r.w + gap; }); break; }
    case "vdist": { if (rs.length < 3) break; const s = [...rs].sort((a, b) => a.y - b.y); const gap = ((s[s.length - 1].y + s[s.length - 1].h) - s[0].y - s.reduce((t, r) => t + r.h, 0)) / (s.length - 1); let y = s[0].y; s.forEach(r => { put(r.id, { y }); y += r.h + gap; }); break; }
    case "page-h": { const bx = Math.min(...rs.map(r => r.x)), br = Math.max(...rs.map(r => r.x + r.w)); const d = 50 - (bx + br) / 2; rs.forEach(r => put(r.id, { x: r.x + d })); break; }
    case "page-v": { const by = Math.min(...rs.map(r => r.y)), bb = Math.max(...rs.map(r => r.y + r.h)); const d = 50 - (by + bb) / 2; rs.forEach(r => put(r.id, { y: r.y + d })); break; }
    case "same-w": rs.slice(1).forEach(r => put(r.id, { w: rs[0].w })); break;
    case "same-h": rs.slice(1).forEach(r => put(r.id, { h: rs[0].h })); break;
    case "same-both": rs.slice(1).forEach(r => put(r.id, { w: rs[0].w, h: rs[0].h })); break;
  }
  for (const k of Object.keys(out)) { const v = out[k]; if (v.x !== undefined) v.x = +v.x.toFixed(2); if (v.y !== undefined) v.y = +v.y.toFixed(2); if (v.w !== undefined) v.w = +v.w.toFixed(2); if (v.h !== undefined) v.h = +v.h.toFixed(2); }
  return out;
}

const GROUPS: { title: string; items: { op: ArrangeOp; label: string; min: number }[] }[] = [
  { title: "Align", items: [{ op: "left", label: "Left", min: 1 }, { op: "hcenter", label: "Centre", min: 1 }, { op: "right", label: "Right", min: 1 }, { op: "top", label: "Top", min: 1 }, { op: "vmiddle", label: "Middle", min: 1 }, { op: "bottom", label: "Bottom", min: 1 }] },
  { title: "Distribute", items: [{ op: "hdist", label: "Horizontally", min: 3 }, { op: "vdist", label: "Vertically", min: 3 }] },
  { title: "Centre on page", items: [{ op: "page-h", label: "Horizontally", min: 1 }, { op: "page-v", label: "Vertically", min: 1 }] },
  { title: "Match size", items: [{ op: "same-w", label: "Width", min: 2 }, { op: "same-h", label: "Height", min: 2 }, { op: "same-both", label: "Both", min: 2 }] }
];

/** The right-click menu over the stage: arrange the selection, or copy, paste, duplicate and delete it. */
export function ContextMenu({ at, count, canPaste, onArrange, onAction, onClose }: { at: { x: number; y: number }; count: number; canPaste: boolean; onArrange: (op: ArrangeOp) => void; onAction: (a: "copy" | "paste" | "duplicate" | "delete") => void; onClose: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; const c = () => onClose(); window.addEventListener("keydown", k); window.addEventListener("mousedown", c); return () => { window.removeEventListener("keydown", k); window.removeEventListener("mousedown", c); }; }, [onClose]);
  const left = Math.min(at.x, window.innerWidth - 260), top = Math.min(at.y, window.innerHeight - 420);
  return <div className="ctx-menu" role="menu" style={{ left, top }} onMouseDown={e => e.stopPropagation()}>
    {count > 0 && <p className="ctx-head">{count === 1 ? "1 element" : `${count} elements`} <span className="muted">· shift-click adds more</span></p>}
    {count > 0 && GROUPS.map(g => <div key={g.title} className="ctx-group"><span className="ctx-title">{g.title}</span><div className="ctx-items">{g.items.map(i => <button key={i.op} type="button" disabled={count < i.min} title={count < i.min ? `select ${i.min} or more` : ""} onClick={() => { onArrange(i.op); onClose(); }}>{i.label}</button>)}</div></div>)}
    <div className="ctx-group ctx-actions">
      {count > 0 && <button type="button" onClick={() => { onAction("copy"); onClose(); }}>Copy <kbd>⌘C</kbd></button>}
      <button type="button" disabled={!canPaste} onClick={() => { onAction("paste"); onClose(); }}>Paste <kbd>⌘V</kbd></button>
      {count > 0 && <button type="button" onClick={() => { onAction("duplicate"); onClose(); }}>Duplicate <kbd>⌘D</kbd></button>}
      {count > 0 && <button type="button" className="danger" onClick={() => { onAction("delete"); onClose(); }}>Delete <kbd>⌫</kbd></button>}
    </div>
  </div>;
}

/** The same operations as buttons, for the side panel when several elements are selected. */
export function ArrangeButtons({ count, onArrange }: { count: number; onArrange: (op: ArrangeOp) => void }) {
  return <>{GROUPS.map(g => <div key={g.title}><h4>{g.title}</h4><div className="arr">{g.items.map(i => <button key={i.op} type="button" className="ghost" disabled={count < i.min} onClick={() => onArrange(i.op)}>{i.label}</button>)}</div></div>)}</>;
}
