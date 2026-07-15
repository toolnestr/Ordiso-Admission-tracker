"use client";

import { useActionState, useState, useTransition } from "react";
import {
  AlertCircle,
  Lock,
  Plus,
  Trash2,
  Wallet,
  History,
} from "lucide-react";
import {
  addFee,
  recordPayment,
  waiveFee,
  addNote,
  deleteNote,
  addCommunication,
  type ActionState,
} from "./actions";
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

const initial: ActionState = { error: null };

const TABS = [
  "Form Data",
  "Fees",
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

export default function DetailTabs(props: {
  applicantId: string;
  role: StaffRole;
  currency: string;
  isPremium: boolean;
  formData: Record<string, unknown>;
  fees: Fee[];
  notes: Note[];
  comms: Comm[];
  activity: Activity[];
  staffId: string;
}) {
  const [tab, setTab] = useState<Tab>("Form Data");

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
          </button>
        ))}
      </div>

      <div className="py-6">
        {tab === "Form Data" && <FormDataTab data={props.formData} />}
        {tab === "Fees" && <FeesTab {...props} />}
        {tab === "Notes" && <NotesTab {...props} />}
        {tab === "Status" && <StatusTab {...props} />}
        {tab === "Documents" && <DocumentsTab isPremium={props.isPremium} />}
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
  role,
  currency,
}: {
  applicantId: string;
  fees: Fee[];
  role: StaffRole;
  currency: string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [state, action, pending] = useActionState(addFee, initial);
  const canEdit = role !== "Viewer";

  const totalDue = fees.reduce((s, f) => s + Number(f.remaining_balance), 0);

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
  const [state, action, pending] = useActionState(recordPayment, initial);
  const [waiving, startWaive] = useTransition();
  const canEdit = role !== "Viewer";
  const settled = fee.status === "Paid" || fee.status === "Waived";

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
              <div
                key={p.id}
                className="flex justify-between text-[12.5px] text-muted-strong"
              >
                <span className="tabular-nums">
                  {currency}
                  {p.amount}
                </span>
                <span className="text-muted">
                  {when(p.paid_on)} · {p.staff?.name ?? "System"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
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

const COMM_TYPES = ["Call", "WhatsApp", "Email", "In-Person", "Other"];

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
            <label className="block">
              <span className="text-[13px] font-medium text-muted-strong">
                Type
              </span>
              <select
                name="type"
                className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
              >
                {COMM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
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

function DocumentsTab({ isPremium }: { isPremium: boolean }) {
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
  return <Empty text="No documents uploaded." />;
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
