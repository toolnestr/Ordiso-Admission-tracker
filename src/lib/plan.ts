/**
 * Plan tiers + feature matrix. No imports — both client and server read this
 * (same rule as lib/limits). `Premium` is the legacy value for Pro-level and
 * is treated identically to `Pro`.
 *
 * Tiers: Free · Starter ($3/mo) · Pro ($10/mo) · Enterprise (contact).
 * A paid plan whose expiry has passed falls back to Free limits everywhere.
 */
import { FREE_TIER_CAP, FREE_STAFF_SEATS } from "./limits";

export type Plan = "Free" | "Starter" | "Pro" | "Premium" | "Enterprise";

/** Selectable tiers in order (Premium is hidden — an alias of Pro). */
export const PLAN_TIERS: Exclude<Plan, "Premium">[] = [
  "Free",
  "Starter",
  "Pro",
  "Enterprise",
];

/** Monthly USD price; Enterprise is contact-based (null). */
export const PLAN_PRICE: Record<Exclude<Plan, "Premium">, number | null> = {
  Free: 0,
  Starter: 3,
  Pro: 10,
  Enterprise: null,
};

export const YEARLY_DISCOUNT = 0.3; // 30% off when billed yearly

export type Features = {
  label: string;
  studentsCap: number | null; // null = unlimited
  staffCap: number | null;
  emails: boolean;
  uploads: boolean;
  customDomain: boolean;
  exports: boolean;
};

/** Active if not expired, OR still within a grace window granted by an admin. */
export function isPlanActive(
  plan: Plan,
  expiresAt?: string | null,
  graceUntil?: string | null,
): boolean {
  if (plan === "Free") return true;
  const now = Date.now();
  if (!expiresAt) return true; // no expiry recorded = active
  if (new Date(expiresAt).getTime() > now) return true;
  if (graceUntil && new Date(graceUntil).getTime() > now) return true; // grace
  return false;
}

export type PlanState = "active" | "grace" | "expired";

/** Whether a paid plan is running normally, in its grace window, or lapsed. */
export function planState(
  plan: Plan,
  expiresAt?: string | null,
  graceUntil?: string | null,
): PlanState {
  if (plan === "Free") return "active";
  const now = Date.now();
  if (!expiresAt || new Date(expiresAt).getTime() > now) return "active";
  if (graceUntil && new Date(graceUntil).getTime() > now) return "grace";
  return "expired";
}

/** Effective features for a plan, downgrading to Free once the plan (and any
 * grace window) has lapsed. */
export function planFeatures(
  plan: Plan,
  expiresAt?: string | null,
  graceUntil?: string | null,
): Features {
  const effective: Plan = isPlanActive(plan, expiresAt, graceUntil)
    ? plan
    : "Free";
  switch (effective) {
    case "Starter":
      return {
        label: "Starter",
        studentsCap: null,
        staffCap: null,
        emails: false,
        uploads: false,
        customDomain: false,
        exports: false,
      };
    case "Pro":
    case "Premium":
      return {
        label: "Pro",
        studentsCap: null,
        staffCap: null,
        emails: true,
        uploads: true,
        customDomain: false,
        exports: true,
      };
    case "Enterprise":
      return {
        label: "Enterprise",
        studentsCap: null,
        staffCap: null,
        emails: true,
        uploads: true,
        customDomain: true,
        exports: true,
      };
    default:
      return {
        label: "Free",
        studentsCap: FREE_TIER_CAP,
        staffCap: FREE_STAFF_SEATS,
        emails: false,
        uploads: false,
        customDomain: false,
        exports: false,
      };
  }
}

/** Display name for a plan (Premium shows as Pro). */
export function planLabel(plan: Plan): string {
  return plan === "Premium" ? "Pro" : plan;
}
