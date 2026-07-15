"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Check, Copy, Plus, Sparkles, X } from "lucide-react";
import { inviteStaff, type StaffActionState } from "./actions";

const initial: StaffActionState = { error: null };

export default function InviteForm({
  atCap,
  seatLimit,
}: {
  atCap: boolean;
  seatLimit: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(inviteStaff, initial);

  if (state.inviteUrl) {
    return <InviteLinkCard url={state.inviteUrl} onDone={() => setOpen(false)} />;
  }

  if (!open) {
    return (
      <div>
        <button
          onClick={() => setOpen(true)}
          disabled={atCap}
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Invite staff
        </button>
        {atCap && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-accent-soft bg-accent-soft px-3 py-2.5 text-[13px] text-accent">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              You&apos;ve used all {seatLimit} free seats. Unlock unlimited staff
              seats with Premium.
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card-sheen rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-medium">Invite a staff member</h3>
        <button
          onClick={() => setOpen(false)}
          aria-label="Cancel"
          className="rounded-md p-1 text-muted transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form action={action} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[13px] font-medium text-muted-strong">
              Name
            </span>
            <input
              name="name"
              required
              className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
            />
          </label>
          <label className="block">
            <span className="text-[13px] font-medium text-muted-strong">
              Email
            </span>
            <input
              name="email"
              type="email"
              required
              className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-[13px] font-medium text-muted-strong">Role</span>
          <select
            name="role"
            defaultValue="Counselor"
            className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
          >
            <option value="Admin">Admin — full access</option>
            <option value="Counselor">
              Counselor — manage applicants, record payments
            </option>
            <option value="Viewer">Viewer — read-only</option>
          </select>
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
            className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Creating invite…" : "Create invite link"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="surface-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--border)]"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export function InviteLinkCard({
  url,
  onDone,
}: {
  url: string;
  onDone?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const full = typeof window !== "undefined" ? window.location.origin + url : url;

  return (
    <div className="card-sheen rounded-2xl p-6">
      <h3 className="text-[15px] font-medium">Invite link ready</h3>
      <p className="mt-1.5 text-[13.5px] text-muted">
        Send this link to your staff member — it works once and expires in 7
        days. (Automatic invite emails are a Premium feature.)
      </p>
      <div className="mt-4 flex items-center gap-2">
        <input
          readOnly
          value={full}
          className="surface-2 min-w-0 flex-1 rounded-lg px-3 py-2.5 text-[13px] text-muted-strong outline-none"
        />
        <button
          onClick={() => {
            navigator.clipboard?.writeText(full);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="surface-2 flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors hover:bg-[var(--border)]"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {onDone && (
        <button
          onClick={onDone}
          className="mt-4 text-[13px] font-medium text-muted transition-colors hover:text-foreground"
        >
          Done
        </button>
      )}
    </div>
  );
}
