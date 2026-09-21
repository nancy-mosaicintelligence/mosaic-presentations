import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Session upkeep and the first gate: pages that need a signed-in user redirect to sign-in; API routes
// answer 401 themselves. The offline file mode skips all of it.
const PROTECTED = [/^\/presentations\//, /^\/p\//, /^\/player\//, /^\/invite\//];

export async function middleware(req: NextRequest) {
  if (process.env.ITW_STORE === "file" && process.env.NODE_ENV !== "production") return NextResponse.next();
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
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
