import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request so server components
 * always see a valid (non-expired) token. Required pattern for @supabase/ssr
 * in Next.js middleware.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // "Remember me" unchecked → keep the auth cookies session-scoped so
          // they clear when the browser closes. Strip maxAge/expires from the
          // sb-* auth cookies on every refresh (this runs each request).
          const persist = request.cookies.get("remember_me")?.value !== "0";
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts =
              !persist && name.startsWith("sb-")
                ? { ...options, maxAge: undefined, expires: undefined }
                : options;
            response.cookies.set(name, value, opts);
          });
        },
      },
    },
  );

  // Touching getUser() is what actually triggers the token refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const PORTAL_PREFIXES = [
    "/dashboard",
    "/applicants",
    "/sessions",
    "/form-builder",
    "/share",
    "/staff",
    "/reports",
    "/settings",
    "/upgrade",
    "/suspended",
    // /admin additionally checks super-admin membership in its own layout;
    // this only ensures a signed-out visitor lands on /login.
    "/admin",
  ];
  const isPortalRoute = PORTAL_PREFIXES.some((p) =>
    request.nextUrl.pathname.startsWith(p),
  );
  if (isPortalRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}
