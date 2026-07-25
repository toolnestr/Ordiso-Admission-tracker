"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSuperAdmin, logSuperAdminAction } from "@/lib/superadmin";

/** Toggle a feedback item between New and Resolved. Super-admin only. */
export async function setFeedbackStatus(formData: FormData) {
  await requireSuperAdmin();

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (!id || (status !== "New" && status !== "Resolved")) return;

  const service = createServiceClient();
  await service.from("feedback").update({ status }).eq("id", id);

  await logSuperAdminAction({
    actionType: "feedback_status",
    description: `Marked feedback ${id} as ${status}`,
  });

  revalidatePath("/admin/feedback");
}
