import { SignIn } from "@/components/SignIn";
import { authConfig } from "@/lib/auth/config";
import { currentUser } from "@/lib/auth/access";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (await currentUser()) redirect(safeNext);
  return <main className="auth"><div className="card">
    <h1>Mosaic · presentations</h1>
    <p className="muted">Sign in with your <strong>{authConfig.companyDomain}</strong> Google account. Invited guests sign in with the Google account their invitation was sent to.</p>
    {error && <p className="error">{error}</p>}
    <SignIn next={safeNext} domain={authConfig.companyDomain} testAuth={authConfig.testAuth} />
  </div></main>;
}
