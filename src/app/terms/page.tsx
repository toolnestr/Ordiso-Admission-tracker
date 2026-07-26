import type { Metadata } from "next";
import LegalShell, { Section } from "@/components/legal/LegalShell";

const DESCRIPTION =
  "The terms governing your use of Ordiso — accounts, free and paid plans, acceptable use, data ownership, and liability.";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: DESCRIPTION,
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    title: "Terms of Service — Ordiso",
    description: DESCRIPTION,
    url: "/terms",
  },
  twitter: { card: "summary_large_image", title: "Terms of Service — Ordiso", description: DESCRIPTION },
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="July 26, 2026">
      <p>
        These terms govern your access to and use of Ordiso. By creating an
        account or using the service, you agree to them. If you use Ordiso on
        behalf of an institute, you confirm you&apos;re authorised to do so.
      </p>

      <Section heading="The service">
        <p>
          Ordiso is admission-management software that lets institutes collect
          applications, track applicants, and confirm admissions. We may add,
          change, or remove features over time.
        </p>
      </Section>

      <Section heading="Accounts">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            You&apos;re responsible for the accuracy of your account details and
            for keeping your credentials secure.
          </li>
          <li>
            You&apos;re responsible for activity by staff members you invite to
            your institute.
          </li>
        </ul>
      </Section>

      <Section heading="Plans and limits">
        <p>
          The Free plan includes defined limits (currently 100 students per
          admission session and 2 admission sessions per year, among others).
          Paid plans lift these limits as described on the pricing page. Plan
          features and limits may change; we&apos;ll reflect changes on the site.
        </p>
      </Section>

      <Section heading="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Break the law or infringe others&apos; rights when using Ordiso.</li>
          <li>
            Upload malicious code, attempt to breach security, or disrupt the
            service.
          </li>
          <li>
            Collect data you&apos;re not entitled to collect, or misuse applicant
            information.
          </li>
        </ul>
      </Section>

      <Section heading="Your data">
        <p>
          Institutes own the data they and their applicants submit. You grant us
          the limited rights needed to host and operate the service on your
          behalf. Our handling of personal data is described in the{" "}
          <a href="/privacy" className="text-accent hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </Section>

      <Section heading="Availability">
        <p>
          We aim to keep Ordiso available and reliable, but the service is
          provided &quot;as is&quot; without warranties. We don&apos;t guarantee
          uninterrupted or error-free operation.
        </p>
      </Section>

      <Section heading="Limitation of liability">
        <p>
          To the maximum extent permitted by law, Ordiso is not liable for
          indirect, incidental, or consequential damages, or for loss of data or
          profits arising from your use of the service.
        </p>
      </Section>

      <Section heading="Termination">
        <p>
          You may stop using Ordiso at any time. We may suspend or terminate
          access if these terms are breached or to protect the service and its
          users.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          We may update these terms; the &quot;last updated&quot; date above
          reflects the current version. Continued use after changes means you
          accept them.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions about these terms? Reach us through the{" "}
          <a href="/contact" className="text-accent hover:underline">
            contact page
          </a>
          .
        </p>
      </Section>
    </LegalShell>
  );
}
