"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordState = { error: string | null; sent: boolean };

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { error: "Please enter your email address.", sent: false };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });

  // Rate limiting is the one failure worth surfacing; anything else is
  // reported as success so the form can't be used to probe which emails
  // have accounts.
  if (error?.status === 429) {
    return {
      error: "Too many attempts. Please wait a few minutes and try again.",
      sent: false,
    };
  }

  return { error: null, sent: true };
}
