"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Mail, MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { SectionHeading } from "./HowItWorks";

type Tier = {
  name: string;
  price: string;
  cadence?: string;
  tagline: string;
  features: string[];
  cta: string;
  href?: string; // link (Free) — otherwise opens the contact modal
  highlight?: boolean;
};

const tiers: Tier[] = [
  {
    name: "Free",
    price: "$0",
    cadence: "/ forever",
    tagline: "Run a full admission session, free.",
    features: [
      "200 students per session",
      "Custom form builder",
      "Public link & QR code",
      "Full dashboard & analytics",
      "Up to 3 staff seats",
      "Fee tracking & interviews",
    ],
    cta: "Register now",
    href: "/register",
  },
  {
    name: "Starter",
    price: "$3",
    cadence: "/ month",
    tagline: "Grow past the free limits.",
    features: [
      "Everything in Free",
      "Unlimited students",
      "Unlimited staff seats",
      "Unlimited sessions",
      "No document uploads",
      "No email automation",
    ],
    cta: "Choose Starter",
  },
  {
    name: "Pro",
    price: "$10",
    cadence: "/ month",
    tagline: "Documents & automated email.",
    features: [
      "Everything in Starter",
      "Document uploads & viewer",
      "Email automation",
      "Applicant document center",
      "Priority support",
    ],
    cta: "Choose Pro",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Let's talk",
    tagline: "Your domain, your brand.",
    features: [
      "Everything in Pro",
      "Custom domain",
      "White-labeling",
      "Full backup & export center",
      "Dedicated onboarding",
    ],
    cta: "Contact us",
  },
];

export default function Pricing() {
  const [contactPlan, setContactPlan] = useState<string | null>(null);

  return (
    <section id="pricing" className="relative mx-auto max-w-6xl px-6 py-28">
      <SectionHeading
        eyebrow="Pricing"
        title="Simple, honest pricing"
        subtitle="Start free forever. Upgrade only when you outgrow it — paid plans are sales-assisted while we finalize checkout, so just reach out."
      />

      <div className="mt-16 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {tiers.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            className={`flex flex-col rounded-2xl p-6 ${
              t.highlight ? "ring-premium" : "card-sheen"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-medium">{t.name}</h3>
              {t.highlight && (
                <span className="rounded-full border border-border bg-accent-soft px-2.5 py-0.5 text-[11px] font-medium text-accent">
                  Popular
                </span>
              )}
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight">
                {t.price}
              </span>
              {t.cadence && (
                <span className="text-[13px] text-muted">{t.cadence}</span>
              )}
            </div>
            <p className="mt-2 text-[13px] text-muted">{t.tagline}</p>

            <ul className="mt-6 flex-1 space-y-2.5">
              {t.features.map((f) => {
                const off = /^No /.test(f);
                return (
                  <li
                    key={f}
                    className="flex items-center gap-2.5 text-[13px]"
                  >
                    {off ? (
                      <X className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
                    ) : (
                      <Check
                        className="h-4 w-4 shrink-0 text-accent"
                        strokeWidth={2.2}
                      />
                    )}
                    <span className={off ? "text-muted" : "text-muted-strong"}>
                      {off ? f.replace(/^No /, "") : f}
                    </span>
                  </li>
                );
              })}
            </ul>

            {t.href ? (
              <a
                href={t.href}
                className="mt-8 rounded-lg bg-foreground py-2.5 text-center text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                {t.cta}
              </a>
            ) : (
              <button
                onClick={() => setContactPlan(t.name)}
                className={`mt-8 rounded-lg py-2.5 text-center text-sm font-medium transition-colors ${
                  t.highlight
                    ? "bg-foreground text-background hover:opacity-90"
                    : "surface-2 hover:bg-[var(--border)]"
                }`}
              >
                {t.cta}
              </button>
            )}
          </motion.div>
        ))}
      </div>

      <ContactModal
        plan={contactPlan}
        onClose={() => setContactPlan(null)}
      />
    </section>
  );
}

function ContactModal({
  plan,
  onClose,
}: {
  plan: string | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {plan && (
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
                  {plan} plan
                </h3>
                <p className="mt-1.5 text-[13.5px] text-muted">
                  Tell us about your institute and we&apos;ll get you set up on{" "}
                  {plan}. Reach out however works best:
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
                  <MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.6} />
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
