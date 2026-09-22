"use client";
import { useState } from "react";
import type { LibraryEntry, Kind } from "@/lib/presentations";
import { BrandMark } from "@/components/Brand";

const KIND: Record<Kind, string> = { deck: "Editable deck", html: "HTML file", link: "Link" };
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
  const [renaming, setRenaming] = useState<string | null>(null);
  const rename = async (p: LibraryEntry, title: string) => {
    setRenaming(null); const t = title.replace(/\s+/g, " ").trim(); if (!t || t === p.title) return;
    const r = await fetch(`/api/presentations/${p.slug}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: t }) });
    if (r.ok) setList(l => l.map(x => (x.id === p.id ? { ...x, title: t } : x))); else setErr((await r.json()).error);
  };
  const remove = async (p: LibraryEntry) => {
    if (!window.confirm(`Delete “${p.title}” for everyone?\n\nIts draft, versions, people, invitations and files go with it. There is no undo. (Archive keeps everything and only hides it.)`)) return;
    const r = await fetch(`/api/presentations/${p.slug}`, { method: "DELETE" }); if (r.ok) setList(list.filter(x => x.id !== p.id)); else setErr((await r.json()).error);
  };
  const archive = async (p: LibraryEntry) => {
    if (!window.confirm(`Archive “${p.title}”? It leaves the library; nothing is deleted.`)) return;
    const r = await fetch(`/api/presentations/${p.slug}/archive`, { method: "POST" }); if (r.ok) setList(list.filter(x => x.id !== p.id)); else setErr((await r.json()).error);
  };

  const openHref = (p: LibraryEntry) => (p.kind === "deck" && p.role !== "viewer" ? `/presentations/${p.slug}/edit` : `/p/${p.slug}`);
  const cover = (p: LibraryEntry) => (p.kind === "deck" && p.renderer === "itw-keynote" ? "/covers/italian-tech-week.jpg" : null);
  const host = (u: string) => { try { return new URL(u).host.replace(/^www\./, ""); } catch { return u; } };
  const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  const add = (m: Exclude<Mode, null>, label: string) => <button type="button" className={mode === m ? "primary" : ""} onClick={() => setMode(mode === m ? null : m)}>{label}</button>;

  return <main className="library">
    <header className="bar">
      <div className="left"><BrandMark /><span className="title">Presentations</span></div><div className="mid" />
      <div className="right"><span className="who"><span className="avatar" aria-hidden="true">{me.slice(0, 1)}</span><span className="email">{me}</span></span><form method="post" action="/auth/sign-out"><button type="submit" className="ghost">Sign out</button></form></div>
    </header>
    <div className="library-body">
      <section className="lib-head">
        <div><p className="eyebrow">Library</p><h1>Presentations</h1><p className="lede">Start a new deck, take a copy of the keynote, or bring in a file or a link. Share each one with the people who need it.</p></div>
        {canCreate && <div className="add-buttons">{add("deck", "New presentation")}{add("copy", "Copy of the keynote")}{add("html", "Import HTML")}{add("link", "Add a link")}</div>}
      </section>
      {canCreate && mode && <form className="add-form" onSubmit={submit}>
        {mode === "deck" && <p className="muted">A new presentation on the keynote engine — its type, motion and rail — starting with an opening and a close. Add stations from the beat picker, type on the stage, place images.</p>}
        {mode === "copy" && <p className="muted">An editable copy of the Italian Tech Week keynote, room and all — its own draft, versions and people.</p>}
        {mode === "html" && <p className="muted">A finished HTML presentation (a file, or a link to one). It is stored privately and presented as is — shared with the same roles and invitations — but its text cannot be edited here.</p>}
        {mode === "link" && <p className="muted">A link to a presentation kept elsewhere (Google Drive, Slides, a site). Listed here with roles and invitations; opening it goes to the link.</p>}
        <label className="row"><span className="lab">Title</span><span className="ctl"><input className="field" value={title} onChange={e => setTitle(e.target.value)} required={mode !== "html" || !file} placeholder={mode === "html" ? "defaults to the file name" : "e.g. Series A narrative"} autoFocus /></span></label>
        {mode !== "deck" && mode !== "copy" && <label className="row"><span className="lab">{mode === "link" ? "Link" : "Link to the HTML"}</span><span className="ctl"><input className="field" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" required={mode === "link" || !file} /></span></label>}
        {mode === "html" && <label className="row"><span className="lab">or a file</span><span className="ctl"><input type="file" accept=".html,.htm,text/html" onChange={e => setFile(e.target.files?.[0] ?? null)} /></span></label>}
        <label className="row"><span className="lab">{mode === "deck" ? "Event line" : "Note"}</span><span className="ctl"><input className="field" value={desc} onChange={e => setDesc(e.target.value)} placeholder={mode === "deck" ? "e.g. Milan, March 2027 — shown top right" : "optional"} /></span></label>
        {err && <p className="error">{err}</p>}
        <div className="actions"><button type="submit" className="primary" disabled={busy}>{busy ? "Working…" : mode === "deck" || mode === "copy" ? "Create" : mode === "html" ? "Import" : "Add"}</button><button type="button" className="ghost" onClick={() => setMode(null)}>Cancel</button></div>
      </form>}
      {!canCreate && <p className="muted">You see the presentations you were invited to.</p>}
      {err && !mode && <p className="error">{err}</p>}
      {list.length === 0 && <div className="empty-state"><img src="/brand/mosaic-icon-orange.svg" alt="" /><h2>Nothing here yet</h2><p>{canCreate ? "Start a new presentation on the keynote engine, take a copy of the keynote, or bring in a file or a link." : "Presentations you are invited to will appear here."}</p></div>}
      {list.length > 0 && <section className="lib-section">
        <h2>{list.length === 1 ? "One presentation" : `${list.length} presentations`}</h2>
        <div className="grid">
          {list.map(p => <article key={p.id} className={"pcard kind-" + p.kind} data-slug={p.slug}>
            <a className="cover" href={openHref(p)} target={p.kind === "link" ? "_blank" : undefined} rel={p.kind === "link" ? "noreferrer" : undefined} aria-label={p.title}>
              {cover(p) ? <img className="shot" src={cover(p)!} alt="" /> : <span className={"cover-gen kind-" + p.kind}><img className="mk" src="/brand/mosaic-icon-orange.svg" alt="" /><span className="cover-title">{p.title}</span></span>}
              <span className="cover-tags"><span className="tag">{KIND[p.kind]}</span>{p.kind === "deck" && p.published && <span className="tag live">Published</span>}</span>
            </a>
            <div className="pcard-body">
              <h3>{renaming === p.id
                ? <input className="field rename" defaultValue={p.title} autoFocus aria-label="Title" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); rename(p, (e.target as HTMLInputElement).value); } if (e.key === "Escape") setRenaming(null); }} onBlur={e => rename(p, e.target.value)} />
                : <><a href={openHref(p)} target={p.kind === "link" ? "_blank" : undefined} rel={p.kind === "link" ? "noreferrer" : undefined}>{p.title}</a>{p.role !== "viewer" && <button type="button" className="ghost rename-btn" title="Rename" aria-label="Rename" onClick={() => setRenaming(p.id)}>✎</button>}</>}</h3>
              <p className={"pcard-sub muted" + (p.sourceUrl && !p.description ? " src" : "")}>{p.description || (p.sourceUrl ? host(p.sourceUrl) : "\u00a0")}</p>
              <p className="meta"><b>{p.role}</b>{p.updatedAt ? ` · updated ${when(p.updatedAt)}` : ""}</p>
            </div>
            <div className="pcard-actions">
              {p.kind === "deck" && (p.role === "viewer" ? <a className="btn primary" href={`/p/${p.slug}`}>Open</a> : <a className="btn primary" href={`/presentations/${p.slug}/edit`}>Edit</a>)}
              {p.kind === "deck" && p.role !== "viewer" && <a className="btn" href={`/player/${p.slug}?source=draft&back=%2F`} title="The working document, exactly as Edit shows it">Present</a>}
              {p.kind === "deck" && p.role !== "viewer" && p.published && <a className="btn" href={`/p/${p.slug}?source=published`} title="The published version, frozen">Published</a>}
              {p.kind === "html" && <a className="btn primary" href={`/p/${p.slug}`}>Present</a>}
              {p.kind === "link" && <a className="btn primary" href={`/p/${p.slug}`} target="_blank" rel="noreferrer">Open link</a>}
              <span className="spacer" />
              {p.role === "owner" && <a className="btn" href={`/presentations/${p.slug}/people`}>People</a>}
              {p.role === "owner" && <button type="button" className="ghost" onClick={() => archive(p)}>Archive</button>}
              {p.role === "owner" && !p.builtIn && <button type="button" className="ghost danger" onClick={() => remove(p)}>Delete</button>}
            </div>
          </article>)}
        </div>
      </section>}
    </div>
  </main>;
}
