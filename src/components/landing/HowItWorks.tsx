"use client";

import { motion } from "framer-motion";
import { Building2, FileText, QrCode, LineChart } from "lucide-react";

const steps = [
  {
    icon: Building2,
    title: "Register your institute",
    desc: "Sign up free in seconds — no approval gate, no setup fees.",
  },
  {
    icon: FileText,
    title: "Build your form",
    desc: "Drag-and-drop fields, programs, and conditional logic. Fully custom.",
  },
  {
    icon: QrCode,
    title: "Share your link or QR",
    desc: "One public link and QR code. Print it, post it, or send it over WhatsApp.",
  },
  {
    icon: LineChart,
    title: "Track on your dashboard",
    desc: "Watch every applicant move from Applied to Confirmed in real time.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="relative mx-auto max-w-6xl px-6 py-28">
      <SectionHeading
        eyebrow="How it works"
        title="From signup to enrolled in four steps"
      />

      <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-border md:grid-cols-4">
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="relative bg-surface p-6"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface-2 text-accent">
                <s.icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
              </span>
              <span className="font-mono text-xs text-muted">
                0{i + 1}
              </span>
            </div>
            <h3 className="mt-5 text-[15px] font-medium">{s.title}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
              {s.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mx-auto max-w-2xl text-center"
    >
      <div className="text-[12.5px] font-medium uppercase tracking-[0.18em] text-accent">
        {eyebrow}
      </div>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] sm:text-[38px]">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
