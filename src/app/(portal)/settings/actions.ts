"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import { logActivity } from "@/lib/activity";

export type SettingsState = { error: string | null; ok?: boolean };

async function requireAdmin() {
  const ctx = await getPortalContext();
  return ctx.role === "Admin" ? ctx : null;
}

function refresh() {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

/** Institute profile. Display name is decoupled from the public link, so
 *  renaming never breaks a shared URL or printed QR (Section 2.8). */
export async function updateProfile(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Only Admins can change settings." };

  const display_name = String(formData.get("display_name") || "").trim();
  if (!display_name) return { error: "Institute name can't be empty." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("institutes")
    .update({
      display_name,
      contact_email: String(formData.get("contact_email") || "").trim() || null,
      contact_phone: String(formData.get("contact_phone") || "").trim() || null,
      address: String(formData.get("address") || "").trim() || null,
      working_hours: String(formData.get("working_hours") || "").trim() || null,
      currency: String(formData.get("currency") || "$").trim(),
      timezone: String(formData.get("timezone") || "UTC").trim(),
    })
    .eq("id", ctx.institute.id);

  if (error) return { error: "Could not save your changes." };
  refresh();
  return { error: null, ok: true };
}

/** Per-stage messages shown to students on the public status page. */
export async function updateStatusMessages(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Only Admins can change settings." };

  const stages = [
    "Applied",
    "Shortlisted",
    "Interview",
    "Admitted",
    "Confirmed",
    "Rejected",
  ];
  const messages: Record<string, string> = {};
  for (const s of stages) {
    const v = String(formData.get(`msg_${s}`) || "").trim();
    if (v) messages[s] = v;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("institutes")
    .update({ status_page_messages: messages })
    .eq("id", ctx.institute.id);

  if (error) return { error: "Could not save your messages." };
  refresh();
  return { error: null, ok: true };
}

export async function addProgram(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Only Admins can change settings." };

  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Give the program a name." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("programs")
    .insert({ institute_id: ctx.institute.id, name });

  if (error) return { error: "Could not add the program." };
  refresh();
  return { error: null, ok: true };
}

/**
 * Deleting a program nulls it on past applicants (FK is ON DELETE SET NULL)
 * rather than destroying their records, so history survives (Section 2.10).
 */
export async function deleteProgram(programId: string) {
  const ctx = await requireAdmin();
  if (!ctx) return;
  const supabase = await createClient();
  await supabase.from("programs").delete().eq("id", programId);
  refresh();
}

export async function addFeeTemplate(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Only Admins can change settings." };

  const name = String(formData.get("name") || "").trim();
  const amount = Number(formData.get("default_amount") || 0);
  const programId = String(formData.get("program_id") || "");

  if (!name) return { error: "Give the fee a name." };
  if (!(amount > 0)) return { error: "Enter an amount greater than zero." };

  const supabase = await createClient();
  const { error } = await supabase.from("fee_structure_templates").insert({
    institute_id: ctx.institute.id,
    name,
    default_amount: amount,
    program_id: programId || null,
  });

  if (error) return { error: "Could not add the fee." };
  refresh();
  return { error: null, ok: true };
}

export async function deleteFeeTemplate(templateId: string) {
  const ctx = await requireAdmin();
  if (!ctx) return;
  const supabase = await createClient();
  await supabase.from("fee_structure_templates").delete().eq("id", templateId);
  refresh();
}

/**
 * Deactivating pauses the portal without deleting data. Permanent deletion is
 * deliberately NOT self-serve — it routes through Super Admin (Section 3.1) so
 * an institute can't irreversibly wipe its own records by accident.
 */
export async function deactivateInstitute(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const ctx = await requireAdmin();
  if (!ctx) return { error: "Only Admins can do this." };

  const typed = String(formData.get("confirm_name") || "").trim();
  if (typed !== ctx.institute.display_name) {
    return { error: "The name you typed doesn't match your institute's name." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("institutes")
    .update({ status: "Deactivated" })
    .eq("id", ctx.institute.id);

  if (error) return { error: "Could not deactivate the account." };

  await logActivity({
    instituteId: ctx.institute.id,
    staffId: ctx.staffId,
    actionType: "institute_deactivated",
    description: "Institute account deactivated by Admin",
  });

  refresh();
  return { error: null, ok: true };
}
