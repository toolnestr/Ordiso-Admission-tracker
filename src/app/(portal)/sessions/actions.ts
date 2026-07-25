"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import { FREE_SESSIONS_PER_YEAR } from "@/lib/limits";

export type SessionActionState = { error: string | null };

/**
 * Whether the institute is limited to Free-tier rules: on Free, or on a paid
 * plan whose expiry has passed. Mirrors the applicant-cap RPC (grace is not
 * considered), so the session quota behaves the same way the 100 cap does.
 */
function isFreeLimited(
  plan: string,
  expiresAt: string | null,
): boolean {
  if (plan === "Free") return true;
  return !!expiresAt && new Date(expiresAt).getTime() < Date.now();
}

/**
 * Creates a new admission session. Two DB-level guards back this up: the
 * partial unique index (one_open_session_per_institute) against two open
 * sessions, and the free_session_quota trigger (migration 0017) capping Free
 * institutes to FREE_SESSIONS_PER_YEAR per calendar year. We pre-check the
 * quota for a friendly upgrade message and still catch the trigger as a
 * backstop against direct inserts.
 */
export async function createSession(
  _prev: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const ctx = await getPortalContext();
  if (ctx.role !== "Admin") return { error: "Only Admins can create sessions." };

  const name = String(formData.get("name") || "").trim();
  const startDate = String(formData.get("start_date") || "");
  const endDate = String(formData.get("end_date") || "");
  const targetRaw = String(formData.get("target_goal") || "").trim();

  if (!name || !startDate || !endDate) {
    return { error: "Name, start date, and end date are all required." };
  }
  if (endDate < startDate) {
    return { error: "End date can't be before the start date." };
  }

  const supabase = await createClient();

  // Free-tier yearly session quota (Section: monetization). Count this
  // institute's sessions created in the current calendar year.
  if (isFreeLimited(ctx.institute.plan, ctx.institute.plan_expires_at)) {
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
    const { count } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .gte("created_at", yearStart);

    if ((count ?? 0) >= FREE_SESSIONS_PER_YEAR) {
      return {
        error: `Your Free plan includes ${FREE_SESSIONS_PER_YEAR} admission sessions per year. Upgrade to create more.`,
      };
    }
  }

  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      institute_id: ctx.institute.id,
      name,
      start_date: startDate,
      end_date: endDate,
      status: "Open",
      target_goal: targetRaw ? Number(targetRaw) : null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        error:
          "You already have an open session. Close it before opening a new one.",
      };
    }
    if (error.message?.includes("free_session_quota")) {
      return {
        error: `Your Free plan includes ${FREE_SESSIONS_PER_YEAR} admission sessions per year. Upgrade to create more.`,
      };
    }
    return { error: "Could not create the session. Please try again." };
  }

  // Seed the cached stats row (Section 2.9).
  await supabase.from("session_stats").insert({ session_id: session.id });

  revalidatePath("/sessions");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function closeSession(sessionId: string) {
  const ctx = await getPortalContext();
  if (ctx.role !== "Admin") return;

  const supabase = await createClient();
  await supabase
    .from("sessions")
    .update({ status: "Closed" })
    .eq("id", sessionId);

  revalidatePath("/sessions");
  revalidatePath("/dashboard");
}

export async function reopenSession(sessionId: string) {
  const ctx = await getPortalContext();
  if (ctx.role !== "Admin") return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ status: "Open" })
    .eq("id", sessionId);

  // Unique-index violation => another session is already open.
  if (error) return;

  revalidatePath("/sessions");
  revalidatePath("/dashboard");
}
