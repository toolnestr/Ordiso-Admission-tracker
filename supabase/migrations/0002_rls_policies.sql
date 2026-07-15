-- ============================================================================
-- Migration 0002: Row Level Security (Section 5.4)
-- Every institute-scoped table is locked to the requesting user's institute
-- via auth.uid() -> staff.institute_id. This is the real enforcement layer for
-- multi-tenant isolation, not just app code.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so they can read `staff` under RLS)
-- ---------------------------------------------------------------------------

-- The institute the current auth user belongs to.
create or replace function auth_institute_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select institute_id
  from staff
  where auth_user_id = auth.uid()
    and status = 'Active'
  limit 1
$$;

-- The role of the current auth user.
create or replace function auth_role()
returns staff_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from staff
  where auth_user_id = auth.uid()
    and status = 'Active'
  limit 1
$$;

-- Convenience: is the current user an Admin?
create or replace function auth_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth_role() = 'Admin', false)
$$;

-- Can the current user write applicant data? (Admin or Counselor — Section 2.3)
create or replace function auth_can_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth_role() in ('Admin', 'Counselor'), false)
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------
alter table institutes                enable row level security;
alter table staff                     enable row level security;
alter table invite_tokens             enable row level security;
alter table programs                  enable row level security;
alter table form_fields               enable row level security;
alter table sessions                  enable row level security;
alter table session_stats             enable row level security;
alter table fee_structure_templates   enable row level security;
alter table applicants                enable row level security;
alter table documents                 enable row level security;
alter table applicant_fees            enable row level security;
alter table fee_payment_history       enable row level security;
alter table applicant_tags            enable row level security;
alter table applicant_tag_assignments enable row level security;
alter table notes                     enable row level security;
alter table communication_log         enable row level security;
alter table interviews                enable row level security;
alter table activity_log              enable row level security;
alter table notifications             enable row level security;
alter table backup_export_jobs        enable row level security;
alter table announcements             enable row level security;
alter table super_admin_activity_log  enable row level security;

-- ---------------------------------------------------------------------------
-- institutes: members read their own; only Admin updates it.
-- ---------------------------------------------------------------------------
create policy institutes_select on institutes
  for select using (id = auth_institute_id());
create policy institutes_update on institutes
  for update using (id = auth_institute_id() and auth_is_admin());

-- ---------------------------------------------------------------------------
-- staff: members read their institute's roster; Admin manages it.
-- ---------------------------------------------------------------------------
create policy staff_select on staff
  for select using (institute_id = auth_institute_id());
create policy staff_admin_write on staff
  for all
  using (institute_id = auth_institute_id() and auth_is_admin())
  with check (institute_id = auth_institute_id() and auth_is_admin());

-- ---------------------------------------------------------------------------
-- Generic institute-scoped tables.
-- Read: any active member of the institute.
-- Write: Admin+Counselor for applicant workflow; Admin-only for config.
-- ---------------------------------------------------------------------------

-- Config tables (Admin write only)
do $$
declare t text;
begin
  foreach t in array array[
    'programs', 'form_fields', 'fee_structure_templates',
    'applicant_tags', 'sessions'
  ]
  loop
    execute format($f$
      create policy %1$s_select on %1$s
        for select using (institute_id = auth_institute_id());
      create policy %1$s_admin_write on %1$s
        for all
        using (institute_id = auth_institute_id() and auth_is_admin())
        with check (institute_id = auth_institute_id() and auth_is_admin());
    $f$, t);
  end loop;
end $$;

-- Applicant workflow tables (Admin+Counselor write)
create policy applicants_select on applicants
  for select using (institute_id = auth_institute_id());
create policy applicants_write on applicants
  for all
  using (institute_id = auth_institute_id() and auth_can_write())
  with check (institute_id = auth_institute_id() and auth_can_write());

