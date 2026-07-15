"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";

export type SessionActionState = { error: string | null };

/**
 * Creates a new admission session. The DB partial unique index
 * (one_open_session_per_institute) is the real guard against two open
 * sessions; we surface a friendly message if it trips.
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
