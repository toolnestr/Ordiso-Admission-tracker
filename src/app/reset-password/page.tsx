"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import Field from "@/components/auth/Field";
import { setNewPassword, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = { error: null };

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(
    setNewPassword,
    initialState,
  );

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a password you haven't used before."
      footer={
        <>
          Changed your mind?{" "}
          <Link href="/login" className="font-medium text-foreground">
            Back to log in
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-4">
        <Field
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
        />
        <Field
          label="Confirm new password"
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
          {pending ? "Updating…" : "Update password"}
        </button>
      </form>
    </AuthShell>
  );
}
