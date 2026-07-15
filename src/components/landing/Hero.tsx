"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Backdrop from "./Backdrop";

export default function Hero() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [4, -4]), {
    stiffness: 120,
    damping: 18,
  });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-4, 4]), {
    stiffness: 120,
    damping: 18,
  });

  return (
    <section
      id="top"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-32 pb-20 text-center"
    >
      <Backdrop />

      <motion.a
        href="#features"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="surface group mb-7 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12.5px] text-muted-strong transition-colors hover:text-foreground"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        200 students free every admission session
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </motion.a>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.05 }}
        className="max-w-3xl text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[64px]"
      >
        Admission management,
        <br className="hidden sm:block" />{" "}
        <span className="text-muted-strong">built for institutes.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.6 }}
        className="mt-6 max-w-xl text-[16px] leading-relaxed text-muted"
      >
        Collect applications, track every applicant through your pipeline, and
        confirm admissions — in one clean workspace. No setup fees, no hidden
        costs.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.6 }}
        className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
      >
        <a
          href="/register"
          className="group inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Register your institute
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </a>
        <a
          href="/login"
          className="surface-2 rounded-lg px-5 py-3 text-sm font-medium transition-colors hover:bg-[var(--border)]"
        >
          Login
        </a>
      </motion.div>

      {/* Product frame */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        style={{ perspective: 1400 }}
        className="mt-20 w-full max-w-4xl"
      >
        <motion.div
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          className="card-sheen overflow-hidden rounded-xl p-2 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]"
        >
          <DashboardMockup />
        </motion.div>
      </motion.div>
    </section>
  );
}

function DashboardMockup() {
  const stats = [
    { label: "Total applicants", value: "142", delta: "+18" },
    { label: "Shortlisted", value: "58", delta: "+6" },
    { label: "Admitted", value: "31", delta: "+4" },
    { label: "Confirmed", value: "24", delta: "+3" },
  ];
  const funnel = [
    { label: "Applied", pct: 100 },
    { label: "Shortlisted", pct: 72 },
    { label: "Interview", pct: 48 },
    { label: "Admitted", pct: 31 },
    { label: "Confirmed", pct: 24 },
  ];

  return (
    <div className="rounded-lg bg-[#0b0b0f] p-4 text-left">
      {/* window chrome */}
      <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        </div>
        <span className="rounded-md border border-border bg-surface px-2 py-1 text-[10.5px] text-muted">
          Fall 2026 · 142 / 200 students
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="surface rounded-lg p-3">
            <div className="text-[11px] text-muted">{s.label}</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-semibold tabular-nums">
                {s.value}
              </span>
              <span className="text-[10.5px] font-medium text-accent">
                {s.delta}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="surface mt-2.5 rounded-lg p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] text-muted">Applicant funnel</span>
          <span className="text-[10.5px] text-muted">Full session</span>
        </div>
        <div className="space-y-2">
          {funnel.map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-[11px] text-muted-strong">
                {f.label}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.04]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent/70 to-accent"
                  style={{ width: `${f.pct}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-muted">
                {f.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
