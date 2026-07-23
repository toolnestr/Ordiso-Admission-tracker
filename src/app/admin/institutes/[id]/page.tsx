import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/superadmin";
import { PlanControl, StatusControl, DeleteControl } from "./InstituteControls";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminInstitutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;
  const service = createServiceClient();

  const { data: inst } = await service
    .from("institutes")
    .select(
      "id, display_name, plan, plan_expires_at, billing_cycle, status, created_at, contact_email, contact_phone, currency, timezone",
    )
    .eq("id", id)
    .maybeSingle();

  if (!inst) notFound();

  const [{ data: staff }, { data: sessions }, { count: applicantTotal }, { data: log }] =
    await Promise.all([
      service
        .from("staff")
        .select("name, email, role, status")
        .eq("institute_id", id)
        .neq("status", "Removed"),
      service
        .from("sessions")
        .select("name, status, start_date, end_date, total_applications_received")
        .eq("institute_id", id)
        .order("start_date", { ascending: false }),
      service
        .from("applicants")
        .select("id", { count: "exact", head: true })
        .eq("institute_id", id),
      service
        .from("super_admin_activity_log")
        .select("action_type, description, created_at")
        .eq("target_institute_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  return (
    <div>
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All institutes
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">
            {inst.display_name}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <span className="font-mono text-[12px]">{inst.id}</span>
            <span>·</span>
            <span>Joined {fmt(inst.created_at)}</span>
            {inst.contact_email && (
              <>
                <span>·</span>
                <a href={`mailto:${inst.contact_email}`} className="hover:text-foreground">
                  {inst.contact_email}
                </a>
              </>
            )}
          </div>
        </div>
        <Link
          href={`/apply/${inst.id}`}
          target="_blank"
          className="surface-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--border)]"
        >
          View public form
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card-sheen rounded-2xl p-5">
          <h3 className="text-[14px] font-medium">Plan</h3>
          <p className="mt-1 text-[12.5px] text-muted">
            Billing is sales-assisted — set it here after payment. Downgrading
            never deletes Premium data.
          </p>
          <div className="mt-4">
            <PlanControl
              instituteId={inst.id}
              plan={inst.plan}
              expiresAt={inst.plan_expires_at}
              billingCycle={inst.billing_cycle}
            />
          </div>
        </div>

        <div className="card-sheen rounded-2xl p-5 lg:col-span-2">
          <h3 className="text-[14px] font-medium">Status</h3>
          <p className="mt-1 text-[12.5px] text-muted">
            Suspended and Deactivated both take the public form offline and block
            portal access. Data is kept either way.
          </p>
          <div className="mt-4">
            <StatusControl instituteId={inst.id} status={inst.status} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card-sheen rounded-2xl p-5">
          <h3 className="text-[14px] font-medium">
            Staff{" "}
            <span className="text-[12px] font-normal text-muted">
              {staff?.length ?? 0}
            </span>
          </h3>
          <div className="mt-3 space-y-2">
            {(staff ?? []).map((s) => (
              <div
                key={s.email}
                className="flex items-center justify-between text-[13px]"
              >
                <div>
                  <div>{s.name}</div>
                  <div className="text-[12px] text-muted">{s.email}</div>
                </div>
                <span className="badge badge-neutral">{s.role}</span>
              </div>
            ))}
            {(staff ?? []).length === 0 && (
              <p className="text-[13px] text-muted">No staff.</p>
            )}
          </div>
        </div>

        <div className="card-sheen rounded-2xl p-5">
          <h3 className="text-[14px] font-medium">
            Sessions{" "}
            <span className="text-[12px] font-normal text-muted">
              {applicantTotal ?? 0} applicants all-time
            </span>
          </h3>
          <div className="mt-3 space-y-2">
            {(sessions ?? []).map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between text-[13px]"
              >
                <div>
                  <div>{s.name}</div>
                  <div className="text-[12px] text-muted">
                    {fmt(s.start_date)} — {fmt(s.end_date)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] tabular-nums text-muted">
                    {s.total_applications_received}
                  </span>
                  <span
                    className={`badge ${s.status === "Open" ? "badge-accent" : "badge-neutral"}`}
                  >
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
            {(sessions ?? []).length === 0 && (
              <p className="text-[13px] text-muted">No sessions yet.</p>
            )}
          </div>
        </div>
      </div>

      {(log ?? []).length > 0 && (
        <div className="card-sheen mt-4 rounded-2xl p-5">
          <h3 className="text-[14px] font-medium">Super Admin actions</h3>
          <div className="mt-3 space-y-2">
            {(log ?? []).map((l, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-border pb-2 text-[13px] last:border-0 last:pb-0"
              >
                <span>{l.description}</span>
                <span className="text-[12px] text-muted">
                  {new Date(l.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <DeleteControl instituteId={inst.id} instituteName={inst.display_name} />
      </div>
    </div>
  );
}
