import Link from "next/link";
import { Users, Share2, Users2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import NewEnquiry from "./NewEnquiry";
import type { PublicField } from "@/components/enquiry/fields";

const STATUS_STYLE: Record<string, string> = {
  Applied: "badge-neutral",
  Shortlisted: "badge-accent",
  Interview: "badge-amber",
  Admitted: "badge-blue",
  Confirmed: "badge-green",
  "Confirmed-Partial": "badge-green",
  Rejected: "badge-red",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function displayName(form_data: Record<string, unknown>, fallback: string) {
  if (form_data) {
    // Prefer any field whose label mentions "name" (case-insensitive),
    // e.g. "Full name", "Student Name" — labels are institute-defined.
    for (const [key, val] of Object.entries(form_data)) {
      if (/name/i.test(key) && typeof val === "string" && val.trim()) {
        return val.trim();
      }
    }
  }
  return fallback;
}

export default async function ApplicantsPage() {
  const ctx = await getPortalContext();
  const supabase = await createClient();

  const { data: applicants } = await supabase
    .from("applicants")
    .select(
      "id, application_id, form_data, email, phone, status, source, created_at, family_id, family_label",
    )
    .order("created_at", { ascending: false });

  const list = applicants ?? [];

  // How many applicants share each family_id, so sibling rows can show a badge.
  const familySize: Record<string, number> = {};
  for (const a of list) {
    const fid = (a as { family_id: string | null }).family_id;
    if (fid) familySize[fid] = (familySize[fid] ?? 0) + 1;
  }

  // Staff manual-entry: Admin/Counselor can add a walk-in enquiry when a
  // session is open. Fetch the institute's own form fields + programs (RLS
  // scopes both to this institute) so the modal mirrors the public form.
  const canAddEnquiry = ctx.role !== "Viewer" && !!ctx.session;
  let enquiryFields: PublicField[] = [];
  let enquiryPrograms: { id: string; name: string }[] = [];
  if (canAddEnquiry) {
    const [{ data: fieldRows }, { data: programRows }] = await Promise.all([
      supabase
        .from("form_fields")
        .select(
          "id, field_label, field_type, is_required, options, is_document_field, display_order",
        )
        .eq("institute_id", ctx.institute.id)
        .order("display_order", { ascending: true }),
      supabase
        .from("programs")
        .select("id, name")
        .eq("institute_id", ctx.institute.id),
    ]);
    enquiryFields = (fieldRows ?? []).map((f) => ({
      id: f.id as string,
      label: f.field_label as string,
      type: f.field_type as string,
      required: !!f.is_required,
      options: (f.options as string[]) ?? [],
      is_document_field: !!f.is_document_field,
    }));
    enquiryPrograms = (programRows ?? []) as { id: string; name: string }[];
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-accent">
            Applicants
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
            {list.length > 0
              ? `${list.length} applicant${list.length === 1 ? "" : "s"}`
              : "Applicants"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {canAddEnquiry && (
            <NewEnquiry
              instituteId={ctx.institute.id}
              fields={enquiryFields}
              programs={enquiryPrograms}
              isPremium={ctx.institute.plan === "Premium"}
            />
          )}
          <Link
            href="/share"
            className="surface-2 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--border)]"
          >
            <Share2 className="h-4 w-4" strokeWidth={1.8} />
            Share form
          </Link>
        </div>
      </div>

      <div className="mt-6">
        {list.length === 0 ? (
          <div className="card-sheen flex flex-col items-center rounded-2xl px-6 py-16 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface-2 text-accent">
              <Users className="h-5 w-5" strokeWidth={1.6} />
            </span>
            <h3 className="mt-4 text-[15px] font-medium">No applicants yet</h3>
            <p className="mt-1.5 max-w-sm text-[13.5px] text-muted">
              {ctx.session
                ? "Share your application link or QR code to start receiving applications."
                : "Open an admission session, then share your form to receive applications."}
            </p>
            <Link
              href={ctx.session ? "/share" : "/sessions"}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
            >
              {ctx.session ? "Share your link" : "Create a session"}
            </Link>
          </div>
        ) : (
          <div className="surface overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[720px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-border text-[12px] uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Applicant</th>
                  <th className="px-4 py-3 font-medium">Applied</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Application ID</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-border transition-colors last:border-0 hover:bg-surface"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/applicants/${a.id}`} className="block">
                        <div className="flex items-center gap-2">
                          <span className="font-medium hover:text-accent">
                            {displayName(
                              a.form_data as Record<string, unknown>,
                              a.email || a.phone || "Unknown",
                            )}
                          </span>
                          {a.family_id && familySize[a.family_id] > 1 && (
                            <span
                              className="badge badge-accent inline-flex items-center gap-1"
                              title={
                                a.family_label
                                  ? `${a.family_label} — ${familySize[a.family_id]} students`
                                  : `${familySize[a.family_id]} siblings`
                              }
                            >
                              <Users2 className="h-3 w-3" strokeWidth={2} />
                              {a.family_label
                                ? `${a.family_label} ×${familySize[a.family_id]}`
                                : `×${familySize[a.family_id]}`}
                            </span>
                          )}
                        </div>
                        {a.email && (
                          <div className="text-[12px] text-muted">{a.email}</div>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-strong">
                      {fmtDate(a.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge ${
                          STATUS_STYLE[a.status] ?? "badge-neutral"
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-strong">{a.source}</td>
                    <td className="px-4 py-3 font-mono text-[12.5px] text-muted">
                      {a.application_id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
