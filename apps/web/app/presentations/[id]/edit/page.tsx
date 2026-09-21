import { notFound } from "next/navigation";
import { getPresentation } from "@/lib/presentations";
import { Editor } from "@/components/editor/Editor";

export const dynamic = "force-dynamic";
export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const def = getPresentation(id);
  if (!def) notFound();
  return <Editor id={def.id} title={def.title} />;
}
