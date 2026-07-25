-- ============================================================================
-- Migration 0015: In-app feedback / bug reports
--
-- A portal user can send feedback or a bug report from the dashboard. Reports
-- are institute-scoped so RLS keeps them isolated like every other table, but
-- only the platform owner ever reads them — so, like `super_admins`, this table
-- gets an INSERT policy for members and NO read policy, leaving reads to the
-- service role in the Super Admin panel.
-- ============================================================================

create table feedback (
  id            uuid primary key default gen_random_uuid(),
  institute_id  uuid not null references institutes(id) on delete cascade,
  -- Keep the row if the staffer is later removed; the email preserves who sent
  -- it for follow-up context.
  staff_id      uuid references staff(id) on delete set null,
  sender_email  text,
  type          text not null default 'Feedback' check (type in ('Feedback', 'Bug')),
  message       text not null check (char_length(message) between 1 and 4000),
  page_url      text,
  status        text not null default 'New' check (status in ('New', 'Resolved')),
  created_at    timestamptz not null default now()
);

create index feedback_institute_idx on feedback(institute_id);
create index feedback_status_idx on feedback(status);

alter table feedback enable row level security;

-- Members of an institute may file feedback for their own institute. There is
-- deliberately no SELECT/UPDATE/DELETE policy: reports are only readable and
-- resolvable through the service role (Super Admin panel).
create policy feedback_insert on feedback
  for insert
  with check (institute_id = auth_institute_id());
