"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/auth/client";

export function SignIn({ next, domain }: { next: string; domain: string }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
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
  </div>;
}
