"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, MailCheck } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import Field from "@/components/auth/Field";
import {
  requestPasswordReset,
  type ForgotPasswordState,
} from "./actions";

const initialState: ForgotPasswordState = { error: null, sent: false };

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialState,
  );

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a link to set a new one."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-medium text-foreground">
            Back to log in
          </Link>
        </>
      }
    >
      {state.sent ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-[13px] text-emerald-300">
          <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            If an account exists for that email, a reset link is on its way.
            The link expires in one hour.
          </span>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
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
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
