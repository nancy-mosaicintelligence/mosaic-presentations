"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createHistory, contentHash, validate, ABSENT } from "@mosaic/presentation-core";
import type { Doc, Command } from "@/lib/doc";
import { needsReload } from "@/lib/doc";
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

type SaveState = { kind: "idle" } | { kind: "dirty" } | { kind: "saving" } | { kind: "saved"; at: string } | { kind: "error"; message: string; issues?: { path: string; message: string }[] };
type Tab = "element" | "images" | "motion" | "copy" | "assets" | "versions";
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
  const [shareOpen, setShareOpen] = useState(false); const [publishedLink, setPublishedLink] = useState<string | null>(null); const [publishing, setPublishing] = useState(false);
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
  const saveTimer = useRef<number | null>(null);
  const docRef = useRef<Doc | null>(null); docRef.current = doc;

  /* ---- the player bridge ---- */
  const onMessage = useCallback((m: BridgeMessage) => {
    if (m.type === "itw:ready" || m.type === "itw:state") { setReady(true); if (m.type === "itw:state") { setStation(m.step); setNotes(!!m.notes); } }
    else if (m.type === "itw:station") setStation(m.index);
    else if (m.type === "itw:selected") { setSelected(m.id); if (m.id && m.user) { if (m.empty) { setFillTarget(m.id); setTab("images"); } else setTab("element"); } }
    else if (m.type === "itw:placed") placedRef.current(m);
    else if (m.type === "itw:drop") dropRef.current(m);
    else if (m.type === "itw:editStart") { setInline({ id: m.id, item: m.item, copy: m.copy, caret: m.caret, fontSize: m.fontSize }); setFrameBox(frame.current?.getBoundingClientRect() ?? null); }
    else if (m.type === "itw:caret") { if (m.caret) setInline(s => (s ? { ...s, caret: m.caret } : s)); }
    else if (m.type === "itw:edited" || m.type === "itw:editDone") { if (m.copy) copyEditRef.current(m.copy, m.runs, m.text, m.type === "itw:edited"); else inlineEditRef.current(m.id, m.item, m.runs, m.type === "itw:edited"); if (m.type === "itw:editDone") setInline(null); else if (m.caret) setInline(s => (s ? { ...s, caret: m.caret, fontSize: m.fontSize } : s)); }
    else if (m.type === "itw:error") setSave({ kind: "error", message: m.message });
  }, []);
  const inlineEditRef = useRef<(id: string, item: number, runs: any[], typing: boolean) => void>(() => {});
  const copyEditRef = useRef<(path: string, runs: any[], text: string, typing: boolean) => void>(() => {});
  const placedRef = useRef<(m: BridgeMessage) => void>(() => {});
  const dropRef = useRef<(m: BridgeMessage) => void>(() => {});
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
    if (!next.assets?.[asset.id]) { const { url: _u, createdAt: _c, id: _i, ...rec } = asset; next = history.apply({ path: ["assets", asset.id], value: rec, label: `add image ${asset.name || asset.id}` }) as Doc; }
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
  const present = useCallback(() => { setPreview(true); const f = frame.current; if (f && f.requestFullscreen) f.requestFullscreen().catch(() => {}); }, []);
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null; const inField = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (inField || mod) return;
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

  return <div className={"editor" + (inPreview ? " preview" : "") + (!inPreview && !showLeft ? " no-left" : "") + (!inPreview && !showRight ? " no-right" : "")}>
    <header className="bar">
      <div className="left">{!inPreview && <button type="button" className={"ghost side-toggle" + (showLeft ? " on" : "")} title={narrow ? "the outline is folded away on a narrow window" : sides.left ? "hide the outline" : "show the outline"} onClick={() => setSides(s => ({ ...s, left: !s.left }))} disabled={narrow}>◧</button>}<a className="brand" href="/" title="Library">Mosaic</a><span className="title">{title}</span></div>
      <div className="mid">
        {!inPreview && <>
          <button type="button" onClick={() => persist()} disabled={save.kind === "saving"} title="Save now (autosave is on)">Save</button>
          <button type="button" onClick={undo} disabled={!hist.undo} title="Undo (⌘Z)">Undo</button>
          <button type="button" onClick={redo} disabled={!hist.redo} title="Redo (⇧⌘Z)">Redo</button>
          <button type="button" className="ghost" onClick={() => setTab("versions")} title="Versions: preview, restore, duplicate">History{versions.length ? ` · ${versions.length}` : ""}</button>
          <span className={"save " + save.kind} aria-live="polite">{save.kind === "idle" ? "" : save.kind === "dirty" ? "Unsaved" : save.kind === "saving" ? "Saving…" : save.kind === "saved" ? `Saved ${new Date(save.at).toLocaleTimeString()}` : `Not saved: ${save.message}`}</span>
          {pendingReload && <button type="button" className="ghost" onClick={() => { if (save.kind === "saved") reloadPlayer(); else persist(); }}>Reload stage</button>}
        </>}
        {previewVersion && <span className="save">Previewing “{previewVersion.name}” — read only</span>}
      </div>
      <div className="right">
        {!inPreview && <form method="post" action="/auth/sign-out" className="inline"><button type="submit" className="ghost" title={email}>Sign out</button></form>}
        <button type="button" className="ghost" onClick={() => { bridge.send({ type: "itw:notes", on: !notes }); setNotes(n => !n); }}>{notes ? "Hide notes" : "Notes"}</button>
        {previewVersion
          ? <button type="button" onClick={() => previewVersionToggle(null)}>Back to draft</button>
          : preview ? <button type="button" onClick={() => setPreview(false)}>Back to editor</button> : <button type="button" onClick={present} title="The draft, fullscreen, from this station">Present</button>}
        {!inPreview && role === "owner" && <button type="button" className="ghost" onClick={() => setShareOpen(s => !s)}>Share</button>}
        {!inPreview && <button type="button" className={"ghost side-toggle" + (showRight ? " on" : "")} title={narrow ? "the panel is folded away on a narrow window" : sides.right ? "hide the panel" : "show the panel"} onClick={() => setSides(s => ({ ...s, right: !s.right }))} disabled={narrow}>◨</button>}
        {!inPreview && <button type="button" className={role === "owner" ? "" : "primary"} onClick={newVersion} disabled={!doc} title="Name the current state as a version, without publishing">New version</button>}
        {!inPreview && role === "owner" && <button type="button" className="primary" onClick={publishNow} disabled={!doc || publishing}>{publishing ? "Publishing…" : "Publish"}</button>}
      </div>
      {shareOpen && !inPreview && <div className="share" role="dialog" aria-label="Share">
        <header><strong>Share</strong><button type="button" className="ghost" onClick={() => setShareOpen(false)}>×</button></header>
        {published ? <p>Published: <strong>{published.name}</strong>. Everyone with access sees it at<br /><code>{typeof window !== "undefined" ? window.location.origin : ""}/p/{id}</code> <button type="button" className="ghost" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/p/${id}`)}>Copy link</button></p> : <p className="muted">Nothing is published yet. Publish makes the current draft the presentation everyone with access sees.</p>}
        {publishedLink && <p className="muted small">Just published.</p>}
        <p className="muted">Who has access — roles and invitations — is on the <a href={`/presentations/${id}/people`}>People</a> page.</p>
      </div>}
    </header>

    {!inPreview && showLeft && doc && <aside className="side left"><Outline doc={doc} station={station} onGoto={i => bridge.send({ type: "itw:goto", index: i })} apply={apply} /></aside>}

    <main className="stage">
      <div className="stage-fit">
        <iframe key={playerKey} ref={frame} src={playerSrc} title="The presentation" allow="fullscreen" allowFullScreen onLoad={() => bridge.send({ type: "itw:state" })} />
      </div>
      {!ready && <div className="loading">Loading the stage…</div>}
      <div className={"preview-nav" + (inPreview ? "" : " always")}><button type="button" aria-label="previous station" onClick={() => bridge.send({ type: "itw:goto", index: station - 1 })}>‹</button><span>{String(station + 1).padStart(2, "0")} / {doc?.stations.length ?? "—"}</span><button type="button" aria-label="next station" onClick={() => bridge.send({ type: "itw:goto", index: station + 1 })}>›</button></div>
      {!inPreview && doc && <Filmstrip doc={doc} station={station} onGoto={i => bridge.send({ type: "itw:goto", index: i })} tools={<StationTools doc={doc} station={station} onAddBox={addBox} onAddImage={() => { fileDrop.current?.click(); }}
        onAdd={t => { const r = addBeat(doc, t, station); restructure(r.doc, `add ${t}`, r.station); }}
        onRemove={() => restructure(removeStation(doc, station), `remove station ${station + 1}`, Math.max(0, station - 1))}
        onMove={dir => { const r = moveStation(doc, station, dir); if (r) restructure(r.doc, "move station", r.station); }} />} />}
      {inline && frameBox && doc && !inPreview && <InlineToolbar caret={inline.caret} frameBox={frameBox} element={inline.id ? locate(doc, inline.id)?.element ?? null : null} fontSize={inline.fontSize} onMark={m => bridge.send({ type: "itw:format", mark: m })} onStyle={inlineStyle} onDone={() => bridge.send({ type: "itw:endEdit" })} copy={!!inline.copy} />}
    </main>

    {!inPreview && showRight && doc && <aside className="side right">
      <nav className="tabs">{(["element", "images", "motion", "copy", "assets", "versions"] as Tab[]).map(t => <button key={t} type="button" className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t === "element" ? "Element" : t === "images" ? "Images" : t === "motion" ? "Motion" : t === "copy" ? "Renderer copy" : t === "assets" ? "Marks" : `Versions${versions.length ? ` · ${versions.length}` : ""}`}</button>)}</nav>
      {issues.length > 0 && <div className="issues">{issues.slice(0, 5).map((i, k) => <div key={k}><code>{i.path}</code> {i.message}</div>)}</div>}
      {tab === "element" && <Inspector doc={doc} slug={id} selectedId={selected} apply={apply} onDeselect={() => { setSelected(null); bridge.send({ type: "itw:select", id: null }); }} onFill={eid => { setFillTarget(eid); setTab("images"); }} />}
      {tab === "images" && <ImagesPanel doc={doc} slug={id} station={station} apply={apply} fillTarget={fillTarget} onPick={a => placeImage(a, undefined, fillTarget)} onPlaced={pid => { setSelected(pid); setTab("element"); setTimeout(() => bridge.send({ type: "itw:select", id: pid }), 150); }} />}
      <input type="file" accept="image/*" multiple hidden ref={fileDrop} onChange={async e => { const files = Array.from(e.target.files || []); e.target.value = ""; const made = await uploadFiles(files); made.forEach((a, i) => placeImage(a, { x: 34 + i * 3, y: 30 + i * 3 }, i === 0 ? fillTarget : null)); }} />
      {tab === "motion" && <AnimationPanel doc={doc} apply={apply} />}
      {tab === "copy" && <CopyPanel doc={doc} apply={apply} />}
      {tab === "assets" && <AssetsPanel doc={doc} apply={apply} presentationId={id} />}
      {tab === "versions" && <VersionsPanel versions={versions} currentHash={hash} draftBasedOn={draftBasedOn} previewing={null} onPreview={previewVersionToggle} onDuplicate={duplicate} onRestore={restore} published={published} onPublish={role === "owner" ? publish : undefined} />}
    </aside>}
  </div>;
}
