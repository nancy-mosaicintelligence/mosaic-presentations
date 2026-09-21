/** Auth configuration from the environment. Read on the server; the anon key and URL are public by design. */
export const authConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  companyDomain: (process.env.COMPANY_DOMAIN || "mosaicintelligence.xyz").toLowerCase(),
  ownerEmails: (process.env.OWNER_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean),
  testAuth: process.env.ITW_TEST_AUTH === "1" && process.env.NODE_ENV !== "production"
};
/** The offline mode: the file store, no sign-in, every write by "local". Only when asked for, never in production. */
export function fileMode(): boolean { return process.env.ITW_STORE === "file" && process.env.NODE_ENV !== "production"; }
export function supabaseConfigured(): boolean { return !!(authConfig.url && authConfig.anonKey); }