-- ---------------------------------------------------------------------------
-- Child tables scoped through their parent applicant's institute.
-- ---------------------------------------------------------------------------
create or replace function applicant_in_my_institute(a_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from applicants
    where id = a_id and institute_id = auth_institute_id()
  )
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'documents', 'applicant_fees', 'notes',
    'communication_log', 'interviews'
  ]
  loop
    execute format($f$
      create policy %1$s_select on %1$s
        for select using (applicant_in_my_institute(applicant_id));
      create policy %1$s_write on %1$s
        for all
        using (applicant_in_my_institute(applicant_id) and auth_can_write())
        with check (applicant_in_my_institute(applicant_id) and auth_can_write());
    $f$, t);
  end loop;
end $$;

-- fee_payment_history is scoped through applicant_fees -> applicants.
create or replace function fee_in_my_institute(f_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from applicant_fees af
    join applicants a on a.id = af.applicant_id
    where af.id = f_id and a.institute_id = auth_institute_id()
  )
$$;

create policy fee_history_select on fee_payment_history
  for select using (fee_in_my_institute(applicant_fee_id));
create policy fee_history_write on fee_payment_history
  for all
  using (fee_in_my_institute(applicant_fee_id) and auth_can_write())
  with check (fee_in_my_institute(applicant_fee_id) and auth_can_write());

-- applicant_tag_assignments scoped through the applicant.
create policy tag_assign_select on applicant_tag_assignments
  for select using (applicant_in_my_institute(applicant_id));
create policy tag_assign_write on applicant_tag_assignments
  for all
  using (applicant_in_my_institute(applicant_id) and auth_can_write())
  with check (applicant_in_my_institute(applicant_id) and auth_can_write());

-- session_stats scoped through the session.
create policy session_stats_select on session_stats
  for select using (
    exists (
      select 1 from sessions
      where sessions.id = session_stats.session_id
        and sessions.institute_id = auth_institute_id()
    )
  );

-- ---------------------------------------------------------------------------
-- activity_log: read by any member; immutable (no update/delete policies).
-- Inserts happen server-side (SECURITY DEFINER triggers / service role).
-- ---------------------------------------------------------------------------
create policy activity_log_select on activity_log
  for select using (institute_id = auth_institute_id());

-- ---------------------------------------------------------------------------
-- notifications: a member sees institute-wide + their own; can mark read.
-- ---------------------------------------------------------------------------
create policy notifications_select on notifications
  for select using (
    institute_id = auth_institute_id()
    and (
      staff_id is null
      or staff_id = (select id from staff where auth_user_id = auth.uid())
    )
  );
create policy notifications_update on notifications
  for update using (institute_id = auth_institute_id());

-- ---------------------------------------------------------------------------
-- backup_export_jobs: Admin-only (Section 2.15).
-- ---------------------------------------------------------------------------
create policy backup_jobs_all on backup_export_jobs
  for all
  using (institute_id = auth_institute_id() and auth_is_admin())
  with check (institute_id = auth_institute_id() and auth_is_admin());

-- ---------------------------------------------------------------------------
-- invite_tokens: Admin manages invites for their institute.
-- ---------------------------------------------------------------------------
create policy invite_tokens_all on invite_tokens
  for all
  using (
    auth_is_admin()
    and exists (
      select 1 from staff
      where staff.id = invite_tokens.staff_id
        and staff.institute_id = auth_institute_id()
    )
  )
  with check (
    auth_is_admin()
    and exists (
      select 1 from staff
      where staff.id = invite_tokens.staff_id
        and staff.institute_id = auth_institute_id()
    )
  );

-- ---------------------------------------------------------------------------
-- announcements & super_admin_activity_log: platform-owner tables.
-- No tenant policies -> RLS denies all access to normal users. Reached only
-- via the service-role key in the Super Admin portal. Announcements meant for
-- institutes are surfaced through a dedicated read path (added later).
-- ---------------------------------------------------------------------------
