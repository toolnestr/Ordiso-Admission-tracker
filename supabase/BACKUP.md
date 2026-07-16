# Backups & continuity

Supabase's free plan has **no backups**, and pauses a project after ~1 week of
inactivity. Two scheduled GitHub Actions cover both (Section 2.9a).

| Workflow | Schedule | What it does |
|---|---|---|
| `.github/workflows/backup.yml` | 02:00 UTC daily | `pg_dump` the whole database into a **private** repo, pruning dumps older than 30 days |
| `.github/workflows/keepalive.yml` | 03:30 UTC daily | One trivial query so Supabase never marks the project idle |

Both can also be run by hand from the **Actions** tab (`Run workflow`).

## One-time setup

**1. Create a private repo for the dumps** — e.g. `ordiso-backups`.
It **must be private**: dumps contain applicant names, emails, and phone
numbers. A public backup repo is a data breach.

**2. Create a GitHub token** so this repo can push to that one.
GitHub → Settings → Developer settings → Personal access tokens → Fine-grained:
- Repository access: only `ordiso-backups`
- Permissions: **Contents: Read and write**

**3. Add four secrets** to *this* repo
(Settings → Secrets and variables → Actions → New repository secret):

| Secret | Value |
|---|---|
| `BACKUP_REPO` | `your-username/ordiso-backups` |
| `BACKUP_REPO_TOKEN` | the token from step 2 |
| `SUPABASE_DB_URL` | Supabase → Project Settings → Database → **Connection string → URI** (swap in your DB password) |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | your public anon key |

**4. Run `Nightly database backup` manually** and confirm a
`dumps/backup-YYYY-MM-DD.sql` file lands in the backup repo.

## Restoring

1. Download the newest `.sql` from the backup repo.
2. Create a fresh Supabase project (or use the existing one).
3. Load it:
   ```bash
   psql "postgresql://postgres:PASSWORD@db.PROJECT-REF.supabase.co:5432/postgres" -f backup-2026-07-16.sql
   ```
4. Update `.env.local` / Cloudflare Pages env vars to the new project's URL and keys.

The dump uses `--clean --if-exists`, so it drops and recreates objects and can
be re-run safely.

## ⚠️ Do one test restore before launch

**A backup that has never been restored is not a backup.** Restore a dump into a
throwaway Supabase project once and confirm the tables and rows arrive. Every
real backup horror story is someone discovering at the worst moment that the
file was empty, partial, or unreadable.

## Known caveats

- **GitHub disables scheduled workflows after 60 days of repo inactivity.** If
  this repo goes quiet, the backup *and* keep-alive silently stop — exactly when
  the keep-alive matters most. Either push something occasionally, or move these
  to a Cloudflare Worker cron (which has no such rule) once the app is deployed
  there.
- The dump covers the `public` and `auth` schemas — your data and your logins.
  It does **not** include Storage objects (Premium documents); add that when
  Storage goes live.
- Free-tier Actions minutes are ample for this (a dump of a few MB takes
  seconds), but the job fails loudly if a dump comes back empty rather than
  quietly committing a useless file.
