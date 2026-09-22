"use client";
import { BrandMark } from "@/components/Brand";
import { useCallback, useEffect, useState } from "react";
import type { Member, Invitation } from "@/lib/auth/access";

/** Owners: share by address, and who holds which role. */
export function People({ id, title, me }: { id: string; title: string; me: string }) {
  const api = `/api/presentations/${id}`;
  const [members, setMembers] = useState<Member[]>([]); const [invites, setInvites] = useState<Invitation[]>([]);
  const [email, setEmail] = useState(""); const [role, setRole] = useState<"viewer" | "editor">("editor");
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [m, i] = await Promise.all([fetch(`${api}/members`, { cache: "no-store" }), fetch(`${api}/invitations`, { cache: "no-store" })]);
    if (m.ok) setMembers(await m.json()); if (i.ok) setInvites(await i.json());
  }, [api]);
  useEffect(() => { load(); }, [load]);
  const call = async (path: string, method: string, body: unknown) => {
    setErr(null); setBusy(true);
    try { const r = await fetch(`${api}${path}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || r.statusText); return j; }
    catch (e: any) { setErr(e.message); return null; } finally { setBusy(false); }
  };
  const [shared, setShared] = useState<{ email: string; role: string; status: "member" | "waiting" } | null>(null);
  const site = typeof window !== "undefined" ? window.location.origin : "";
  const shareWith = async (addr: string, r: string) => { const res = await call("/invitations", "POST", { email: addr, role: r }); if (res) { setShared({ email: addr.trim().toLowerCase(), role: r, status: res.status }); await load(); } return res; };
  const submit = async (e: React.FormEvent) => { e.preventDefault(); if (await shareWith(email, role)) setEmail(""); };
  const pending = invites.filter(i => i.status === "pending");
  return <main className="people">
    <header className="bar"><div className="left"><BrandMark /><span className="title">{title}</span></div><div className="mid" /><div className="right"><a className="btn ghost" href={`/presentations/${id}/edit`}>Editor</a><a className="btn ghost" href={`/p/${id}`}>Open</a><form method="post" action="/auth/sign-out" className="inline"><button type="submit" className="ghost">Sign out · {me}</button></form></div></header>
    <div className="people-body">
      <section>
        <h2>Share</h2>
        <p className="muted">Type an address and a role — anyone with a Google account, inside Mosaic or outside. Someone who has signed in before has it in their library at once; someone who has not gets it the first time they sign in with that account. Type the same address again to change the role.</p>
        {err && <p className="error">{err}</p>}
        <form className="invite" onSubmit={submit}>
          <input className="field" type="email" required placeholder="name@mosaicintelligence.xyz" value={email} onChange={e => setEmail(e.target.value)} />
          <select className="field" value={role} onChange={e => setRole(e.target.value as "viewer" | "editor")}><option value="editor">editor</option><option value="viewer">viewer</option></select>
          <button type="submit" className="primary" disabled={busy}>Share</button>
        </form>
        {shared && <div className="link"><p>{shared.status === "member"
          ? <>Shared with <strong>{shared.email}</strong> as {shared.role}. It is in their library now.</>
          : <>Shared with <strong>{shared.email}</strong> as {shared.role}. It appears the first time they sign in at <code>{site}</code> with that Google account.</>}</p>
          <button type="button" className="ghost" onClick={() => { navigator.clipboard?.writeText(site); }}>Copy the site link</button><button type="button" className="ghost" onClick={() => setShared(null)}>Dismiss</button></div>}
      </section>
      <section>
        <h2>People with access</h2>
        <p className="muted">Owners manage people, versions and publication. Editors change the document and make versions. Viewers open it. A mosaicintelligence.xyz account gets no role by itself.</p>
        <table className="members"><thead><tr><th>Person</th><th>Role</th><th /></tr></thead><tbody>
          {members.map(m => <tr key={m.userId}>
            <td><strong>{m.name || m.email}</strong>{m.name && <span className="muted"> · {m.email}</span>}{m.email === me && <span className="tag">you</span>}</td>
            <td><select className="field" value={m.role} disabled={busy} onChange={async e => { if (await call("/members", "PUT", { userId: m.userId, role: e.target.value })) await load(); }}><option>owner</option><option>editor</option><option>viewer</option></select></td>
            <td><button type="button" className="ghost" disabled={busy || m.email === me} onClick={async () => { if (window.confirm(`Remove ${m.email}?`) && await call("/members", "DELETE", { userId: m.userId })) await load(); }}>Remove</button></td>
          </tr>)}
          {pending.map(i => <tr key={i.id} className="pending">
            <td>{i.email}<span className="muted"> · not signed in yet</span></td>
            <td><select className="field" value={i.role} disabled={busy} onChange={e => shareWith(i.email, e.target.value)}><option value="editor">editor</option><option value="viewer">viewer</option></select></td>
            <td><button type="button" className="ghost" disabled={busy} onClick={async () => { if (await call("/invitations", "DELETE", { id: i.id })) await load(); }}>Remove</button></td>
          </tr>)}
          {members.length === 0 && pending.length === 0 && <tr><td colSpan={3} className="muted">Nobody yet.</td></tr>}
        </tbody></table>
      </section>
    </div>
  </main>;
}
