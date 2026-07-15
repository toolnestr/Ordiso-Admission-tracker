"use client";

import { useActionState, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { updateStatus, manualConfirm, type ActionState } from "./actions";
import type { StaffRole } from "@/lib/portal";

// Stages are skippable by design (Section 2.13) — any stage to any stage.
const STAGES = ["Applied", "Shortlisted", "Interview", "Admitted", "Rejected"];

const initial: ActionState = { error: null };

export default function StatusControl({
  applicantId,
  status,
  role,
  totalDue,
  currency,
  confirmationReason,
}: {
  applicantId: string;
  status: string;
  role: StaffRole;
  totalDue: number;
  currency: string;
  confirmationReason: string | null;
}) {
  const [pending, start] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [state, action, confirming] = useActionState(manualConfirm, initial);

  const isConfirmed = status.startsWith("Confirmed");
  const canEdit = role !== "Viewer";

  if (isConfirmed) {
    return (
      <div className="card-sheen rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={1.7} />
          </span>
          <div>
            <div className="text-[14px] font-medium">
              {status === "Confirmed-Partial"
                ? "Admission confirmed — partial payment"
                : "Admission confirmed"}
            </div>
            {status === "Confirmed-Partial" && totalDue > 0 && (
              <div className="mt-0.5 text-[13px] text-amber-300">
                {currency}
                {totalDue} still outstanding
              </div>
            )}
            {confirmationReason && (
              <div className="mt-1 text-[12.5px] text-muted">
                {confirmationReason}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-sheen rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[13px] text-muted">Move to:</span>
        {STAGES.map((s) => (
          <button
            key={s}
            disabled={!canEdit || pending || s === status}
            onClick={() => start(() => updateStatus(applicantId, s))}
            className={`rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed ${
              s === status
                ? "border-accent bg-accent-soft text-accent"
                : "border-border text-muted-strong hover:text-foreground disabled:opacity-40"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Manual confirm — Admin only, reason mandatory (Section 2.4) */}
      {role === "Admin" && status === "Admitted" && (
        <div className="mt-4 border-t border-border pt-4">
          {!showConfirm ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[13px] text-muted">
                {totalDue > 0
                  ? `${currency}${totalDue} outstanding — confirms as "Partial Payment".`
                  : "All fees cleared — this will confirm the admission."}
              </div>
              <button
                onClick={() => setShowConfirm(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
              >
                <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
                Confirm admission
              </button>
            </div>
          ) : (
            <form action={action} className="space-y-3">
              <input type="hidden" name="applicant_id" value={applicantId} />
              <label className="block">
                <span className="text-[13px] font-medium text-muted-strong">
                  Reason for manual confirmation{" "}
                  <span className="text-accent">*</span>
                </span>
                <input
                  name="reason"
                  required
                  placeholder="e.g. Fee waived by principal; paid cash at office"
                  className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
                />
              </label>

              {totalDue > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-[13px] text-amber-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {currency}
                    {totalDue} is still outstanding. This will be recorded as
                    &quot;Confirmed — Partial Payment&quot; and the balance stays
                    visible for follow-up.
                  </span>
                </div>
              )}

              {state.error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{state.error}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={confirming}
                  className="rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {confirming ? "Confirming…" : "Confirm admission"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="surface-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--border)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
