"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createHistory, contentHash, validate } from "@mosaic/presentation-core";
import type { Doc, Command } from "@/lib/doc";
import { needsReload } from "@/lib/doc";
import { PlayerBridge, type BridgeMessage } from "./bridge";
import { Inspector } from "./Inspector";
import { Outline } from "./Outline";
import { AnimationPanel, CopyPanel, AssetsPanel } from "./Panels";
import { VersionsPanel, type VersionMeta } from "./Versions";

type SaveState = { kind: "idle" } | { kind: "dirty" } | { kind: "saving" } | { kind: "saved"; at: string } | { kind: "error"; message: string; issues?: { path: string; message: string }[] };
type Tab = "element" | "motion" | "copy" | "assets" | "versions";

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
  const frame = useRef<HTMLIFrameElement | null>(null);
  const saveTimer = useRef<number | null>(null);
  const docRef = useRef<Doc | null>(null); docRef.current = doc;

  /* ---- the player bridge ---- */
  const onMessage = useCallback((m: BridgeMessage) => {
    if (m.type === "itw:ready" || m.type === "itw:state") { setReady(true); if (m.type === "itw:state") { setStation(m.step); setNotes(!!m.notes); } }
    else if (m.type === "itw:station") setStation(m.index);
    else if (m.type === "itw:selected") { setSelected(m.id); if (m.id && m.user) setTab("element"); }
    else if (m.type === "itw:error") setSave({ kind: "error", message: m.message });
  }, []);
  const bridge = useMemo(() => new PlayerBridge(() => frame.current, onMessage), [onMessage]);
  // attach, and ask the frame for its state in case it is already running (a remount never reloads the frame)
  useEffect(() => { bridge.attach(); bridge.send({ type: "itw:state" }); return () => bridge.detach(); }, [bridge]);
  // when the deck is ready: present mode, edit mode unless previewing, the current draft, the station we were at
  useEffect(() => {
    if (!ready) return;
    bridge.send({ type: "itw:mode", present: true });
    bridge.send({ type: "itw:edit", on: !preview && !previewVersion });
    if (docRef.current && !previewVersion) bridge.send({ type: "itw:load", doc: docRef.current });
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
    if (path && needsReload(path)) setPendingReload(true); else if (ready) bridge.send({ type: "itw:load", doc: next });
  }, [history, scheduleSave, ready, bridge]);
  const apply = useCallback((c: Command) => { const next = history.apply(c) as Doc; afterChange(next, c.path); }, [history, afterChange]);
  // undo and redo re-apply live unless the step they walk touched what the stage reads at start-up
  const undo = useCallback(() => { const e = history.peekUndo(); if (!e) return; afterChange(history.undo() as Doc, e.path); }, [history, afterChange]);
  const redo = useCallback(() => { const e = history.peekRedo(); if (!e) return; afterChange(history.redo() as Doc, e.path); }, [history, afterChange]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey; if (!mod || e.key.toLowerCase() !== "z") return;
      e.preventDefault(); if (e.shiftKey) redo(); else undo();
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

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

  return <div className={"editor" + (inPreview ? " preview" : "")}>
    <header className="bar">
      <div className="left"><span className="brand">Mosaic</span><span className="title">{title}</span></div>
      <div className="mid">
        {!inPreview && <>
          <button type="button" onClick={undo} disabled={!hist.undo} title="Undo (⌘Z)">Undo</button>
          <button type="button" onClick={redo} disabled={!hist.redo} title="Redo (⇧⌘Z)">Redo</button>
          <span className={"save " + save.kind} aria-live="polite">{save.kind === "idle" ? "" : save.kind === "dirty" ? "Unsaved" : save.kind === "saving" ? "Saving…" : save.kind === "saved" ? `Saved ${new Date(save.at).toLocaleTimeString()}` : `Not saved: ${save.message}`}</span>
          {pendingReload && <button type="button" className="ghost" onClick={() => { if (save.kind === "saved") reloadPlayer(); else persist(); }}>Reload stage</button>}
        </>}
        {previewVersion && <span className="save">Previewing “{previewVersion.name}” — read only</span>}
      </div>
      <div className="right">
        {role === "owner" && !inPreview && <a className="btn ghost" href={`/presentations/${id}/people`}>People</a>}
        {!inPreview && <form method="post" action="/auth/sign-out" className="inline"><button type="submit" className="ghost" title={email}>Sign out</button></form>}
        <button type="button" className="ghost" onClick={() => { bridge.send({ type: "itw:notes", on: !notes }); setNotes(n => !n); }}>{notes ? "Hide notes" : "Notes"}</button>
        <button type="button" className="ghost" onClick={() => bridge.send({ type: "itw:fullscreen", on: true })}>Fullscreen</button>
        {previewVersion
          ? <button type="button" onClick={() => previewVersionToggle(null)}>Back to draft</button>
          : <button type="button" onClick={() => setPreview(p => !p)}>{preview ? "Back to editor" : "Preview"}</button>}
        {!inPreview && <button type="button" className="primary" onClick={newVersion} disabled={!doc}>New version</button>}
      </div>
    </header>

    {!inPreview && doc && <aside className="side left"><Outline doc={doc} station={station} onGoto={i => bridge.send({ type: "itw:goto", index: i })} apply={apply} /></aside>}

    <main className="stage">
      <div className="stage-fit">
        <iframe key={playerKey} ref={frame} src={playerSrc} title="The presentation" allow="fullscreen" allowFullScreen onLoad={() => bridge.send({ type: "itw:state" })} />
      </div>
      {!ready && <div className="loading">Loading the stage…</div>}
      {inPreview && <div className="preview-nav"><button type="button" onClick={() => bridge.send({ type: "itw:goto", index: station - 1 })}>‹</button><span>{String(station + 1).padStart(2, "0")} / {doc?.stations.length ?? "—"}</span><button type="button" onClick={() => bridge.send({ type: "itw:goto", index: station + 1 })}>›</button></div>}
    </main>

    {!inPreview && doc && <aside className="side right">
      <nav className="tabs">{(["element", "motion", "copy", "assets", "versions"] as Tab[]).map(t => <button key={t} type="button" className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t === "element" ? "Element" : t === "motion" ? "Motion" : t === "copy" ? "Renderer copy" : t === "assets" ? "Marks" : `Versions${versions.length ? ` · ${versions.length}` : ""}`}</button>)}</nav>
      {issues.length > 0 && <div className="issues">{issues.slice(0, 5).map((i, k) => <div key={k}><code>{i.path}</code> {i.message}</div>)}</div>}
      {tab === "element" && <Inspector doc={doc} selectedId={selected} apply={apply} onDeselect={() => { setSelected(null); bridge.send({ type: "itw:select", id: null }); }} />}
      {tab === "motion" && <AnimationPanel doc={doc} apply={apply} />}
      {tab === "copy" && <CopyPanel doc={doc} apply={apply} />}
      {tab === "assets" && <AssetsPanel doc={doc} apply={apply} presentationId={id} />}
      {tab === "versions" && <VersionsPanel versions={versions} currentHash={hash} draftBasedOn={draftBasedOn} previewing={null} onPreview={previewVersionToggle} onDuplicate={duplicate} onRestore={restore} published={published} onPublish={role === "owner" ? publish : undefined} />}
    </aside>}
  </div>;
}
