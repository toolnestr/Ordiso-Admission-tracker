import Link from "next/link";
import { FileText, ExternalLink, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import AddFieldForm from "./AddFieldForm";
import FieldRowActions from "./FieldRowActions";

const TYPE_LABEL: Record<string, string> = {
  short_text: "Short text",
  long_text: "Paragraph",
  email: "Email",
  phone: "Phone",
  number: "Number",
  date: "Date",
  dropdown: "Dropdown",
  radio: "Multiple choice",
  checkbox: "Checkboxes",
  file: "File upload",
};

export default async function FormBuilderPage() {
  const ctx = await getPortalContext();
  const supabase = await createClient();

  const { data: fields } = await supabase
    .from("form_fields")
    .select(
      "id, field_label, field_type, is_required, options, is_document_field",
    )
    .eq("institute_id", ctx.institute.id)
    .order("display_order", { ascending: true });

  const list = fields ?? [];
  const isPremium = ctx.features.uploads;
  const applyPath = `/apply/${ctx.institute.id}`;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-accent">
            Form Builder
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">
            Application form
          </h1>
          <p className="mt-1.5 max-w-lg text-[13.5px] text-muted">
            Build the single form students fill in. Fields appear in the order
            below. Changes go live immediately on your public link.
          </p>
        </div>
        <Link
          href={applyPath}
          target="_blank"
          className="surface-2 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--border)]"
        >
          <ExternalLink className="h-4 w-4" strokeWidth={1.8} />
          Preview form
        </Link>
      </div>

      {list.length > 0 && (
        <div className="surface mt-6 overflow-hidden rounded-2xl">
          {list.map((f, i) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-medium">
                    {f.field_label}
                  </span>
                  {f.is_required && (
                    <span className="text-[12px] text-accent">*</span>
                  )}
                  {f.is_document_field && !isPremium && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10.5px] font-medium text-accent">
                      <Lock className="h-2.5 w-2.5" />
                      Premium
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[12px] text-muted">
                  {TYPE_LABEL[f.field_type] ?? f.field_type}
                  {Array.isArray(f.options) && f.options.length > 0 && (
                    <span> · {f.options.length} options</span>
                  )}
                </div>
              </div>
              {ctx.role === "Admin" && (
                <FieldRowActions
                  fieldId={f.id}
                  isFirst={i === 0}
                  isLast={i === list.length - 1}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {list.length === 0 && (
        <div className="card-sheen mt-6 flex flex-col items-center rounded-2xl px-6 py-16 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface-2 text-accent">
            <FileText className="h-5 w-5" strokeWidth={1.6} />
          </span>
          <h3 className="mt-4 text-[15px] font-medium">No fields yet</h3>
          <p className="mt-1.5 max-w-sm text-[13.5px] text-muted">
            Add fields like Full Name, Email, Phone, and Program to build your
            application form.
          </p>
        </div>
      )}

      {ctx.role === "Admin" && (
        <div className="mt-4">
          <AddFieldForm isPremium={isPremium} />
        </div>
      )}
    </div>
  );
}
