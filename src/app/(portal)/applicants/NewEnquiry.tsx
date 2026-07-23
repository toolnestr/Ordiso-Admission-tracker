"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PublicField } from "@/components/enquiry/fields";
import { deriveContact } from "@/components/enquiry/fields";
import { sendReceivedEmails } from "@/app/apply/[instituteId]/actions";
import StudentBlocks, {
  newStudent,
  toGroupPayload,
  mergedValues,
  type Student,
} from "@/components/enquiry/StudentBlocks";

type CreatedStudent = { application_id: string; possible_duplicate: boolean };
type DoneState = { students: CreatedStudent[]; familyCode?: string };

/**
 * Staff-facing "add enquiry" — the manual counterpart to the public apply form,
 * for walk-ins and phone enquiries. One enquiry can hold several siblings; each
 * becomes its own applicant sharing a family_id (see submit_enquiry_group).
 * A single student uses the plain submit_application path. Admin + Counselor
 * only; hidden for Viewer. Requires an open session.
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
  const [students, setStudents] = useState<Student[]>([newStudent()]);
  const [shared, setShared] = useState<Record<string, string>>({});
  const [familyLabel, setFamilyLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<DoneState | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function reset() {
    setStudents([newStudent()]);
    setShared({});
    setFamilyLabel("");
    setError(null);
    setDone(null);
  }
  function close() {
    setOpen(false);
    setTimeout(reset, 200);
  }

  function friendlyError(code?: string) {
    if (code === "session_full")
      return "This would exceed the free-tier cap of 200 for this session.";
    if (code === "no_open_session" || code === "session_closed")
      return "There's no open session to add an enquiry to.";
    return "Couldn't save the enquiry. Please try again.";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (programs.length > 0 && students.some((s) => !s.programId)) {
      setError("Please choose a program for every student.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    if (students.length === 1) {
      // Single student — no family; reuse the plain submission path.
      const values = mergedValues(students[0], shared);
      const { email, phone } = deriveContact(fields, values);
      const { data, error: rpcErr } = await supabase.rpc("submit_application", {
        p_institute_id: instituteId,
        p_form_data: values,
        p_email: email,
        p_phone: phone,
        p_program_id: students[0].programId || null,
        p_source: "Direct",
      });
      setSubmitting(false);
      const res = data as {
        application_id?: string;
        error?: string;
        possible_duplicate?: boolean;
      };
      if (rpcErr || !res?.application_id) {
        setError(friendlyError(res?.error));
        return;
      }
      setDone({
        students: [
          {
            application_id: res.application_id,
            possible_duplicate: !!res.possible_duplicate,
          },
        ],
      });
      void sendReceivedEmails([res.application_id]);
      router.refresh();
      return;
    }

    // Two or more students — one family group, atomically.
    const { data, error: rpcErr } = await supabase.rpc("submit_enquiry_group", {
      p_institute_id: instituteId,
      p_family_label: familyLabel,
      p_students: toGroupPayload(students, fields, shared),
    });
    setSubmitting(false);
    const res = data as {
      students?: CreatedStudent[];
      family_code?: string;
      error?: string;
    };
    if (rpcErr || !res?.students) {
      setError(friendlyError(res?.error));
      return;
    }
    setDone({ students: res.students, familyCode: res.family_code });
    void sendReceivedEmails(res.students.map((s) => s.application_id));
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
                  Add a walk-in or phone enquiry. For siblings, add each student.
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
                <h3 className="mt-4 text-[15px] font-medium">
                  {done.students.length > 1
                    ? `${done.students.length} students added`
                    : "Enquiry added"}
                </h3>
                {done.familyCode && (
                  <p className="mt-2 text-[13px] text-muted">
                    Family tracking code{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {done.familyCode}
                    </span>
                    <br />
                    <span className="text-[12px]">
                      One code the family can use to track all their children.
                    </span>
                  </p>
                )}
                <div className="mt-3 space-y-1.5">
                  {done.students.map((d) => (
                    <div
                      key={d.application_id}
                      className="flex items-center justify-center gap-2 text-[13.5px]"
                    >
                      <span className="font-mono font-semibold">
                        {d.application_id}
                      </span>
                      {d.possible_duplicate && (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-300">
                          possible duplicate
                        </span>
                      )}
                    </div>
                  ))}
                </div>
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
              <form onSubmit={handleSubmit} className="mt-5">
                <StudentBlocks
                  fields={fields}
                  programs={programs}
                  isPremium={isPremium}
                  students={students}
                  setStudents={setStudents}
                  shared={shared}
                  setShared={setShared}
                  familyLabel={familyLabel}
                  setFamilyLabel={setFamilyLabel}
                />

                {error && (
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="mt-5 flex justify-end gap-2">
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
                    {submitting
                      ? "Saving…"
                      : students.length > 1
                        ? `Add ${students.length} students`
                        : "Add enquiry"}
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
