"use server";

import { sendApplicantEmail } from "@/lib/email";

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
