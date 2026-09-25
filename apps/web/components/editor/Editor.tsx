"use client";
import { BrandMark } from "@/components/Brand";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createHistory, contentHash, validate, ABSENT } from "@mosaic/presentation-core";
import type { Doc, Command } from "@/lib/doc";
import { needsReload } from "@/lib/doc";
import { CANVAS } from "@/lib/player-chrome";
import { ContextMenu, ArrangeButtons, arrange, type ArrangeOp, type Rect } from "./Arrange";
import { SetupPanel, ChromePanel } from "./Setup";
import { PlayerBridge, type BridgeMessage } from "./bridge";
import { Inspector } from "./Inspector";
import { Filmstrip } from "./Filmstrip";
import { InlineToolbar, type Caret } from "./InlineToolbar";
import { locate } from "@/lib/doc";
import { Outline } from "./Outline";
import { AnimationPanel, CopyPanel, AssetsPanel } from "./Panels";
import { VersionsPanel, type VersionMeta } from "./Versions";
import { ImagesPanel } from "./Images";
import { StationTools, addBeat, removeStation, moveStation } from "./Structure";
import { ExportDialog, exportToSlides, type ExportReady } from "./Export";

type SaveState = { kind: "idle" } | { kind: "dirty" } | { kind: "saving" } | { kind: "saved"; at: string } | { kind: "error"; message: string; issues?: { path: string; message: string }[] };
type Tab = "element" | "images" | "motion" | "setup" | "copy" | "assets" | "versions";
/** The stage renders images from the served route; the stored document keeps storage:// paths. */
const forStage = (doc: Doc, slug: string): Doc => JSON.parse(JSON.stringify(doc).replace(/storage:\/\/images\/[0-9a-f-]{36}\//g, `/img/${slug}/`));

export function Editor({ id, title, role, email }: { id: string; title: string; role: "owner" | "editor" | "viewer"; email: string }) {
  const api = `/api/presentations/${id}`;
  const history = useRef(createHistory(null as Doc | null)).current;
  const [doc, setDoc] = useState<Doc | null>(null);
  const [hist, setHist] = useState({ undo: false, redo: false });
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [draftBasedOn, setDraftBasedOn] = useState<string | undefined>();
  const [station, setStation] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("element");
  const [preview, setPreview] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1");
  const [previewVersion, setPreviewVersion] = useState<VersionMeta | null>(null);
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [published, setPublished] = useState<{ versionId: string; publishedAt: string; name: string } | null>(null);
  const [playerKey, setPlayerKey] = useState(0);
  const [ready, setReady] = useState(false);
  const [notes, setNotes] = useState(false);
  const [pendingReload, setPendingReload] = useState(false);
  const [inline, setInline] = useState<{ id: string | null; item: number; copy?: string | null; caret: Caret; fontSize: number } | null>(null);
  const [fillTarget, setFillTarget] = useState<string | null>(null);   // an empty image box waiting for a picture
  const [name, setName] = useState(title); const [renaming, setRenaming] = useState(false);
  const rename = useCallback(async (v: string) => {
    setRenaming(false); const t = v.replace(/\s+/g, " ").trim(); if (!t || t === name) return;
    const r = await fetch(`${api}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: t }) });
    if (r.ok) { setName(t); document.title = `${t} · Mosaic`; } else setSave({ kind: "error", message: (await r.json()).error });
  }, [api, name]);
  const [shareOpen, setShareOpen] = useState(false); const [addr, setAddr] = useState(id); const [publishedLink, setPublishedLink] = useState<string | null>(null); const [publishing, setPublishing] = useState(false);
  const fileDrop = useRef<HTMLInputElement | null>(null);
  // the side panels fold away: by hand, or on their own when the window is narrow (a split screen, a small laptop)
  const [sides, setSides] = useState<{ left: boolean; right: boolean }>(() => { try { const v = JSON.parse(localStorage.getItem("itw.sides") || "null"); if (v) return v; } catch {} return { left: true, right: true }; });
  const [narrow, setNarrow] = useState(false);
  useEffect(() => { const on = () => setNarrow(window.innerWidth < 1180); on(); window.addEventListener("resize", on); return () => window.removeEventListener("resize", on); }, []);
  useEffect(() => { try { localStorage.setItem("itw.sides", JSON.stringify(sides)); } catch {} }, [sides]);
  const showLeft = sides.left && !narrow, showRight = sides.right && !narrow;
  const inlineRef = useRef(inline); inlineRef.current = inline;
  const [frameBox, setFrameBox] = useState<DOMRect | null>(null);
  const frame = useRef<HTMLIFrameElement | null>(null);
  // the deck is designed on a 1920×1080 canvas; the stage shows that exact frame scaled to fit, so what is designed is what is presented
  const stageFit = useRef<HTMLDivElement | null>(null); const canvas = useRef<HTMLDivElement | null>(null); const [scale, setScale] = useState(0.5); const scaleRef = useRef(0.5); scaleRef.current = scale;
  useEffect(() => {
    const fit = () => { const host = stageFit.current; if (!host) return; const full = !!document.fullscreenElement && document.fullscreenElement === canvas.current; const W = full ? window.innerWidth : host.clientWidth - 32, H = full ? window.innerHeight : host.clientHeight - 24; setScale(Math.max(0.05, Math.min(W / CANVAS.w, H / CANVAS.h))); };
    fit(); const ro = new ResizeObserver(fit); if (stageFit.current) ro.observe(stageFit.current); window.addEventListener("resize", fit); document.addEventListener("fullscreenchange", fit);
    return () => { ro.disconnect(); window.removeEventListener("resize", fit); document.removeEventListener("fullscreenchange", fit); };
  }, []);
  const saveTimer = useRef<number | null>(null);
  const docRef = useRef<Doc | null>(null); docRef.current = doc;

  /* ---- the player bridge ---- */
  const onMessage = useCallback((m: BridgeMessage) => {
    if (m.type === "itw:ready" || m.type === "itw:state") { setReady(true); if (m.type === "itw:state") { setStation(m.step); setNotes(!!m.notes); } }
    else if (m.type === "itw:station") setStation(m.index);
    else if (m.type === "itw:selected") { setSelected(m.id); setSelectedIds(m.ids || (m.id ? [m.id] : [])); if (m.rects) rectsRef.current = m.rects; if (m.id && m.pct) selPctRef.current = { id: m.id, ...m.pct }; if (m.id && m.user) { if (m.empty) { setFillTarget(m.id); setTab("images"); } else setTab("element"); } }
    else if (m.type === "itw:context") { if (m.rects) rectsRef.current = m.rects; const fb = frame.current?.getBoundingClientRect(); if (fb) setMenu({ x: fb.left + m.x * scaleRef.current, y: fb.top + m.y * scaleRef.current, ids: m.ids || [] }); }
    else if (m.type === "itw:movedGroup") movedGroupRef.current(m.moves || []);
    else if (m.type === "itw:copy") copyRef.current(m.ids || [m.id]);
    else if (m.type === "itw:paste") pasteRef.current();
    else if (m.type === "itw:duplicate") { copyRef.current(m.ids || [m.id]); pasteRef.current(); }
    else if (m.type === "itw:crop") cropRef.current(m.id, m.crop, !!m.done);
    else if (m.type === "itw:cropStart") setCropping(m.id);
    else if (m.type === "itw:cropEnd") setCropping(null);
    else if (m.type === "itw:placed") placedRef.current(m);
    else if (m.type === "itw:delete") removeManyRef.current(m.ids && m.ids.length ? m.ids : [m.id]);
    else if (m.type === "itw:copyMoved") copyMovedRef.current(m.path, m.dx, m.dy);
    else if (m.type === "itw:chromeMoved") chromeRef.current.move(m.name, m.dx, m.dy, false);
    else if (m.type === "itw:chromeNudge") chromeRef.current.move(m.name, m.dx, m.dy, true);
    else if (m.type === "itw:chromeScaled") chromeRef.current.scale(m.name, m.scale);
    else if (m.type === "itw:nudgeKey") nudgeManyRef.current(m.ids && m.ids.length ? m.ids : [m.id], m.dx, m.dy);
    else if (m.type === "itw:drop") dropRef.current(m);
    else if (m.type === "itw:editStart") { setInline({ id: m.id, item: m.item, copy: m.copy, caret: m.caret, fontSize: m.fontSize }); setFrameBox(frame.current?.getBoundingClientRect() ?? null); }
    else if (m.type === "itw:caret") { if (m.caret) setInline(s => (s ? { ...s, caret: m.caret } : s)); }
    else if (m.type === "itw:edited" || m.type === "itw:editDone") { if (m.copy) copyEditRef.current(m.copy, m.runs, m.text, m.type === "itw:edited"); else inlineEditRef.current(m.id, m.item, m.runs, m.type === "itw:edited"); if (m.type === "itw:editDone") setInline(null); else if (m.caret) setInline(s => (s ? { ...s, caret: m.caret, fontSize: m.fontSize } : s)); }
    else if (m.type === "itw:error") setSave({ kind: "error", message: m.message });
    else if (m.type === "itw:exportReady") exportReadyRef.current(m as unknown as ExportReady);
  }, []);
  const inlineEditRef = useRef<(id: string, item: number, runs: any[], typing: boolean) => void>(() => {});
  const copyEditRef = useRef<(path: string, runs: any[], text: string, typing: boolean) => void>(() => {});
  const placedRef = useRef<(m: BridgeMessage) => void>(() => {});
  const removeRef = useRef<(id: string) => void>(() => {});
  const copyRef = useRef<(ids: string[]) => void>(() => {}); const pasteRef = useRef<() => void>(() => {}); const cropRef = useRef<(id: string, crop: any, done: boolean) => void>(() => {});
  const selPctRef = useRef<{ id: string; x: number; y: number; w: number } | null>(null);
  const clipRef = useRef<{ element: any; pct: { x: number; y: number; w: number } | null }[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]); const selectedIdsRef = useRef(selectedIds); selectedIdsRef.current = selectedIds;
  const rectsRef = useRef<Record<string, Rect>>({}); const [menu, setMenu] = useState<{ x: number; y: number; ids: string[] } | null>(null);
  const removeManyRef = useRef<(ids: string[]) => void>(() => {}); const nudgeManyRef = useRef<(ids: string[], dx: number, dy: number) => void>(() => {});
  const movedGroupRef = useRef<(moves: { id: string; move: any }[]) => void>(() => {}); const arrangeRef = useRef<(op: ArrangeOp) => void>(() => {});
  const [cropping, setCropping] = useState<string | null>(null);
  const copyMovedRef = useRef<(path: string, dx: number, dy: number) => void>(() => {});
  const chromeRef = useRef<{ move: (name: string, dx: number, dy: number, delta: boolean) => void; scale: (name: string, v: number) => void }>({ move: () => {}, scale: () => {} });
  const nudgeRef = useRef<(id: string, dx: number, dy: number) => void>(() => {});
  const dropRef = useRef<(m: BridgeMessage) => void>(() => {});
  const exportReadyRef = useRef<(m: ExportReady) => void>(() => {});
  const [exportOpen, setExportOpen] = useState(false);
  const bridge = useMemo(() => new PlayerBridge(() => frame.current, onMessage), [onMessage]);
  // attach, and ask the frame for its state in case it is already running (a remount never reloads the frame)
  useEffect(() => { bridge.attach(); bridge.send({ type: "itw:state" }); return () => bridge.detach(); }, [bridge]);
  // when the deck is ready: present mode, edit mode unless previewing, the current draft, the station we were at
  useEffect(() => {
    if (!ready) return;
    bridge.send({ type: "itw:mode", present: true });
    bridge.send({ type: "itw:edit", on: !preview && !previewVersion });
    if (docRef.current && !previewVersion) bridge.send({ type: "itw:load", doc: forStage(docRef.current, id) });
    bridge.send({ type: "itw:goto", index: station });
    if (selected) bridge.send({ type: "itw:select", id: selected });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  useEffect(() => { if (ready) bridge.send({ type: "itw:edit", on: !preview && !previewVersion }); }, [preview, previewVersion, ready, bridge]);
  const reloadPlayer = useCallback(() => { setReady(false); setPendingReload(false); setPlayerKey(k => k + 1); }, []);

  /* ---- the draft ---- */
  const loadDraft = useCallback(async () => {
    const r = await fetch(`${api}/draft`, { cache: "no-store" }); const d = await r.json();
    if (!r.ok) { setSave({ kind: "error", message: d.error }); return; }
    history.reset(d.document); setDoc(d.document); setDraftBasedOn(d.basedOn); setHist({ undo: false, redo: false }); setSave({ kind: "saved", at: d.updatedAt });
  }, [api, history]);
  const loadVersions = useCallback(async () => {
    const [r, p] = await Promise.all([fetch(`${api}/versions`, { cache: "no-store" }), fetch(`${api}/publication`, { cache: "no-store" })]);
    if (r.ok) setVersions(await r.json()); if (p.ok) setPublished(await p.json());
  }, [api]);
  useEffect(() => { loadDraft(); loadVersions(); }, [loadDraft, loadVersions]);

  const persist = useCallback(async () => {
    const d = docRef.current; if (!d) return;
    setSave({ kind: "saving" });
    try {
      const r = await fetch(`${api}/draft`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ document: d }) });
      const body = await r.json();
      if (!r.ok) { setSave({ kind: "error", message: body.error, issues: body.issues }); return; }
      setSave({ kind: "saved", at: body.updatedAt }); setDraftBasedOn(body.basedOn);
      if (pendingReload) reloadPlayer();
    } catch (e: any) { setSave({ kind: "error", message: e.message }); }
  }, [api, pendingReload, reloadPlayer]);
  const scheduleSave = useCallback(() => { setSave({ kind: "dirty" }); if (saveTimer.current) window.clearTimeout(saveTimer.current); saveTimer.current = window.setTimeout(persist, 700); }, [persist]);

  const afterChange = useCallback((next: Doc, path?: Command["path"]) => {
    setDoc(next); setHist({ undo: history.canUndo, redo: history.canRedo }); scheduleSave();
    if (path && needsReload(path)) setPendingReload(true); else if (ready) bridge.send({ type: "itw:load", doc: forStage(next, id) });
  }, [history, scheduleSave, ready, bridge, id]);
  /** A structural change: the whole document as one undo step, then the stage moves to the station concerned. */
  const restructure = useCallback((next: Doc, label: string, goto?: number) => {
    const d = history.apply({ path: [], value: next, label }) as Doc; afterChange(d);
    if (goto !== undefined) setTimeout(() => bridge.send({ type: "itw:goto", index: goto }), 80);
  }, [history, afterChange, bridge]);
  const apply = useCallback((c: Command) => { const next = history.apply(c) as Doc; afterChange(next, c.path); if (c.value === ABSENT) { setSelected(null); bridge.send({ type: "itw:select", id: null }); } }, [history, afterChange, bridge]);
  // typing on the stage: into history (coalesced) and autosave, but not sent back while the line is open
  inlineEditRef.current = (id, item, runs, typing) => {
    const d = docRef.current; if (!d) return; const hit = locate(d, id); if (!hit) return;
    const path = item >= 0 ? ["sections", hit.si, "elements", hit.ei, "items", item, "runs"] : ["sections", hit.si, "elements", hit.ei, "runs"];
    const current = item >= 0 ? hit.element.items?.[item]?.runs : hit.element.runs;
    if (JSON.stringify(current) === JSON.stringify(runs)) { if (!typing && ready) bridge.send({ type: "itw:load", doc: forStage(d, id) }); return; }   // closing a line unchanged is not a step
    const next = history.apply({ path, value: runs, label: `copy of ${id}`, coalesce: `${id}.${item}` }) as Doc;
    setDoc(next); setHist({ undo: history.canUndo, redo: history.canRedo }); scheduleSave();
    if (!typing && ready) bridge.send({ type: "itw:load", doc: forStage(next, id) });
  };
  // the renderer's own copy, typed on the stage: strings or runs under copy.*; the stage reloads once the line closes
  copyEditRef.current = (path, runs, text, typing) => {
    const d = docRef.current; if (!d) return; const keys = path.split(".").map(k => (/^\d+$/.test(k) ? Number(k) : k));
    const current = keys.reduce((o: any, k) => (o ? o[k] : undefined), d.copy);
    const value = Array.isArray(current) ? runs : text;
    if (JSON.stringify(current) === JSON.stringify(value)) return;
    const next = history.apply({ path: ["copy", ...keys], value, label: `copy ${path}`, coalesce: `copy.${path}` }) as Doc;
    setDoc(next); setHist({ undo: history.canUndo, redo: history.canRedo }); scheduleSave(); setPendingReload(true);
  };
  /** The renderer's own copy dragged on the stage: its offset lives in the document under its path (none = back where the renderer put it). */
  copyMovedRef.current = (path, dx, dy) => {
    const d = docRef.current; if (!d) return;
    apply({ path: ["offsets", path], value: Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05 ? undefined : { dx, dy }, label: `move ${path}` });
  };
  /** Copy: the element as it is, with where it sits on the stage; paste: a free copy of it on the current station, a step to the side. */
  /** A whole-document change as one undo step (several elements moved, aligned, removed or pasted together). */
  const applyDoc = useCallback((next: Doc, label: string) => { const d = history.apply({ path: [], value: next, label }) as Doc; afterChange(d); }, [history, afterChange]);
  const clone = (v: any) => JSON.parse(JSON.stringify(v));
  copyRef.current = (ids) => {
    const d = docRef.current; if (!d) return;
    const items = ids.map(id => { const hit = locate(d, id); if (!hit) return null; const r = rectsRef.current[id]; return { element: clone(hit.element), pct: r ? { x: r.x, y: r.y, w: r.w } : null }; }).filter(Boolean) as { element: any; pct: any }[];
    if (items.length) clipRef.current = items;
  };
  pasteRef.current = () => {
    const d = docRef.current, clip = clipRef.current; if (!d || !clip || !clip.length) return;
    const st = d.stations[stationRef.current]; const si = d.sections.findIndex(s => s.key === st.section); if (si < 0) { setSave({ kind: "error", message: "this station has no section to hold a box" }); return; }
    const next = clone(d) as Doc; const sec = next.sections[si]; const made: string[] = []; const again: { element: any; pct: any }[] = [];
    for (const c of clip) {
      let n = sec.elements.length + 1; while (sec.elements.some(e => e.id === `${sec.key}.${n}`)) n++;
      const src = c.element; const { id: _id, in: _in, nudge: _n, hidden: _h, ...rest } = src;
      const at = src.place ? { x: src.place.x + 2, y: src.place.y + 2, w: src.place.w } : c.pct ? { x: c.pct.x + 2, y: c.pct.y + 2, w: Math.max(4, c.pct.w) } : { x: 32, y: 32, w: 36 };
      const el = { ...rest, id: `${sec.key}.${n}`, place: { x: +Math.min(96, at.x).toFixed(2), y: +Math.min(96, at.y).toFixed(2), w: +at.w.toFixed(2) }, reveal: { p: st.p } };
      sec.elements.push(el); made.push(el.id); again.push({ element: clone(el), pct: null });
    }
    applyDoc(next, made.length === 1 ? `paste ${clip[0].element.id}` : `paste ${made.length} elements`);
    clipRef.current = again;   /* another paste lands a step further */
    setSelected(made[made.length - 1]); setSelectedIds(made); setTimeout(() => bridge.send(made.length === 1 ? { type: "itw:select", id: made[0] } : { type: "itw:selectMany", ids: made }), 150); setTab("element");
  };
  /** Several elements dragged together: their new places in one step. */
  movedGroupRef.current = (moves) => {
    const d = docRef.current; if (!d) return; const next = clone(d) as Doc;
    for (const m of moves) { const hit = locate(next, m.id); if (!hit) continue; const e = hit.element as any; if (m.move.place) e.place = m.move.place; else if (m.move.nudge) { if (m.move.nudge.dx === 0 && m.move.nudge.dy === 0) delete e.nudge; else e.nudge = m.move.nudge; } }
    applyDoc(next, `move ${moves.length} elements`); setTimeout(() => bridge.send({ type: "itw:selectMany", ids: moves.map(m => m.id) }), 150);
  };
  removeManyRef.current = (ids) => {
    const d = docRef.current; if (!d) return; const next = clone(d) as Doc; let n = 0;
    for (const id of ids) { const hit = locate(next, id); if (!hit) continue; next.sections[hit.si].elements.splice(hit.ei, 1); n++; }
    if (!n) return; applyDoc(next, n === 1 ? `remove ${ids[0]}` : `remove ${n} elements`); setSelected(null); setSelectedIds([]); bridge.send({ type: "itw:select", id: null });
  };
  nudgeManyRef.current = (ids, dx, dy) => {
    const d = docRef.current; if (!d) return; const next = clone(d) as Doc;
    for (const id of ids) { const hit = locate(next, id); if (!hit) continue; const e = hit.element as any; if (e.place) { e.place.x = +(e.place.x + dx).toFixed(2); e.place.y = +(e.place.y + dy).toFixed(2); } else { const nd = { dx: +((e.nudge?.dx || 0) + dx).toFixed(2), dy: +((e.nudge?.dy || 0) + dy).toFixed(2) }; if (nd.dx === 0 && nd.dy === 0) delete e.nudge; else e.nudge = nd; } }
    applyDoc(next, `nudge ${ids.length === 1 ? ids[0] : ids.length + " elements"}`); setTimeout(() => bridge.send(ids.length === 1 ? { type: "itw:select", id: ids[0] } : { type: "itw:selectMany", ids }), 150);
  };
  /** Align, distribute, centre on the page, match sizes — on the selection's rectangles as the stage reports them; one step. */
  arrangeRef.current = (op) => {
    const d = docRef.current; const ids = selectedIdsRef.current; if (!d || !ids.length) return;
    const targets = arrange(op, ids, rectsRef.current); const next = clone(d) as Doc; const ref = locate(next, ids[0])?.element as any; let n = 0;
    for (const id of Object.keys(targets)) {
      const hit = locate(next, id); if (!hit) continue; const e = hit.element as any, r = rectsRef.current[id], t = targets[id]; if (!r) continue;
      const dx = t.x !== undefined ? t.x - r.x : 0, dy = t.y !== undefined ? t.y - r.y : 0;
      if (e.place) {
        if (dx || dy) { e.place.x = +(e.place.x + dx).toFixed(2); e.place.y = +(e.place.y + dy).toFixed(2); }
        if (t.w !== undefined && r.w) e.place.w = +(e.place.w * (t.w / r.w)).toFixed(2);
        if (t.h !== undefined && r.h) { if (e.frame && ref?.frame && op === "same-both") e.frame = { ...ref.frame }; else if (t.w === undefined) e.place.w = +(e.place.w * (t.h / r.h)).toFixed(2); }
      } else if (dx || dy) { const nd = { dx: +((e.nudge?.dx || 0) + dx).toFixed(2), dy: +((e.nudge?.dy || 0) + dy).toFixed(2) }; if (nd.dx === 0 && nd.dy === 0) delete e.nudge; else e.nudge = nd; }
      n++;
    }
    if (!n) return; applyDoc(next, `${op} ${ids.length} elements`); setTimeout(() => bridge.send({ type: "itw:selectMany", ids }), 150);
  };
  /** The crop a framed picture was given on the stage (drag to pan, wheel to zoom). The stage paints the session live; the
   *  document takes the result once, when the session closes — one undo step for the whole crop. */
  cropRef.current = (id, crop, done) => {
    if (!done) return;
    const d = docRef.current; if (!d) return; const hit = locate(d, id); if (!hit) return; const e = hit.element;
    apply({ path: ["sections", hit.si, "elements", hit.ei, "adjust"], value: { ...(e.adjust || {}), crop }, label: `crop ${id}` });
  };
  /** A header logo moved or resized on the stage: its offset under offsets["chrome.<name>"], its size under tokens.scale. */
  chromeRef.current = {
    move: (name, dx, dy, delta) => {
      const d = docRef.current; if (!d) return; const cur = (d as any).offsets?.[`chrome.${name}`] || { dx: 0, dy: 0 };
      const n = delta ? { dx: +(cur.dx + dx).toFixed(2), dy: +(cur.dy + dy).toFixed(2) } : { dx, dy };
      apply({ path: ["offsets", `chrome.${name}`], value: Math.abs(n.dx) < 0.05 && Math.abs(n.dy) < 0.05 ? undefined : n, label: `move ${name === "brand" ? "the Mosaic logo" : "the event mark"}`, coalesce: delta ? `chrome.${name}.key` : undefined });
    },
    scale: (name, v) => {
      const d = docRef.current; if (!d) return; const sc = { ...((d.tokens as any)?.scale || {}), [name]: v }; if (v === 1) delete sc[name];
      apply({ path: ["tokens", "scale"], value: Object.keys(sc).length ? sc : undefined, label: `${name === "brand" ? "Mosaic logo" : "event mark"} size` });
    }
  };
  /** Remove the selected element (the keynote's own lines are hidden rather than lost; undo brings anything back). */
  removeRef.current = (id) => {
    const d = docRef.current; if (!d) return; const hit = locate(d, id); if (!hit) return;
    apply({ path: ["sections", hit.si, "elements", hit.ei], value: ABSENT, label: `remove ${id}` });
  };
  nudgeRef.current = (id, dx, dy) => {
    const d = docRef.current; if (!d) return; const hit = locate(d, id); if (!hit) return; const base = ["sections", hit.si, "elements", hit.ei]; const e = hit.element;
    if (e.place) apply({ path: [...base, "place"], value: { ...e.place, x: +(e.place.x + dx).toFixed(2), y: +(e.place.y + dy).toFixed(2) }, label: `nudge ${id}`, coalesce: `${id}.key` });
    else { const n = { dx: +((e.nudge?.dx || 0) + dx).toFixed(2), dy: +((e.nudge?.dy || 0) + dy).toFixed(2) }; apply({ path: [...base, "nudge"], value: n.dx === 0 && n.dy === 0 ? undefined : n, label: `nudge ${id}`, coalesce: `${id}.key` }); }
  };
  // a move or a resize on the stage
  placedRef.current = (m) => {
    const d = docRef.current; if (!d) return; const hit = locate(d, m.id); if (!hit) return; const base = ["sections", hit.si, "elements", hit.ei];
    if (m.place) apply({ path: [...base, "place"], value: m.place, label: `move ${m.id}` });
    else if (m.nudge) apply({ path: [...base, "nudge"], value: Math.abs(m.nudge.dx) < 0.05 && Math.abs(m.nudge.dy) < 0.05 ? undefined : m.nudge, label: `move ${m.id}` });
    else if (m.width) apply({ path: [...base, "size"], value: { ...(hit.element.size || {}), width: m.width }, label: `resize ${m.id}` });
    else if (m.maxWidth) apply({ path: [...base, "style"], value: { ...(hit.element.style || {}), maxWidth: m.maxWidth }, label: `resize ${m.id}` });
  };
  /** Place an image asset: into a box (fill) or as a free picture at a point on the stage. */
  const placeImage = useCallback((asset: any, at?: { x: number; y: number }, box?: string | null) => {
    const d = docRef.current; if (!d) return;
    let next = d;
    if (!next.assets?.[asset.id]) { const { url: _u, createdAt: _c, id: _i, on: _o, ...rec } = asset; next = history.apply({ path: ["assets", asset.id], value: rec, label: `add image ${asset.name || asset.id}` }) as Doc; }
    if (box) { const hit = locate(next, box); if (hit) next = history.apply({ path: ["sections", hit.si, "elements", hit.ei, "asset"], value: asset.id, label: `fill ${box}` }) as Doc; }
    else {
      const st = next.stations[stationRef.current]; const si = next.sections.findIndex(s => s.key === st.section); if (si < 0) { setSave({ kind: "error", message: "this station has no section to hold an image" }); return; }
      const sec = next.sections[si]; let n = sec.elements.length + 1; while (sec.elements.some(e => e.id === `${sec.key}.${n}`)) n++;
      const w = 32, x = at ? Math.max(0, Math.min(100 - w, at.x - w / 2)) : 34, y = at ? Math.max(0, Math.min(90, at.y - 10)) : 30;
      next = history.apply({ path: ["sections", si, "elements", sec.elements.length], value: { id: `${sec.key}.${n}`, type: "image", asset: asset.id, alt: asset.name || "", place: { x, y, w }, reveal: { p: st.p } }, label: "place image" }) as Doc;
      setSelected(`${sec.key}.${n}`);
    }
    afterChange(next); setFillTarget(null); setTab("element");
  }, [history, afterChange]);
  const uploadFiles = useCallback(async (files: File[]): Promise<any[]> => {
    const out: any[] = [];
    for (const f of files) { const fd = new FormData(); fd.append("file", f); const r = await fetch(`${api}/images`, { method: "POST", body: fd }); const body = await r.json(); if (!r.ok) { setSave({ kind: "error", message: body.error || r.statusText }); continue; } out.push(body); }
    return out;
  }, [api]);
  dropRef.current = async (m) => {
    if (m.asset) { try { placeImage(JSON.parse(m.asset), { x: m.x, y: m.y }, m.box); } catch { /* not ours */ } return; }
    if (m.files && m.files.length) { const made = await uploadFiles(m.files.filter((f: File) => /^image\//.test(f.type))); made.forEach((a, i) => placeImage(a, { x: m.x + i * 3, y: m.y + i * 3 }, i === 0 ? m.box : null)); }
  };
  /** New boxes on the current station: a free text box, an empty image box. */
  const addBox = useCallback((kind: "text" | "imagebox") => {
    const d = docRef.current; if (!d) return; const st = d.stations[stationRef.current]; const si = d.sections.findIndex(s => s.key === st.section); if (si < 0) { setSave({ kind: "error", message: "this station has no section to hold a box" }); return; }
    const sec = d.sections[si]; let n = sec.elements.length + 1; while (sec.elements.some(e => e.id === `${sec.key}.${n}`)) n++;
    const id = `${sec.key}.${n}`;
    const el = kind === "text" ? { id, type: "text", role: ["lede"], runs: [{ t: "New text" }], place: { x: 30, y: 40, w: 40 }, reveal: { p: st.p } } : { id, type: "image", frame: { w: 16, h: 9 }, place: { x: 30, y: 30, w: 40 }, reveal: { p: st.p } };
    apply({ path: ["sections", si, "elements", sec.elements.length], value: el, label: kind === "text" ? "add text box" : "add image box" });
    setSelected(id); setTimeout(() => bridge.send({ type: "itw:select", id }), 120); if (kind === "imagebox") { setFillTarget(id); setTab("images"); } else setTab("element");
  }, [apply, bridge]);
  /** Present: the draft, fullscreen, from the current station. */
  const present = useCallback(() => { setPreview(true); const c = canvas.current; if (c && c.requestFullscreen) c.requestFullscreen().catch(() => {}); }, []);
  /** Publish in one step: a version named by the moment, published; the link to share. */
  const publishNow = useCallback(async () => {
    const d = docRef.current; if (!d || publishing) return; setPublishing(true);
    try {
      await persist();
      const name = `Published ${new Date().toLocaleString()}`;
      const v = await fetch(`${api}/versions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, document: d }) }); const vb = await v.json(); if (!v.ok) throw new Error(vb.error);
      const p = await fetch(`${api}/publication`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ versionId: vb.id }) }); const pb = await p.json(); if (!p.ok) throw new Error(pb.error);
      await loadVersions(); setPublishedLink(`${window.location.origin}/p/${id}`); setShareOpen(true);
    } catch (e: any) { setSave({ kind: "error", message: e.message }); } finally { setPublishing(false); }
  }, [api, id, persist, loadVersions, publishing]);
  /** A style change for the line being edited: into the document, and straight onto the element without a re-apply. */
  const inlineStyle = useCallback((patch: Record<string, string | undefined>) => {
    const d = docRef.current, s = inlineRef.current; if (!d || !s) return; const hit = locate(d, s.id); if (!hit) return;
    const style = { ...(hit.element.style || {}) }; for (const k of Object.keys(patch)) { const v = patch[k]; if (v === undefined) delete style[k]; else style[k] = v; }
    const value = Object.keys(style).length ? style : undefined;
    const next = history.apply({ path: ["sections", hit.si, "elements", hit.ei, "style"], value, label: `style of ${s.id}` }) as Doc;
    setDoc(next); setHist({ undo: history.canUndo, redo: history.canRedo }); scheduleSave();
    bridge.send({ type: "itw:style", id: s.id, style });
  }, [history, scheduleSave, bridge]);
  // undo and redo re-apply live unless the step they walk touched what the stage reads at start-up
  const undo = useCallback(() => { const e = history.peekUndo(); if (!e) return; afterChange(history.undo() as Doc, e.path); }, [history, afterChange]);
  const redo = useCallback(() => { const e = history.peekRedo(); if (!e) return; afterChange(history.redo() as Doc, e.path); }, [history, afterChange]);
  const stationRef = useRef(station); stationRef.current = station;
  const runExport = useCallback(async (from: number, to: number, textScale: number, onProgress: (done: number, total: number) => void) => {
    const back = stationRef.current; const fr = frame.current; if (!fr) throw new Error("the stage is not open");
    const ask = (index: number) => new Promise<ExportReady>((res, rej) => {
      let done = false; exportReadyRef.current = (m) => { done = true; res(m); };
      bridge.send({ type: "itw:export", index });
      setTimeout(() => { if (!done) rej(new Error(`the stage did not render station ${index + 1}`)); }, 30000);
    });
    try { return await exportToSlides({ frame: fr, bridge, ask, from, to, title: name, textScale, onProgress }); }
    finally { bridge.send({ type: "itw:exportDone" }); bridge.send({ type: "itw:goto", index: back }); }
  }, [bridge, name]);
  const selectedRef = useRef(selected); selectedRef.current = selected;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null; const inField = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && !inField && !inlineRef.current) {
        const k = e.key.toLowerCase(); const ids = selectedIdsRef.current.length ? selectedIdsRef.current : selectedRef.current ? [selectedRef.current] : [];
        if (k === "v" && clipRef.current) { e.preventDefault(); pasteRef.current(); return; }
        if (ids.length && (k === "c" || k === "d")) { e.preventDefault(); copyRef.current(ids); if (k === "d") pasteRef.current(); return; }
      }
      if (inField || mod) return;
      if (selectedRef.current && selectedRef.current.startsWith("chrome.") && !inlineRef.current) {
        const step = e.shiftKey ? 5 : 1; const name = selectedRef.current.slice(7);
        if (e.key === "Escape") { e.preventDefault(); setSelected(null); bridge.send({ type: "itw:select", id: null }); return; }
        if (e.key.startsWith("Arrow")) { e.preventDefault(); chromeRef.current.move(name, e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0, e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0, true); return; }
        if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); return; }   /* a logo is never removed; Put back returns it */
      }
      if (selectedRef.current && !inlineRef.current) {
        const step = e.shiftKey ? 5 : 1; const ids = selectedIdsRef.current.length ? selectedIdsRef.current : [selectedRef.current];
        if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeManyRef.current(ids); return; }
        if (e.key === "Escape") { e.preventDefault(); setSelected(null); setSelectedIds([]); bridge.send({ type: "itw:select", id: null }); return; }
        if (e.key.startsWith("Arrow")) { e.preventDefault(); nudgeManyRef.current(ids, e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0, e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0); return; }
      }
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); bridge.send({ type: "itw:goto", index: stationRef.current + 1 }); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); bridge.send({ type: "itw:goto", index: stationRef.current - 1 }); }
      else if (e.key === "Home") { e.preventDefault(); bridge.send({ type: "itw:goto", index: 0 }); }
      else if (e.key === "End") { e.preventDefault(); bridge.send({ type: "itw:goto", index: 9999 }); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, bridge]);
  useEffect(() => { const on = () => setFrameBox(frame.current?.getBoundingClientRect() ?? null); window.addEventListener("resize", on); return () => window.removeEventListener("resize", on); }, []);

  /* ---- versions ---- */
  const newVersion = async () => {
    const name = window.prompt("Name this version", `Version ${versions.length + 1}`); if (!name) return;
    const note = window.prompt("A note for it (optional)") || undefined;
    const r = await fetch(`${api}/versions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, note, document: docRef.current }) });
    const body = await r.json(); if (!r.ok) { setSave({ kind: "error", message: body.error, issues: body.issues }); return; }
    await loadVersions(); setTab("versions");
  };
  const duplicate = async (v: VersionMeta) => { const name = window.prompt("Name for the copy", `${v.name} (copy)`); if (!name) return; await fetch(`${api}/versions/${v.id}/duplicate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }); await loadVersions(); };
  const restore = async (v: VersionMeta) => {
    const r = await fetch(`${api}/versions/${v.id}/restore`, { method: "POST" }); if (!r.ok) { setSave({ kind: "error", message: (await r.json()).error }); return; }
    setPreviewVersion(null); await loadDraft(); reloadPlayer();
  };
  const previewVersionToggle = (v: VersionMeta | null) => { setPreviewVersion(v); setSelected(null); reloadPlayer(); };
  const publish = async (v: VersionMeta) => {
    if (!window.confirm(`Publish “${v.name}”? Everyone with access will see it at /p/${id}.`)) return;
    const r = await fetch(`${api}/publication`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ versionId: v.id }) });
    if (!r.ok) { setSave({ kind: "error", message: (await r.json()).error }); return; }
    await loadVersions();
  };

  const hash = useMemo(() => (doc ? contentHash(doc) : ""), [doc]);
  const issues = useMemo(() => (doc ? validate(doc).errors : []), [doc]);
  const playerSrc = `/player/${id}?source=${previewVersion ? `version:${previewVersion.id}` : "draft"}`;
  const inPreview = preview || !!previewVersion;

  useEffect(() => { const u = new URL(window.location.href); if (preview) u.searchParams.set("preview", "1"); else u.searchParams.delete("preview"); window.history.replaceState(null, "", u.toString()); }, [preview]);
  // unsaved changes: the browser asks before a close or a reload; a link out of the editor asks Save / Discard / Stay
  const dirty = save.kind === "dirty" || save.kind === "saving"; const dirtyRef = useRef(dirty); dirtyRef.current = dirty;
  const [leaving, setLeaving] = useState<string | null>(null);
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = ""; } }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, []);
  const onLeaveClick = (e: React.MouseEvent) => { const a = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null; if (!a || a.target === "_blank" || !dirtyRef.current) return; e.preventDefault(); setLeaving(a.getAttribute("href")); };

  return <div className={"editor" + (inPreview ? " preview" : "") + (!inPreview && !showLeft ? " no-left" : "") + (!inPreview && !showRight ? " no-right" : "")} onClickCapture={onLeaveClick}>
    {menu && !inPreview && <ContextMenu at={menu} count={menu.ids.length} canPaste={!!clipRef.current} onClose={() => setMenu(null)} onArrange={op => arrangeRef.current(op)} onAction={a => { if (a === "copy") copyRef.current(menu.ids); else if (a === "paste") pasteRef.current(); else if (a === "duplicate") { copyRef.current(menu.ids); pasteRef.current(); } else if (a === "delete") removeManyRef.current(menu.ids); }} />}
    {leaving && <div className="modal-back" role="dialog" aria-label="Unsaved changes"><div className="modal">
      <h3>Unsaved changes</h3><p className="muted">Save them before leaving, or discard them and go back to what was last saved.</p>
      <div className="actions"><button type="button" className="primary" onClick={async () => { await persist(); dirtyRef.current = false; window.location.href = leaving; }}>Save and leave</button><button type="button" className="ghost danger" onClick={() => { dirtyRef.current = false; window.location.href = leaving; }}>Discard and leave</button><button type="button" className="ghost" onClick={() => setLeaving(null)}>Stay</button></div>
    </div></div>}
    <header className="bar">
      <div className="left">{!inPreview && <button type="button" className={"ghost side-toggle" + (showLeft ? " on" : "")} title={narrow ? "the outline is folded away on a narrow window" : sides.left ? "hide the outline" : "show the outline"} onClick={() => setSides(s => ({ ...s, left: !s.left }))} disabled={narrow}>◧</button>}<BrandMark />{renaming
        ? <input className="field title-edit" defaultValue={name} autoFocus aria-label="Title" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); rename((e.target as HTMLInputElement).value); } if (e.key === "Escape") setRenaming(false); }} onBlur={e => rename(e.target.value)} />
        : <button type="button" className="title" title={role === "viewer" ? name : "Rename"} onClick={() => { if (role !== "viewer") setRenaming(true); }}>{name}</button>}</div>
      <div className="mid">
        {!inPreview && <>
          <button type="button" onClick={() => persist()} disabled={save.kind === "saving"} title="Save now (autosave is on)">Save</button>
          <button type="button" onClick={undo} disabled={!hist.undo} title="Undo (⌘Z)">Undo</button>
          <button type="button" onClick={redo} disabled={!hist.redo} title="Redo (⇧⌘Z)">Redo</button>
          <button type="button" className="ghost" onClick={() => setTab("versions")} title="Versions: preview, restore, duplicate">History{versions.length ? ` · ${versions.length}` : ""}</button>
          <span className={"save " + save.kind} aria-live="polite">{save.kind === "idle" ? "" : save.kind === "dirty" ? "Unsaved" : save.kind === "saving" ? "Saving…" : save.kind === "saved" ? `Saved ${new Date(save.at).toLocaleTimeString()}` : `Not saved: ${save.message}`}</span>
          {pendingReload && <button type="button" className="ghost" onClick={() => { if (save.kind === "saved") reloadPlayer(); else persist(); }}>Reload stage</button>}
          {cropping && <span className="save cropping-hint">Cropping · drag to move, scroll to zoom, Esc when done</span>}
        </>}
        {previewVersion && <span className="save">Previewing “{previewVersion.name}” — read only</span>}
      </div>
      <div className="right">
        {previewVersion
          ? <button type="button" onClick={() => previewVersionToggle(null)}>Back to draft</button>
          : preview ? <button type="button" onClick={() => setPreview(false)}>Back to editor</button> : <button type="button" onClick={present} title="The draft, fullscreen, from this station">Present</button>}
        {!inPreview && role === "owner" && <button type="button" className="ghost" onClick={() => setShareOpen(s => !s)}>Share</button>}
        {!inPreview && <button type="button" className="ghost" onClick={() => { setExportOpen(s => !s); setShareOpen(false); }} disabled={!doc || !ready} title="A .pptx file for Google Slides">Export</button>}
        {!inPreview && <button type="button" className={"ghost side-toggle" + (showRight ? " on" : "")} title={narrow ? "the panel is folded away on a narrow window" : sides.right ? "hide the panel" : "show the panel"} onClick={() => setSides(s => ({ ...s, right: !s.right }))} disabled={narrow}>◨</button>}
        {!inPreview && <button type="button" className={role === "owner" ? "" : "primary"} onClick={newVersion} disabled={!doc} title="Name the current state as a version, without publishing">New version</button>}
        {!inPreview && role === "owner" && <button type="button" className="primary" onClick={publishNow} disabled={!doc || publishing}>{publishing ? "Publishing…" : "Publish"}</button>}
      </div>
      {exportOpen && !inPreview && doc && <ExportDialog total={doc.stations.length} title={name} onClose={() => setExportOpen(false)} run={runExport} />}
      {shareOpen && !inPreview && <div className="share" role="dialog" aria-label="Share">
        <header><strong>Share</strong><button type="button" className="ghost" onClick={() => setShareOpen(false)}>×</button></header>
        <p>The link:<br /><code>{typeof window !== "undefined" ? window.location.origin : ""}/p/{id}</code> <button type="button" className="ghost" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/p/${id}`)}>Copy link</button></p>
        <p className="muted small">People with access see the current document — what this editor shows. {published ? <>Anyone else on the internet sees the published version: <strong>{published.name}</strong>.</> : <>Nobody else can open it until you <strong>Publish</strong>; then anyone with the link sees that version.</>}</p>
        {role === "owner" && <div className="address"><span className="lab">Address</span>
          <input className="field" value={addr} onChange={e => setAddr(e.target.value.toLowerCase())} spellCheck={false} />
          <button type="button" className="ghost" onClick={() => setAddr(name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60))}>Use the name</button>
          <button type="button" disabled={addr === id || !addr} onClick={async () => { if (!window.confirm(`Change the address to /p/${addr}? Links already shared to /p/${id} stop working.`)) return; const r = await fetch(`${api}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: addr }) }); const b = await r.json().catch(() => ({})); if (r.ok) window.location.href = `/presentations/${b.slug}/edit`; else setSave({ kind: "error", message: b.error || r.statusText }); }}>Change</button>
        </div>}
        {publishedLink && <p className="muted small">Just published.</p>}
        <p className="muted">Who has access — roles and invitations — is on the <a href={`/presentations/${id}/people`}>People</a> page.</p>
      </div>}
    </header>

    {!inPreview && showLeft && doc && <aside className="side left"><Outline doc={doc} station={station} onGoto={i => bridge.send({ type: "itw:goto", index: i })} apply={apply} /></aside>}

    <main className="stage">
      <div className="stage-fit" ref={stageFit}>
        <div className="canvas" ref={canvas} data-scale={scale.toFixed(4)} style={{ width: CANVAS.w * scale, height: CANVAS.h * scale }}>
          <iframe key={playerKey} ref={frame} src={playerSrc} title="The presentation" allow="fullscreen" allowFullScreen style={{ width: CANVAS.w, height: CANVAS.h, transform: `scale(${scale})` }} onLoad={() => { bridge.send({ type: "itw:state" }); setFrameBox(frame.current?.getBoundingClientRect() ?? null); }} />
        </div>
      </div>
      {!ready && <div className="loading">Loading the stage…</div>}
      <div className={"preview-nav" + (inPreview ? "" : " always")}><button type="button" aria-label="previous station" onClick={() => bridge.send({ type: "itw:goto", index: station - 1 })}>‹</button><span>{String(station + 1).padStart(2, "0")} / {doc?.stations.length ?? "—"}</span><button type="button" aria-label="next station" onClick={() => bridge.send({ type: "itw:goto", index: station + 1 })}>›</button></div>
      {!inPreview && doc && <Filmstrip doc={doc} station={station} onGoto={i => bridge.send({ type: "itw:goto", index: i })} tools={<StationTools doc={doc} station={station} onAddBox={addBox} onAddImage={() => { fileDrop.current?.click(); }}
        onAdd={t => { const r = addBeat(doc, t, station); restructure(r.doc, `add ${t}`, r.station); }}
        onRemove={() => restructure(removeStation(doc, station), `remove station ${station + 1}`, Math.max(0, station - 1))}
        onMove={dir => { const r = moveStation(doc, station, dir); if (r) restructure(r.doc, "move station", r.station); }} />} />}
      {inline && frameBox && doc && !inPreview && <InlineToolbar caret={inline.caret} frameBox={frameBox} scale={scale} element={inline.id ? locate(doc, inline.id)?.element ?? null : null} fontSize={inline.fontSize} onMark={m => bridge.send({ type: "itw:format", mark: m })} onStyle={inlineStyle} onDone={() => bridge.send({ type: "itw:endEdit" })} copy={!!inline.copy} />}
    </main>

    {!inPreview && showRight && doc && <aside className="side right">
      <nav className="tabs">{(["element", "images", "motion", "setup", "versions"] as Tab[]).map(t => <button key={t} type="button" className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t === "element" ? "Element" : t === "images" ? "Images" : t === "motion" ? "Motion" : t === "setup" ? "Setup" : t === "copy" ? "Renderer copy" : t === "assets" ? "Marks" : `Versions${versions.length ? ` · ${versions.length}` : ""}`}</button>)}</nav>
      {issues.length > 0 && <div className="issues">{issues.slice(0, 5).map((i, k) => <div key={k}><code>{i.path}</code> {i.message}</div>)}</div>}
      {tab === "element" && selectedIds.length > 1 && <div className="panel multi"><header className="ph"><span className="kind">{selectedIds.length} elements</span><button type="button" className="ghost danger" onClick={() => removeManyRef.current(selectedIds)}>Remove</button><button type="button" className="ghost" onClick={() => { setSelected(null); setSelectedIds([]); bridge.send({ type: "itw:select", id: null }); }}>Deselect</button></header><p className="muted small">Shift-click adds to the selection; drag moves them together; right-click for the same menu.</p><ArrangeButtons count={selectedIds.length} onArrange={op => arrangeRef.current(op)} /></div>}
      {tab === "element" && selected && selected.startsWith("chrome.") && <ChromePanel name={selected.slice(7) as "brand" | "partner"} doc={doc} apply={apply} onDeselect={() => { setSelected(null); bridge.send({ type: "itw:select", id: null }); }} />}
      {tab === "element" && selectedIds.length <= 1 && !(selected && selected.startsWith("chrome.")) && <Inspector doc={doc} slug={id} selectedId={selected} apply={apply} onDeselect={() => { setSelected(null); bridge.send({ type: "itw:select", id: null }); }} onFill={eid => { setFillTarget(eid); setTab("images"); }} onRemove={eid => removeRef.current(eid)} />}
      {tab === "images" && <ImagesPanel doc={doc} slug={id} station={station} apply={apply} fillTarget={fillTarget} onPick={a => placeImage(a, undefined, fillTarget)} onPlaced={pid => { setSelected(pid); setTab("element"); setTimeout(() => bridge.send({ type: "itw:select", id: pid }), 150); }} />}
      <input type="file" accept="image/*" multiple hidden ref={fileDrop} onChange={async e => { const files = Array.from(e.target.files || []); e.target.value = ""; const made = await uploadFiles(files); made.forEach((a, i) => placeImage(a, { x: 34 + i * 3, y: 30 + i * 3 }, i === 0 ? fillTarget : null)); }} />
      {tab === "motion" && <AnimationPanel doc={doc} apply={apply} />}
      {tab === "setup" && <SetupPanel doc={doc} slug={id} apply={apply} />}
      {tab === "copy" && <CopyPanel doc={doc} apply={apply} />}
      {tab === "assets" && <AssetsPanel doc={doc} apply={apply} presentationId={id} />}
      {tab === "versions" && <VersionsPanel versions={versions} currentHash={hash} draftBasedOn={draftBasedOn} previewing={null} onPreview={previewVersionToggle} onDuplicate={duplicate} onRestore={restore} published={published} onPublish={role === "owner" ? publish : undefined} onReset={async () => { if (!window.confirm("Reset the draft to the committed document? Versions are kept; the current draft is replaced.")) return; const r = await fetch(`${api}/draft/reset`, { method: "POST" }); if (!r.ok) { setSave({ kind: "error", message: (await r.json()).error }); return; } await loadDraft(); reloadPlayer(); }} />}
    </aside>}
  </div>;
}
