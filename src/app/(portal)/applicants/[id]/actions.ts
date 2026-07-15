"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import { logActivity } from "@/lib/activity";

export type ActionState = { error: string | null };

const PIPELINE = [
  "Applied",
  "Shortlisted",
  "Interview",
  "Admitted",
  "Confirmed",
  "Confirmed-Partial",
  "Rejected",
] as const;

function refresh(id: string) {
  revalidatePath(`/applicants/${id}`);
  revalidatePath("/applicants");
  revalidatePath("/dashboard");
}

/**
 * Move an applicant to any pipeline stage. Stages are intentionally skippable
 * (Section 2.13) — a walk-in who pays on the spot can jump Applied -> Admitted.
 */
export async function updateStatus(applicantId: string, status: string) {
  const ctx = await getPortalContext();
  if (ctx.role === "Viewer") return;
  if (!PIPELINE.includes(status as (typeof PIPELINE)[number])) return;

  // Confirmation is not a plain status change — it must go through the
  // confirm actions so a reason is recorded (Section 2.4).
  if (status === "Confirmed" || status === "Confirmed-Partial") return;

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("applicants")
    .select("status")
    .eq("id", applicantId)
    .single();

  const { error } = await supabase
    .from("applicants")
    .update({ status })
    .eq("id", applicantId);
  if (error) return;

  await logActivity({
    instituteId: ctx.institute.id,
    applicantId,
    staffId: ctx.staffId,
    actionType: "status_change",
    description: `Status changed: ${before?.status ?? "?"} → ${status}`,
  });

  refresh(applicantId);
}

/** All fees cleared (Paid/Waived) => auto-confirm (Section 2.4). */
async function maybeAutoConfirm(applicantId: string, instituteId: string) {
  const supabase = await createClient();
  const { data: fees } = await supabase
    .from("applicant_fees")
    .select("status")
    .eq("applicant_id", applicantId);

  // No fees assigned yet => nothing to auto-confirm against.
  if (!fees || fees.length === 0) return;

  const allCleared = fees.every(
    (f) => f.status === "Paid" || f.status === "Waived",
  );
  if (!allCleared) return;

  const { data: applicant } = await supabase
    .from("applicants")
    .select("status")
    .eq("id", applicantId)
    .single();

  // Only auto-confirm from Admitted; never override a Rejected record.
  if (applicant?.status !== "Admitted") return;

  await supabase
    .from("applicants")
    .update({
      status: "Confirmed",
      confirmed_at: new Date().toISOString(),
      confirmed_by: null, // null = System
      confirmation_reason: "Auto-confirmed: all fees paid or waived",
    })
    .eq("id", applicantId);

  await logActivity({
    instituteId,
    applicantId,
    staffId: null, // System
    actionType: "admission_confirmed",
    description: "Admission auto-confirmed — all fees paid or waived",
  });
}

export async function addFee(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await getPortalContext();
  if (ctx.role === "Viewer") return { error: "You don't have permission." };

  const applicantId = String(formData.get("applicant_id") || "");
  const name = String(formData.get("name") || "").trim();
  const amount = Number(formData.get("amount") || 0);

  if (!name) return { error: "Give the fee a name." };
  if (!(amount > 0)) return { error: "Enter an amount greater than zero." };

  const supabase = await createClient();
  const { error } = await supabase.from("applicant_fees").insert({
    applicant_id: applicantId,
    name,
    amount,
    status: "Pending",
    amount_paid: 0,
    remaining_balance: amount,
  });
  if (error) return { error: "Could not add the fee." };

  await logActivity({
    instituteId: ctx.institute.id,
    applicantId,
    staffId: ctx.staffId,
    actionType: "fee_added",
    description: `Fee assigned: ${name} (${ctx.institute.currency}${amount})`,
  });

  refresh(applicantId);
  return { error: null };
}

/** Record a (possibly partial) payment; supports real-world installments. */
export async function recordPayment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await getPortalContext();
  if (ctx.role === "Viewer") return { error: "You don't have permission." };

  const feeId = String(formData.get("fee_id") || "");
  const applicantId = String(formData.get("applicant_id") || "");
  const amount = Number(formData.get("amount") || 0);
  if (!(amount > 0)) return { error: "Enter an amount greater than zero." };

  const supabase = await createClient();
  const { data: fee } = await supabase
    .from("applicant_fees")
    .select("name, amount, amount_paid, status")
    .eq("id", feeId)
    .single();
  if (!fee) return { error: "Fee not found." };
  if (fee.status === "Waived") return { error: "This fee is already waived." };

  const newPaid = Number(fee.amount_paid) + amount;
  if (newPaid > Number(fee.amount)) {
    return { error: "That's more than the outstanding balance." };
  }
  const remaining = Number(fee.amount) - newPaid;
  const status = remaining <= 0 ? "Paid" : "Partially Paid";

  await supabase.from("fee_payment_history").insert({
    applicant_fee_id: feeId,
    amount,
    recorded_by: ctx.staffId,
  });

  await supabase
    .from("applicant_fees")
    .update({ amount_paid: newPaid, remaining_balance: remaining, status })
    .eq("id", feeId);

  await logActivity({
    instituteId: ctx.institute.id,
    applicantId,
    staffId: ctx.staffId,
    actionType: "fee_payment",
    description: `Payment recorded: ${ctx.institute.currency}${amount} for ${fee.name} → ${status}`,
  });

  await maybeAutoConfirm(applicantId, ctx.institute.id);
  refresh(applicantId);
  return { error: null };
}

