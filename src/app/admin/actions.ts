"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSuperAdmin, logSuperAdminAction } from "@/lib/superadmin";

const STATUSES = ["Active", "Suspended", "Deactivated"] as const;
const PLANS = ["Free", "Starter", "Pro", "Enterprise"] as const;
const CYCLES = ["monthly", "yearly"] as const;

export async function setInstituteStatus(
  instituteId: string,
  status: (typeof STATUSES)[number],
) {
  await requireSuperAdmin();
  if (!STATUSES.includes(status)) return;

  const service = createServiceClient();
  const { data: before } = await service
    .from("institutes")
    .select("display_name, status")
    .eq("id", instituteId)
    .single();

  await service.from("institutes").update({ status }).eq("id", instituteId);

  await logSuperAdminAction({
    actionType: "institute_status_changed",
    targetInstituteId: instituteId,
    description: `${before?.display_name ?? "Institute"}: ${before?.status} → ${status}`,
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/institutes/${instituteId}`);
}

/**
 * Super Admin activates a plan a user requested. Paid plans get an expiry set
 * from the billing cycle (monthly = +1 month, yearly = +1 year); Free clears
 * the cycle/expiry. Downgrades are never destructive — paid-only data stays
 * put and just becomes view-locked (Section 6.6).
 */
export async function setInstitutePlan(
  instituteId: string,
  plan: (typeof PLANS)[number],
  cycle: (typeof CYCLES)[number] | null,
) {
  await requireSuperAdmin();
  if (!PLANS.includes(plan)) return;

  const service = createServiceClient();
  const { data: before } = await service
    .from("institutes")
    .select("display_name, plan")
    .eq("id", instituteId)
    .single();

  let billing_cycle: string | null = null;
  let plan_expires_at: string | null = null;
  if (plan !== "Free") {
    billing_cycle = cycle && CYCLES.includes(cycle) ? cycle : "monthly";
    const d = new Date();
    if (billing_cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    plan_expires_at = d.toISOString();
  }

  // Enterprise is stored as-is; older 'Premium' rows keep working (alias Pro).
  await service
    .from("institutes")
    .update({ plan, billing_cycle, plan_expires_at })
    .eq("id", instituteId);

  await logSuperAdminAction({
    actionType: "institute_plan_changed",
    targetInstituteId: instituteId,
    description: `${before?.display_name ?? "Institute"}: ${before?.plan} → ${plan}${
      plan_expires_at
        ? ` (${billing_cycle}, expires ${plan_expires_at.slice(0, 10)})`
        : ""
    }`,
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/institutes/${instituteId}`);
}

export type DeleteState = { error: string | null };

/**
 * Permanent deletion — Super-Admin-only by design (Section 3.1), which is why
 * institutes can only *deactivate* themselves. Requires typing the exact name.
 * The audit entry survives: target_institute_id is ON DELETE SET NULL, and the
 * name is baked into the description.
 */
export async function deleteInstitute(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  await requireSuperAdmin();

  const instituteId = String(formData.get("institute_id") || "");
  const typed = String(formData.get("confirm_name") || "").trim();

  const service = createServiceClient();
  const { data: inst } = await service
    .from("institutes")
    .select("display_name")
    .eq("id", instituteId)
    .single();

  if (!inst) return { error: "Institute not found." };
  if (typed !== inst.display_name) {
    return { error: "The name you typed doesn't match." };
  }

  // Log BEFORE deleting — afterwards the row (and its name) is gone.
  await logSuperAdminAction({
    actionType: "institute_deleted",
    targetInstituteId: instituteId,
    description: `Permanently deleted institute "${inst.display_name}"`,
  });

  // Staff auth users aren't cascaded by the FK, so clear them explicitly.
  const { data: staff } = await service
    .from("staff")
    .select("auth_user_id")
    .eq("institute_id", instituteId);
  for (const s of staff ?? []) {
    if (s.auth_user_id) await service.auth.admin.deleteUser(s.auth_user_id);
  }

  await service.from("institutes").delete().eq("id", instituteId);

  revalidatePath("/admin");
  return { error: null };
}
