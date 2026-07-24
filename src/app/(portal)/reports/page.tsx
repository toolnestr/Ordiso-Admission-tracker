import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import ReportsView from "./ReportsView";

export type SessionMeta = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
};

export type Totals = {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  byDay: { date: string; count: number }[];
  admitted: number;
  confirmed: number;
};

const PIPELINE = [
  "Applied",
  "Shortlisted",
  "Interview",
  "Admitted",
  "Confirmed",
  "Confirmed-Partial",
  "Rejected",
];

function summarize(
  rows: { status: string; source: string; created_at: string }[],
  session: SessionMeta | null,
): Totals {
  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const dayMap: Record<string, number> = {};

  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    bySource[r.source] = (bySource[r.source] ?? 0) + 1;
    const d = r.created_at.slice(0, 10);
    dayMap[d] = (dayMap[d] ?? 0) + 1;
  }

  // Dense day series across the session window so gaps read as real zeroes
  // rather than the line skipping over them.
  const byDay: { date: string; count: number }[] = [];
  if (session) {
    const start = new Date(session.start_date + "T00:00:00");
    const end = new Date(session.end_date + "T00:00:00");
    const today = new Date();
    const last = end < today ? end : today;
    for (let d = new Date(start); d <= last; d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
      byDay.push({ date: key, count: dayMap[key] ?? 0 });
    }
  }

  const confirmed =
    (byStatus["Confirmed"] ?? 0) + (byStatus["Confirmed-Partial"] ?? 0);

  return {
    total: rows.length,
    byStatus,
    bySource,
    byDay,
    admitted: byStatus["Admitted"] ?? 0,
    confirmed,
  };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const ctx = await getPortalContext(); // gates access + redirects if signed out
  const { session: sessionParam } = await searchParams;
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, name, start_date, end_date, status")
    .order("start_date", { ascending: false });

  const list = (sessions ?? []) as SessionMeta[];

  if (list.length === 0) {
    return (
      <div>
        <Header />
        <div className="card-sheen mt-6 rounded-2xl px-6 py-16 text-center">
          <h3 className="text-[15px] font-medium">Nothing to report yet</h3>
          <p className="mt-1.5 text-[13.5px] text-muted">
            Create an admission session and start collecting applications.
          </p>
        </div>
      </div>
    );
  }

  const selected = list.find((s) => s.id === sessionParam) ?? list[0];
  const selectedIdx = list.findIndex((s) => s.id === selected.id);
  const previous = list[selectedIdx + 1] ?? null; // next-oldest

  const [{ data: curRows }, { data: prevRows }] = await Promise.all([
    supabase
      .from("applicants")
      .select("status, source, created_at")
      .eq("session_id", selected.id),
    previous
      ? supabase
          .from("applicants")
          .select("status, source, created_at")
          .eq("session_id", previous.id)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const current = summarize(curRows ?? [], selected);
  const prior = previous ? summarize(prevRows ?? [], previous) : null;

  // Detailed rows for the PDF reports (names, program, reasons, dates).
  const { data: detailRows } = await supabase
    .from("applicants")
    .select(
      "application_id, form_data, status, source, created_at, confirmed_at, confirmation_reason, rejection_reason, programs(name)",
    )
    .eq("session_id", selected.id)
    .order("created_at", { ascending: true });

  return (
    <div>
      <Header />
      <ReportsView
        sessions={list}
        selected={selected}
        previous={previous}
        current={current}
        prior={prior}
        pipeline={PIPELINE}
        instituteName={ctx.institute.display_name}
        rows={(detailRows ?? []) as never[]}
      />
    </div>
  );
}

function Header() {
  return (
    <>
      <div className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-accent">
        Reports
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
        Analytics
      </h1>
      <p className="mt-1.5 max-w-lg text-[13.5px] text-muted">
        How this admission session is tracking, and how it compares to your last
        one.
      </p>
    </>
  );
}
