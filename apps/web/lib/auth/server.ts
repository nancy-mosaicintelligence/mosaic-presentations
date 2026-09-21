import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { authConfig } from "./config";

/** Every database call goes out fresh: a per-call abort signal opts out of React's request memoisation in server
 *  components (two identical GETs in one render would otherwise share the first result — a read after a write would
 *  see the old row), and no-store keeps it out of Next's data cache. */
const freshFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: "no-store", signal: new AbortController().signal });

/** The user-scoped client: the anon key plus the session from the cookies, so row-level security applies to every query. */
export async function supabaseServer(): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(authConfig.url, authConfig.anonKey, {
    global: { fetch: freshFetch },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (all) => { try { for (const { name, value, options } of all) store.set(name, value, options); } catch { /* a server component cannot set cookies; the middleware refreshes them */ }
      }
    }
  });
}

/** The service-role client: server only, used for the sign-in bootstrap and invitation lookup, never for user data paths. */
export function supabaseAdmin(): SupabaseClient {
  if (!authConfig.serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(authConfig.url, authConfig.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: freshFetch } });
}
