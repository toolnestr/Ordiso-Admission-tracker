import type { MetadataRoute } from "next";

const SITE_URL = "https://admission.toolnestr.com";

// Only the marketing landing page is meant to be indexed. Everything else is
// an app surface (auth, portal, admin) or a per-institute apply/status page —
// keep crawlers off them so they don't get flagged as thin/duplicate content.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/status",
        "/suspended",
        "/upgrade",
        "/share",
        "/apply/",
        "/invite/",
        "/auth/",
        "/admin",
        "/dashboard",
        "/applicants",
        "/sessions",
        "/settings",
        "/staff",
        "/form-builder",
        "/reports",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
