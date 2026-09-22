import "server-only";
import { fileMode } from "./auth/config";
import { requireRole, type Role, type Access, type SessionUser } from "./auth/access";
import { supabaseServer } from "./auth/server";
import { getFileStore, type Store } from "./store";
import { SupabaseStore } from "./store-supabase";

/** The store for one request, after the role gate: the database as the signed-in user, or the file store in offline mode. */
/** What only the database store offers; the file store leaves these undefined and the routes answer 501. */
export interface Publishing {
  resetDraft?: (actor: string) => Promise<unknown>;
  publish?: (versionId: string) => Promise<{ versionId: string; publishedAt: string }>;
  published?: () => Promise<{ versionId: string; publishedAt: string; name: string; document: unknown } | null>;
}
export async function storeFor(slug: string, min: Role): Promise<{ store: Store & Publishing; access: Access & { user: SessionUser; presentationId: string } }> {
  const access = await requireRole(slug, min);
  if (fileMode()) return { store: getFileStore(), access };
  return { store: new SupabaseStore(await supabaseServer(), access.presentationId, slug, access.user), access };
}
