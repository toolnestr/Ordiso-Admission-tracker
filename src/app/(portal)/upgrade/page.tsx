import { Check, Mail, MessageCircle, Sparkles } from "lucide-react";
import { getPortalContext, FREE_STAFF_SEATS, FREE_TIER_CAP } from "@/lib/portal";

const PREMIUM = [
  {
    title: "Unlimited students",
    body: `No 200-per-session cap — run as many applicants as you need.`,
  },
  {
    title: "Unlimited staff seats",
    body: `Go beyond ${FREE_STAFF_SEATS} seats and bring your whole team in.`,
  },
  {
    title: "Document uploads",
    body: "Let applicants attach IDs, transcripts, and certificates — reviewed right in the portal.",
  },
  {
    title: "Email automation",
    body: "Applicant-facing notifications sent automatically at each stage.",
  },
  {
    title: "Custom domain & white-labeling",
    body: "Run the form on your own domain, with your branding instead of ours.",
  },
  {
    title: "Backup & export center",
    body: "Full institute-wide exports — every session, applicant, fee, and document.",
  },
];

export default async function UpgradePage() {
  const ctx = await getPortalContext();
  const isPremium = ctx.institute.plan !== "Free";

  if (isPremium) {
    return (
      <div className="card-sheen mx-auto max-w-lg rounded-2xl p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
          <Sparkles className="h-6 w-6" strokeWidth={1.7} />
        </span>
        <h1 className="mt-4 text-xl font-semibold">You&apos;re on Premium</h1>
        <p className="mt-2 text-[13.5px] text-muted">
          Every feature is unlocked. Need anything? Just reach out.
        </p>
      </div>
    );
  }

  const used = ctx.session?.total_applications_received ?? 0;
  const subject = encodeURIComponent(
    `Premium enquiry — ${ctx.institute.display_name}`,
  );
  const body = encodeURIComponent(
    `Hi,\n\nWe'd like to know more about Ordiso Premium.\n\nInstitute: ${ctx.institute.display_name}\nInstitute ID: ${ctx.institute.id}\n\nThanks,\n${ctx.name}`,
  );
  const wa = encodeURIComponent(
    `Hi — we'd like to know more about Ordiso Premium for ${ctx.institute.display_name}.`,
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
          <Sparkles className="h-6 w-6" strokeWidth={1.7} />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em]">
          Upgrade to Premium
        </h1>
        <p className="mx-auto mt-2 max-w-md text-[13.5px] text-muted">
          You&apos;ve used {used} of your {FREE_TIER_CAP} free applicants this
          session. Premium removes the limits — talk to us and we&apos;ll find
          the right fit for your institute.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {PREMIUM.map((f) => (
          <div key={f.title} className="card-sheen rounded-xl p-4">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                <Check className="h-3 w-3" strokeWidth={2.5} />
              </span>
              <div>
                <div className="text-[14px] font-medium">{f.title}</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                  {f.body}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card-sheen mt-6 rounded-2xl p-6 text-center">
        <h2 className="text-[15px] font-medium">Let&apos;s talk</h2>
        <p className="mt-1.5 text-[13px] text-muted">
          Pricing is tailored to your institute&apos;s size. Reach out however
          works best:
        </p>
        <div className="mt-5 flex flex-col justify-center gap-2.5 sm:flex-row">
          <a
            href={`mailto:hello@ordiso.app?subject=${subject}&body=${body}`}
            className="surface inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13.5px] transition-colors hover:border-border-strong"
          >
            <Mail className="h-4 w-4 text-accent" strokeWidth={1.7} />
            hello@ordiso.app
          </a>
          <a
            href={`https://wa.me/0000000000?text=${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            className="surface inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-[13.5px] transition-colors hover:border-border-strong"
          >
            <MessageCircle className="h-4 w-4 text-accent" strokeWidth={1.7} />
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
