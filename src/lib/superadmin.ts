import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type SuperAdmin = { userId: string; email: string };

/**
 * Returns the current super admin, or null.
 *
 * The lookup runs through the service role because `super_admins` has RLS on
 * with no policies — nothing reachable by a normal session can read it, so
 * membership can't be probed or forged from the client.
 */
export async function getSuperAdmin(): Promise<SuperAdmin | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data } = await service
    .from("super_admins")
    .select("email")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return data ? { userId: user.id, email: data.email } : null;
}

/** Gate for every /admin page and action. */
export async function requireSuperAdmin(): Promise<SuperAdmin> {
  const sa = await getSuperAdmin();
  // Bounce to the normal app rather than /login: a signed-in institute Admin
  // hitting /admin isn't unauthenticated, just not the platform owner.
  if (!sa) redirect("/dashboard");
  return sa;
}

/** Immutable platform-owner audit trail (Section 3.9). */
export async function logSuperAdminAction(params: {
  actionType: string;
  targetInstituteId?: string | null;
  description: string;
}) {
  const service = createServiceClient();
  await service.from("super_admin_activity_log").insert({
    action_type: params.actionType,
    target_institute_id: params.targetInstituteId ?? null,
    description: params.description,
  });
}
