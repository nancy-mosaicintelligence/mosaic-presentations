"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/auth/client";

export function SignIn({ next, domain, testAuth }: { next: string; domain: string; testAuth?: boolean }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  // the local stack has no Google: the same admission, by password (only with ITW_TEST_AUTH=1, never in production)
  const local = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const r = await fetch("/auth/test-sign-in", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error || r.statusText); setBusy(false); return; }
    window.location.href = next;
  };
  const go = async (company: boolean) => {
    setBusy(true); setErr(null);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: company ? { hd: domain, prompt: "select_account" } : { prompt: "select_account" }
    } });
    if (error) { setErr(error.message); setBusy(false); }
  };
  return <div className="signin">
    <button type="button" className="primary" disabled={busy} onClick={() => go(true)}>Continue with Google · {domain}</button>
    <button type="button" className="ghost" disabled={busy} onClick={() => go(false)}>I was invited — sign in with another Google account</button>
    {err && <p className="error">{err}</p>}
    {testAuth && <form className="local-signin" onSubmit={local}>
      <p className="muted small">Local stack (no Google here): sign in with a test account.</p>
      <input className="field" type="email" placeholder="email" value={email} onChange={e => setEmail(e.target.value)} required />
      <input className="field" type="password" placeholder="password" value={password} onChange={e => setPassword(e.target.value)} required />
      <button type="submit" className="ghost" disabled={busy}>Sign in locally</button>
    </form>}
  </div>;
}
