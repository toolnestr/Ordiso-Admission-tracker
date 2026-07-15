"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import Field from "@/components/auth/Field";
import { registerInstitute, type RegisterState } from "./actions";

const initialState: RegisterState = { error: null };

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(
    registerInstitute,
    initialState,
  );

  return (
    <AuthShell
      title="Register your institute"
      subtitle="Free forever — no setup fees, no credit card."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground">
            Log in
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-4">
        <Field label="Institute name" name="institute_name" />
        <Field label="Your name" name="admin_name" autoComplete="name" />
        <Field
          label="Work email"
          name="email"
          type="email"
          autoComplete="email"
        />
        <Field
          label="Password"
          name="password"
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
          {pending ? "Creating your institute…" : "Register your institute"}
        </button>
      </form>
    </AuthShell>
  );
}
