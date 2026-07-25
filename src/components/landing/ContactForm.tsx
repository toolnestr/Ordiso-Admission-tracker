"use client";

import { useActionState } from "react";
import { AlertCircle, Check, Send } from "lucide-react";
import { submitContact, type ContactState } from "@/app/contact/actions";

const initial: ContactState = { ok: false, error: null };

export default function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, initial);

  if (state.ok) {
    return (
      <div className="card-sheen flex flex-col items-center rounded-2xl px-8 py-14 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full border border-green-500/30 bg-green-500/10 text-green-300">
          <Check className="h-6 w-6" strokeWidth={2} />
        </span>
        <h2 className="mt-4 text-[19px] font-semibold">Message sent</h2>
        <p className="mt-1.5 max-w-sm text-[14px] text-muted">
          Thanks for reaching out — we&apos;ll get back to you by email as soon
          as we can.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="card-sheen space-y-4 rounded-2xl p-6 sm:p-8">
      {/* Honeypot — hidden from humans, catches bots. */}
      <div className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[13px] font-medium text-muted-strong">Name</span>
          <input
            name="name"
            required
            maxLength={120}
            autoComplete="name"
            className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted focus:border-border-strong"
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-muted-strong">Email</span>
          <input
            name="email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            className="surface-2 mt-1.5 block w-full rounded-lg px-3 py-2.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted focus:border-border-strong"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-[13px] font-medium text-muted-strong">Message</span>
        <textarea
          name="message"
          required
          rows={6}
          maxLength={4000}
          placeholder="How can we help?"
          className="surface-2 mt-1.5 block w-full resize-none rounded-lg px-3 py-2.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted focus:border-border-strong"
        />
      </label>

      {state.error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-foreground py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto sm:px-6"
      >
        <Send className="h-4 w-4" strokeWidth={1.9} />
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
