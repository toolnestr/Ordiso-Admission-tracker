"use server";

import { createServiceClient } from "@/lib/supabase/server";

export type ContactState = { ok: boolean; error: string | null };

// Basic shape check — deliberately lenient (we don't bounce real people over a
// regex), just enough to reject obvious junk.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitContact(
  _prevState: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const message = String(formData.get("message") || "").trim();
  // Honeypot: bots fill every field; humans never see this one.
  const trap = String(formData.get("company") || "").trim();

  if (trap) {
    // Pretend success so bots don't learn they were caught.
    return { ok: true, error: null };
  }
  if (!name || !email || !message) {
    return { ok: false, error: "Please fill in every field." };
  }
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (message.length > 4000) {
    return { ok: false, error: "Please keep your message under 4000 characters." };
  }

  // No visitor auth context, so write through the service role. The table has
  // RLS on with no policies, so this action is the only path in.
  const service = createServiceClient();
  const { error } = await service.from("contact_messages").insert({
    name: name.slice(0, 120),
    email: email.slice(0, 200),
    message,
  });

  if (error) {
    return { ok: false, error: "Something went wrong — please try again." };
  }

  return { ok: true, error: null };
}
