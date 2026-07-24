"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  Lock,
  Plus,
  Trash2,
  Wallet,
  History,
  Pencil,
  FileUp,
  FileText,
  Download,
  CalendarClock,
} from "lucide-react";
import {
  addFee,
  recordPayment,
  editFeeAmount,
  editPayment,
  deletePayment,
  waiveFee,
  uploadDocument,
  deleteDocument,
  addNote,
  deleteNote,
  addCommunication,
  addFollowUp,
  resolveFollowUp,
  deleteFollowUp,
  type ActionState,
} from "./actions";
import Select from "@/components/ui/Select";
import type { StaffRole } from "@/lib/portal";

type Fee = {
  id: string;
  name: string;
  amount: number;
  status: string;
  amount_paid: number;
  remaining_balance: number;
  fee_payment_history: {
    id: string;
    amount: number;
    paid_on: string;
    staff: { name: string } | null;
  }[];
};
type Note = {
  id: string;
  content: string;
  created_at: string;
  staff_id: string | null;
  staff: { name: string } | null;
};
type Comm = {
  id: string;
  type: string;
  summary: string;
  outcome_tag: string | null;
  created_at: string;
  staff: { name: string } | null;
};
type Activity = {
  id: string;
  action_type: string;
  description: string;
  reason: string | null;
  created_at: string;
  staff: { name: string } | null;
};
type FollowUp = {
  id: string;
  due_date: string;
  remark: string | null;
  status: string;
  resolved_at: string | null;
  created_at: string;
  staff: { name: string } | null;
};

const initial: ActionState = { error: null };

const TABS = [
  "Form Data",
  "Fees",
  "Follow-ups",
  "Notes",
  "Status",
  "Documents",
  "Activity",
] as const;
type Tab = (typeof TABS)[number];

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Render a bare 'YYYY-MM-DD' date without timezone drift. */
function fmtDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type FamilyMemberFees = { id: string; name: string; fees: Fee[] };
type Doc = { id: string; label: string; size: number; url: string | null };

