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
    // Supabase rejects reusing the current password with a dedicated code.
    // Surface that plainly instead of the generic failure, which otherwise
    // reads as "something broke" when the user simply typed their old one.
    const isSamePassword =
      error.code === "same_password" ||
      /should be different from the old password/i.test(error.message);
    if (isSamePassword) {
      return {
        error:
          "That's your current password. Please choose a new one you haven't used before.",
      };
    }
    return { error: "Could not update your password. Please try again." };
  }

  redirect("/dashboard");
}
