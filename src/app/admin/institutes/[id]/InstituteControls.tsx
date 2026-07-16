"use client";

import { useActionState, useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";
import {
  setInstituteStatus,
  setInstitutePlan,
  deleteInstitute,
  type DeleteState,
} from "@/app/admin/actions";

const initial: DeleteState = { error: null };

export function PlanControl({
  instituteId,
  plan,
}: {
  instituteId: string;
  plan: string;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      {(["Free", "Premium"] as const).map((p) => (
        <button
          key={p}
          disabled={pending || p === plan}
          onClick={() => start(() => setInstitutePlan(instituteId, p))}
          className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed ${
            p === plan
              ? "border-accent bg-accent-soft text-accent"
              : "border-border text-muted-strong hover:text-foreground disabled:opacity-40"
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

export function StatusControl({
  instituteId,
  status,
}: {
  instituteId: string;
  status: string;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      {(["Active", "Suspended", "Deactivated"] as const).map((s) => (
        <button
          key={s}
          disabled={pending || s === status}
          onClick={() => start(() => setInstituteStatus(instituteId, s))}
          className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed ${
            s === status
              ? "border-accent bg-accent-soft text-accent"
              : "border-border text-muted-strong hover:text-foreground disabled:opacity-40"
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

export function DeleteControl({
  instituteId,
  instituteName,
}: {
  instituteId: string;
  instituteName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteInstitute, initial);

  return (
    <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.04] p-5">
      <h3 className="text-[14px] font-medium text-red-300">Delete permanently</h3>
      <p className="mt-1 text-[13px] text-muted">
        Wipes the institute and every applicant, fee, note, and staff login it
        owns. This cannot be undone. The audit entry survives.
      </p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-4 rounded-lg border border-red-500/30 px-3.5 py-2 text-[13px] font-medium text-red-300 transition-colors hover:bg-red-500/10"
        >
          Delete institute
        </button>
      ) : (
        <form action={action} className="mt-4 space-y-3">
          <input type="hidden" name="institute_id" value={instituteId} />
          <label className="block">
            <span className="text-[13px] text-muted-strong">
              Type{" "}
              <span className="font-medium text-foreground">{instituteName}</span>{" "}
              to confirm
            </span>
            <input
              name="confirm_name"
              required
              autoComplete="off"
              className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
            />
          </label>

          {state.error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-red-500/90 px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Delete forever"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="surface-2 rounded-lg px-4 py-2 text-[13px] font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
