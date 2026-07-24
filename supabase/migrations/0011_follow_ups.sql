-- ============================================================================
-- Migration 0011: Follow-ups
-- A schedulable, remark-bearing follow-up per applicant. Supersedes the single
-- applicants.follow_up_date / follow_up_resolved slot (kept in place, unused)
-- because staff need a *history* of follow-ups with remarks that can be
-- exported daily/monthly.
-- ============================================================================

create type follow_up_status as enum ('Pending', 'Done');

create table follow_ups (
  id           uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references applicants(id) on delete cascade,
  staff_id     uuid references staff(id) on delete set null,
  due_date     date not null,
  remark       text,
  status       follow_up_status not null default 'Pending',
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index follow_ups_applicant_idx on follow_ups(applicant_id);
-- Dashboard/list queries filter by date window + pending state.
create index follow_ups_due_idx on follow_ups(due_date, status);

-- RLS: identical tenant-scoping to notes / communication_log — a follow-up is
-- visible/writable exactly when its applicant belongs to the caller's institute
-- (and, for writes, the caller has a non-Viewer role). See 0002_rls_policies.
alter table follow_ups enable row level security;

create policy follow_ups_select on follow_ups
  for select using (applicant_in_my_institute(applicant_id));

create policy follow_ups_write on follow_ups
  for all
  using (applicant_in_my_institute(applicant_id) and auth_can_write())
  with check (applicant_in_my_institute(applicant_id) and auth_can_write());
