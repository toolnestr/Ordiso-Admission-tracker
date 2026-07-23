import Link from "next/link";
import { AlertTriangle, ArrowRight, Search } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/superadmin";
import { planLabel } from "@/lib/plan";

const STATUS_BADGE: Record<string, string> = {
  Active: "badge-green",
  Suspended: "badge-red",
  Deactivated: "badge-neutral",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string; status?: string }>;
}) {
  await requireSuperAdmin();
  const { q, plan, status } = await searchParams;
  const service = createServiceClient();

  const [{ data: institutes }, { data: applicants }, { data: fields }] =
    await Promise.all([
      service
        .from("institutes")
        .select("id, display_name, plan, status, created_at, contact_email")
        .order("created_at", { ascending: false }),
      service.from("applicants").select("institute_id"),
      service.from("form_fields").select("institute_id"),
    ]);

  const all = institutes ?? [];

  // Roll counts up in memory — cross-tenant aggregates can't use RLS views,
  // and at platform scale this is a handful of rows per institute.
  const applicantCount: Record<string, number> = {};
  for (const a of applicants ?? []) {
    applicantCount[a.institute_id] = (applicantCount[a.institute_id] ?? 0) + 1;
  }
  const hasForm = new Set((fields ?? []).map((f) => f.institute_id));

  const filtered = all.filter((i) => {
    if (plan && i.plan !== plan) return false;
    if (status && i.status !== status) return false;
    if (q) {
      const hay = `${i.display_name} ${i.contact_email ?? ""} ${i.id}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const totalApplicants = (applicants ?? []).length;
  const premium = all.filter((i) => i.plan !== "Free").length;
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const newSignups = all.filter((i) => new Date(i.created_at) >= since).length;

  // Onboarding tracker (Section 3.8): registered but never got going.
  const stalled = all.filter(
    (i) => i.status === "Active" && (!hasForm.has(i.id) || !applicantCount[i.id]),
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Platform</h1>
      <p className="mt-1.5 text-[13.5px] text-muted">
        Every institute on Ordiso, across all tenants.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Institutes" value={all.length} />
        <Stat label="Premium" value={premium} sub={`${all.length - premium} free`} />
        <Stat label="Applicants processed" value={totalApplicants} />
        <Stat label="New in 30 days" value={newSignups} />
      </div>

      {stalled.length > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-300"
            strokeWidth={1.8}
          />
          <div>
            <div className="text-[13.5px] font-medium text-amber-300">
              {stalled.length} institute{stalled.length === 1 ? "" : "s"} haven&apos;t
              got started
            </div>
            <p className="mt-0.5 text-[12.5px] text-muted">
              Registered but no application form built, or no applicants yet —
              worth reaching out: {stalled.map((s) => s.display_name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Filters — plain GET form so the URL is shareable */}
      <form className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name, email, or ID…"
            className="surface-2 w-full rounded-lg py-2 pl-9 pr-3 text-[13.5px] outline-none focus:border-border-strong"
          />
        </div>
        <FilterLinks current={plan} param="plan" options={["Free", "Premium"]} q={q} status={status} />
        <FilterLinks current={status} param="status" options={["Active", "Suspended", "Deactivated"]} q={q} plan={plan} />
        <button
          type="submit"
          className="surface-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--border)]"
        >
          Search
        </button>
      </form>

      <div className="surface mt-4 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[720px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-border text-[12px] uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Institute</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Applicants</th>
              <th className="px-4 py-3 font-medium">Signed up</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  No institutes match.
                </td>
              </tr>
            ) : (
              filtered.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/institutes/${i.id}`}
                      className="font-medium hover:text-accent"
                    >
                      {i.display_name}
                    </Link>
                    <div className="text-[12px] text-muted">
                      {i.contact_email ?? "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${i.plan !== "Free" ? "badge-accent" : "badge-neutral"}`}>
                      {planLabel(i.plan)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_BADGE[i.status] ?? "badge-neutral"}`}>
                      {i.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {applicantCount[i.id] ?? 0}
                  </td>
                  <td className="px-4 py-3 text-muted-strong">{fmt(i.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/institutes/${i.id}`}
                      aria-label={`Manage ${i.display_name}`}
                      className="inline-flex items-center gap-1 text-[12.5px] text-muted transition-colors hover:text-foreground"
                    >
                      Manage
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="card-sheen rounded-xl p-4">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-[11.5px] text-muted">{sub}</div>}
    </div>
  );
}

function FilterLinks({
  current,
  param,
  options,
  q,
  plan,
  status,
}: {
  current?: string;
  param: "plan" | "status";
  options: string[];
  q?: string;
  plan?: string;
  status?: string;
}) {
  function href(v?: string) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (param === "plan") {
      if (v) p.set("plan", v);
      if (status) p.set("status", status);
    } else {
      if (plan) p.set("plan", plan);
      if (v) p.set("status", v);
    }
    return `/admin?${p.toString()}`;
  }

  return (
    <div className="surface-2 flex rounded-lg p-0.5">
      <Link
        href={href(undefined)}
        className={`rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
          !current ? "bg-[var(--border)] text-foreground" : "text-muted"
        }`}
      >
        All
      </Link>
      {options.map((o) => (
        <Link
          key={o}
          href={href(o)}
          className={`rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
            current === o ? "bg-[var(--border)] text-foreground" : "text-muted"
          }`}
        >
          {o}
        </Link>
      ))}
    </div>
  );
}
