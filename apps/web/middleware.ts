import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Session upkeep and the first gate: pages that need a signed-in user redirect to sign-in; API routes
// answer 401 themselves. The offline file mode skips all of it.
const PROTECTED = [/^\/presentations\//, /^\/player\//, /^\/invite\//];   /* /p/<slug> decides for itself: the published version is for anyone */

export async function middleware(req: NextRequest) {
  if (process.env.ITW_STORE === "file" && process.env.NODE_ENV !== "production") return NextResponse.next();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // a deploy without its environment: say so plainly (names only), rather than a stack trace on every page
    const missing = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "OWNER_EMAILS"].filter(k => !process.env[k]);
    return new NextResponse(`<!doctype html><meta charset="utf-8"><title>Not configured</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0e0e0e;color:#e8e5e1;font:15px/1.5 system-ui,sans-serif"><main style="max-width:560px;padding:32px"><h1 style="font-weight:500;font-size:22px;margin:0 0 12px">This deploy is not configured yet</h1><p>The app needs its environment variables set on the host, then a new build (two of them are baked in at build time). Missing: <code>${missing.join("</code>, <code>")}</code>.</p><p style="color:#a9a49f">See docs/DEPLOY.md in the repository.</p></main>`, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  }
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (all) => { for (const { name, value } of all) req.cookies.set(name, value); res = NextResponse.next({ request: req }); for (const { name, value, options } of all) res.cookies.set(name, value, options); }
    }
  });
  const { data: { user } } = await sb.auth.getUser();
  const path = req.nextUrl.pathname;
  if (!user && PROTECTED.some(re => re.test(path))) {
    const url = req.nextUrl.clone(); url.pathname = "/sign-in"; url.search = "?next=" + encodeURIComponent(path + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
