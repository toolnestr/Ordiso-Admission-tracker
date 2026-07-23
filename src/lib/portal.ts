import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  planFeatures,
  planState,
  type Plan,
  type Features,
  type PlanState,
} from "@/lib/plan";

export type StaffRole = "Admin" | "Counselor" | "Viewer";

export type PortalContext = {
  userId: string;
  staffId: string;
  name: string;
  role: StaffRole;
  institute: {
    id: string;
    display_name: string;
    plan: Plan;
    plan_expires_at: string | null;
    grace_until: string | null;
    currency: string;
  };
  /** Effective feature access for the institute's plan (expiry + grace aware). */
  features: Features;
  /** 'active' | 'grace' | 'expired' — drives the renewal banner. */
  planState: PlanState;
  session: {
    id: string;
    name: string;
    status: "Open" | "Closed";
    start_date: string;
    end_date: string;
    total_applications_received: number;
    target_goal: number | null;
  } | null;
};

/**
 * Loads the signed-in staff member, their institute, and the current open
 * session. Redirects to /login if unauthenticated. Every portal page/layout
 * calls this — all reads go through RLS, so a bug can't leak another tenant.
 */
export async function getPortalContext(): Promise<PortalContext> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select(
      "id, name, role, institutes(id, display_name, plan, plan_expires_at, grace_until, currency, status)",
    )
    .eq("auth_user_id", user.id)
    .single();

  if (!staff) redirect("/login");

  const institute = Array.isArray(staff.institutes)
    ? staff.institutes[0]
    : staff.institutes;

  // Suspended/Deactivated institutes lose portal access, matching what the
  // public form already enforces in get_public_form (Section 3.1).
  if (institute.status !== "Active") redirect("/suspended");

  // Current open session (at most one, enforced by DB unique index).
  const { data: session } = await supabase
    .from("sessions")
    .select(
      "id, name, status, start_date, end_date, total_applications_received, target_goal",
    )
    .eq("status", "Open")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const plan = institute.plan as Plan;
  const expiresAt = (institute.plan_expires_at as string | null) ?? null;
  const graceUntil = (institute.grace_until as string | null) ?? null;

  return {
    userId: user.id,
    staffId: staff.id,
    name: staff.name,
    role: staff.role as StaffRole,
    institute: {
      id: institute.id,
      display_name: institute.display_name,
      plan,
      plan_expires_at: expiresAt,
      grace_until: graceUntil,
      currency: institute.currency,
    },
    features: planFeatures(plan, expiresAt, graceUntil),
    planState: planState(plan, expiresAt, graceUntil),
    session,
  };
}

// Limits live in lib/limits so client components can read them without
// pulling this server-only module into the browser bundle.
export { FREE_TIER_CAP, FREE_STAFF_SEATS } from "@/lib/limits";
