"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSuperAdmin, logSuperAdminAction } from "@/lib/superadmin";

const STATUSES = ["Active", "Suspended", "Deactivated"] as const;
const PLANS = ["Free", "Premium"] as const;

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

/** Billing is sales-assisted (Sections 1.2/2.10), so plan changes are manual. */
export async function setInstitutePlan(
  instituteId: string,
  plan: (typeof PLANS)[number],
) {
  await requireSuperAdmin();
  if (!PLANS.includes(plan)) return;

  const service = createServiceClient();
  const { data: before } = await service
    .from("institutes")
    .select("display_name, plan")
    .eq("id", instituteId)
    .single();

  // Downgrades are never destructive (Section 6.6): Premium-only data stays
  // put and simply becomes view-locked until they upgrade again.
  await service.from("institutes").update({ plan }).eq("id", instituteId);

  await logSuperAdminAction({
    actionType: "institute_plan_changed",
    targetInstituteId: instituteId,
    description: `${before?.display_name ?? "Institute"}: ${before?.plan} → ${plan}`,
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
