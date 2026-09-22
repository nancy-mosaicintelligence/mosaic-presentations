"use client";
import { MARKS } from "@mosaic/presentation-core";
import type { Element } from "@/lib/doc";

export type Caret = { x: number; y: number; w: number; h: number; ex: number; ey: number; ew: number; eh: number };
const MARK_LABEL: Record<string, string> = { em: "em", strong: "B", i: "I", hl: "hl", lead: "lead", x2: "×2" };

/** Floats above the line being edited: marks for the selection, size, alignment and colour for the element. */
export function InlineToolbar({ caret, frameBox, element, fontSize, onMark, onStyle, onDone, copy }: { caret: Caret; frameBox: DOMRect; element: Element | null; fontSize: number; onMark: (m: string) => void; onStyle: (patch: Record<string, string | undefined>) => void; onDone: () => void; copy?: boolean }) {
  const left = Math.max(8, Math.min(frameBox.width - 420, caret.ex + caret.ew / 2 - 210)) + frameBox.left;
  const top = frameBox.top + caret.ey - 52;
  const style = element?.style || {};
  const size = style.fontSize && /^\d+(\.\d+)?px$/.test(style.fontSize) ? parseFloat(style.fontSize) : fontSize;
  const setSize = (px: number) => onStyle({ fontSize: Math.max(10, Math.min(200, Math.round(px))) + "px" });
  if (copy) return <div className="inline-toolbar" style={{ left, top: Math.max(frameBox.top + 8, top) }} onMouseDown={e => e.preventDefault()}>
    <span className="size muted">Renderer copy — the stage reloads when you finish</span><span className="sep" /><button type="button" className="done" onClick={onDone}>Done</button>
  </div>;
  return <div className="inline-toolbar" style={{ left, top: Math.max(frameBox.top + 8, top) }} onMouseDown={e => e.preventDefault()}>
    {MARKS.map((m: string) => <button key={m} type="button" className={"mk " + m} title={m} onClick={() => onMark(m)}>{MARK_LABEL[m] || m}</button>)}
    <span className="sep" />
    <button type="button" title="smaller" onClick={() => setSize(size - 2)}>−</button>
    <span className="size">{Math.round(size)}</span>
    <button type="button" title="larger" onClick={() => setSize(size + 2)}>+</button>
    <button type="button" className="ghost" title="use the role's size" onClick={() => onStyle({ fontSize: undefined })}>auto</button>
    <span className="sep" />
    {(["left", "center", "right"] as const).map(a => <button key={a} type="button" className={style.textAlign === a ? "on" : ""} title={a} onClick={() => onStyle({ textAlign: style.textAlign === a ? undefined : a })}>{a === "left" ? "⇤" : a === "center" ? "☰" : "⇥"}</button>)}
    <span className="sep" />
    <label className="colour" title="colour"><input type="color" value={/^#[0-9a-f]{6}$/i.test(style.color || "") ? style.color : "#e8e5e1"} onChange={e => onStyle({ color: e.target.value })} /><span style={{ background: style.color || "currentColor" }} /></label>
    <button type="button" className="ghost" title="inherit" onClick={() => onStyle({ color: undefined })}>×</button>
    <span className="sep" />
    <button type="button" className="done" onClick={onDone}>Done</button>
  </div>;
}
