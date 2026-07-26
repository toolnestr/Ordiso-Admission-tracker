import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { authCookieOptions } from "./rememberCookie";

/**
 * Server Supabase client (RSC / Route Handlers / Server Actions).
 * Reads the user's session from cookies; still bound by RLS via the anon key.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            // Apply the "Remember me" lifetime to the sb-* auth cookies so a
            // remembered login is persistent from the very first write.
            const persist = cookieStore.get("remember_me")?.value !== "0";
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(
                name,
                value,
                authCookieOptions(name, options, persist),
              ),
            );
          } catch {
            // called from a Server Component — safe to ignore when middleware
            // is responsible for refreshing sessions.
          }
        },
      },
    },
  );
}

/**
 * Service-role client — bypasses RLS. NEVER import this into browser code.
 * Only use in trusted server contexts (Super Admin actions, registration,
 * background jobs). The key must never be exposed to the client (Section 2.9b).
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
