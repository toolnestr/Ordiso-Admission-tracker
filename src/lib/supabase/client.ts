import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — uses the public anon key. Safe to ship to the
 * browser because RLS (migration 0002) is the real enforcement layer.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
