import Link from "next/link";
import { ArrowRight, CalendarPlus, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext, FREE_TIER_CAP } from "@/lib/portal";

const PIPELINE = [
  "Applied",
  "Shortlisted",
  "Interview",
  "Admitted",
  "Confirmed",
] as const;

export default async function DashboardPage() {
  const ctx = await getPortalContext();
  const supabase = await createClient();

  // Live counts per status for the current session. (session_stats caching +
  // triggers come later; a direct grouped read is correct and cheap now.)
  const counts: Record<string, number> = {};
  let total = 0;
  if (ctx.session) {
    const { data: rows } = await supabase
      .from("applicants")
      .select("status")
      .eq("session_id", ctx.session.id);
    for (const r of rows ?? []) {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
      total++;
    }
  }

  const confirmed =
    (counts["Confirmed"] ?? 0) + (counts["Confirmed-Partial"] ?? 0);

  const stats = [
    { label: "Total applicants", value: total },
    { label: "Shortlisted", value: counts["Shortlisted"] ?? 0 },
    { label: "Admitted", value: counts["Admitted"] ?? 0 },
    { label: "Confirmed", value: confirmed },
  ];

  const funnelMax = Math.max(total, 1);
  const funnel = PIPELINE.map((stage) => {
    const v =
      stage === "Confirmed"
        ? confirmed
        : stage === "Applied"
          ? total
          : (counts[stage] ?? 0);
    return { stage, value: v, pct: Math.round((v / funnelMax) * 100) };
  });

  return (
    <div>
      <div className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-accent">
        Dashboard
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
        Welcome back, {ctx.name.split(" ")[0]}
      </h1>

      {!ctx.session ? (
        <NoSessionBanner />
      ) : (
        <>
          {/* Stat cards */}
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="card-sheen rounded-xl p-4">
                <div className="text-[12px] text-muted">{s.label}</div>
                <div className="mt-1.5 text-2xl font-semibold tabular-nums">
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {/* Funnel */}
            <div className="card-sheen rounded-2xl p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[14px] font-medium">Applicant funnel</h3>
                <span className="text-[12px] text-muted">{ctx.session.name}</span>
              </div>
              {total === 0 ? (
                <p className="py-8 text-center text-[13.5px] text-muted">
                  No applicants yet. Share your form to start collecting
                  applications.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {funnel.map((f) => (
                    <div key={f.stage} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-[12.5px] text-muted-strong">
                        {f.stage}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent/70 to-accent"
                          style={{ width: `${f.pct}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-[12.5px] tabular-nums text-muted">
                        {f.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cap + quick actions */}
            <div className="space-y-4">
              {ctx.institute.plan === "Free" && (
                <div className="card-sheen rounded-2xl p-5">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-[14px] font-medium">Free tier usage</h3>
                    <span className="text-[12px] tabular-nums text-muted">
                      {total} / {FREE_TIER_CAP}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.04]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent/70 to-accent"
                      style={{
                        width: `${Math.min((total / FREE_TIER_CAP) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  {ctx.session.target_goal && (
                    <p className="mt-3 text-[12.5px] text-muted">
                      Target: {confirmed + (counts["Admitted"] ?? 0)} /{" "}
                      {ctx.session.target_goal} admissions
                    </p>
                  )}
                </div>
              )}

              <div className="card-sheen rounded-2xl p-5">
                <h3 className="text-[14px] font-medium">Quick actions</h3>
                <div className="mt-3 space-y-2">
                  <Link
                    href="/share"
                    className="surface flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-colors hover:border-border-strong"
                  >
                    <Share2 className="h-4 w-4 text-accent" strokeWidth={1.7} />
                    Share application link
                  </Link>
                  <Link
                    href="/applicants"
                    className="surface flex items-center justify-between rounded-lg px-3 py-2.5 text-[13px] transition-colors hover:border-border-strong"
                  >
                    <span>View all applicants</span>
                    <ArrowRight className="h-4 w-4 text-muted" strokeWidth={1.7} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
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
            You need an open admission session before you can collect
            applications. Create one to get started.
          </p>
        </div>
      </div>
      <Link
        href="/sessions"
        className="inline-flex items-center gap-2 rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
      >
        Create a session
        <ArrowRight className="h-4 w-4" strokeWidth={2} />
      </Link>
    </div>
  );
}
