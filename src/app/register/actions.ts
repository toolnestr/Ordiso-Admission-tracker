"use server";

import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type RegisterState = { error: string | null };

/**
 * Registers a new institute + its first Admin staff member.
 *
 * Institute/staff creation is service-role-only by design: RLS on
 * `institutes`/`staff` scopes everything to auth_institute_id(), which does
 * not exist yet for a brand-new signup. This server action is the one
 * trusted place that bypasses RLS to bootstrap a tenant, then hands the
 * user a normal authenticated session for everything after.
 */
export async function registerInstitute(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const instituteName = String(formData.get("institute_name") || "").trim();
  const adminName = String(formData.get("admin_name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");

  if (!instituteName || !adminName || !email || !password) {
    return { error: "Please fill in every field." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const service = createServiceClient();

  // 1. Create the auth user. Free tier has no email automation (Section 2.10),
  //    so we mark the email confirmed immediately rather than send a link.
  const { data: userData, error: userErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userErr || !userData.user) {
    const msg = userErr?.message.includes("already been registered")
      ? "An account with this email already exists."
      : userErr?.message || "Could not create your account.";
    return { error: msg };
  }
  const authUserId = userData.user.id;

  // 2. Create the institute (the permanent Institute ID used everywhere else).
  const { data: institute, error: instErr } = await service
    .from("institutes")
    .insert({ display_name: instituteName, contact_email: email })
    .select("id")
    .single();

  if (instErr || !institute) {
    await service.auth.admin.deleteUser(authUserId);
    return { error: "Could not create your institute. Please try again." };
  }

  // 3. Create the first staff row: Admin, Active, linked to the auth user.
  const { error: staffErr } = await service.from("staff").insert({
    institute_id: institute.id,
    auth_user_id: authUserId,
    name: adminName,
    email,
    role: "Admin",
    status: "Active",
    joined_at: new Date().toISOString(),
  });

  if (staffErr) {
    await service.from("institutes").delete().eq("id", institute.id);
    await service.auth.admin.deleteUser(authUserId);
    return { error: "Could not finish setting up your account. Please try again." };
  }

  // 4. Sign the new Admin in — from here on, RLS + auth_institute_id() apply.
  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr) {
    return { error: "Account created — please log in." };
  }

  redirect("/dashboard");
}
