import Link from "next/link";
import { Users, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import NewEnquiry from "./NewEnquiry";
import ApplicantsTable, { type Applicant } from "./ApplicantsTable";
import type { PublicField } from "@/components/enquiry/fields";

export default async function ApplicantsPage() {
  const ctx = await getPortalContext();
  const supabase = await createClient();

  const { data: applicants } = await supabase
    .from("applicants")
    .select(
      "id, application_id, form_data, email, phone, status, source, created_at, family_id, family_label, family_code",
    )
    .order("created_at", { ascending: false });

  const list = (applicants ?? []) as Applicant[];

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
          <ApplicantsTable applicants={list} />
        )}
      </div>
    </div>
  );
}
