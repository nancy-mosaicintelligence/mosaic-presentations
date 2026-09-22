"use client";
import { BrandMark } from "@/components/Brand";
import { useCallback, useEffect, useState } from "react";
import type { Member, Invitation } from "@/lib/auth/access";

/** Owners: who holds which role, and the named invitations out. */
export function People({ id, title, me }: { id: string; title: string; me: string }) {
  const api = `/api/presentations/${id}`;
  const [members, setMembers] = useState<Member[]>([]); const [invites, setInvites] = useState<Invitation[]>([]);
  const [email, setEmail] = useState(""); const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [link, setLink] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
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
  const invite = async (e: React.FormEvent) => { e.preventDefault(); const r = await call("/invitations", "POST", { email, role }); if (r) { setLink(r.link); setEmail(""); await load(); } };
  return <main className="people">
    <header className="bar"><div className="left"><BrandMark /><span className="title">{title}</span></div><div className="mid" /><div className="right"><a className="btn ghost" href={`/presentations/${id}/edit`}>Editor</a><a className="btn ghost" href={`/p/${id}`}>Published</a><form method="post" action="/auth/sign-out"><button type="submit" className="ghost">Sign out · {me}</button></form></div></header>
    <div className="people-body">
      <section>
        <h2>Members</h2>
        <p className="muted">Owners manage people, versions and publication. Editors change the draft and make versions. Viewers open the published presentation. A {`${"mosaicintelligence.xyz"}`} account gets no role by itself.</p>
        {err && <p className="error">{err}</p>}
        <table className="members"><thead><tr><th>Person</th><th>Role</th><th /></tr></thead><tbody>
          {members.map(m => <tr key={m.userId}>
            <td><strong>{m.name || m.email}</strong>{m.name && <span className="muted"> · {m.email}</span>}{m.email === me && <span className="tag">you</span>}</td>
            <td><select className="field" value={m.role} disabled={busy} onChange={async e => { if (await call("/members", "PUT", { userId: m.userId, role: e.target.value })) await load(); }}><option>owner</option><option>editor</option><option>viewer</option></select></td>
            <td><button type="button" className="ghost" disabled={busy || m.email === me} onClick={async () => { if (window.confirm(`Remove ${m.email}?`) && await call("/members", "DELETE", { userId: m.userId })) await load(); }}>Remove</button></td>
          </tr>)}
        </tbody></table>
      </section>
      <section>
        <h2>Invitations</h2>
        <p className="muted">A named invitation is for one Google account, one role, fourteen days. The link is shown once, here; send it yourself.</p>
        <form className="invite" onSubmit={invite}>
          <input className="field" type="email" required placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          <select className="field" value={role} onChange={e => setRole(e.target.value as "viewer" | "editor")}><option value="viewer">viewer</option><option value="editor">editor</option></select>
          <button type="submit" className="primary" disabled={busy}>Invite</button>
        </form>
        {link && <div className="link"><p>Invitation link (shown once):</p><code>{link}</code><button type="button" className="ghost" onClick={() => { navigator.clipboard?.writeText(link); }}>Copy</button><button type="button" className="ghost" onClick={() => setLink(null)}>Dismiss</button></div>}
        <table className="members"><thead><tr><th>Email</th><th>Role</th><th>Status</th><th /></tr></thead><tbody>
          {invites.map(i => <tr key={i.id} className={i.status}>
            <td>{i.email}</td><td>{i.role}</td>
            <td>{i.status}{i.status === "pending" && <span className="muted"> · until {new Date(i.expiresAt).toLocaleDateString()}</span>}</td>
            <td>{i.status === "pending" && <button type="button" className="ghost" disabled={busy} onClick={async () => { if (await call("/invitations", "DELETE", { id: i.id })) await load(); }}>Revoke</button>}</td>
          </tr>)}
          {invites.length === 0 && <tr><td colSpan={4} className="muted">No invitations yet.</td></tr>}
        </tbody></table>
      </section>
    </div>
  </main>;
}
