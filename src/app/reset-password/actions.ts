"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ResetPasswordState = { error: string | null };

export async function setNewPassword(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm_password") || "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Those passwords don't match." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: "Your reset link has expired. Please request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Could not update your password. Please try again." };
  }

  redirect("/dashboard");
}
