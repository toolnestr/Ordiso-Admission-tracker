import Nav from "@/components/landing/Nav";
import Footer from "@/components/landing/Footer";

/**
 * Shared layout for the Privacy Policy / Terms pages: landing Nav + Footer with
 * a readable prose column. `children` are the page's sections.
 */
export default function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 pb-20 pt-32 sm:pt-36">
          <h1 className="text-3xl font-semibold tracking-[-0.02em] sm:text-[38px]">
            {title}
          </h1>
          <p className="mt-2 text-[13px] text-muted">Last updated: {updated}</p>
          <div className="legal mt-8 space-y-8 text-[14.5px] leading-relaxed text-muted-strong">
            {children}
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

/** A titled section within a legal page. */
export function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-[17px] font-semibold text-foreground">{heading}</h2>
      {children}
    </section>
  );
}
