"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import Field from "@/components/auth/Field";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <AuthShell
      title="Log in"
      subtitle="Welcome back to your admissions dashboard."
      footer={
        <>
          Don&apos;t have an institute yet?{" "}
          <Link href="/register" className="font-medium text-foreground">
            Register free
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-4">
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted transition-colors hover:text-foreground">
            <input
              type="checkbox"
              name="remember"
              defaultChecked
              className="h-3.5 w-3.5 rounded border-border bg-surface-2 accent-[var(--accent)]"
            />
            Remember me
          </label>
          <Link
            href="/forgot-password"
            className="text-[13px] text-muted transition-colors hover:text-foreground"
          >
            Forgot password?
          </Link>
        </div>

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
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthShell>
  );
}
