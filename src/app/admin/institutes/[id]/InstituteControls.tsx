"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { AlertCircle, Megaphone, Trash2 } from "lucide-react";
import {
  setInstituteStatus,
  setInstitutePlan,
  deleteInstitute,
  postAnnouncement,
  deactivateAnnouncement,
  setGracePeriod,
  type DeleteState,
} from "@/app/admin/actions";

const initial: DeleteState = { error: null };

export function PlanControl({
  instituteId,
  plan,
  expiresAt,
  billingCycle,
}: {
  instituteId: string;
  plan: string;
  expiresAt: string | null;
  billingCycle: string | null;
}) {
  const [pending, start] = useTransition();
  const [cycle, setCycle] = useState<"monthly" | "yearly">(
    billingCycle === "yearly" ? "yearly" : "monthly",
  );
  const current = plan === "Premium" ? "Pro" : plan;
  const expired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;

  return (
    <div className="space-y-3">
      {plan !== "Free" && (
        <div className="text-[12.5px] text-muted">
          {expiresAt ? (
            <>
              {billingCycle ?? "monthly"} ·{" "}
              <span className={expired ? "text-red-300" : "text-muted-strong"}>
                {expired ? "expired" : "expires"}{" "}
                {new Date(expiresAt).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </>
          ) : (
            "no expiry set"
          )}
        </div>
      )}

      <div className="flex gap-1">
        {(["monthly", "yearly"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCycle(c)}
            className={`rounded-lg px-2.5 py-1 text-[11.5px] font-medium capitalize transition-colors ${
              cycle === c
                ? "bg-[var(--border)] text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["Free", "Starter", "Pro", "Enterprise"] as const).map((p) => (
          <button
            key={p}
            disabled={pending}
            onClick={() =>
              start(() =>
                setInstitutePlan(instituteId, p, p === "Free" ? null : cycle),
              )
            }
            className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              p === current
                ? "border-accent bg-accent-soft text-accent"
                : "border-border text-muted-strong hover:text-foreground"
            }`}
          >
            {p === current ? `${p} ✓` : `Activate ${p}`}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GraceControl({
  instituteId,
  graceUntil,
}: {
  instituteId: string;
  graceUntil: string | null;
}) {
  const [pending, start] = useTransition();
  const active = graceUntil ? new Date(graceUntil).getTime() > Date.now() : false;
  return (
    <div className="space-y-2">
      {graceUntil && (
        <div className="text-[12.5px] text-muted">
          {active ? "In grace until " : "Grace ended "}
          <span className="text-muted-strong">
            {new Date(graceUntil).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            disabled={pending}
            onClick={() => start(() => setGracePeriod(instituteId, d))}
            className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-medium text-muted-strong transition-colors hover:text-foreground disabled:opacity-40"
          >
            +{d} days
          </button>
        ))}
        {graceUntil && (
          <button
            disabled={pending}
            onClick={() => start(() => setGracePeriod(instituteId, 0))}
            className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-medium text-muted transition-colors hover:text-red-300 disabled:opacity-40"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

export function AnnouncementControl({
  instituteId,
  announcements,
}: {
  instituteId: string;
  announcements: { id: string; message: string; mode: string; active: boolean }[];
}) {
  const [state, action, pending] = useActionState(postAnnouncement, initial);
  const [deleting, startDelete] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="space-y-3">
      {announcements.length > 0 && (
        <div className="space-y-1.5">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="surface flex items-start justify-between gap-3 rounded-lg px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-[13px]">{a.message}</div>
                <div className="mt-0.5 text-[11.5px] text-muted">
                  {a.mode === "once" ? "Shown once" : "Every login"}
                </div>
              </div>
              <button
                onClick={() =>
                  startDelete(() => deactivateAnnouncement(a.id, instituteId))
                }
                disabled={deleting}
                aria-label="Deactivate"
                className="shrink-0 rounded p-1 text-muted transition-colors hover:text-red-300 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        ref={formRef}
        action={action}
        onSubmit={() => setTimeout(() => formRef.current?.reset(), 100)}
        className="space-y-2"
      >
        <input type="hidden" name="institute_id" value={instituteId} />
        <textarea
          name="message"
          rows={2}
          required
          placeholder="Message to show this institute on login — e.g. Payment due, please renew."
          className="surface-2 block w-full rounded-lg px-3 py-2.5 text-[13.5px] outline-none focus:border-border-strong"
        />
        <div className="flex items-center gap-2">
          <select
            name="mode"
            defaultValue="recurring"
            className="surface-2 rounded-lg px-2.5 py-1.5 text-[12.5px] outline-none"
          >
            <option value="recurring">Every login</option>
            <option value="once">Show once</option>
          </select>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-[12.5px] font-medium text-background disabled:opacity-50"
          >
            <Megaphone className="h-3.5 w-3.5" strokeWidth={1.8} />
            {pending ? "Posting…" : "Post"}
          </button>
        </div>
        {state.error && (
          <div className="flex items-start gap-2 text-[12.5px] text-red-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}
      </form>
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
