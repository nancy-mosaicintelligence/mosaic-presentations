import { notFound, redirect } from "next/navigation";
import { getPresentation } from "@/lib/presentations";
import { accessFor, atLeast } from "@/lib/auth/access";
import { People } from "@/components/people/People";

export const dynamic = "force-dynamic";
export default async function PeoplePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const def = getPresentation(id);
  if (!def) notFound();
  const a = await accessFor(id);
  if (!a.user) redirect(`/sign-in?next=${encodeURIComponent(`/presentations/${id}/people`)}`);
  if (!atLeast(a.role, "owner")) redirect(`/no-access?reason=${encodeURIComponent("only owners manage people")}`);
  return <People id={def.id} title={def.title} me={a.user.email} />;
}
