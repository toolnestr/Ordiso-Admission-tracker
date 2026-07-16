import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

// Makes Cloudflare bindings available when running `next dev` locally.
// No-op in production. Kept below the export so the config shape is unchanged.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
