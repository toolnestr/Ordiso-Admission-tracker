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
              {/* Direct WhatsApp chat — wa.me needs the number as digits only
                  (no +, spaces or dashes). */}
              <a
                href="https://wa.me/923068977463?text=Hi%20Ordiso%2C%20I%20have%20a%20question"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/10 p-5 transition-colors hover:bg-[#25D366]/15"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#25D366] text-white">
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.548 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-[14px] font-medium">Chat on WhatsApp</h3>
                  <p className="mt-0.5 text-[13px] text-muted">+92 306 8977463</p>
                </div>
              </a>
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
