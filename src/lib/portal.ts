import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type StaffRole = "Admin" | "Counselor" | "Viewer";

export type PortalContext = {
  userId: string;
  staffId: string;
  name: string;
  role: StaffRole;
  institute: {
    id: string;
    display_name: string;
    plan: "Free" | "Premium";
    currency: string;
  };
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
    .select("id, name, role, institutes(id, display_name, plan, currency)")
    .eq("auth_user_id", user.id)
    .single();

  if (!staff) redirect("/login");

  const institute = Array.isArray(staff.institutes)
    ? staff.institutes[0]
    : staff.institutes;

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

  return {
    userId: user.id,
    staffId: staff.id,
    name: staff.name,
    role: staff.role as StaffRole,
    institute: {
      id: institute.id,
      display_name: institute.display_name,
      plan: institute.plan,
      currency: institute.currency,
    },
    session,
  };
}

// Limits live in lib/limits so client components can read them without
// pulling this server-only module into the browser bundle.
export { FREE_TIER_CAP, FREE_STAFF_SEATS } from "@/lib/limits";
