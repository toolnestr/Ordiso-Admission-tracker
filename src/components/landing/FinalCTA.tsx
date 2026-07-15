"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="relative mx-auto max-w-4xl px-6 py-28">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="card-sheen relative overflow-hidden rounded-2xl px-8 py-16 text-center"
      >
        <div className="accent-glow absolute inset-x-0 top-0 h-56" />
        <div className="relative">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] sm:text-[38px]">
            Start managing admissions today
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-muted">
            Set up your institute in minutes and share your first application
            form before lunch. Free forever, no strings attached.
          </p>
          <a
            href="/register"
            className="group mt-8 inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Register your institute
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </motion.div>
    </section>
  );
}
