import type { Metadata } from "next";
import { Mail, Clock } from "lucide-react";
import Nav from "@/components/landing/Nav";
import Footer from "@/components/landing/Footer";
import ContactForm from "@/components/landing/ContactForm";

// A real marketing page — opt back into indexing (the root layout defaults to
// noindex) with a self-referencing canonical.
export const metadata: Metadata = {
  title: "Contact us — Ordiso",
  description:
    "Get in touch with the Ordiso team. Questions about admissions management, pricing, or your institute account — we're happy to help.",
  alternates: { canonical: "/contact" },
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 pb-16 pt-32 sm:pt-36">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-[-0.02em] sm:text-[40px]">
              Get in touch
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">
              Questions about setting up your institute, pricing, or your
              account? Send us a message and we&apos;ll reply by email. We
              usually respond within one business day.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <ContactForm />

            <aside className="space-y-4">
              <div className="surface rounded-2xl p-5">
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-accent-soft bg-accent-soft text-accent">
                  <Mail className="h-[18px] w-[18px]" strokeWidth={1.7} />
                </span>
                <h3 className="mt-3 text-[14px] font-medium">Prefer email?</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  Use the form and we&apos;ll pick it up right away — it reaches
                  the same inbox and we can reply to you directly.
                </p>
              </div>
              <div className="surface rounded-2xl p-5">
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-accent-soft bg-accent-soft text-accent">
                  <Clock className="h-[18px] w-[18px]" strokeWidth={1.7} />
                </span>
                <h3 className="mt-3 text-[14px] font-medium">Response time</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">
                  Most messages get a reply within one business day. Already have
                  an account? Mention your institute name so we can find it fast.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
