"use server";

import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "Incorrect email or password." };
  }

  // Where to land depends on which role table the user actually belongs to —
  // /dashboard requires a `staff` row and /admin requires a `super_admins`
  // row. An account in neither (e.g. a super admin not seeded into `staff`)
  // must not be silently bounced back to /login with no explanation.
  const { data: staff } = await supabase
    .from("staff")
    .select("id")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (staff) {
    redirect("/dashboard");
  }

  const service = createServiceClient();
  const { data: superAdmin } = await service
    .from("super_admins")
    .select("id")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (superAdmin) {
    redirect("/admin");
  }

  await supabase.auth.signOut();
  return {
    error:
      "This account isn't linked to any institute yet. Contact support to get access.",
  };
}
