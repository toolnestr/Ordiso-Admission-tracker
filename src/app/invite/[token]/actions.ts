"use server";

import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";

export type AcceptState = { error: string | null };

/**
 * Accepts a staff invite: creates the auth user, links it to the pre-created
 * staff row, and burns the token. Runs with the service role because the
 * invitee has no session yet (RLS can't scope them to an institute until
 * staff.auth_user_id exists).
 */
export async function acceptInvite(
  _prev: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm_password") || "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords don't match." };
  }

  const service = createServiceClient();

  const { data: invite } = await service
    .from("invite_tokens")
    .select("id, staff_id, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return { error: "This invite link isn't valid." };
  if (invite.used_at) return { error: "This invite has already been used." };
  if (new Date(invite.expires_at) < new Date()) {
    return { error: "This invite link has expired. Ask your Admin to resend it." };
  }

  const { data: staff } = await service
    .from("staff")
    .select("id, name, email, role, status, institute_id")
    .eq("id", invite.staff_id)
    .single();

  if (!staff || staff.status !== "Invited") {
    return { error: "This invite is no longer active." };
  }

  const { data: userData, error: userErr } = await service.auth.admin.createUser({
    email: staff.email,
    password,
    email_confirm: true,
  });
  if (userErr || !userData.user) {
    return {
      error: userErr?.message.includes("already been registered")
        ? "An account already exists for this email. Try logging in instead."
        : "Could not create your account. Please try again.",
    };
  }

  const { error: linkErr } = await service
    .from("staff")
    .update({
      auth_user_id: userData.user.id,
      status: "Active",
      joined_at: new Date().toISOString(),
    })
    .eq("id", staff.id);

  if (linkErr) {
    await service.auth.admin.deleteUser(userData.user.id);
    return { error: "Could not finish setting up your account." };
  }

  await service
    .from("invite_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", invite.id);

  await logActivity({
    instituteId: staff.institute_id,
    staffId: staff.id,
    actionType: "invite_accepted",
    description: `${staff.name} joined as ${staff.role}`,
  });

  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: staff.email,
    password,
  });
  if (signInErr) return { error: "Account created — please log in." };

  redirect("/dashboard");
}
