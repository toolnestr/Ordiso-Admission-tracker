# Supabase — Ordiso

Database schema, RLS, and public functions for the Admission Tracking System
(maps to Section 5 of the project plan).

## Migrations

| File | Purpose |
|------|---------|
| `migrations/0001_core_schema.sql` | All tables, enums, indexes, and the cap-gaming constraints (immutable counter + one-open-session unique index). |
| `migrations/0002_rls_policies.sql` | Row Level Security — tenant isolation via `auth.uid() -> staff.institute_id`, plus role checks (Admin/Counselor/Viewer). |
| `migrations/0003_public_functions.sql` | No-auth RPCs for the student flow: `get_public_form`, `submit_application` (enforces the 200-cap), `check_application_status`. |

## Applying them

**Option A — Supabase SQL editor (quickest to start):**
Open your project → SQL Editor → paste each file in order (0001 → 0002 → 0003) → Run.

**Option B — Supabase CLI:**
```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

## Environment

Copy `.env.example` → `.env.local` in the project root and fill in the three
keys from Project Settings → API. The service-role key is server-only and must
never be shipped to the browser (Section 2.9b).

## Key invariants enforced at the DB level

- **200-cap can't be gamed** — `sessions.total_applications_received` only ever
  increments (in `submit_application`); deleting applicants never frees slots.
- **One Open session per institute** — partial unique index
  `one_open_session_per_institute`.
- **Tenant isolation** — RLS on every `institute_id` table; the anon key can
  only reach applicant data through the three vetted public functions.
- **Immutable audit log** — `activity_log` has a SELECT policy but no
  UPDATE/DELETE policy, so rows can't be altered by any tenant user.

## Not yet wired (next steps)

- `register_institute` flow (creates institute + Admin staff) — needs the
  service-role key, so it lives in a server action, not SQL.
- Triggers to maintain `session_stats` and write `activity_log` entries.
- Storage buckets + policies for Premium document uploads.
