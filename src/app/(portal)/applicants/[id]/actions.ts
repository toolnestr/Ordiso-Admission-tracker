"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import { logActivity } from "@/lib/activity";
import { sendApplicantEmail, statusEmailKind } from "@/lib/email";

export type ActionState = { error: string | null };

/** Documents cap: a single file must be 5 MB or smaller (also set on the bucket). */
export const MAX_DOC_BYTES = 5 * 1024 * 1024;

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

  // Notify the applicant (Premium institutes only; best-effort).
  const kind = statusEmailKind(status);
  if (kind) await sendApplicantEmail(kind, { applicantId });

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

  await sendApplicantEmail("confirmed", { applicantId });
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

/**
 * Recompute a fee's paid/remaining/status from its payment history — the
 * single source of truth after any edit or deletion of a payment. Never
 * touches a Waived fee.
 */
async function recomputeFee(
  supabase: Awaited<ReturnType<typeof createClient>>,
  feeId: string,
) {
  const { data: fee } = await supabase
    .from("applicant_fees")
    .select("amount, status")
    .eq("id", feeId)
    .single();
  if (!fee || fee.status === "Waived") return;

  const { data: hist } = await supabase
    .from("fee_payment_history")
    .select("amount")
    .eq("applicant_fee_id", feeId);

  const paid = (hist ?? []).reduce((s, h) => s + Number(h.amount), 0);
  const remaining = Number(fee.amount) - paid;
  const status = remaining <= 0 ? "Paid" : paid > 0 ? "Partially Paid" : "Pending";

  await supabase
    .from("applicant_fees")
    .update({
      amount_paid: paid,
      remaining_balance: Math.max(remaining, 0),
      status,
    })
    .eq("id", feeId);
}

/** Edit a fee's name/amount after it was assigned (e.g. corrected sum). */
export async function editFeeAmount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await getPortalContext();
  if (ctx.role === "Viewer") return { error: "You don't have permission." };

  const feeId = String(formData.get("fee_id") || "");
  const applicantId = String(formData.get("applicant_id") || "");
  const name = String(formData.get("name") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  if (!name) return { error: "Give the fee a name." };
  if (!(amount > 0)) return { error: "Enter an amount greater than zero." };

  const supabase = await createClient();
  const { data: fee } = await supabase
    .from("applicant_fees")
    .select("amount_paid, status")
    .eq("id", feeId)
    .single();
  if (!fee) return { error: "Fee not found." };
  if (fee.status === "Waived") return { error: "This fee is waived." };
  if (amount < Number(fee.amount_paid)) {
    return { error: "Amount can't be less than what's already paid." };
  }

  const { error } = await supabase
    .from("applicant_fees")
    .update({ name, amount })
    .eq("id", feeId);
  if (error) return { error: "Could not update the fee." };

  await recomputeFee(supabase, feeId);
  await logActivity({
    instituteId: ctx.institute.id,
    applicantId,
    staffId: ctx.staffId,
    actionType: "fee_edited",
    description: `Fee updated: ${name} (${ctx.institute.currency}${amount})`,
  });
  await maybeAutoConfirm(applicantId, ctx.institute.id);
  refresh(applicantId);
  return { error: null };
}

