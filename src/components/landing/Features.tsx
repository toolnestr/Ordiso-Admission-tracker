"use client";

import { motion } from "framer-motion";
import {
  LayoutList,
  Share2,
  Users,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading } from "./HowItWorks";

type Feature = {
  title: string;
  desc: string;
  icon: LucideIcon;
  className: string;
  span?: boolean;
};

const features: Feature[] = [
  {
    title: "Application management",
    desc: "A visual pipeline from Applied → Shortlisted → Interview → Admitted → Confirmed. Custom forms, applicant profiles, notes, fees, and interview scheduling — every applicant in one place.",
    icon: LayoutList,
    className: "md:col-span-2 md:row-span-2",
    span: true,
  },
  {
    title: "Sharing & reach",
    desc: "One public link and branded QR code. Share anywhere, track the source of every applicant.",
    icon: Share2,
    className: "",
  },
  {
    title: "Team & access",
    desc: "Invite staff as Admin, Counselor, or Viewer — permissions enforced down to the database.",
    icon: Users,
    className: "",
  },
  {
    title: "Insights & analytics",
    desc: "Session-aware funnels, status breakdowns, trends, and source charts — plus session comparisons and exports.",
    icon: BarChart3,
    className: "md:col-span-2",
  },
];

export default function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-6xl px-6 py-28">
      <SectionHeading
        eyebrow="Features"
        title="Everything you need to run admissions"
        subtitle="A free tier that feels genuinely premium — the same depth of tooling a paid product would charge for."
      />

      <div className="mt-16 grid auto-rows-[minmax(168px,auto)] grid-cols-1 gap-4 md:grid-cols-3">
        {features.map((f, i) => (
          <FeatureCard key={f.title} feature={f} index={i} />
        ))}
      </div>
    </section>
  );
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const Icon = feature.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className={`card-sheen group relative overflow-hidden rounded-2xl p-6 transition-colors hover:border-border-strong ${feature.className}`}
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface-2 text-accent">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
      </span>
      <h3 className="mt-5 text-[15px] font-medium">{feature.title}</h3>
      <p
        className={`mt-2 text-[13.5px] leading-relaxed text-muted ${
          feature.span ? "max-w-md" : ""
        }`}
      >
        {feature.desc}
      </p>

      {feature.span && (
        <div className="mt-6 hidden gap-2 sm:flex">
          {["Applied", "Shortlisted", "Interview", "Admitted", "Confirmed"].map(
            (s, i) => (
              <div
                key={s}
                className="flex-1 rounded-lg border border-border bg-surface px-2.5 py-2 text-center"
              >
                <div className="text-[10.5px] text-muted">{s}</div>
                <div className="mt-1 text-sm font-semibold tabular-nums">
                  {[100, 72, 48, 31, 24][i]}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </motion.div>
  );
}
