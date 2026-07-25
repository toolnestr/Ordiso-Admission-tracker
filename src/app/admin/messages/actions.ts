"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSuperAdmin, logSuperAdminAction } from "@/lib/superadmin";

/** Toggle a contact message between New and Resolved. Super-admin only. */
export async function setMessageStatus(formData: FormData) {
  await requireSuperAdmin();

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (!id || (status !== "New" && status !== "Resolved")) return;

  const service = createServiceClient();
  await service.from("contact_messages").update({ status }).eq("id", id);

  await logSuperAdminAction({
    actionType: "contact_status",
    description: `Marked contact message ${id} as ${status}`,
  });

  revalidatePath("/admin/messages");
}
