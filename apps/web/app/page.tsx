import { redirect } from "next/navigation";
import { currentUser, isCompany, bootstrapOwner } from "@/lib/auth/access";
import { supabaseServer } from "@/lib/auth/server";
import { fileMode } from "@/lib/auth/config";
import { listLibrary, SEEDS, type LibraryEntry } from "@/lib/presentations";
import { Library } from "@/components/library/Library";

export const dynamic = "force-dynamic";
/** Home: the library of everything the signed-in person holds a role on, and the ways to add to it. */
export default async function Home() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?next=%2F");
  if (!fileMode()) await bootstrapOwner(user);   // idempotent: an owner listed in OWNER_EMAILS always holds the seeded decks
  const entries: LibraryEntry[] = fileMode()
    ? Object.entries(SEEDS).map(([slug, s]) => ({ id: slug, slug, title: s.title, kind: s.kind, renderer: s.renderer, description: s.description, sourceUrl: null, storagePath: null, createdBy: null, createdAt: "", updatedAt: "", archivedAt: null, role: "owner", published: false }))
    : await listLibrary(await supabaseServer(), user.id);
  return <Library entries={entries} me={user.email} canCreate={fileMode() || isCompany(user.email)} />;
}
