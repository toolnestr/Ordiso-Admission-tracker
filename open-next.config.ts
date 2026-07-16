import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default OpenNext config. No incremental-cache/queue bindings yet — the app
// renders pages dynamically per-request (auth + RLS), so there's nothing to
// cache across users. Add R2/KV caching here later if read-heavy public pages
// (the /apply form) warrant it.
export default defineCloudflareConfig();
