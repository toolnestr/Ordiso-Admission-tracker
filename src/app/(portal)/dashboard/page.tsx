import Link from "next/link";
import { ArrowRight, CalendarPlus, Share2, TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext, FREE_TIER_CAP } from "@/lib/portal";
import Funnel from "@/components/charts/Funnel";
import Donut from "@/components/charts/Donut";
import AreaChart from "@/components/charts/AreaChart";
import { stageColor, sourceColor } from "@/components/charts/palette";
import ScreenshotButton from "@/components/portal/ScreenshotButton";

type Row = { status: string; source: string; created_at: string };

function summarize(rows: Row[]) {
  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    bySource[r.source] = (bySource[r.source] ?? 0) + 1;
  }
  const confirmed =
    (byStatus["Confirmed"] ?? 0) + (byStatus["Confirmed-Partial"] ?? 0);
  return {
    total: rows.length,
    byStatus,
    bySource,
    confirmed,
    admitted: byStatus["Admitted"] ?? 0,
    shortlisted: byStatus["Shortlisted"] ?? 0,
  };
}

function displayName(form_data: Record<string, unknown>, fallback: string) {
  if (form_data) {
    for (const [k, v] of Object.entries(form_data)) {
      if (/name/i.test(k) && typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return fallback;
}

const STATUS_BADGE: Record<string, string> = {
  Applied: "badge-neutral",
  Shortlisted: "badge-accent",
  Interview: "badge-amber",
  Admitted: "badge-blue",
  Confirmed: "badge-green",
  "Confirmed-Partial": "badge-green",
  Rejected: "badge-red",
};

const FUNNEL = ["Applied", "Shortlisted", "Interview", "Admitted", "Confirmed"];

export default async function DashboardPage() {
  const ctx = await getPortalContext();
  const supabase = await createClient();

  if (!ctx.session) {
    return (
      <div>
        <Header name={ctx.name} />
        <NoSessionBanner />
      </div>
    );
  }

  // Current session rows.
  const { data: rows } = await supabase
    .from("applicants")
    .select("status, source, created_at")
    .eq("session_id", ctx.session.id);
  const cur = summarize((rows ?? []) as Row[]);

  // Previous session (for deltas) — next-oldest by start_date.
  const { data: prevSession } = await supabase
    .from("sessions")
    .select("id")
    .lt("start_date", ctx.session.start_date)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  let prev: ReturnType<typeof summarize> | null = null;
  if (prevSession) {
    const { data: prevRows } = await supabase
      .from("applicants")
      .select("status, source, created_at")
      .eq("session_id", prevSession.id);
    prev = summarize((prevRows ?? []) as Row[]);
  }

  // Recent applicants (last 5).
  const { data: recent } = await supabase
    .from("applicants")
    .select("id, form_data, email, status, created_at")
    .eq("session_id", ctx.session.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Dense day series across the session window.
  const dayMap: Record<string, number> = {};
  for (const r of rows ?? []) dayMap[r.created_at.slice(0, 10)] = (dayMap[r.created_at.slice(0, 10)] ?? 0) + 1;
  const byDay: { date: string; count: number }[] = [];
  const start = new Date(ctx.session.start_date + "T00:00:00");
  const end = new Date(ctx.session.end_date + "T00:00:00");
  const today = new Date();
  const last = end < today ? end : today;
  for (let d = new Date(start); d <= last; d.setDate(d.getDate() + 1)) {
    const key = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
    byDay.push({ date: key, count: dayMap[key] ?? 0 });
  }

  const conversion = cur.total > 0 ? Math.round((cur.confirmed / cur.total) * 100) : 0;
  const prevConversion = prev && prev.total > 0 ? Math.round((prev.confirmed / prev.total) * 100) : null;

  // A funnel must count "reached at least this stage" (cumulative), not the
  // snapshot per-stage count — stages are skippable (Section 2.13), so a later
  // stage can hold more people than an earlier one, which would make the raw
  // counts non-monotonic and produce nonsense conversion like ">100%".
  const stageValue = (s: string) =>
    s === "Confirmed" ? cur.confirmed : cur.byStatus[s] ?? 0;
  const funnelStages = FUNNEL.map((s, i) => ({
    label: s,
    value:
      i === 0 ? cur.total : FUNNEL.slice(i).reduce((sum, st) => sum + stageValue(st), 0),
  }));

  const statusSlices = FUNNEL.concat("Rejected")
    .map((s) => ({
      label: s,
      value: s === "Confirmed" ? cur.confirmed : cur.byStatus[s] ?? 0,
      color: stageColor(s),
    }))
    .filter((d) => d.value > 0);

  const sourceSlices = ["QR", "Direct", "Shared"]
    .map((s) => ({ label: s, value: cur.bySource[s] ?? 0, color: sourceColor(s) }))
    .filter((d) => d.value > 0);

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <Header name={ctx.name} />
        <ScreenshotButton
          targetId="dashboard-capture"
          filePrefix="ordiso-dashboard"
        />
      </div>

      <div id="dashboard-capture">
      {/* KPI row with trends vs previous session */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total applicants" value={cur.total} prior={prev?.total} />
        <Stat label="Shortlisted" value={cur.shortlisted} prior={prev?.shortlisted} />
        <Stat label="Admitted" value={cur.admitted} prior={prev?.admitted} />
        <Stat label="Confirmed" value={cur.confirmed} prior={prev?.confirmed} />
      </div>

      {cur.total === 0 ? (
        <EmptyState hasSession />
      ) : (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card title="Admission funnel" subtitle="Drop-off at each stage" className="lg:col-span-2">
              <Funnel stages={funnelStages} />
            </Card>
            <Card title="Status distribution" subtitle="Share by stage">
              <Donut data={statusSlices} centerLabel="Applicants" size={150} />
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card title="Applications over time" subtitle={ctx.session.name} className="lg:col-span-2">
              <AreaChart data={byDay.map((d) => ({ date: d.date, value: d.count }))} height={180} />
            </Card>
            <Card title="Applicant sources" subtitle="Where they came from">
              {sourceSlices.length > 0 ? (
                <Donut data={sourceSlices} centerLabel="Applicants" size={150} />
              ) : (
                <p className="py-8 text-center text-[13px] text-muted">No source data.</p>
              )}
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {/* Recent applicants */}
            <div className="card-sheen rounded-2xl p-5 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-medium">Recent applicants</h3>
                <Link href="/applicants" className="text-[12.5px] text-accent hover:underline">
                  View all
                </Link>
              </div>
              <div className="mt-3 divide-y divide-[var(--border)]">
                {(recent ?? []).map((a) => (
                  <Link
                    key={a.id}
                    href={`/applicants/${a.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:opacity-80"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-medium">
                        {displayName(a.form_data as Record<string, unknown>, a.email || "Unknown")}
                      </div>
                      <div className="text-[12px] text-muted">
                        {new Date(a.created_at).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    </div>
                    <span className={`badge ${STATUS_BADGE[a.status] ?? "badge-neutral"}`}>
                      {a.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Cap + conversion + quick actions */}
            <div className="space-y-4">
              {ctx.institute.plan === "Free" && (
                <Card title="Free tier usage">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12px] text-muted">This session</span>
                    <span className="text-[12px] tabular-nums text-muted">
                      {cur.total} / {FREE_TIER_CAP}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full track">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent/70 to-accent"
                      style={{ width: `${Math.min((cur.total / FREE_TIER_CAP) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
                    <span className="text-[12px] text-muted">Conversion</span>
                    <span className="text-[13px] font-medium tabular-nums">
                      {conversion}%
                      {prevConversion !== null && prevConversion !== conversion && (
                        <span className={`ml-1.5 text-[11px] ${conversion > prevConversion ? "text-emerald-400" : "text-muted"}`}>
                          {conversion > prevConversion ? "+" : ""}
                          {conversion - prevConversion}%
                        </span>
                      )}
                    </span>
                  </div>
                </Card>
              )}

              <Card title="Quick actions">
                <div className="space-y-2">
                  <Link href="/share" className="surface flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-colors hover:border-border-strong">
                    <Share2 className="h-4 w-4 text-accent" strokeWidth={1.7} />
                    Share application link
                  </Link>
                  <Link href="/applicants" className="surface flex items-center justify-between rounded-lg px-3 py-2.5 text-[13px] transition-colors hover:border-border-strong">
                    <span>View all applicants</span>
                    <ArrowRight className="h-4 w-4 text-muted" strokeWidth={1.7} />
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}

function Header({ name }: { name: string }) {
  return (
    <>
      <div className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-accent">
        Dashboard
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
        Welcome back, {name.split(" ")[0]}
      </h1>
    </>
  );
}

function Card({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`card-sheen rounded-2xl p-5 ${className}`}>
      <h3 className="text-[14px] font-medium">{title}</h3>
      {subtitle && <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Stat({ label, value, prior }: { label: string; value: number; prior?: number }) {
  const delta = prior === undefined ? null : value - prior;
  return (
    <div className="card-sheen rounded-xl p-4">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {delta !== null && delta !== 0 && (
          <span className={`inline-flex items-center gap-0.5 text-[11.5px] font-medium ${delta > 0 ? "text-emerald-400" : "text-muted"}`}>
            {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta)}
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyState({ hasSession }: { hasSession: boolean }) {
  return (
    <div className="card-sheen mt-4 rounded-2xl px-6 py-16 text-center">
      <h3 className="text-[15px] font-medium">No applicants yet</h3>
      <p className="mt-1.5 text-[13.5px] text-muted">
        {hasSession
          ? "Share your form to start collecting applications — your charts will come alive here."
          : "Open a session first."}
      </p>
      <Link href="/share" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90">
        <Share2 className="h-4 w-4" strokeWidth={1.8} />
        Share your link
      </Link>
    </div>
  );
}

function NoSessionBanner() {
  return (
    <div className="card-sheen mt-6 flex flex-col items-start gap-3 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-surface-2 text-accent">
          <CalendarPlus className="h-5 w-5" strokeWidth={1.6} />
        </span>
        <div>
          <h3 className="text-[15px] font-medium">No open session</h3>
          <p className="mt-1 max-w-md text-[13.5px] text-muted">
            You need an open admission session before you can collect applications.
          </p>
        </div>
      </div>
      <Link href="/sessions" className="inline-flex items-center gap-2 rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90">
        Create a session
        <ArrowRight className="h-4 w-4" strokeWidth={2} />
      </Link>
    </div>
  );
}
