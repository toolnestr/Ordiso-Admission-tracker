"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, Check } from "lucide-react";
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
            {/* Custom box (appearance-none) so it renders identically on mobile
                — a native checkbox is near-invisible on the dark background. */}
            <span className="relative flex h-4 w-4 items-center justify-center">
              <input
                type="checkbox"
                name="remember"
                defaultChecked
                className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-border-strong bg-surface-2 transition-colors checked:border-accent checked:bg-accent"
              />
              <Check
                className="pointer-events-none absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100"
                strokeWidth={3}
              />
            </span>
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
