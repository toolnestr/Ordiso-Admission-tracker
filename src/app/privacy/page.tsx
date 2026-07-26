import type { Metadata } from "next";
import LegalShell, { Section } from "@/components/legal/LegalShell";

const DESCRIPTION =
  "How Ordiso collects, uses, and protects institute and applicant data — accounts, application submissions, and essential cookies.";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    title: "Privacy Policy — Ordiso",
    description: DESCRIPTION,
    url: "/privacy",
  },
  twitter: { card: "summary_large_image", title: "Privacy Policy — Ordiso", description: DESCRIPTION },
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="July 26, 2026">
      <p>
        Ordiso (&quot;we&quot;, &quot;us&quot;) provides admission-management
        software for institutes. This policy explains what data we handle, why,
        and the choices you have. By using Ordiso you agree to this policy.
      </p>

      <Section heading="Who controls the data">
        <p>
          For an <strong>institute&apos;s own account and applicant records</strong>,
          the institute is the data controller and Ordiso is a data processor
          acting on its instructions. For our marketing site and account sign-up,
          Ordiso is the controller.
        </p>
      </Section>

      <Section heading="Information we collect">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Institute account details</strong> — institute name, your
            name, work email, and mobile number provided at registration, plus
            optional profile settings (address, contact info, logo).
          </li>
          <li>
            <strong>Applicant data</strong> — information submitted through an
            institute&apos;s application form (e.g. names, contact details, and
            any custom fields the institute configures), which the institute
            controls.
          </li>
          <li>
            <strong>Usage and technical data</strong> — basic logs needed to run
            and secure the service.
          </li>
          <li>
            <strong>Messages you send us</strong> — via the contact form or
            in-app feedback.
          </li>
        </ul>
      </Section>

      <Section heading="How we use it">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>To provide, maintain, and secure the service.</li>
          <li>To authenticate you and keep you signed in.</li>
          <li>To respond to your enquiries and support requests.</li>
          <li>To enforce plan limits and prevent abuse.</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your data, and we do not use applicant
          data for advertising.
        </p>
      </Section>

      <Section heading="Cookies">
        <p>
          We use only <strong>strictly necessary cookies</strong> — for
          authentication (keeping you logged in) and remembering your session
          preference. We do not use advertising or third-party analytics
          cookies, so no cookie-consent banner is required.
        </p>
      </Section>

      <Section heading="Service providers">
        <p>
          We host data and authentication with <strong>Supabase</strong> and
          serve the application through <strong>Cloudflare</strong>. These
          providers process data on our behalf under their own security and
          privacy commitments.
        </p>
      </Section>

      <Section heading="Data retention">
        <p>
          Institute and applicant data is retained while the account is active.
          Institutes can delete their own records at any time; when an account is
          closed, associated data is removed in the normal course of operation.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>
          Depending on your location, you may have rights to access, correct,
          export, or delete personal data. Institutes can manage applicant
          records directly in the dashboard. For other requests, contact us and
          we&apos;ll help.
        </p>
      </Section>

      <Section heading="Children&apos;s data">
        <p>
          Institutes may collect applicant information that relates to minors as
          part of admissions. That data is controlled by the institute, which is
          responsible for obtaining any consents required by law.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          We may update this policy from time to time. Material changes will be
          reflected by the &quot;last updated&quot; date above.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions about this policy? Reach us through the{" "}
          <a href="/contact" className="text-accent hover:underline">
            contact page
          </a>
          .
        </p>
      </Section>
    </LegalShell>
  );
}
