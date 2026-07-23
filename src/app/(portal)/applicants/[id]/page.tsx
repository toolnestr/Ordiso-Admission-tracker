import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, MessageCircle, Users2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import StatusControl from "./StatusControl";
import DetailTabs from "./DetailTabs";
import EmailButton from "./EmailButton";

const STATUS_STYLE: Record<string, string> = {
  Applied: "badge-neutral",
  Shortlisted: "badge-accent",
  Interview: "badge-amber",
  Admitted: "badge-blue",
  Confirmed: "badge-green",
  "Confirmed-Partial": "badge-green",
  Rejected: "badge-red",
};

function displayName(form_data: Record<string, unknown>, fallback: string) {
  if (form_data) {
    for (const [key, val] of Object.entries(form_data)) {
      if (/name/i.test(key) && typeof val === "string" && val.trim()) {
        return val.trim();
      }
    }
  }
  return fallback;
}

export default async function ApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getPortalContext();
  const supabase = await createClient();

  const { data: applicant } = await supabase
    .from("applicants")
    .select(
      "id, application_id, form_data, email, phone, status, source, created_at, confirmed_at, confirmation_reason, fee_exempt, fee_exempt_reason, family_id, family_label, family_code, programs(name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!applicant) notFound();

  // Siblings: other applicants in the same family group (RLS scopes to this
  // institute automatically). Only fetched when this applicant is in a family.
  let siblings:
    | { id: string; application_id: string; form_data: unknown; status: string }[]
    | null = null;
  if (applicant.family_id) {
    const { data: sibs } = await supabase
      .from("applicants")
      .select("id, application_id, form_data, status")
      .eq("family_id", applicant.family_id)
      .neq("id", applicant.id)
      .order("created_at", { ascending: true });
    siblings = sibs ?? [];
  }

  // Family fees: every sibling's fees, so payments can be collected for the
  // whole family from one place (the Fees tab).
  let familyFees:
    | { id: string; name: string; fees: unknown[] }[]
    | null = null;
  if (siblings && siblings.length > 0) {
    const ids = siblings.map((s) => s.id);
    const { data: sibFees } = await supabase
      .from("applicant_fees")
      .select(
        "id, name, amount, status, amount_paid, remaining_balance, applicant_id, fee_payment_history(id, amount, paid_on, staff(name))",
      )
      .in("applicant_id", ids);
    familyFees = siblings
      .map((s) => ({
        id: s.id,
        name: displayName(
          (s.form_data ?? {}) as Record<string, unknown>,
          s.application_id,
        ),
        fees: (sibFees ?? []).filter(
          (f) => (f as { applicant_id: string }).applicant_id === s.id,
        ),
      }))
      .filter((s) => s.fees.length > 0);
  }

  const [{ data: fees }, { data: notes }, { data: comms }, { data: activity }] =
    await Promise.all([
      supabase
        .from("applicant_fees")
        .select(
          "id, name, amount, status, amount_paid, remaining_balance, fee_payment_history(id, amount, paid_on, staff(name))",
        )
        .eq("applicant_id", id),
      supabase
        .from("notes")
        .select("id, content, created_at, staff_id, staff(name)")
        .eq("applicant_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("communication_log")
        .select("id, type, summary, outcome_tag, created_at, staff(name)")
        .eq("applicant_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("activity_log")
        .select("id, action_type, description, reason, created_at, staff(name)")
        .eq("applicant_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const form_data = (applicant.form_data ?? {}) as Record<string, unknown>;
  const name = displayName(form_data, applicant.email || "Unknown");
  const program = Array.isArray(applicant.programs)
    ? applicant.programs[0]
    : applicant.programs;

  const totalDue = (fees ?? []).reduce(
    (sum, f) => sum + Number(f.remaining_balance ?? 0),
    0,
  );

  return (
    <div>
      <Link
        href="/applicants"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All applicants
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">{name}</h1>
            <span className={`badge ${STATUS_STYLE[applicant.status] ?? "badge-neutral"}`}>
              {applicant.status}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <span className="font-mono">{applicant.application_id}</span>
            <span>·</span>
            <span>
              Applied{" "}
              {new Date(applicant.created_at).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span>·</span>
            <span>via {applicant.source}</span>
            {program?.name && (
              <>
                <span>·</span>
                <span>{program.name}</span>
              </>
            )}
          </div>
        </div>

        {/* Quick contact — zero backend cost, just URL schemes (Section 2.5a) */}
        <div className="flex items-center gap-2">
          {applicant.phone && (
            <>
              <a
                href={`https://wa.me/${applicant.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="surface-2 grid h-9 w-9 place-items-center rounded-lg text-muted-strong transition-colors hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4" strokeWidth={1.7} />
              </a>
              <a
                href={`tel:${applicant.phone}`}
                aria-label="Call"
                className="surface-2 grid h-9 w-9 place-items-center rounded-lg text-muted-strong transition-colors hover:text-foreground"
              >
                <Phone className="h-4 w-4" strokeWidth={1.7} />
              </a>
            </>
          )}
          {applicant.email && <EmailButton email={applicant.email} />}
        </div>
      </div>

      {/* Siblings / family group — every student as a chip; current one is
          highlighted. Scrolls horizontally if the family is large. */}
      {siblings && siblings.length > 0 && (
        <div className="card-sheen mt-5 rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Users2 className="h-4 w-4 text-accent" strokeWidth={1.8} />
            <h3 className="text-[14px] font-medium">
              {applicant.family_label
                ? `${applicant.family_label} — family`
                : "Family"}
            </h3>
            <span className="text-[12px] text-muted">
              {siblings.length + 1} students
            </span>
            {applicant.family_code && (
              <span className="ml-auto font-mono text-[12.5px] text-accent">
                {applicant.family_code}
              </span>
            )}
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {[
              { id: applicant.id, form_data, status: applicant.status, self: true },
              ...siblings.map((s) => ({
                id: s.id,
                form_data: (s.form_data ?? {}) as Record<string, unknown>,
                status: s.status,
                self: false,
              })),
            ].map((m) => (
              <Link
                key={m.id}
                href={`/applicants/${m.id}`}
                className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-[13px] transition-colors ${
                  m.self
                    ? "border-accent-soft bg-accent-soft"
                    : "surface hover:border-border-strong"
                }`}
              >
                <span className="font-medium">
                  {displayName(m.form_data, "Student")}
                </span>
                <span
                  className={`badge ${STATUS_STYLE[m.status] ?? "badge-neutral"}`}
                >
                  {m.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Status control */}
      <div className="mt-5">
        <StatusControl
          applicantId={applicant.id}
          status={applicant.status}
          role={ctx.role}
          totalDue={totalDue}
          currency={ctx.institute.currency}
          confirmationReason={applicant.confirmation_reason}
        />
      </div>

      <div className="mt-6">
        <DetailTabs
          applicantId={applicant.id}
          role={ctx.role}
          currency={ctx.institute.currency}
          isPremium={ctx.institute.plan === "Premium"}
          formData={form_data}
          fees={(fees ?? []) as never[]}
          familyFees={(familyFees ?? []) as never[]}
          notes={(notes ?? []) as never[]}
          comms={(comms ?? []) as never[]}
          activity={(activity ?? []) as never[]}
          staffId={ctx.staffId}
        />
      </div>
    </div>
  );
}
