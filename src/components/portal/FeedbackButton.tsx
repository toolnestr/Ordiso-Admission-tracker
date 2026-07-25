"use client";

import { useActionState, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { MessageSquarePlus, Bug, Lightbulb, X, Check, AlertCircle } from "lucide-react";
import { submitFeedback, type FeedbackState } from "@/app/(portal)/feedback/actions";

const initial: FeedbackState = { ok: false, error: null };

/**
 * "Feedback / report a bug" entry point for the portal. Lives at the bottom of
 * the sidebar (below Upgrade) and opens a lightweight modal. Reports are stored
 * institute-scoped and read by the platform owner in the Super Admin panel.
 */
export default function FeedbackButton({
  variant = "sidebar",
}: {
  variant?: "sidebar" | "mobile";
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"Feedback" | "Bug">("Feedback");
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const [state, action, pending] = useActionState(submitFeedback, initial);

  useEffect(() => setMounted(true), []);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const trigger =
    variant === "mobile" ? (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-[13.5px] font-medium text-foreground transition-colors hover:bg-[var(--border)]"
      >
        <MessageSquarePlus className="h-[17px] w-[17px]" strokeWidth={1.7} />
        Feedback / Report a bug
      </button>
    ) : (
      <button
        onClick={() => setOpen(true)}
        className="mt-1.5 flex w-full items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-[13.5px] font-medium text-foreground transition-colors hover:bg-[var(--border)]"
      >
        <MessageSquarePlus className="h-[17px] w-[17px]" strokeWidth={1.7} />
        Feedback / Report a bug
      </button>
    );

  const modal =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => !pending && setOpen(false)}
          >
            <div
              className="card-sheen w-full max-w-md rounded-t-2xl p-6 sm:rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[15px] font-medium">Send us feedback</h3>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="rounded-md p-1 text-muted transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {state.ok ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <span className="grid h-11 w-11 place-items-center rounded-full border border-green-500/30 bg-green-500/10 text-green-300">
                    <Check className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <p className="mt-3 text-[14px] font-medium">Thanks — we got it.</p>
                  <p className="mt-1 text-[13px] text-muted">
                    We read every message. We&apos;ll follow up if we need more detail.
                  </p>
                  <button
                    onClick={() => setOpen(false)}
                    className="mt-5 rounded-lg bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form action={action} className="space-y-4">
                  <input type="hidden" name="type" value={type} />
                  <input type="hidden" name="page_url" value={pathname} />

                  {/* Type toggle */}
                  <div className="grid grid-cols-2 gap-2">
                    <TypeOption
                      active={type === "Feedback"}
                      onClick={() => setType("Feedback")}
                      icon={<Lightbulb className="h-4 w-4" strokeWidth={1.8} />}
                      label="Feedback"
                    />
                    <TypeOption
                      active={type === "Bug"}
                      onClick={() => setType("Bug")}
                      icon={<Bug className="h-4 w-4" strokeWidth={1.8} />}
                      label="Bug report"
                    />
                  </div>

                  <label className="block">
                    <span className="text-[13px] font-medium text-muted-strong">
                      {type === "Bug"
                        ? "What went wrong?"
                        : "What's on your mind?"}
                    </span>
                    <textarea
                      name="message"
                      required
                      rows={5}
                      maxLength={4000}
                      autoFocus
                      placeholder={
                        type === "Bug"
                          ? "Describe what you did and what happened…"
                          : "Tell us what would make Ordiso better…"
                      }
                      className="surface-2 mt-1.5 w-full resize-none rounded-lg px-3 py-2.5 text-[13.5px] outline-none focus:border-border-strong"
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
                    className="w-full rounded-lg bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {pending ? "Sending…" : "Send"}
                  </button>
                </form>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {trigger}
      {modal}
    </>
  );
}

function TypeOption({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors ${
        active
          ? "border-accent-soft bg-accent-soft text-accent"
          : "border-border bg-surface-2 text-muted hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
