"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Mail, MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { SectionHeading } from "./HowItWorks";

const freeFeatures = [
  "200 students per session",
  "Custom form builder",
  "Public link and QR code",
  "Full dashboard and analytics",
  "Up to 3 staff seats",
  "Fee tracking and interviews",
];

const premiumFeatures = [
  "Everything in Free",
  "Unlimited students and staff",
  "Document uploads and viewer",
  "Email automation",
  "Custom domain and white-label",
  "Full backup and export center",
];

export default function Pricing() {
  const [open, setOpen] = useState(false);

  return (
    <section id="pricing" className="relative mx-auto max-w-4xl px-6 py-28">
      <SectionHeading
        eyebrow="Pricing"
        title="Simple, honest pricing"
        subtitle="The free plan is genuinely free forever. Premium is sales-assisted while we finalize pricing — just reach out."
      />

      <div className="mt-16 grid gap-4 md:grid-cols-2">
        {/* Free */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="card-sheen flex flex-col rounded-2xl p-7"
        >
          <h3 className="text-[15px] font-medium text-muted-strong">Free</h3>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight">$0</span>
            <span className="text-sm text-muted">/ forever</span>
          </div>
          <p className="mt-2 text-[13.5px] text-muted">
            Everything an institute needs to run a full admission session.
          </p>
          <ul className="mt-6 flex-1 space-y-3">
            {freeFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[13.5px]">
                <Check
                  className="h-4 w-4 shrink-0 text-accent"
                  strokeWidth={2.2}
                />
                <span className="text-muted-strong">{f}</span>
              </li>
            ))}
          </ul>
          <a
            href="/register"
            className="mt-8 rounded-lg bg-foreground py-2.5 text-center text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Register now
          </a>
        </motion.div>

        {/* Premium */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="ring-premium flex flex-col rounded-2xl p-7"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-medium">Premium</h3>
            <span className="rounded-full border border-border bg-accent-soft px-2.5 py-0.5 text-[11px] font-medium text-accent">
              For growing institutes
            </span>
          </div>
          <div className="mt-4 text-4xl font-semibold tracking-tight">
            Let&apos;s talk
          </div>
          <p className="mt-2 text-[13.5px] text-muted">
            Unlimited scale, documents, automation, and your own domain.
          </p>
          <ul className="mt-6 flex-1 space-y-3">
            {premiumFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-[13.5px]">
                <Check
                  className="h-4 w-4 shrink-0 text-accent"
                  strokeWidth={2.2}
                />
                <span className="text-muted-strong">{f}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setOpen(true)}
            className="surface-2 mt-8 rounded-lg py-2.5 text-center text-sm font-medium transition-colors hover:bg-[var(--border)]"
          >
            Contact us
          </button>
        </motion.div>
      </div>

      <ContactModal open={open} onClose={() => setOpen(false)} />
    </section>
  );
}

function ContactModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-6 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="card-sheen w-full max-w-md rounded-2xl p-7"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">
                  Talk to us about Premium
                </h3>
                <p className="mt-1.5 text-[13.5px] text-muted">
                  We&apos;ll help you pick the right plan. Reach out however
                  works best:
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-md p-1 text-muted transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-2.5">
              <a
                href="mailto:hello@ordiso.app"
                className="surface flex items-center gap-3 rounded-xl p-3.5 transition-colors hover:border-border-strong"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface-2 text-accent">
                  <Mail className="h-[18px] w-[18px]" strokeWidth={1.6} />
                </span>
                <div>
                  <div className="text-[13.5px] font-medium">Email us</div>
                  <div className="text-xs text-muted">hello@ordiso.app</div>
                </div>
              </a>
              <a
                href="https://wa.me/0000000000"
                target="_blank"
                rel="noopener noreferrer"
                className="surface flex items-center gap-3 rounded-xl p-3.5 transition-colors hover:border-border-strong"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface-2 text-accent">
                  <MessageCircle
                    className="h-[18px] w-[18px]"
                    strokeWidth={1.6}
                  />
                </span>
                <div>
                  <div className="text-[13.5px] font-medium">WhatsApp</div>
                  <div className="text-xs text-muted">Chat with our team</div>
                </div>
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
