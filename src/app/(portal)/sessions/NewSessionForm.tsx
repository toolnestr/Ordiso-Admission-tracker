"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Plus, X } from "lucide-react";
import { createSession, type SessionActionState } from "./actions";

const initial: SessionActionState = { error: null };

export default function NewSessionForm({ hasOpen }: { hasOpen: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createSession, initial);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={hasOpen}
        title={hasOpen ? "Close your open session first" : undefined}
        className="inline-flex items-center gap-2 rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        New session
      </button>
    );
  }

  return (
    <div className="card-sheen rounded-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-medium">Create a session</h3>
        <button
          onClick={() => setOpen(false)}
          aria-label="Cancel"
          className="rounded-md p-1 text-muted transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form
        action={action}
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={() => setTimeout(() => setOpen(false), 100)}
      >
        <label className="block sm:col-span-2">
          <span className="text-[13px] font-medium text-muted-strong">
            Session name
          </span>
          <input
            name="name"
            required
            placeholder="e.g. Fall 2026 Admissions"
            className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-muted-strong">
            Start date
          </span>
          <input
            name="start_date"
            type="date"
            required
            className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-muted-strong">
            End date
          </span>
          <input
            name="end_date"
            type="date"
            required
            className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-[13px] font-medium text-muted-strong">
            Target admissions{" "}
            <span className="font-normal text-muted">(optional)</span>
          </span>
          <input
            name="target_goal"
            type="number"
            min={1}
            placeholder="e.g. 150"
            className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-border-strong"
          />
        </label>

        {state.error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-300 sm:col-span-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}

        <div className="flex gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Creating…" : "Create session"}
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
