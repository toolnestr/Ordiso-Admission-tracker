import type { createClient } from "@/lib/supabase/server";

type DB = Awaited<ReturnType<typeof createClient>>;

/**
 * The date "today" as a YYYY-MM-DD string, computed in a given IANA timezone —
 * so an 11pm-in-Karachi follow-up isn't counted against the wrong UTC day.
 * Falls back to UTC if the timezone is empty or invalid.
 */
export function ymdInTz(date: Date, tz: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz || "UTC", ...opts }).format(
      date,
    );
  } catch {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", ...opts }).format(date);
  }
}

/** First day of the month containing a YYYY-MM-DD date, as YYYY-MM-01. */
export function monthStart(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

export type FollowUpRow = {
  id: string;
  due_date: string;
  remark: string | null;
  status: string;
  resolved_at: string | null;
  created_at: string;
  applicant_id: string;
  staff: { name: string } | null;
  applicants: {
    id: string;
    form_data: Record<string, unknown> | null;
    email: string | null;
    phone: string | null;
    application_id: string;
    status: string;
  };
};

/**
 * All follow-ups for applicants in a given session (current-session scope).
 * RLS keeps this tenant-scoped automatically. Ordered by due date ascending.
 */
export async function fetchSessionFollowUps(
  supabase: DB,
  sessionId: string,
): Promise<FollowUpRow[]> {
  const { data } = await supabase
    .from("follow_ups")
    .select(
      "id, due_date, remark, status, resolved_at, created_at, applicant_id, staff(name), applicants!inner(id, form_data, email, phone, application_id, status, session_id)",
    )
    .eq("applicants.session_id", sessionId)
    .order("due_date", { ascending: true });
  return (data ?? []) as unknown as FollowUpRow[];
}

export type FollowUpBuckets = {
  todayTotal: number;
  todayRemaining: number;
  overdue: number;
  monthPending: number;
};

/**
 * Bucket follow-ups relative to `today` (a YYYY-MM-DD in institute tz):
 *  - todayTotal / todayRemaining: due today (all vs still-pending)
 *  - overdue:   pending with a due date strictly before today
 *  - monthPending: pending, due between the 1st of this month and today
 * Future-dated follow-ups are never counted as pending.
 */
export function bucketFollowUps(
  rows: FollowUpRow[],
  today: string,
): FollowUpBuckets {
  const mStart = monthStart(today);
  let todayTotal = 0;
  let todayRemaining = 0;
  let overdue = 0;
  let monthPending = 0;
  for (const r of rows) {
    const pending = r.status !== "Done";
    if (r.due_date === today) {
      todayTotal++;
      if (pending) todayRemaining++;
    }
    if (pending && r.due_date < today) overdue++;
    if (pending && r.due_date >= mStart && r.due_date <= today) monthPending++;
  }
  return { todayTotal, todayRemaining, overdue, monthPending };
}
