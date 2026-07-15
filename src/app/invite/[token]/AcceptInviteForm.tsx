"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import Field from "@/components/auth/Field";
import { acceptInvite, type AcceptState } from "./actions";

const initial: AcceptState = { error: null };

export default function AcceptInviteForm({
  token,
  name,
  email,
}: {
  token: string;
  name: string;
  email: string;
}) {
  const [state, action, pending] = useActionState(acceptInvite, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div className="surface rounded-lg px-3 py-2.5">
        <div className="text-[13.5px] font-medium">{name}</div>
        <div className="text-[12.5px] text-muted">{email}</div>
      </div>

      <Field
        label="Create a password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
      />
      <Field
        label="Confirm password"
        name="confirm_password"
        type="password"
        autoComplete="new-password"
        minLength={8}
      />

      {state.error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full rounded-lg bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Setting up…" : "Join institute"}
      </button>
    </form>
  );
}
