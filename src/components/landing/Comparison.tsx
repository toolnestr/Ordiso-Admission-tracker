"use client";

import { motion } from "framer-motion";
import { Check, Minus } from "lucide-react";
import { useState } from "react";
import { SectionHeading } from "./HowItWorks";

const rows: { label: string; free: boolean; premium: boolean }[] = [
  { label: "200 students per admission session", free: true, premium: true },
  { label: "Custom drag-and-drop form builder", free: true, premium: true },
  { label: "Public link and QR code sharing", free: true, premium: true },
  { label: "Full dashboard and analytics", free: true, premium: true },
  { label: "Up to 3 staff seats", free: true, premium: true },
  { label: "Interview scheduling and fee tracking", free: true, premium: true },
  { label: "Unlimited students", free: false, premium: true },
  { label: "Unlimited staff seats", free: false, premium: true },
  { label: "Document uploads and viewer", free: false, premium: true },
  { label: "Email automation", free: false, premium: true },
  { label: "Custom domain and white-labeling", free: false, premium: true },
  { label: "Full backup and bulk export center", free: false, premium: true },
];

export default function Comparison() {
  const [plan, setPlan] = useState<"free" | "premium">("free");

  return (
    <section className="relative mx-auto max-w-3xl px-6 py-28">
      <SectionHeading
        eyebrow="Free vs Premium"
        title="Start free. Upgrade only when you outgrow it."
      />

      <div className="mt-10 flex justify-center">
        <div className="surface-2 relative inline-flex rounded-lg p-1">
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="absolute inset-y-1 w-[calc(50%-4px)] rounded-md bg-foreground"
            style={{ left: plan === "free" ? 4 : "50%" }}
          />
          {(["free", "premium"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlan(p)}
              className={`relative z-10 w-28 rounded-md py-1.5 text-[13px] font-medium capitalize transition-colors ${
                plan === p ? "text-background" : "text-muted"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="surface mt-10 overflow-hidden rounded-2xl">
        {rows.map((row, i) => {
          const included = plan === "free" ? row.free : row.premium;
          return (
            <div
              key={row.label}
              className="flex items-center justify-between border-b border-border px-5 py-3.5 last:border-0"
            >
              <span
                className={`text-[13.5px] ${
                  included ? "text-foreground" : "text-muted"
                }`}
              >
                {row.label}
              </span>
              {included ? (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-accent-soft text-accent">
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                </span>
              ) : (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-surface-2 text-muted">
                  <Minus className="h-3 w-3" strokeWidth={2} />
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-[13.5px] text-muted">
        <span className="font-medium text-foreground">200 students free</span>{" "}
        every admission session — no credit card, ever.
      </p>
    </section>
  );
}
