import { createServiceClient } from "@/lib/supabase/server";

/**
 * Writes an immutable audit-trail entry (Section 2.12).
 *
 * activity_log deliberately has a SELECT policy but no INSERT/UPDATE/DELETE
 * policy, so tenant users can read their trail but never forge or alter it.
 * Writes therefore go through the service role from trusted server actions.
 *
 * Pass staffId = null for system-generated events (auto-confirmation etc.),
 * which the UI renders as "System" rather than crediting a person.
 */
export async function logActivity(params: {
  instituteId: string;
  applicantId?: string | null;
  staffId?: string | null;
  actionType: string;
  description: string;
  reason?: string | null;
}) {
  const service = createServiceClient();
  await service.from("activity_log").insert({
    institute_id: params.instituteId,
    applicant_id: params.applicantId ?? null,
    staff_id: params.staffId ?? null,
    action_type: params.actionType,
    description: params.description,
    reason: params.reason ?? null,
  });
}
