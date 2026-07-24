import type { MetadataRoute } from "next";

const SITE_URL = "https://admission.toolnestr.com";

// Only the public marketing page belongs in the sitemap. App/utility pages are
// noindex (see robots.ts and the root layout), so listing them would just
// re-trigger the duplicate/thin-content audit flags.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
