"use server";

import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";

export type FeedbackState = { ok: boolean; error: string | null };

export async function submitFeedback(
  _prevState: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const type = String(formData.get("type") || "Feedback");
  const message = String(formData.get("message") || "").trim();
  const pageUrl = String(formData.get("page_url") || "").trim() || null;

  if (type !== "Feedback" && type !== "Bug") {
    return { ok: false, error: "Please choose a valid type." };
  }
  if (message.length < 3) {
    return { ok: false, error: "Please add a little more detail." };
  }
  if (message.length > 4000) {
    return { ok: false, error: "That's a bit long — please keep it under 4000 characters." };
  }

  // getPortalContext resolves the institute + staff row and enforces auth, so
  // the insert below always satisfies the feedback_insert RLS check.
  const ctx = await getPortalContext();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("feedback").insert({
    institute_id: ctx.institute.id,
    staff_id: ctx.staffId,
    sender_email: user?.email ?? null,
    type,
    message,
    page_url: pageUrl,
  });

  if (error) {
    return { ok: false, error: "Couldn't send that — please try again." };
  }

  return { ok: true, error: null };
}