/** Waiving is Admin-only (Section 2.4), even though fees are a Free feature. */
export async function waiveFee(feeId: string, applicantId: string) {
  const ctx = await getPortalContext();
  if (ctx.role !== "Admin") return;

  const supabase = await createClient();
  const { data: fee } = await supabase
    .from("applicant_fees")
    .select("name")
    .eq("id", feeId)
    .single();

  await supabase
    .from("applicant_fees")
    .update({ status: "Waived", remaining_balance: 0 })
    .eq("id", feeId);

  await logActivity({
    instituteId: ctx.institute.id,
    applicantId,
    staffId: ctx.staffId,
    actionType: "fee_waived",
    description: `Fee waived: ${fee?.name ?? "fee"}`,
  });

  await maybeAutoConfirm(applicantId, ctx.institute.id);
  refresh(applicantId);
}

/**
 * Admin override confirm. Requires a reason. If a balance is still due the
 * status is Confirmed-Partial so it's never conflated with a fully-paid
 * confirmation (Section 2.4).
 */
export async function manualConfirm(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await getPortalContext();
  if (ctx.role !== "Admin") {
    return { error: "Only Admins can confirm an admission manually." };
  }

  const applicantId = String(formData.get("applicant_id") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!reason) return { error: "A reason is required for a manual confirm." };

  const supabase = await createClient();
  const { data: fees } = await supabase
    .from("applicant_fees")
    .select("status, remaining_balance")
    .eq("applicant_id", applicantId);

  const balanceDue = (fees ?? []).some(
    (f) => f.status !== "Paid" && f.status !== "Waived",
  );
  const status = balanceDue ? "Confirmed-Partial" : "Confirmed";

  const { error } = await supabase
    .from("applicants")
    .update({
      status,
      confirmed_at: new Date().toISOString(),
      confirmed_by: ctx.staffId,
      confirmation_reason: reason,
    })
    .eq("id", applicantId);
  if (error) return { error: "Could not confirm the admission." };

  await logActivity({
    instituteId: ctx.institute.id,
    applicantId,
    staffId: ctx.staffId,
    actionType: "admission_confirmed",
    description: balanceDue
      ? "Admission manually confirmed with an outstanding balance"
      : "Admission manually confirmed",
    reason,
  });

  refresh(applicantId);
  return { error: null };
}

export async function addNote(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await getPortalContext();
  if (ctx.role === "Viewer") return { error: "You don't have permission." };

  const applicantId = String(formData.get("applicant_id") || "");
  const content = String(formData.get("content") || "").trim();
  if (!content) return { error: "Write something first." };

  const supabase = await createClient();
  const { error } = await supabase.from("notes").insert({
    applicant_id: applicantId,
    staff_id: ctx.staffId,
    content,
  });
  if (error) return { error: "Could not save the note." };

  refresh(applicantId);
  return { error: null };
}

export async function deleteNote(noteId: string, applicantId: string) {
  const ctx = await getPortalContext();
  if (ctx.role === "Viewer") return;

  const supabase = await createClient();
  const { data: note } = await supabase
    .from("notes")
    .select("staff_id")
    .eq("id", noteId)
    .single();

  // Staff may delete their own notes; Admin may moderate any note.
  if (!note) return;
  if (note.staff_id !== ctx.staffId && ctx.role !== "Admin") return;

  await supabase.from("notes").delete().eq("id", noteId);

  await logActivity({
    instituteId: ctx.institute.id,
    applicantId,
    staffId: ctx.staffId,
    actionType: "note_deleted",
    description: "A note was deleted",
  });

  refresh(applicantId);
}

export async function addCommunication(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await getPortalContext();
  if (ctx.role === "Viewer") return { error: "You don't have permission." };

  const applicantId = String(formData.get("applicant_id") || "");
  const type = String(formData.get("type") || "Call");
  const summary = String(formData.get("summary") || "").trim();
  const outcome = String(formData.get("outcome_tag") || "").trim();
  if (!summary) return { error: "Add a short summary." };

  const supabase = await createClient();
  const { error } = await supabase.from("communication_log").insert({
    applicant_id: applicantId,
    staff_id: ctx.staffId,
    type,
    summary,
    outcome_tag: outcome || null,
  });
  if (error) return { error: "Could not save the log entry." };

  refresh(applicantId);
  return { error: null };
}
