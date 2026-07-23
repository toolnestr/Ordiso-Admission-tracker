"use server";

import { sendApplicantEmail } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Fire the "application received" email for freshly-created applicants. Called
 * from the public apply form and the staff enquiry modal after a successful
 * submit. Best-effort and Premium-gated inside sendApplicantEmail.
 */
export async function sendReceivedEmails(applicationIds: string[]) {
  for (const id of applicationIds) {
    if (id) await sendApplicantEmail("received", { applicationId: id });
  }
}

const MAX = 5 * 1024 * 1024;

/**
 * Upload a file an applicant attached on the public form, keyed by their public
 * Application ID (all they have — there's no session). Premium-gated, 5 MB cap.
 * Uses the service role since the uploader is anonymous. Best-effort.
 */
export async function uploadApplicantDocument(
  applicationId: string,
  formData: FormData,
) {
  const file = formData.get("file");
  const label = String(formData.get("label") || "").trim();
  if (!(file instanceof File) || file.size === 0 || file.size > MAX) return;

  const svc = createServiceClient();
  const { data } = await svc
    .from("applicants")
    .select("id, institute_id, institutes(plan)")
    .eq("application_id", applicationId)
    .maybeSingle();
  if (!data) return;
  const inst = Array.isArray(data.institutes)
    ? data.institutes[0]
    : (data.institutes as { plan: string } | null);
  if (inst?.plan !== "Premium") return;

  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${data.institute_id}/${data.id}/${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await svc.storage
    .from("documents")
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) return;

  await svc.from("documents").insert({
    applicant_id: data.id,
    document_label: label || file.name,
    file_url: path,
    file_size: file.size,
  });
}
