import type { MetadataRoute } from "next";

// Web app manifest — installability + richer mobile/OS metadata. Icons point at
// the existing /icon.svg (served by app/icon.svg); a maskable PNG can be added
// here later if a raster app icon is created.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ordiso — Admission Management for Institutes",
    short_name: "Ordiso",
    description:
      "Manage applications, track admissions, and confirm enrollments in one place. Free for institutes.",
    start_url: "/",
    display: "standalone",
    background_color: "#08080b",
    theme_color: "#08080b",
    icons: [
      {
        src: "/icon.svg",
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
    ],
  };
}
