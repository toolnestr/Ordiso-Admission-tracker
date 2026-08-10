"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Edit, Trash2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { deleteApplicant, updateApplicant } from "./actions";
import type { PublicField } from "@/components/enquiry/fields";
import { FieldRenderer, deriveContact, isSharedField } from "@/components/enquiry/fields";
import Select from "@/components/ui/Select";

export default function ApplicantActions({
  applicant,
  fields,
  programs,
  isAdmin,
}: {
  applicant: {
    id: string;
    form_data: Record<string, unknown>;
    email: string | null;
    phone: string | null;
    program_id?: string | null;
  };
  fields: PublicField[];
  programs: { id: string; name: string }[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Edit State
  const [values, setValues] = useState<Record<string, string>>(() => {
    // Flatten form_data to strings for editing
    const init: Record<string, string> = {};
    if (applicant.form_data) {
      for (const [k, v] of Object.entries(applicant.form_data)) {
        init[k] = typeof v === "string" ? v : String(v ?? "");
      }
    }
    return init;
  });
  const [programId, setProgramId] = useState(applicant.program_id || "");
  const [showMore, setShowMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteApplicant(applicant.id);
      router.push("/applicants");
    } catch (err: any) {
      alert(err.message || "Failed to delete");
      setDeleting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { email, phone } = deriveContact(fields, values);
      await updateApplicant(applicant.id, values, email, phone, programId || null);
      setEditOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to update");
    }
    setSaving(false);
  };

  // Determine basic fields (Name, Phone, Email)
  const basicFields = fields.filter((f) => 
    f.type === "email" || f.type === "phone" || /name/i.test(f.label)
  );
  
  const fieldsToRender = showMore ? fields : basicFields;

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="surface-2 grid h-9 w-9 place-items-center rounded-lg text-muted-strong transition-colors hover:text-foreground"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-lg border border-[var(--border)] bg-[#12121a] p-1 shadow-lg">
            <button
              onClick={() => {
                setMenuOpen(false);
                setEditOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <Edit className="h-4 w-4" />
              Edit enquiry
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteOpen(true);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-[13px] text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
                Delete enquiry
              </button>
            )}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card-sheen w-full max-w-md rounded-2xl p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Delete Enquiry
            </h3>
            <p className="mt-3 text-[14px] text-muted">
              Are you sure you want to permanently delete this enquiry?
            </p>
            <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-[13px] text-amber-200/90">
              <strong>Note:</strong> Deleting an enquiry does not decrease your total applications counter for the free tier. This action cannot be undone.
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteOpen(false)}
                className="rounded-lg px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:text-foreground"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-500/20 px-4 py-2 text-[13px] font-medium text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="card-sheen w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6">
            <h3 className="text-lg font-semibold">Edit Enquiry</h3>
            <p className="mt-1 text-[13px] text-muted">Update applicant details below.</p>
            
            <form onSubmit={handleEdit} className="mt-5 space-y-5">
              {programs.length > 0 && (
                <label className="block">
                  <span className="mb-1.5 block text-[13.5px] font-medium text-muted-strong">
                    Program
                  </span>
                  <Select
                    value={programId}
                    onChange={setProgramId}
                    placeholder="Select a program…"
                    options={programs.map((p) => ({ value: p.id, label: p.name }))}
                  />
                </label>
              )}

              {fieldsToRender.map((f) => (
                <FieldRenderer
                  key={f.id}
                  field={f}
                  value={values[f.label] || ""}
                  onChange={(v) => setValues({ ...values, [f.label]: v })}
                  locked={false}
                />
              ))}

              <button
                type="button"
                onClick={() => setShowMore(!showMore)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-[13px] text-muted transition-colors hover:border-border-strong hover:text-foreground"
              >
                {showMore ? (
                  <>Show less <ChevronUp className="h-4 w-4" /></>
                ) : (
                  <>Show more fields <ChevronDown className="h-4 w-4" /></>
                )}
              </button>

              {error && (
                <div className="rounded-lg bg-red-500/10 p-3 text-[13px] text-red-400">
                  {error}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-lg px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:text-foreground"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
