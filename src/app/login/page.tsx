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
