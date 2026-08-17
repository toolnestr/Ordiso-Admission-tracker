import Link from "next/link";
import {
  ArrowRight,
  CalendarPlus,
  Share2,
  TrendingUp,
  TrendingDown,
  CalendarClock,
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  GraduationCap,
  UserPlus,
  CalendarCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext, FREE_TIER_CAP } from "@/lib/portal";
import {
  ymdInTz,
  fetchSessionFollowUps,
  bucketFollowUps,
} from "@/lib/followups";
import Funnel from "@/components/charts/Funnel";
import Donut from "@/components/charts/Donut";
import AreaChart from "@/components/charts/AreaChart";
import { stageColor, sourceColor } from "@/components/charts/palette";
import ScreenshotButton from "@/components/portal/ScreenshotButton";

type Row = {
  id: string;
  status: string;
  source: string;
  created_at: string;
  confirmed_at?: string | null;
};

function summarize(rows: Row[]) {
  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    bySource[r.source] = (bySource[r.source] ?? 0) + 1;
  }
  const confirmed = byStatus["Confirmed"] ?? 0;
  return {
    total: rows.length,
    byStatus,
    bySource,
    confirmed,
    admitted: byStatus["Admitted"] ?? 0,
    shortlisted: byStatus["Shortlisted"] ?? 0,
    interview: byStatus["Interview"] ?? 0,
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

  // Current session rows with confirmation timestamps.
  const { data: rows } = await supabase
    .from("applicants")
    .select("id, status, source, created_at, confirmed_at")
    .eq("session_id", ctx.session.id);
  const sessionRows = (rows ?? []) as Row[];
  const cur = summarize(sessionRows);

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
      .select("id, status, source, created_at, confirmed_at")
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

  // Read institute timezone for precise "Today" calculations.
  const { data: inst } = await supabase
    .from("institutes")
    .select("timezone")
    .eq("id", ctx.institute.id)
    .maybeSingle();

  const userTz = inst?.timezone ?? "UTC";
  const todayYmd = ymdInTz(new Date(), userTz);

  // Recent activity logs (for tracking status updates made today like Admitted, Confirmed, Shortlisted).
  const { data: recentActivity } = await supabase
    .from("activity_log")
    .select("action_type, description, created_at, applicant_id")
    .eq("institute_id", ctx.institute.id)
    .gte("created_at", new Date(Date.now() - 48 * 3600 * 1000).toISOString())
    .order("created_at", { ascending: false });

  // Filter today's activity logs according to the institute's timezone.
  const todayLogs = (recentActivity ?? []).filter(
    (l) => ymdInTz(new Date(l.created_at), userTz) === todayYmd,
  );

  // 1. Applicants created today (New Enquiry today).
  const createdToday = sessionRows.filter(
    (r) => ymdInTz(new Date(r.created_at), userTz) === todayYmd,
  );
  const todayAppliedCount = createdToday.length;
  const todayAppliedForm = createdToday.filter((r) => r.source !== "Manual").length;
  const todayAppliedManual = createdToday.filter((r) => r.source === "Manual").length;

  // 2. Confirmed today:
  const todayConfirmedIds = new Set<string>();
  for (const r of sessionRows) {
    if (r.confirmed_at && ymdInTz(new Date(r.confirmed_at), userTz) === todayYmd) {
      todayConfirmedIds.add(r.id);
    } else if (
      r.status === "Confirmed" &&
      !r.confirmed_at &&
      ymdInTz(new Date(r.created_at), userTz) === todayYmd
    ) {
      todayConfirmedIds.add(r.id);
    }
  }
  for (const l of todayLogs) {
    if (
      l.action_type === "admission_confirmed" ||
      (l.action_type === "status_change" &&
        (l.description.includes("→ Confirmed") || l.description.includes("to Confirmed")))
    ) {
      if (l.applicant_id) todayConfirmedIds.add(l.applicant_id);
    }
  }
  const todayConfirmedCount = todayConfirmedIds.size;

  // 3. Admitted today:
  const todayAdmittedIds = new Set<string>();
  for (const r of createdToday) {
    if (r.status === "Admitted") todayAdmittedIds.add(r.id);
  }
  for (const l of todayLogs) {
    if (
      l.action_type === "status_change" &&
      (l.description.includes("→ Admitted") ||
        l.description.includes("to Admitted") ||
        l.description.includes("updated to Admitted"))
    ) {
      if (l.applicant_id) todayAdmittedIds.add(l.applicant_id);
    }
  }
  const todayAdmittedCount = todayAdmittedIds.size;

  // 4. Shortlisted today:
  const todayShortlistedIds = new Set<string>();
  for (const r of createdToday) {
    if (r.status === "Shortlisted") todayShortlistedIds.add(r.id);
  }
  for (const l of todayLogs) {
    if (
      l.action_type === "status_change" &&
      (l.description.includes("→ Shortlisted") ||
        l.description.includes("to Shortlisted") ||
        l.description.includes("updated to Shortlisted"))
    ) {
      if (l.applicant_id) todayShortlistedIds.add(l.applicant_id);
    }
  }
  const todayShortlistedCount = todayShortlistedIds.size;

  // 5. Interviews scheduled / status today:
  const todayInterviewIds = new Set<string>();
  for (const r of createdToday) {
    if (r.status === "Interview") todayInterviewIds.add(r.id);
  }
  for (const l of todayLogs) {
    if (
      l.action_type === "interview_scheduled" ||
      (l.action_type === "status_change" &&
        (l.description.includes("→ Interview") || l.description.includes("to Interview")))
    ) {
      if (l.applicant_id) todayInterviewIds.add(l.applicant_id);
    }
  }
  const todayInterviewCount = todayInterviewIds.size;

  // Follow-up tracking (current-session scope).
  const followRows = await fetchSessionFollowUps(supabase, ctx.session.id);
  const followUps = bucketFollowUps(followRows, todayYmd);

  // Formatted date string in user's timezone.
  const todayDisplay = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: userTz,
  }).format(new Date());

  // Dense day series across the session window.
  const dayMap: Record<string, number> = {};
  for (const r of sessionRows) {
    dayMap[r.created_at.slice(0, 10)] = (dayMap[r.created_at.slice(0, 10)] ?? 0) + 1;
  }
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

  // Exact snapshot counts for funnel stages.
  const stageValue = (s: string) =>
    s === "Confirmed" ? cur.confirmed : cur.byStatus[s] ?? 0;
  const funnelStages = FUNNEL.map((s, i) => ({
    label: s,
    value: i === 0 ? cur.total : stageValue(s),
  }));

  const statusSlices = FUNNEL.concat("Rejected")
    .map((s) => ({
      label: s,
      value: s === "Confirmed" ? cur.confirmed : cur.byStatus[s] ?? 0,
      color: stageColor(s),
    }))
    .filter((d) => d.value > 0);

  // Two buckets: staff-added ("Manual") vs everything from the public form.
  const manualCount = cur.bySource["Manual"] ?? 0;
  const formCount = cur.total - manualCount;
  const sourceSlices = [
    { label: "QR / Link", value: formCount, color: sourceColor("QR / Link") },
    { label: "Manual", value: manualCount, color: sourceColor("Manual") },
  ].filter((d) => d.value > 0);

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
        {/* ========================================================= */}
        {/* CURRENT DAY LIVE OVERVIEW SECTION                         */}
        {/* ========================================================= */}
        <div className="mt-6 rounded-2xl border border-border bg-surface-2/40 p-4 sm:p-5">
          <div className="flex items-center gap-2.5 border-b border-border/70 pb-3.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-foreground">
              Today&apos;s Live Summary
            </h2>
            <span className="rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">
              {todayDisplay}
            </span>
          </div>

          {/* Primary Today Cards Grid */}
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <TodayCard
              href="/applicants"
              tone="green"
              icon={<CheckCircle2 className="h-4 w-4" strokeWidth={2} />}
              label="Confirmed Today"
              value={todayConfirmedCount}
              subtext={
                todayConfirmedCount > 0
                  ? `${todayConfirmedCount} admission${todayConfirmedCount === 1 ? "" : "s"} finalized`
                  : "No confirmations yet"
              }
            />

            <TodayCard
              href="/applicants"
              tone="blue"
              icon={<GraduationCap className="h-4 w-4" strokeWidth={2} />}
              label="Admitted Today"
              value={todayAdmittedCount}
              subtext={
                todayAdmittedCount > 0
                  ? `${todayAdmittedCount} offer${todayAdmittedCount === 1 ? "" : "s"} given today`
                  : "No admissions today"
              }
            />

            <TodayCard
              href="/applicants"
              tone="accent"
              icon={<UserPlus className="h-4 w-4" strokeWidth={2} />}
              label="New Enquiry Today"
              value={todayAppliedCount}
              subtext={
                todayAppliedCount > 0
                  ? `${todayAppliedForm} form · ${todayAppliedManual} walk-in`
                  : "No new enquiries yet"
              }
            />

            <TodayCard
              href="/applicants"
              tone="amber"
              icon={<CalendarCheck className="h-4 w-4" strokeWidth={2} />}
              label="Shortlisted & Interviews"
              value={todayShortlistedCount + todayInterviewCount}
              subtext={
                todayShortlistedCount > 0 || todayInterviewCount > 0
                  ? `${todayShortlistedCount} shortlisted · ${todayInterviewCount} interview`
                  : "No reviews scheduled"
              }
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* SESSION CUMULATIVE KPIS (WITH HISTORICAL TRENDS)          */}
        {/* ========================================================= */}
        <div className="mt-6">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">
              Session Overview · {ctx.session.name}
            </h3>
            <span className="text-[11.5px] text-muted">vs previous session</span>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Total applicants" value={cur.total} prior={prev?.total} />
            <Stat label="Shortlisted" value={cur.shortlisted} prior={prev?.shortlisted} />
            <Stat label="Admitted" value={cur.admitted} prior={prev?.admitted} />
            <Stat label="Confirmed" value={cur.confirmed} prior={prev?.confirmed} />
          </div>
        </div>

        {/* Follow-up tracking — click a tile to see the applicants behind it. */}
        {cur.total > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FollowTile
              href="/follow-ups?tab=today"
              icon={<CalendarClock className="h-4 w-4" strokeWidth={1.8} />}
              label="Follow up today"
              value={followUps.todayRemaining}
              hint={
                followUps.todayTotal > 0
                  ? `${followUps.todayRemaining} of ${followUps.todayTotal} remaining`
                  : "Nothing due today"
              }
              tone="accent"
            />
            <FollowTile
              href="/follow-ups?tab=overdue"
              icon={<AlertTriangle className="h-4 w-4" strokeWidth={1.8} />}
              label="Overdue"
              value={followUps.overdue}
              hint={
                followUps.overdue > 0 ? "From previous dates" : "All caught up"
              }
              tone={followUps.overdue > 0 ? "red" : "muted"}
            />
            <FollowTile
              href="/follow-ups?tab=month"
              icon={<CalendarRange className="h-4 w-4" strokeWidth={1.8} />}
              label="Pending this month"
              value={followUps.monthPending}
              hint="Up to today"
              tone="amber"
            />
          </div>
        )}

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

              {/* Cap + conversion + quick actions — excluded from the shared
                  screenshot (not useful in an exported/shared image). */}
              <div className="space-y-4" data-screenshot-exclude>
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

