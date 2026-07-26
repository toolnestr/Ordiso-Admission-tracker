import type { CookieOptions } from "@supabase/ssr";

type CookieOpts = CookieOptions | undefined;

/**
 * "Remember me" cookie-lifetime policy for the Supabase auth cookies (sb-*):
 *
 * - persist  → leave Supabase's own options untouched. @supabase/ssr writes a
 *   long-lived (~400-day) persistent cookie by default, which already survives
 *   a browser restart. We deliberately do NOT re-set maxAge here: a maxAge set
 *   from middleware can be dropped by OpenNext/Cloudflare, silently downgrading
 *   the cookie to session-scope (the bug that made "Remember me" not stick).
 * - !persist → strip maxAge/expires so the cookie is session-scoped and clears
 *   when the browser closes.
 *
 * Non-auth cookies always pass through untouched.
 */
export function authCookieOptions(
  name: string,
  options: CookieOpts,
  persist: boolean,
): CookieOpts {
  if (persist || !name.startsWith("sb-")) return options;
  return { ...(options ?? {}), maxAge: undefined, expires: undefined };
}
