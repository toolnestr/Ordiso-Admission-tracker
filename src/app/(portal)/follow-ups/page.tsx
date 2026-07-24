import Link from "next/link";
import { CalendarClock, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import { ymdInTz, fetchSessionFollowUps } from "@/lib/followups";
import FollowUpsView, { type FollowUpItem } from "./FollowUpsView";

function displayName(form_data: Record<string, unknown>, fallback: string) {
  if (form_data) {
    for (const [k, v] of Object.entries(form_data)) {
      if (/name/i.test(k) && typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return fallback;
}

const VALID_TABS = ["today", "overdue", "month"] as const;
type TabKey = (typeof VALID_TABS)[number];

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const ctx = await getPortalContext();
  const supabase = await createClient();
  const { tab } = await searchParams;
  const initialTab: TabKey = VALID_TABS.includes(tab as TabKey)
    ? (tab as TabKey)
    : "today";

  if (!ctx.session) {
    return (
      <div>
        <Header />
        <div className="card-sheen mt-6 flex flex-col items-start gap-3 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-[15px] font-medium">No open session</h3>
            <p className="mt-1 max-w-md text-[13.5px] text-muted">
              Follow-ups are tracked against the current session. Open a session
              to start scheduling them.
            </p>
          </div>
          <Link
            href="/sessions"
            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
          >
            Create a session
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </div>
    );
  }

  const { data: inst } = await supabase
    .from("institutes")
    .select("timezone")
    .eq("id", ctx.institute.id)
    .maybeSingle();
  const today = ymdInTz(new Date(), inst?.timezone ?? "UTC");

  const rows = await fetchSessionFollowUps(supabase, ctx.session.id);
  const items: FollowUpItem[] = rows.map((r) => ({
    id: r.id,
    applicantId: r.applicant_id,
    name: displayName(
      (r.applicants.form_data ?? {}) as Record<string, unknown>,
      r.applicants.application_id,
    ),
    applicationId: r.applicants.application_id,
    phone: r.applicants.phone,
    email: r.applicants.email,
    applicantStatus: r.applicants.status,
    dueDate: r.due_date,
    remark: r.remark,
    status: r.status,
    resolvedAt: r.resolved_at,
    staffName: r.staff?.name ?? null,
  }));

  return (
    <div>
      <Header />
      <FollowUpsView
        items={items}
        today={today}
        initialTab={initialTab}
        instituteName={ctx.institute.display_name}
        sessionName={ctx.session.name}
        canEdit={ctx.role !== "Viewer"}
      />
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2">
      <CalendarClock className="h-5 w-5 text-accent" strokeWidth={1.8} />
      <div>
        <div className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-accent">
          Follow-ups
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">
          Follow-up tracking
        </h1>
      </div>
    </div>
  );
}
