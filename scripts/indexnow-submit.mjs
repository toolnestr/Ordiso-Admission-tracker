#!/usr/bin/env node
// Submit URLs to IndexNow (Bing, Yandex, etc. share the feed) for instant
// indexing. No dependencies; requires Node 18+ (global fetch).
//
// Usage:
//   node scripts/indexnow-submit.mjs                 # submit every URL in the live sitemap
//   node scripts/indexnow-submit.mjs <url> [url...]  # submit specific URLs
//
// The IndexNow key is public by design — it's verified against the matching
// file hosted at KEY_LOCATION, so exposing it here (and in the repo) is fine.

const HOST = "admission.toolnestr.com";
const KEY = "58802a5b0a3723f58e83b45f1c89d76b";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP = `https://${HOST}/sitemap.xml`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

const urlArgs = process.argv.slice(2).filter((a) => !a.startsWith("--"));

const locs = (xml) =>
  [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

async function fetchSitemapUrls() {
  const res = await fetch(SITEMAP);
  if (!res.ok) throw new Error(`sitemap fetch failed: HTTP ${res.status}`);
  // Handle a plain sitemap or a sitemap index (follow child sitemaps).
  const xml = await res.text();
  const all = locs(xml);
  const children = all.filter((u) => u.endsWith(".xml"));
  if (!children.length) return all;
  const urls = new Set();
  for (const sm of children) {
    for (const u of locs(await (await fetch(sm)).text())) {
      if (!u.endsWith(".xml")) urls.add(u);
    }
  }
  return [...urls];
}

async function submit(urlList) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList,
    }),
  });
  console.log(
    `[indexnow] submitted ${urlList.length} URL(s) → HTTP ${res.status} ${res.statusText}`,
  );
  if (res.status >= 400) console.log("[indexnow] " + (await res.text()).slice(0, 300));
  return res.status < 400;
}

async function main() {
  const urls = urlArgs.length ? urlArgs : await fetchSitemapUrls();
  if (!urls.length) {
    console.log("[indexnow] no URLs to submit.");
    return;
  }
  console.log(`[indexnow] submitting ${urls.length} URL(s) as ${HOST}…`);
  urls.forEach((u) => console.log("  " + u));
  await submit(urls);
  console.log("[indexnow] done.");
}

main().catch((e) => {
  console.log("[indexnow] error: " + (e?.message || e));
  process.exitCode = 1;
});
