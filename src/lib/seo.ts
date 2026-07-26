/**
 * Shared SEO constants and JSON-LD builders. Kept import-free so both server
 * pages and metadata can use it. SITE_URL is repeated in robots.ts / sitemap.ts
 * by the same existing convention.
 */

export const SITE_NAME = "Ordiso";
export const SITE_URL = "https://admission.toolnestr.com";
export const SITE_DESCRIPTION =
  "Manage applications, track admissions, and confirm enrollments in one place. Free for institutes — no setup fees, no hidden costs.";

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;

/** The Organization node, referenced by @id from every other node. */
const organization = {
  "@type": "Organization",
  "@id": ORG_ID,
  name: SITE_NAME,
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/icon.svg`,
  },
  description: SITE_DESCRIPTION,
};

const website = {
  "@type": "WebSite",
  "@id": SITE_ID,
  name: SITE_NAME,
  url: SITE_URL,
  publisher: { "@id": ORG_ID },
};

/**
 * Home page graph: Organization + WebSite + the SaaS product itself, with a
 * Free ($0) offer. No aggregateRating — we don't have real reviews to cite.
 */
export function homeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      website,
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        publisher: { "@id": ORG_ID },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          category: "free",
        },
      },
    ],
  };
}

/** Contact page graph: ContactPage + a breadcrumb back to home. */
export function contactJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      {
        "@type": "ContactPage",
        "@id": `${SITE_URL}/contact#webpage`,
        url: `${SITE_URL}/contact`,
        name: "Contact us — Ordiso",
        isPartOf: { "@id": SITE_ID },
        about: { "@id": ORG_ID },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Contact",
            item: `${SITE_URL}/contact`,
          },
        ],
      },
    ],
  };
}
