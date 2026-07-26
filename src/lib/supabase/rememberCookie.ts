import type { CookieOptions } from "@supabase/ssr";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

type CookieOpts = CookieOptions | undefined;

/**
 * "Remember me" cookie-lifetime policy for the Supabase auth cookies (sb-*):
 *
 * - persist  → a real 30-day maxAge so the session survives a browser restart.
 * - !persist → no maxAge/expires, so the cookie is session-scoped and clears
 *   when the browser closes.
 *
 * Non-auth cookies pass through untouched. Applied consistently in both the
 * server client (login writes) and the middleware (every refresh), so the
 * choice actually takes effect — @supabase/ssr's own default is otherwise
 * session-scoped, which made "Remember me" a no-op.
 */
export function authCookieOptions(
  name: string,
  options: CookieOpts,
  persist: boolean,
): CookieOpts {
  if (!name.startsWith("sb-")) return options;
  return persist
    ? { ...(options ?? {}), maxAge: THIRTY_DAYS, expires: undefined }
    : { ...(options ?? {}), maxAge: undefined, expires: undefined };
}