export default function DetailTabs(props: {
  applicantId: string;
  role: StaffRole;
  currency: string;
  isPremium: boolean;
  formData: Record<string, unknown>;
  fees: Fee[];
  familyFees: FamilyMemberFees[];
  documents: Doc[];
  notes: Note[];
  comms: Comm[];
  activity: Activity[];
  followUps: FollowUp[];
  staffId: string;
}) {
  const [tab, setTab] = useState<Tab>("Form Data");
  const pendingFollowUps = props.followUps.filter(
    (f) => f.status !== "Done",
  ).length;

  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-[13.5px] transition-colors ${
              tab === t
                ? "border-accent font-medium text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t}
            {t === "Fees" && props.fees.length > 0 && (
              <span className="ml-1.5 text-[11px] text-muted">
                {props.fees.length}
              </span>
            )}
            {t === "Follow-ups" && pendingFollowUps > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500/15 px-1.5 text-[11px] text-amber-300">
                {pendingFollowUps}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="py-6">
        {tab === "Form Data" && <FormDataTab data={props.formData} />}
        {tab === "Fees" && <FeesTab {...props} />}
        {tab === "Follow-ups" && (
          <FollowUpsTab
            applicantId={props.applicantId}
            followUps={props.followUps}
            role={props.role}
          />
        )}
        {tab === "Notes" && <NotesTab {...props} />}
        {tab === "Status" && <StatusTab {...props} />}
        {tab === "Documents" && (
          <DocumentsTab
            isPremium={props.isPremium}
            documents={props.documents}
            applicantId={props.applicantId}
            role={props.role}
          />
        )}
        {tab === "Activity" && <ActivityTab activity={props.activity} />}
      </div>
    </div>
  );
}

function FormDataTab({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <Empty text="No form data was submitted." />;
  }
  return (
    <div className="surface overflow-hidden rounded-2xl">
      {entries.map(([k, v]) => (
        <div
          key={k}
          className="flex flex-col gap-1 border-b border-border px-4 py-3 last:border-0 sm:flex-row sm:gap-4"
        >
          <span className="w-48 shrink-0 text-[13px] text-muted">{k}</span>
          <span className="text-[13.5px]">
            {String(v || "—").replace(/\|/g, ", ")}
          </span>
        </div>
      ))}
    </div>
  );
}

function FeesTab({
  applicantId,
  fees,
  familyFees,
  role,
  currency,
}: {
  applicantId: string;
  fees: Fee[];
  familyFees: FamilyMemberFees[];
  role: StaffRole;
  currency: string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [state, action, pending] = useActionState(addFee, initial);
  const canEdit = role !== "Viewer";

  const totalDue = fees.reduce((s, f) => s + Number(f.remaining_balance), 0);
  const familyDue = (familyFees ?? []).reduce(
    (s, m) =>
      s + m.fees.reduce((a, f) => a + Number(f.remaining_balance), 0),
    totalDue,
  );

  return (
    <div className="space-y-4">
      {fees.length === 0 ? (
        <Empty text="No fees assigned yet. Assign fees once the applicant is admitted." />
      ) : (
        <>
          {fees.map((f) => (
            <FeeCard
              key={f.id}
              fee={f}
              applicantId={applicantId}
              role={role}
              currency={currency}
            />
          ))}
          <div className="flex justify-between rounded-xl border border-border px-4 py-3 text-[13.5px]">
            <span className="text-muted">Total outstanding</span>
            <span className="font-semibold tabular-nums">
              {currency}
              {totalDue}
            </span>
          </div>
        </>
      )}

      {canEdit &&
        (showAdd ? (
          <form
            action={action}
            onSubmit={() => setTimeout(() => setShowAdd(false), 100)}
            className="card-sheen space-y-3 rounded-xl p-4"
          >
            <input type="hidden" name="applicant_id" value={applicantId} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[13px] font-medium text-muted-strong">
                  Fee name
                </span>
                <input
                  name="name"
                  required
                  placeholder="e.g. Admission fee"
                  className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
                />
              </label>
              <label className="block">
                <span className="text-[13px] font-medium text-muted-strong">
                  Amount ({currency})
                </span>
                <input
                  name="amount"
                  type="number"
                  min={1}
                  step="0.01"
                  required
                  className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
                />
              </label>
            </div>
            {state.error && <ErrorNote text={state.error} />}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-background disabled:opacity-50"
              >
                {pending ? "Adding…" : "Add fee"}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="surface-2 rounded-lg px-4 py-2 text-[13px] font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="surface-2 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--border)]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Assign a fee
          </button>
        ))}

      {familyFees && familyFees.length > 0 && (
        <div className="mt-6 border-t border-border pt-5">
          <h4 className="text-[13px] font-medium text-muted-strong">
            Siblings&apos; fees
          </h4>
          <p className="mt-0.5 text-[12px] text-muted">
            Record payments for the whole family from one place.
          </p>
          <div className="mt-4 space-y-5">
            {familyFees.map((m) => (
              <div key={m.id}>
                <div className="mb-2 text-[12.5px] font-medium">{m.name}</div>
                <div className="space-y-3">
                  {m.fees.map((f) => (
                    <FeeCard
                      key={f.id}
                      fee={f}
                      applicantId={m.id}
                      role={role}
                      currency={currency}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-between rounded-xl border border-accent-soft bg-accent-soft px-4 py-3 text-[13.5px]">
            <span className="text-muted-strong">Family total outstanding</span>
            <span className="font-semibold tabular-nums text-accent">
              {currency}
              {familyDue}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const FEE_BADGE: Record<string, string> = {
  Pending: "badge-neutral",
  "Partially Paid": "badge-amber",
  Paid: "badge-green",
  Waived: "badge-blue",
};

function FeeCard({
  fee,
  applicantId,
  role,
  currency,
}: {
  fee: Fee;
  applicantId: string;
  role: StaffRole;
  currency: string;
}) {
  const [showPay, setShowPay] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [state, action, pending] = useActionState(recordPayment, initial);
  const [editState, editAction, editing] = useActionState(
    editFeeAmount,
    initial,
  );
  const [waiving, startWaive] = useTransition();
  const canEdit = role !== "Viewer";
  const settled = fee.status === "Paid" || fee.status === "Waived";
  const waived = fee.status === "Waived";

  return (
    <div className="card-sheen rounded-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-medium">{fee.name}</span>
            <span className={`badge ${FEE_BADGE[fee.status] ?? "badge-neutral"}`}>
              {fee.status}
            </span>
          </div>
          <div className="mt-1 text-[13px] text-muted tabular-nums">
            {currency}
            {fee.amount_paid} paid of {currency}
            {fee.amount}
            {Number(fee.remaining_balance) > 0 && fee.status !== "Waived" && (
              <span className="text-amber-300">
                {" "}
                · {currency}
                {fee.remaining_balance} due
              </span>
            )}
          </div>
        </div>

        {canEdit && !settled && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowPay((v) => !v)}
              className="surface-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:bg-[var(--border)]"
            >
              <Wallet className="h-3.5 w-3.5" strokeWidth={1.8} />
              Record payment
            </button>
            <button
              onClick={() => setShowEdit((v) => !v)}
              aria-label="Edit fee"
              className="surface-2 grid place-items-center rounded-lg px-2 py-1.5 text-muted-strong transition-colors hover:bg-[var(--border)]"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
            {role === "Admin" && (
              <button
                onClick={() => startWaive(() => waiveFee(fee.id, applicantId))}
                disabled={waiving}
                className="rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-medium text-muted-strong transition-colors hover:text-foreground disabled:opacity-50"
              >
                {waiving ? "Waiving…" : "Waive"}
              </button>
            )}
          </div>
        )}
      </div>

      {showEdit && !waived && (
        <form
          action={editAction}
          onSubmit={() => setTimeout(() => setShowEdit(false), 100)}
          className="mt-4 border-t border-border pt-4"
        >
          <input type="hidden" name="fee_id" value={fee.id} />
          <input type="hidden" name="applicant_id" value={applicantId} />
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="text-[12.5px] text-muted-strong">Fee name</span>
              <input
                name="name"
                defaultValue={fee.name}
                required
                className="surface-2 mt-1 block w-48 rounded-lg px-3 py-2 text-[14px] outline-none focus:border-border-strong"
              />
            </label>
            <label className="block">
              <span className="text-[12.5px] text-muted-strong">
                Amount ({currency})
              </span>
              <input
                name="amount"
                type="number"
                min={1}
                step="0.01"
                defaultValue={fee.amount}
                required
                className="surface-2 mt-1 block w-32 rounded-lg px-3 py-2 text-[14px] outline-none focus:border-border-strong"
              />
            </label>
            <button
              type="submit"
              disabled={editing}
              className="rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-background disabled:opacity-50"
            >
              {editing ? "Saving…" : "Save"}
            </button>
          </div>
          {editState.error && (
            <div className="mt-2">
              <ErrorNote text={editState.error} />
            </div>
          )}
        </form>
      )}

      {showPay && !settled && (
        <form
          action={action}
          onSubmit={() => setTimeout(() => setShowPay(false), 100)}
          className="mt-4 border-t border-border pt-4"
        >
          <input type="hidden" name="fee_id" value={fee.id} />
          <input type="hidden" name="applicant_id" value={applicantId} />
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="text-[12.5px] text-muted-strong">
                Amount ({currency})
              </span>
              <input
                name="amount"
                type="number"
                min={1}
                step="0.01"
                required
                className="surface-2 mt-1 block w-40 rounded-lg px-3 py-2 text-[14px] outline-none focus:border-border-strong"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-background disabled:opacity-50"
            >
              {pending ? "Recording…" : "Record"}
            </button>
          </div>
          {state.error && (
            <div className="mt-2">
              <ErrorNote text={state.error} />
            </div>
          )}
        </form>
      )}

      {/* Installment history (Section 2.4) */}
      {fee.fee_payment_history?.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <div className="mb-2 flex items-center gap-1.5 text-[12px] text-muted">
            <History className="h-3.5 w-3.5" />
            Payment history
          </div>
          <div className="space-y-1.5">
            {fee.fee_payment_history.map((p) => (
              <PaymentRow
                key={p.id}
                payment={p}
                feeId={fee.id}
                applicantId={applicantId}
                currency={currency}
                canEdit={canEdit && !waived}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentRow({
  payment,
  feeId,
  applicantId,
  currency,
  canEdit,
}: {
  payment: { id: string; amount: number; paid_on: string; staff: { name: string } | null };
  feeId: string;
  applicantId: string;
  currency: string;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(editPayment, initial);
  const [deleting, startDelete] = useTransition();

  if (editing) {
    return (
      <form
        action={action}
        onSubmit={() => setTimeout(() => setEditing(false), 100)}
        className="flex flex-wrap items-center gap-2"
      >
        <input type="hidden" name="payment_id" value={payment.id} />
        <input type="hidden" name="fee_id" value={feeId} />
        <input type="hidden" name="applicant_id" value={applicantId} />
        <span className="text-[12.5px] text-muted">{currency}</span>
        <input
          name="amount"
          type="number"
          min={1}
          step="0.01"
          defaultValue={payment.amount}
          required
          className="surface-2 w-28 rounded-lg px-2 py-1 text-[13px] outline-none focus:border-border-strong"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-foreground px-3 py-1 text-[12.5px] font-medium text-background disabled:opacity-50"
        >
          {pending ? "…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-[12.5px] text-muted transition-colors hover:text-foreground"
        >
          Cancel
        </button>
        {state.error && <ErrorNote text={state.error} />}
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between text-[12.5px] text-muted-strong">
      <span className="tabular-nums">
        {currency}
        {payment.amount}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-muted">
          {when(payment.paid_on)} · {payment.staff?.name ?? "System"}
        </span>
        {canEdit && (
          <span className="flex gap-1">
            <button
              onClick={() => setEditing(true)}
              aria-label="Edit payment"
              className="rounded p-0.5 text-muted transition-colors hover:text-foreground"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={() =>
                startDelete(() =>
                  deletePayment(payment.id, feeId, applicantId),
                )
              }
              disabled={deleting}
              aria-label="Delete payment"
              className="rounded p-0.5 text-muted transition-colors hover:text-red-300 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

function NotesTab({
  applicantId,
  notes,
  role,
  staffId,
}: {
  applicantId: string;
  notes: Note[];
  role: StaffRole;
  staffId: string;
}) {
  const [state, action, pending] = useActionState(addNote, initial);
  const [deleting, startDelete] = useTransition();
  const canEdit = role !== "Viewer";

  return (
    <div className="space-y-4">
      {canEdit && (
        <form action={action} className="card-sheen rounded-xl p-4">
          <input type="hidden" name="applicant_id" value={applicantId} />
          <textarea
            name="content"
            rows={3}
            required
            placeholder="Add an internal note — e.g. Parent is keen, sibling applying next year."
            className="surface-2 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
          />
          {state.error && (
            <div className="mt-2">
              <ErrorNote text={state.error} />
            </div>
          )}
          <button
            type="submit"
            disabled={pending}
            className="mt-3 rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-background disabled:opacity-50"
          >
            {pending ? "Saving…" : "Add note"}
          </button>
        </form>
      )}

      {notes.length === 0 ? (
        <Empty text="No notes yet." />
      ) : (
        notes.map((n) => (
          <div key={n.id} className="surface rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="whitespace-pre-wrap text-[13.5px]">{n.content}</p>
              {(n.staff_id === staffId || role === "Admin") && (
                <button
                  onClick={() => startDelete(() => deleteNote(n.id, applicantId))}
                  disabled={deleting}
                  aria-label="Delete note"
                  className="shrink-0 rounded-md p-1 text-muted transition-colors hover:text-red-400 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="mt-2 text-[12px] text-muted">
              {n.staff?.name ?? "Unknown"} · {when(n.created_at)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function FollowUpsTab({
  applicantId,
  followUps,
  role,
}: {
  applicantId: string;
  followUps: FollowUp[];
  role: StaffRole;
}) {
  const [state, action, pending] = useActionState(addFollowUp, initial);
  const [busy, startBusy] = useTransition();
  const canEdit = role !== "Viewer";
  // Local 'today' for the overdue hint in this tab. The dashboard/list use the
  // institute timezone as the authority; here it's just a visual cue.
  const todayYmd = new Date().toLocaleDateString("en-CA");

  return (
    <div className="space-y-4">
      {canEdit && (
        <form action={action} className="card-sheen space-y-3 rounded-xl p-4">
          <input type="hidden" name="applicant_id" value={applicantId} />
          <div className="grid gap-3 sm:grid-cols-[190px_1fr]">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-muted-strong">
                Follow-up date <span className="text-accent">*</span>
              </span>
              <input
                type="date"
                name="due_date"
                required
                defaultValue={todayYmd}
                className="surface-2 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-muted-strong">
                Remark{" "}
                <span className="font-normal text-muted">(optional)</span>
              </span>
              <input
                name="remark"
                placeholder="e.g. Call parent about the fee deadline"
                className="surface-2 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
              />
            </label>
          </div>
          {state.error && <ErrorNote text={state.error} />}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-background disabled:opacity-50"
          >
            {pending ? "Saving…" : "Schedule follow-up"}
          </button>
        </form>
      )}

      {followUps.length === 0 ? (
        <Empty text="No follow-ups scheduled." />
      ) : (
        followUps.map((f) => {
          const done = f.status === "Done";
          const overdue = !done && f.due_date < todayYmd;
          return (
            <div key={f.id} className="surface rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CalendarClock
                      className="h-4 w-4 text-muted"
                      strokeWidth={1.7}
                    />
                    <span className="text-[13.5px] font-medium">
                      {fmtDate(f.due_date)}
                    </span>
                    {done ? (
                      <span className="badge badge-green">Done</span>
                    ) : overdue ? (
                      <span className="badge badge-red">Overdue</span>
                    ) : (
                      <span className="badge badge-amber">Pending</span>
                    )}
                  </div>
                  {f.remark && (
                    <p className="mt-2 whitespace-pre-wrap text-[13.5px]">
                      {f.remark}
                    </p>
                  )}
                  <div className="mt-2 text-[12px] text-muted">
                    {f.staff?.name ?? "Unknown"}
                    {done && f.resolved_at
                      ? ` · done ${when(f.resolved_at)}`
                      : ""}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 items-center gap-1">
                    {!done && (
                      <button
                        onClick={() =>
                          startBusy(() => resolveFollowUp(f.id, applicantId))
                        }
                        disabled={busy}
                        className="rounded-md px-2 py-1 text-[12px] font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10 disabled:opacity-40"
                      >
                        Mark done
                      </button>
                    )}
                    <button
                      onClick={() =>
                        startBusy(() => deleteFollowUp(f.id, applicantId))
                      }
                      disabled={busy}
                      aria-label="Delete follow-up"
                      className="rounded-md p-1 text-muted transition-colors hover:text-red-400 disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

const COMM_TYPES = ["Call", "WhatsApp", "Email", "In-Person", "Other"].map(
  (t) => ({ value: t, label: t }),
);

function StatusTab({
  applicantId,
  comms,
  role,
}: {
  applicantId: string;
  comms: Comm[];
  role: StaffRole;
}) {
  const [state, action, pending] = useActionState(addCommunication, initial);
  const [commType, setCommType] = useState("Call");
  const canEdit = role !== "Viewer";

  const last = comms[0];

  return (
    <div className="space-y-4">
      {last && (
        <div className="rounded-xl border border-border px-4 py-3 text-[13px] text-muted">
          Last contacted{" "}
          <span className="text-foreground">{when(last.created_at)}</span> ·{" "}
          {last.type}
        </div>
      )}

      {canEdit && (
        <form action={action} className="card-sheen space-y-3 rounded-xl p-4">
          <input type="hidden" name="applicant_id" value={applicantId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-muted-strong">
                Type
              </span>
              <Select
                name="type"
                value={commType}
                onChange={setCommType}
                options={COMM_TYPES}
              />
            </div>
            <label className="block">
              <span className="text-[13px] font-medium text-muted-strong">
                Outcome <span className="font-normal text-muted">(optional)</span>
              </span>
              <input
                name="outcome_tag"
                placeholder="e.g. Confirmed will join"
                className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[13px] font-medium text-muted-strong">
              Summary
            </span>
            <input
              name="summary"
              required
              placeholder="What was discussed?"
              className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
            />
          </label>
          {state.error && <ErrorNote text={state.error} />}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-background disabled:opacity-50"
          >
            {pending ? "Logging…" : "Log contact"}
          </button>
        </form>
      )}

      {comms.length === 0 ? (
        <Empty text="No contact logged yet." />
      ) : (
        comms.map((c) => (
          <div key={c.id} className="surface rounded-xl p-4">
            <div className="flex items-center gap-2">
              <span className="badge badge-accent">{c.type}</span>
              {c.outcome_tag && (
                <span className="badge badge-neutral">{c.outcome_tag}</span>
              )}
            </div>
            <p className="mt-2 text-[13.5px]">{c.summary}</p>
            <div className="mt-2 text-[12px] text-muted">
              {c.staff?.name ?? "Unknown"} · {when(c.created_at)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function fmtSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function DocumentsTab({
  isPremium,
  documents,
  applicantId,
  role,
}: {
  isPremium: boolean;
  documents: Doc[];
  applicantId: string;
  role: StaffRole;
}) {
  const [state, action, pending] = useActionState(uploadDocument, initial);
  const [deleting, startDelete] = useTransition();
  const canEdit = role !== "Viewer";
  const formRef = useRef<HTMLFormElement>(null);

  if (!isPremium) {
    return (
      <div className="card-sheen flex flex-col items-center rounded-2xl px-6 py-14 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent">
          <Lock className="h-5 w-5" strokeWidth={1.6} />
        </span>
        <h3 className="mt-4 text-[15px] font-medium">
          Document uploads are a Premium feature
        </h3>
        <p className="mt-1.5 max-w-sm text-[13.5px] text-muted">
          Upgrade to let applicants attach their ID, transcripts, and
          certificates — and review them right here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.length === 0 ? (
        <Empty text="No documents uploaded yet." />
      ) : (
        <div className="space-y-2">
          {documents.map((d) => (
            <div
              key={d.id}
              className="surface flex items-center justify-between gap-3 rounded-xl px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileText
                  className="h-5 w-5 shrink-0 text-accent"
                  strokeWidth={1.6}
                />
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-medium">
                    {d.label}
                  </div>
                  <div className="text-[12px] text-muted">
                    {fmtSize(d.size)}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {d.url && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Download"
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
                  >
                    <Download className="h-4 w-4" strokeWidth={1.8} />
                  </a>
                )}
                {canEdit && (
                  <button
                    onClick={() =>
                      startDelete(() => deleteDocument(d.id, applicantId))
                    }
                    disabled={deleting}
                    aria-label="Delete"
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <form
          ref={formRef}
          action={action}
          onSubmit={() => setTimeout(() => formRef.current?.reset(), 100)}
          className="card-sheen rounded-xl p-4"
        >
          <input type="hidden" name="applicant_id" value={applicantId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[13px] font-medium text-muted-strong">
                Label (optional)
              </span>
              <input
                name="label"
                placeholder="e.g. Transcript, National ID"
                className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-medium text-muted-strong">
                File (PDF/image, max 5 MB)
              </span>
              <input
                name="file"
                type="file"
                required
                accept=".pdf,image/png,image/jpeg,image/webp"
                className="mt-1.5 block w-full text-[13px] text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-foreground hover:file:bg-[var(--border)]"
              />
            </label>
          </div>
          {state.error && (
            <div className="mt-3">
              <ErrorNote text={state.error} />
            </div>
          )}
          <button
            type="submit"
            disabled={pending}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-background disabled:opacity-50"
          >
            <FileUp className="h-4 w-4" strokeWidth={1.8} />
            {pending ? "Uploading…" : "Upload document"}
          </button>
        </form>
      )}
    </div>
  );
}

function ActivityTab({ activity }: { activity: Activity[] }) {
  if (activity.length === 0) {
    return <Empty text="No activity recorded yet." />;
  }
  return (
    <div className="space-y-2">
      {activity.map((a) => (
        <div key={a.id} className="surface rounded-xl px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13.5px]">{a.description}</span>
            <span className="text-[12px] text-muted">{when(a.created_at)}</span>
          </div>
          {a.reason && (
            <p className="mt-1 text-[12.5px] text-muted">
              Reason: {a.reason}
            </p>
          )}
          <div className="mt-1 text-[12px]">
            {a.staff?.name ? (
              <span className="text-muted">{a.staff.name}</span>
            ) : (
              <span className="badge badge-neutral">System</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-[13.5px] text-muted">
      {text}
    </div>
  );
}

function ErrorNote({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-300">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
