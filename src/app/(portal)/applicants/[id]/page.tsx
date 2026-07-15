import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import StatusControl from "./StatusControl";
import DetailTabs from "./DetailTabs";

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
      "id, application_id, form_data, email, phone, status, source, created_at, confirmed_at, confirmation_reason, fee_exempt, fee_exempt_reason, programs(name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!applicant) notFound();

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
          {applicant.email && (
            <a
              href={`mailto:${applicant.email}`}
              aria-label="Email"
              className="surface-2 grid h-9 w-9 place-items-center rounded-lg text-muted-strong transition-colors hover:text-foreground"
            >
              <Mail className="h-4 w-4" strokeWidth={1.7} />
            </a>
          )}
        </div>
      </div>

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
          notes={(notes ?? []) as never[]}
          comms={(comms ?? []) as never[]}
          activity={(activity ?? []) as never[]}
          staffId={ctx.staffId}
        />
      </div>
    </div>
  );
}
