"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState } from "react";
import { SectionHeading } from "./HowItWorks";

const faqs = [
  {
    q: "Is it really free?",
    a: "Yes. The free plan lets you manage up to 200 students per admission session, with the full form builder, dashboard, QR sharing, and up to 5 staff seats — no credit card, no setup fee, no time limit.",
  },
  {
    q: "What happens after 200 students?",
    a: "Once a session reaches 200 applicants, the public form stops accepting new submissions for that session. You can start a fresh session (another 200 free), or upgrade to Premium for unlimited students.",
  },
  {
    q: "Can I get my own domain?",
    a: "Custom domains and white-labeling are Premium features. On the free plan your application form lives at a shareable Ordiso link that never changes, even if you rename your institute.",
  },
  {
    q: "Is my data secure and isolated from other institutes?",
    a: "Absolutely. Every institute's data is isolated at the database level with row-level security — one institute can never see another's applicants. We also run automated nightly backups so your records stay safe.",
  },
  {
    q: "Do students need to create an account?",
    a: "Never. Students simply open your link or scan your QR code, fill the form, and get an Application ID to check their status. No login, no password, no account.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative mx-auto max-w-2xl px-6 py-28">
      <SectionHeading eyebrow="FAQ" title="Questions, answered" />

      <div className="surface mt-12 overflow-hidden rounded-2xl">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className="border-b border-border last:border-0">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-[14.5px] font-medium">{f.q}</span>
                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="shrink-0 text-muted"
                >
                  <Plus className="h-4 w-4" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28 }}
                  >
                    <p className="px-5 pb-4 text-[13.5px] leading-relaxed text-muted">
                      {f.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
