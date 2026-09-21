export const dynamic = "force-dynamic";
export default async function NoAccess({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return <main className="auth"><div className="card">
    <h1>No access</h1>
    <p>{reason || "This account has no access to any presentation."}</p>
    <p className="muted">Access is by invitation. Ask an owner for a named invitation to the Google account you use, then open the link it gives you.</p>
    <p><a href="/sign-in">Sign in with a different account</a></p>
  </div></main>;
}