function TodayCard({
  label,
  value,
  subtext,
  icon,
  tone = "accent",
  href,
}: {
  label: string;
  value: string | number;
  subtext: string;
  icon: React.ReactNode;
  tone?: "green" | "blue" | "accent" | "amber";
  href?: string;
}) {
  const toneMap = {
    green: {
      badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      border: "border-emerald-500/20 hover:border-emerald-500/40",
      gradient: "from-emerald-500/[0.05] to-transparent",
    },
    blue: {
      badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      border: "border-blue-500/20 hover:border-blue-500/40",
      gradient: "from-blue-500/[0.05] to-transparent",
    },
    accent: {
      badge: "bg-[var(--accent-soft)] text-accent border-accent/25",
      border: "border-accent/20 hover:border-accent/40",
      gradient: "from-[var(--accent)]/[0.05] to-transparent",
    },
    amber: {
      badge: "bg-amber-500/10 text-amber-300 border-amber-500/20",
      border: "border-amber-500/20 hover:border-amber-500/40",
      gradient: "from-amber-500/[0.05] to-transparent",
    },
  };

  const currentTone = toneMap[tone];

  const inner = (
    <div
      className={`card-sheen relative overflow-hidden rounded-xl border p-4 transition-all duration-200 bg-gradient-to-b ${currentTone.border} ${currentTone.gradient}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-muted">{label}</span>
        <span
          className={`grid h-7 w-7 place-items-center rounded-lg border text-[13px] ${currentTone.badge}`}
        >
          {icon}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </span>
      </div>
      <p className="mt-1 truncate text-[11.5px] text-muted">{subtext}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-transform hover:-translate-y-0.5">
        {inner}
      </Link>
    );
  }

  return inner;
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

function FollowTile({
  href,
  icon,
  label,
  value,
  hint,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
  tone: "accent" | "amber" | "red" | "muted";
}) {
  const toneCls =
    tone === "red"
      ? "text-red-400"
      : tone === "amber"
        ? "text-amber-300"
        : tone === "accent"
          ? "text-accent"
          : "text-muted";
  return (
    <Link
      href={href}
      className="card-sheen group flex items-center justify-between rounded-xl p-4 transition-colors hover:border-border-strong"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <span className={toneCls}>{icon}</span>
          {label}
        </div>
        <div className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</div>
        <div className="mt-0.5 text-[11.5px] text-muted">{hint}</div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
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