/** Correct the amount of an already-recorded payment. */
export async function editPayment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await getPortalContext();
  if (ctx.role === "Viewer") return { error: "You don't have permission." };

  const paymentId = String(formData.get("payment_id") || "");
  const feeId = String(formData.get("fee_id") || "");
  const applicantId = String(formData.get("applicant_id") || "");
  const amount = Number(formData.get("amount") || 0);
  if (!(amount > 0)) return { error: "Enter an amount greater than zero." };

  const supabase = await createClient();
  const { data: fee } = await supabase
    .from("applicant_fees")
    .select("amount, amount_paid")
    .eq("id", feeId)
    .single();
  if (!fee) return { error: "Fee not found." };

  // The other payments plus the new amount must not exceed the fee total.
  const { data: other } = await supabase
    .from("fee_payment_history")
    .select("amount")
    .eq("applicant_fee_id", feeId)
    .neq("id", paymentId);
  const otherSum = (other ?? []).reduce((s, h) => s + Number(h.amount), 0);
  if (otherSum + amount > Number(fee.amount)) {
    return { error: "That's more than the fee total." };
  }

  const { error } = await supabase
    .from("fee_payment_history")
    .update({ amount })
    .eq("id", paymentId);
  if (error) return { error: "Could not update the payment." };

  await recomputeFee(supabase, feeId);
  await logActivity({
    instituteId: ctx.institute.id,
    applicantId,
    staffId: ctx.staffId,
    actionType: "fee_payment_edited",
    description: `Payment corrected to ${ctx.institute.currency}${amount}`,
  });
  await maybeAutoConfirm(applicantId, ctx.institute.id);
  refresh(applicantId);
  return { error: null };
}

/** Delete a recorded payment (entered in error). */
export async function deletePayment(
  paymentId: string,
  feeId: string,
  applicantId: string,
) {
  const ctx = await getPortalContext();
  if (ctx.role === "Viewer") return;

  const supabase = await createClient();
  await supabase.from("fee_payment_history").delete().eq("id", paymentId);
  await recomputeFee(supabase, feeId);
  await logActivity({
    instituteId: ctx.institute.id,
    applicantId,
    staffId: ctx.staffId,
    actionType: "fee_payment_deleted",
    description: "A recorded payment was deleted",
  });
  refresh(applicantId);
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

  await sendApplicantEmail("confirmed", { applicantId });

  refresh(applicantId);
  return { error: null };
}

/**
 * Staff document upload (Premium only). File goes to the private `documents`
 * bucket via the service role (storage RLS is bypassed; the row insert is
 * still RLS-checked as the signed-in user). 5 MB cap enforced here and on the
 * bucket.
 */
export async function uploadDocument(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await getPortalContext();
  if (ctx.role === "Viewer") return { error: "You don't have permission." };
  if (ctx.institute.plan !== "Premium") {
    return { error: "Document uploads are a Premium feature." };
  }

  const applicantId = String(formData.get("applicant_id") || "");
  const label = String(formData.get("label") || "").trim();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }
  if (file.size > MAX_DOC_BYTES) {
    return { error: "File must be 5 MB or smaller." };
  }

  const svc = createServiceClient();
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${ctx.institute.id}/${applicantId}/${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await svc.storage
    .from("documents")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (upErr) return { error: "Upload failed. Check the file type and size." };

  const supabase = await createClient();
  const { error } = await supabase.from("documents").insert({
    applicant_id: applicantId,
    document_label: label || file.name,
    file_url: path,
    file_size: file.size,
  });
  if (error) {
    await svc.storage.from("documents").remove([path]);
    return { error: "Could not save the document." };
  }

  await logActivity({
    instituteId: ctx.institute.id,
    applicantId,
    staffId: ctx.staffId,
    actionType: "document_uploaded",
    description: `Document uploaded: ${label || file.name}`,
  });
  refresh(applicantId);
  return { error: null };
}

export async function deleteDocument(docId: string, applicantId: string) {
  const ctx = await getPortalContext();
  if (ctx.role === "Viewer") return;

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("file_url, document_label")
    .eq("id", docId)
    .single();
  if (!doc) return;

  const svc = createServiceClient();
  await svc.storage.from("documents").remove([doc.file_url]);
  await supabase.from("documents").delete().eq("id", docId);

  await logActivity({
    instituteId: ctx.institute.id,
    applicantId,
    staffId: ctx.staffId,
    actionType: "document_deleted",
    description: `Document deleted: ${doc.document_label ?? "file"}`,
  });
  refresh(applicantId);
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
