"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, CalendarClock, CheckCircle2, AlertCircle } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import Select from "@/components/ui/Select";
import {
  completeFollowUp,
  rescheduleFollowUp,
  type ActionState,
} from "@/app/(portal)/applicants/[id]/actions";

const initial: ActionState = { error: null };

/** Outcome vocabulary — covers what actually happens on an admissions call. */
export const OUTCOME_TAGS = [
  "Reached",
  "No answer",
  "Call back later",
  "Visiting campus",
  "Documents pending",
  "Fee discussion",
  "Not interested",
  "Other",
];

export type FollowUpLike = {
  id: string;
  due_date: string;
  remark: string | null;
  status: string;
  outcome?: string | null;
  outcome_tag?: string | null;
  resolved_at?: string | null;
  staffName?: string | null;
  resolvedByName?: string | null;
};

export function fmtYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtStamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Bottom-sheet on phones, centered dialog on desktop. Portalled to <body> so a
 * `backdrop-filter` ancestor can't trap the fixed overlay (see MobileNav).
 */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Dialogs only ever open from a user click, so the document always exists by
  // then — no mounted-state dance needed (and no setState-in-effect).
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border-strong bg-[#12121a] shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-[14.5px] font-medium">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-muted transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Complete a follow-up: record the outcome and, in the same step, book the
 * next call if the parent asked for one. This is the whole point — a call
 * rarely "ends", it moves.
 */
export function CompleteFollowUpDialog({
  open,
  onClose,
  followUp,
  applicantId,
  today,
}: {
  open: boolean;
  onClose: () => void;
  followUp: FollowUpLike;
  applicantId: string;
  today: string;
}) {
  const [state, action, pending] = useActionState(completeFollowUp, initial);
  const [tag, setTag] = useState("Reached");
  const [wantsNext, setWantsNext] = useState(false);
  const [nextDate, setNextDate] = useState(today);

  // Close once the action finishes without an error.
  const wasPending = useRef(false);
  useEffect(() => {
    if (!pending && wasPending.current && !state.error) onClose();
    wasPending.current = pending;
  }, [pending, state.error, onClose]);

  return (
    <Modal open={open} onClose={onClose} title="Complete follow-up">
      <form action={action} className="space-y-4">
        <input type="hidden" name="follow_up_id" value={followUp.id} />
        <input type="hidden" name="applicant_id" value={applicantId} />

        <div className="rounded-lg border border-border px-3 py-2.5 text-[12.5px] text-muted">
          <span className="text-muted-strong">Due {fmtYmd(followUp.due_date)}</span>
          {followUp.remark && (
            <p className="mt-1 whitespace-pre-wrap text-foreground">
              {followUp.remark}
            </p>
          )}
        </div>

        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-muted-strong">
            What happened?
          </span>
          <Select
            name="outcome_tag"
            value={tag}
            onChange={setTag}
            options={OUTCOME_TAGS.map((t) => ({ value: t, label: t }))}
          />
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-muted-strong">
            Notes <span className="font-normal text-muted">(optional)</span>
          </span>
          <textarea
            name="outcome"
            rows={4}
            placeholder="e.g. Spoke to the father. Wants to visit the campus before paying the fee."
            className="surface-2 block w-full resize-y rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
          />
        </label>

        <div className="rounded-lg border border-border p-3">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={wantsNext}
              onChange={(e) => setWantsNext(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
            />
            <span>
              <span className="block text-[13.5px] font-medium">
                Schedule the next follow-up
              </span>
              <span className="block text-[12px] text-muted">
                Parents often ask to be called back on another day.
              </span>
            </span>
          </label>

          {wantsNext && (
            <div className="mt-3 space-y-3 border-t border-border pt-3">
              <div>
                <span className="mb-1.5 block text-[12.5px] font-medium text-muted-strong">
                  Next date
                </span>
                <DatePicker
                  name="next_date"
                  value={nextDate}
                  onChange={setNextDate}
                  min={today}
                />
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-muted-strong">
                  What to discuss{" "}
                  <span className="font-normal text-muted">(optional)</span>
                </span>
                <input
                  name="next_remark"
                  placeholder="e.g. Confirm campus visit time"
                  className="surface-2 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
                />
              </label>
            </div>
          )}
        </div>

        {state.error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="surface-2 rounded-lg px-4 py-2.5 text-[13.5px] font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-[13.5px] font-medium text-background disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
            {pending ? "Saving…" : "Mark done"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Move a pending follow-up to a new date without closing it. */
export function RescheduleDialog({
  open,
  onClose,
  followUp,
  applicantId,
  today,
}: {
  open: boolean;
  onClose: () => void;
  followUp: FollowUpLike;
  applicantId: string;
  today: string;
}) {
  const [state, action, pending] = useActionState(rescheduleFollowUp, initial);
  const [date, setDate] = useState(followUp.due_date);
  const wasPending = useRef(false);
  useEffect(() => {
    if (!pending && wasPending.current && !state.error) onClose();
    wasPending.current = pending;
  }, [pending, state.error, onClose]);

  return (
    <Modal open={open} onClose={onClose} title="Reschedule follow-up">
      <form action={action} className="space-y-4">
        <input type="hidden" name="follow_up_id" value={followUp.id} />
        <input type="hidden" name="applicant_id" value={applicantId} />
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-muted-strong">
            New date
          </span>
          <DatePicker name="due_date" value={date} onChange={setDate} min={today} />
        </div>
        {state.error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-300">
            {state.error}
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="surface-2 rounded-lg px-4 py-2.5 text-[13.5px] font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-foreground px-4 py-2.5 text-[13.5px] font-medium text-background disabled:opacity-50"
          >
            {pending ? "Saving…" : "Move date"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Read-only detail — long remarks/outcomes get room to breathe here. */
export function FollowUpDetailDialog({
  open,
  onClose,
  followUp,
}: {
  open: boolean;
  onClose: () => void;
  followUp: FollowUpLike;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Follow-up details">
      <div className="space-y-4 text-[13.5px]">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted" strokeWidth={1.7} />
          <span className="font-medium">{fmtYmd(followUp.due_date)}</span>
          <span
            className={`badge ${
              followUp.status === "Done" ? "badge-green" : "badge-amber"
            }`}
          >
            {followUp.status}
          </span>
          {followUp.outcome_tag && (
            <span className="badge badge-accent">{followUp.outcome_tag}</span>
          )}
        </div>

        {followUp.remark && (
          <Block label="Planned" text={followUp.remark} />
        )}
        {followUp.outcome && <Block label="Outcome" text={followUp.outcome} />}

        <div className="border-t border-border pt-3 text-[12px] text-muted">
          {followUp.staffName && <div>Scheduled by {followUp.staffName}</div>}
          {followUp.status === "Done" && followUp.resolved_at && (
            <div>
              Completed {fmtStamp(followUp.resolved_at)}
              {followUp.resolvedByName ? ` by ${followUp.resolvedByName}` : ""}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Block({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="mb-1 text-[11.5px] uppercase tracking-wide text-muted">
        {label}
      </div>
      <p className="whitespace-pre-wrap break-words rounded-lg border border-border px-3 py-2.5">
        {text}
      </p>
    </div>
  );
}
