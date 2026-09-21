import { redirect } from "next/navigation";
import { currentUser, acceptInvitation } from "@/lib/auth/access";
import { StoreError } from "@/lib/store";

export const dynamic = "force-dynamic";
/** An invitation link: the signed-in account must be the invited one; then the membership is granted and the guest lands on the presentation. */
export default async function Invite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await currentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`);
  try {
    const { slug, role } = await acceptInvitation(token, user);
    redirect(role === "viewer" ? `/p/${slug}` : `/presentations/${slug}/edit`);
  } catch (e) {
    if (e instanceof StoreError) return <main className="auth"><div className="card"><h1>This invitation cannot be used</h1><p>{e.message}</p><p className="muted">Signed in as {user.email}. <a href="/sign-in">Use a different account</a>.</p></div></main>;
    throw e;
  }
}
