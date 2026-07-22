"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Select from "@/components/ui/Select";
import { FieldRenderer, type PublicField } from "@/app/apply/[instituteId]/ApplyForm";

/**
 * Staff-facing "add enquiry" — the manual counterpart to the public apply form,
 * for walk-ins and phone enquiries. Reuses the institute's own form fields and
 * the same `submit_application` RPC (cap + dedupe + app-code handled server
 * side), so a manual entry is indistinguishable from a public one downstream.
 * Admin + Counselor only; hidden for Viewer. Requires an open session.
 */
export default function NewEnquiry({
  instituteId,
  fields,
  programs,
  isPremium,
}: {
  instituteId: string;
  fields: PublicField[];
  programs: { id: string; name: string }[];
  isPremium: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [programId, setProgramId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ appId: string; dup: boolean } | null>(null);

  // Close on Escape while the modal is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function reset() {
    setValues({});
    setProgramId("");
    setError(null);
    setDone(null);
  }

  function close() {
    setOpen(false);
    // Delay reset so the closing view doesn't flash empty.
    setTimeout(reset, 200);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (programs.length > 0 && !programId) {
      setError("Please choose a program.");
      return;
    }

    // Same email/phone derivation the public form uses, for duplicate flagging.
    let email: string | null = null;
    let phone: string | null = null;
    for (const f of fields) {
      if (f.type === "email" && values[f.label]) email = values[f.label];
      if (f.type === "phone" && values[f.label]) phone = values[f.label];
    }

    setSubmitting(true);
    const supabase = createClient();
    const { data, error: rpcErr } = await supabase.rpc("submit_application", {
      p_institute_id: instituteId,
      p_form_data: values,
      p_email: email,
      p_phone: phone,
      p_program_id: programId || null,
      p_source: "Direct",
    });
    setSubmitting(false);

    if (rpcErr) {
      setError("Couldn't save the enquiry. Please try again.");
      return;
    }
    const res = data as {
      application_id?: string;
      error?: string;
      possible_duplicate?: boolean;
    };
    if (res.error === "session_full") {
      setError("This session has reached the free-tier cap of 200.");
      return;
    }
    if (res.error === "no_open_session" || res.error === "session_closed") {
      setError("There's no open session to add an enquiry to.");
      return;
    }
    if (res.error || !res.application_id) {
      setError("Couldn't save the enquiry. Please try again.");
      return;
    }

    setDone({ appId: res.application_id, dup: !!res.possible_duplicate });
    // Refresh the underlying server list so the new row shows immediately.
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        New enquiry
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8"
          onMouseDown={(e) => e.target === e.currentTarget && close()}
        >
          <div className="card-sheen my-auto w-full max-w-lg rounded-2xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">New enquiry</h2>
                <p className="mt-1 text-[13px] text-muted">
                  Add a walk-in or phone enquiry to the current session.
                </p>
              </div>
              <button
                onClick={close}
                aria-label="Close"
                className="rounded-md p-1.5 text-muted transition-colors hover:text-foreground"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {done ? (
              <div className="mt-6 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" strokeWidth={1.8} />
                </span>
                <h3 className="mt-4 text-[15px] font-medium">Enquiry added</h3>
                <p className="mt-2 text-[13.5px] text-muted">
                  Application ID{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {done.appId}
                  </span>
                </p>
                {done.dup && (
                  <p className="mx-auto mt-3 max-w-sm rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[12.5px] text-amber-300">
                    A matching email or phone already exists in this session —
                    this may be a duplicate.
                  </p>
                )}
                <div className="mt-5 flex justify-center gap-2">
                  <button
                    onClick={reset}
                    className="surface-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--border)]"
                  >
                    Add another
                  </button>
                  <button
                    onClick={close}
                    className="rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-5">
                {programs.length > 0 && (
                  <label className="block">
                    <span className="mb-1.5 block text-[13.5px] font-medium text-muted-strong">
                      Program<span className="ml-0.5 text-accent">*</span>
                    </span>
                    <Select
                      value={programId}
                      onChange={setProgramId}
                      placeholder="Select a program…"
                      options={programs.map((p) => ({
                        value: p.id,
                        label: p.name,
                      }))}
                    />
                  </label>
                )}

                {fields.map((f) => (
                  <FieldRenderer
                    key={f.id}
                    field={f}
                    value={values[f.label] ?? ""}
                    onChange={(v) =>
                      setValues((prev) => ({ ...prev, [f.label]: v }))
                    }
                    locked={f.is_document_field && !isPremium}
                  />
                ))}

                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-muted-strong transition-colors hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? "Saving…" : "Add enquiry"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
