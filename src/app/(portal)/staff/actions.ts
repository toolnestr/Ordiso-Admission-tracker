"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getPortalContext, FREE_STAFF_SEATS } from "@/lib/portal";
import { logActivity } from "@/lib/activity";

export type StaffActionState = { error: string | null; inviteUrl?: string };

const ROLES = ["Admin", "Counselor", "Viewer"] as const;

/** Seats counted = Active + Invited (a pending invite holds a seat). */
async function usedSeats(instituteId: string) {
  const service = createServiceClient();
  const { count } = await service
    .from("staff")
    .select("id", { count: "exact", head: true })
    .eq("institute_id", instituteId)
    .in("status", ["Active", "Invited"]);
  return count ?? 0;
}

export async function inviteStaff(
  _prev: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const ctx = await getPortalContext();
  if (ctx.role !== "Admin") return { error: "Only Admins can invite staff." };

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") || "") as (typeof ROLES)[number];

  if (!name || !email) return { error: "Name and email are both required." };
  if (!ROLES.includes(role)) return { error: "Pick a valid role." };

  // Free-tier seat cap.
  if (ctx.institute.plan === "Free") {
    const used = await usedSeats(ctx.institute.id);
    if (used >= FREE_STAFF_SEATS) {
      return {
        error: `You've used all ${FREE_STAFF_SEATS} free seats. Upgrade to Premium for unlimited staff.`,
      };
    }
  }

  const service = createServiceClient();

  // Reject duplicates within this institute.
  const { data: existing } = await service
    .from("staff")
    .select("id, status")
    .eq("institute_id", ctx.institute.id)
    .eq("email", email)
    .maybeSingle();
  if (existing && existing.status !== "Removed") {
    return { error: "Someone with that email is already on your team." };
  }

  const { data: staff, error: staffErr } = await service
    .from("staff")
    .insert({
      institute_id: ctx.institute.id,
      name,
      email,
      role,
      status: "Invited",
    })
    .select("id")
    .single();
  if (staffErr || !staff) return { error: "Could not create the invite." };

  const token = randomBytes(24).toString("hex");
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);

  const { error: tokenErr } = await service.from("invite_tokens").insert({
    staff_id: staff.id,
    token,
    expires_at: expires.toISOString(),
  });
  if (tokenErr) {
    await service.from("staff").delete().eq("id", staff.id);
    return { error: "Could not create the invite link." };
  }

  await logActivity({
    instituteId: ctx.institute.id,
    staffId: ctx.staffId,
    actionType: "staff_invited",
    description: `Invited ${name} (${email}) as ${role}`,
  });

  revalidatePath("/staff");
  // Email automation is Premium; on Free the Admin shares this link manually.
  return { error: null, inviteUrl: `/invite/${token}` };
}

export async function changeRole(staffId: string, role: string) {
  const ctx = await getPortalContext();
  if (ctx.role !== "Admin") return;
  if (!ROLES.includes(role as (typeof ROLES)[number])) return;
  if (staffId === ctx.staffId) return; // don't let an Admin demote themselves

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("staff")
    .select("name, role")
    .eq("id", staffId)
    .single();

  await supabase.from("staff").update({ role }).eq("id", staffId);

  await logActivity({
    instituteId: ctx.institute.id,
    staffId: ctx.staffId,
    actionType: "staff_role_changed",
    description: `${before?.name ?? "Staff"} role changed: ${before?.role} → ${role}`,
  });

  revalidatePath("/staff");
}

/**
 * Removing revokes portal access immediately. Past actions stay in the
 * Activity Log attributed to their name with a "removed" tag (Section 2.3),
 * so we mark the row Removed rather than deleting it.
 */
export async function removeStaff(staffId: string) {
  const ctx = await getPortalContext();
  if (ctx.role !== "Admin") return;
  if (staffId === ctx.staffId) return; // can't remove yourself

  const service = createServiceClient();
  // Scope by institute: the service role bypasses RLS, so we MUST verify the
  // target staff belongs to the caller's institute before touching it.
  const { data: staff } = await service
    .from("staff")
    .select("name, email, auth_user_id")
    .eq("id", staffId)
    .eq("institute_id", ctx.institute.id)
    .maybeSingle();
  if (!staff) return;

  await service
    .from("staff")
    .update({ status: "Removed", auth_user_id: null })
    .eq("id", staffId)
    .eq("institute_id", ctx.institute.id);

  // Kill their login entirely.
  if (staff?.auth_user_id) {
    await service.auth.admin.deleteUser(staff.auth_user_id);
  }

  await logActivity({
    instituteId: ctx.institute.id,
    staffId: ctx.staffId,
    actionType: "staff_removed",
    description: `Removed ${staff?.name ?? "staff member"} (${staff?.email ?? ""})`,
  });

  revalidatePath("/staff");
}

/** Revoke a pending invite — frees the seat. */
export async function revokeInvite(staffId: string) {
  const ctx = await getPortalContext();
  if (ctx.role !== "Admin") return;

  const service = createServiceClient();
  // Service role bypasses RLS — scope the lookup to the caller's institute.
  const { data: staff } = await service
    .from("staff")
    .select("name, status")
    .eq("id", staffId)
    .eq("institute_id", ctx.institute.id)
    .maybeSingle();
  if (!staff || staff.status !== "Invited") return;

  await service.from("invite_tokens").delete().eq("staff_id", staffId);
  await service
    .from("staff")
    .delete()
    .eq("id", staffId)
    .eq("institute_id", ctx.institute.id);

  await logActivity({
    instituteId: ctx.institute.id,
    staffId: ctx.staffId,
    actionType: "invite_revoked",
    description: `Revoked the invite for ${staff?.name ?? "staff member"}`,
  });

  revalidatePath("/staff");
}

/** Issue a fresh link for a pending invite (old one stops working). */
export async function resendInvite(
  staffId: string,
): Promise<{ inviteUrl: string } | null> {
  const ctx = await getPortalContext();
  if (ctx.role !== "Admin") return null;

  const service = createServiceClient();
  // Service role bypasses RLS — verify the target is a still-pending invite in
  // the caller's own institute before minting a fresh token for it. Without
  // this, an Admin could re-issue an invite link for another tenant's staff
  // slot and take over that account via /invite/[token].
  const { data: staff } = await service
    .from("staff")
    .select("id")
    .eq("id", staffId)
    .eq("institute_id", ctx.institute.id)
    .eq("status", "Invited")
    .maybeSingle();
  if (!staff) return null;

  const token = randomBytes(24).toString("hex");
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);

  await service.from("invite_tokens").delete().eq("staff_id", staffId);
  const { error } = await service.from("invite_tokens").insert({
    staff_id: staffId,
    token,
    expires_at: expires.toISOString(),
  });
  if (error) return null;

  revalidatePath("/staff");
  return { inviteUrl: `/invite/${token}` };
}
