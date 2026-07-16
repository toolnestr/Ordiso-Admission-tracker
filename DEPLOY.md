# Deploying to Cloudflare

The app runs on **Cloudflare Workers** via the OpenNext adapter — full Next.js
(server actions, middleware, RSC), not just static files. Cloudflare serves all
static assets for free/unlimited, so Supabase only ever handles small API + auth
calls (Section 2.9b).

## Why middleware, not proxy

Next 16 renamed `middleware.ts` → `proxy.ts`, but **proxy always runs on the
Node runtime** and Cloudflare (OpenNext) only supports **Edge** middleware. So
this project deliberately keeps `src/middleware.ts` (Edge) and you'll see a
"middleware is deprecated, use proxy" warning at build — that warning is
expected and must be ignored. Do **not** switch it to `proxy.ts`; the Cloudflare
build will fail with "Node.js middleware is not currently supported."

## Environment variables

`NEXT_PUBLIC_*` are inlined at **build** time; `SUPABASE_SERVICE_ROLE_KEY` is
read at **runtime**. Both must be set in Cloudflare (they are not committed).

| Variable | Type in Cloudflare | Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Plaintext (Build + Runtime) | `https://iaqdmgejswhogyxzsydt.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Plaintext (Build + Runtime) | your anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** (Runtime) | your service-role key |

## First deploy (Cloudflare dashboard — recommended)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a
   repository** → authorize GitHub → pick `Ordiso-Admission-tracker`.
2. Build settings:
   - **Build command:** `npx opennextjs-cloudflare build`
   - **Deploy command:** `npx wrangler deploy`
   - (Cloudflare reads `wrangler.jsonc` for the rest.)
3. **Variables and Secrets** → add the three above. Mark
   `SUPABASE_SERVICE_ROLE_KEY` as an **encrypted secret**.
4. **Save and Deploy.** First build takes a few minutes.
5. You get a `*.workers.dev` URL. Open it — the landing page should load.

Every `git push` to `main` then rebuilds and redeploys automatically.

## Deploy from your machine (alternative)

```bash
# one-time
npx wrangler login
# each deploy
npm run cf:deploy
```
Set secrets once with `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY`, and
the public vars via the dashboard or a `.dev.vars` file for local preview.

## After it's live

1. **Update Supabase Auth redirect URLs** — Supabase → Authentication → URL
   Configuration → add your `*.workers.dev` (and later, custom) domain as a Site
   URL / redirect, or password logins from the deployed site may be rejected.
2. **Custom domain** — Workers → your worker → Settings → Domains & Routes → add
   a custom domain (Premium/white-label institutes get their own later).
3. **Move the cron jobs here (optional but recommended).** The GitHub Actions
   backup + keep-alive stop after 60 days of repo inactivity (see `BACKUP.md`).
   A Cloudflare Worker Cron Trigger has no such limit — worth migrating the
   keep-alive ping once you're on Workers anyway.

## Local preview of the Workers build

```bash
npm run cf:preview
```
Runs the actual Workers runtime locally (needs a `.dev.vars` file with the three
variables). Closer to production than `next dev`, useful for catching
Edge/Node-compat issues before deploying.
