"use client";
import { useState } from "react";
import type { LibraryEntry, Kind } from "@/lib/presentations";

const KIND: Record<Kind, string> = { deck: "Editable", html: "HTML", link: "Link" };
type Mode = null | "deck" | "copy" | "html" | "link";

/** The library: cards for every presentation with a role, and the three ways to add one. */
export function Library({ entries, me, canCreate }: { entries: LibraryEntry[]; me: string; canCreate: boolean }) {
  const [mode, setMode] = useState<Mode>(null);
  const [title, setTitle] = useState(""); const [url, setUrl] = useState(""); const [file, setFile] = useState<File | null>(null); const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const [list, setList] = useState(entries);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!mode) return; setBusy(true); setErr(null);
    try {
      let r: Response;
      if (mode === "html" && file) { const fd = new FormData(); fd.append("file", file); fd.append("title", title || file.name.replace(/\.html?$/i, "")); if (desc) fd.append("description", desc); r = await fetch("/api/presentations", { method: "POST", body: fd }); }
      else r = await fetch("/api/presentations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: mode === "copy" ? "deck" : mode, renderer: mode === "copy" ? "itw-keynote" : mode === "deck" ? "mosaic-deck" : undefined, title, description: desc || undefined, url: url || undefined }) });
      const body = await r.json(); if (!r.ok) throw new Error(body.error || r.statusText);
      const entry: LibraryEntry = { ...body, role: "owner", published: body.kind !== "deck" };
      setList([entry, ...list]); setMode(null); setTitle(""); setUrl(""); setFile(null); setDesc("");
      if (body.kind === "deck") window.location.href = `/presentations/${body.slug}/edit`;
    } catch (ex: any) { setErr(ex.message); } finally { setBusy(false); }
  };
  const archive = async (p: LibraryEntry) => {
    if (!window.confirm(`Archive “${p.title}”? It leaves the library; nothing is deleted.`)) return;
    const r = await fetch(`/api/presentations/${p.slug}/archive`, { method: "POST" }); if (r.ok) setList(list.filter(x => x.id !== p.id)); else setErr((await r.json()).error);
  };

  return <main className="library">
    <header className="bar"><div className="left"><span className="brand">Mosaic</span><span className="title">Presentations</span></div><div className="mid" /><div className="right"><form method="post" action="/auth/sign-out"><button type="submit" className="ghost">Sign out · {me}</button></form></div></header>
    <div className="library-body">
      {canCreate && <section className="add">
        <div className="add-buttons">
          <button type="button" className={mode === "deck" ? "primary" : ""} onClick={() => setMode(mode === "deck" ? null : "deck")}>New presentation</button>
          <button type="button" className={mode === "copy" ? "primary" : ""} onClick={() => setMode(mode === "copy" ? null : "copy")}>Copy of the keynote</button>
          <button type="button" className={mode === "html" ? "primary" : ""} onClick={() => setMode(mode === "html" ? null : "html")}>Import HTML</button>
          <button type="button" className={mode === "link" ? "primary" : ""} onClick={() => setMode(mode === "link" ? null : "link")}>Add a link</button>
        </div>
        {mode && <form className="add-form" onSubmit={submit}>
          {mode === "deck" && <p className="muted">A new presentation on the keynote engine — its type, motion and rail — starting with an opening and a close. Add stations from the beat picker, type on the stage, place images.</p>}
          {mode === "copy" && <p className="muted">An editable copy of the Italian Tech Week keynote, room and all — its own draft, versions and people.</p>}
          {mode === "html" && <p className="muted">A finished HTML presentation (a file, or a link to one). It is stored privately and presented as is — shared with the same roles and invitations — but its text cannot be edited here.</p>}
          {mode === "link" && <p className="muted">A link to a presentation kept elsewhere (Google Drive, Slides, a site). Listed here with roles and invitations; opening it goes to the link.</p>}
          <label className="row"><span className="lab">Title</span><span className="ctl"><input className="field" value={title} onChange={e => setTitle(e.target.value)} required={mode !== "html" || !file} placeholder={mode === "html" ? "defaults to the file name" : "e.g. Series A narrative"} /></span></label>
          {mode !== "deck" && <label className="row"><span className="lab">{mode === "link" ? "Link" : "Link to the HTML"}</span><span className="ctl"><input className="field" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" required={mode === "link" || !file} /></span></label>}
          {mode === "html" && <label className="row"><span className="lab">or a file</span><span className="ctl"><input type="file" accept=".html,.htm,text/html" onChange={e => setFile(e.target.files?.[0] ?? null)} /></span></label>}
          <label className="row"><span className="lab">{mode === "deck" ? "Event line" : "Note"}</span><span className="ctl"><input className="field" value={desc} onChange={e => setDesc(e.target.value)} placeholder={mode === "deck" ? "e.g. Milan, March 2027 — shown top right" : "optional"} /></span></label>
          {err && <p className="error">{err}</p>}
          <div className="actions"><button type="submit" className="primary" disabled={busy}>{busy ? "Working…" : mode === "deck" || mode === "copy" ? "Create" : mode === "html" ? "Import" : "Add"}</button><button type="button" className="ghost" onClick={() => setMode(null)}>Cancel</button></div>
        </form>}
      </section>}
      {!canCreate && <p className="muted">You see the presentations you were invited to.</p>}
      {list.length === 0 && <p className="muted empty">Nothing here yet{canCreate ? " — create one or import one above." : "."}</p>}
      <section className="grid">
        {list.map(p => <article key={p.id} className={"pcard " + p.kind}>
          <div className="pcard-top"><span className="tag">{KIND[p.kind]}</span><span className="tag role">{p.role}</span>{p.kind === "deck" && (p.published ? <span className="tag live">published</span> : <span className="tag">unpublished</span>)}</div>
          <h3>{p.title}</h3>
          {p.description && <p className="muted small">{p.description}</p>}
          {p.sourceUrl && <p className="muted small src">{p.sourceUrl}</p>}
          <div className="pcard-actions">
            {p.kind === "deck" && (p.role === "viewer" ? <a className="btn" href={`/p/${p.slug}`}>Open</a> : <a className="btn primary" href={`/presentations/${p.slug}/edit`}>Edit</a>)}
            {p.kind === "deck" && p.role !== "viewer" && p.published && <a className="btn ghost" href={`/p/${p.slug}`}>Present</a>}
            {p.kind === "html" && <a className="btn primary" href={`/p/${p.slug}`}>Present</a>}
            {p.kind === "link" && <a className="btn primary" href={`/p/${p.slug}`} target="_blank" rel="noreferrer">Open link</a>}
            {p.role === "owner" && <a className="btn ghost" href={`/presentations/${p.slug}/people`}>People</a>}
            {p.role === "owner" && <button type="button" className="ghost" onClick={() => archive(p)}>Archive</button>}
          </div>
          {p.updatedAt && <p className="muted small">Updated {new Date(p.updatedAt).toLocaleString()}</p>}
        </article>)}
      </section>
    </div>
  </main>;
}
