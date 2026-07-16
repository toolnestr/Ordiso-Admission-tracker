/**
 * Free-plan limits.
 *
 * Deliberately kept in their own module with no imports: both client and
 * server components need these numbers, and pulling them from lib/portal
 * would drag the server-only Supabase client (next/headers) into the
 * browser bundle.
 */

/** Max applicants per admission session on the Free plan. */
export const FREE_TIER_CAP = 200;

/** Max staff accounts (any mix of roles) on the Free plan. */
export const FREE_STAFF_SEATS = 3;
