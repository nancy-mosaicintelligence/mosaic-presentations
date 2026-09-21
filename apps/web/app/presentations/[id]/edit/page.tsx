import { notFound, redirect } from "next/navigation";
import { getPresentation } from "@/lib/presentations";
import { accessFor, atLeast } from "@/lib/auth/access";
import { Editor } from "@/components/editor/Editor";

export const dynamic = "force-dynamic";
export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const def = getPresentation(id);
  if (!def) notFound();
  const a = await accessFor(id);
  if (!a.user) redirect(`/sign-in?next=${encodeURIComponent(`/presentations/${id}/edit`)}`);
  if (!atLeast(a.role, "editor")) redirect(atLeast(a.role, "viewer") ? `/p/${id}` : `/no-access?reason=${encodeURIComponent(`${a.user.email} has no editor role on this presentation`)}`);
  return <Editor id={def.id} title={def.title} role={a.role!} email={a.user.email} />;
}
