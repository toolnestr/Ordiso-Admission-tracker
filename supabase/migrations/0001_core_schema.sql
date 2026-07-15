-- ============================================================================
-- Ordiso — Admission Tracking System
-- Migration 0001: Core schema
-- Maps to Section 5 of the project plan (Database Schema — FINALIZED).
-- Postgres / Supabase.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type plan_tier          as enum ('Free', 'Premium');
create type institute_status   as enum ('Active', 'Suspended', 'Deactivated');
create type staff_role         as enum ('Admin', 'Counselor', 'Viewer');
create type staff_status       as enum ('Active', 'Invited', 'Removed');
create type session_status     as enum ('Open', 'Closed');
create type applicant_status   as enum (
  'Applied', 'Shortlisted', 'Interview',
  'Admitted', 'Confirmed', 'Confirmed-Partial', 'Rejected'
);
create type applicant_source   as enum ('QR', 'Direct', 'Shared');
create type fee_status         as enum ('Pending', 'Partially Paid', 'Paid', 'Waived');
create type doc_review_status  as enum ('Reviewed', 'Pending Review');
create type interview_status   as enum ('Scheduled', 'Completed', 'No-Show', 'Rescheduled', 'Cancelled');
create type interview_result   as enum ('Recommended', 'Not Recommended', 'Needs Second Round');
create type comm_type          as enum ('Call', 'WhatsApp', 'Email', 'In-Person', 'Other');
create type field_type         as enum (
  'short_text', 'long_text', 'dropdown', 'radio', 'checkbox',
  'date', 'file', 'number', 'email', 'phone'
);
create type announce_audience  as enum ('All', 'Free', 'Premium');

-- ---------------------------------------------------------------------------
-- Core tenant tables
-- ---------------------------------------------------------------------------

-- institutes: the tenant root. `id` is the permanent Institute ID used in
-- public URLs (Section 2.8) and by the Super Admin internally.
create table institutes (
  id                  uuid primary key default gen_random_uuid(),
  display_name        text not null,
  logo_url            text,
  contact_email       text,
  contact_phone       text,
  address             text,
  plan                plan_tier not null default 'Free',
  status              institute_status not null default 'Active',
  timezone            text not null default 'UTC',
  currency            text not null default 'Rs.',
  working_hours       text,
  status_page_messages jsonb not null default '{}'::jsonb,
  storage_used_bytes  bigint not null default 0,
  created_at          timestamptz not null default now()
);

-- staff: members of an institute, linked to a Supabase Auth user.
create table staff (
  id            uuid primary key default gen_random_uuid(),
  institute_id  uuid not null references institutes(id) on delete cascade,
  auth_user_id  uuid unique references auth.users(id) on delete set null,
  name          text not null,
  email         text not null,
  role          staff_role not null default 'Viewer',
  status        staff_status not null default 'Invited',
  invited_at    timestamptz not null default now(),
  joined_at     timestamptz
);
create index staff_institute_idx on staff(institute_id);
create index staff_auth_user_idx on staff(auth_user_id);

-- invite_tokens: one-time links for staff onboarding (Section 2.3).
create table invite_tokens (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references staff(id) on delete cascade,
  token       text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz
);

-- programs: courses the institute offers (Section 2.10).
create table programs (
  id            uuid primary key default gen_random_uuid(),
  institute_id  uuid not null references institutes(id) on delete cascade,
  name          text not null,
  created_at    timestamptz not null default now()
);
create index programs_institute_idx on programs(institute_id);

-- form_fields: the form *definition* built in the Form Builder (Section 2.6).
create table form_fields (
  id                uuid primary key default gen_random_uuid(),
  institute_id      uuid not null references institutes(id) on delete cascade,
  field_label       text not null,
  field_type        field_type not null,
  is_required       boolean not null default false,
  options           jsonb not null default '[]'::jsonb,
  conditional_logic jsonb,
  display_order     int not null default 0,
  is_document_field boolean not null default false
);
create index form_fields_institute_idx on form_fields(institute_id);

-- sessions: admission cycles. One Open session per institute enforced below.
create table sessions (
  id                          uuid primary key default gen_random_uuid(),
  institute_id                uuid not null references institutes(id) on delete cascade,
  name                        text not null,
  start_date                  date not null,
  end_date                    date not null,
  status                      session_status not null default 'Open',
  total_applications_received int not null default 0,   -- immutable counter (Section 2.5)
  target_goal                 int,
  notes                       text,
  created_at                  timestamptz not null default now()
);
create index sessions_institute_idx on sessions(institute_id);

-- Enforce "strictly one Open session at a time" at the DB level (Section 2.7).
create unique index one_open_session_per_institute
  on sessions(institute_id)
  where status = 'Open';

-- session_stats: cached per-status counts, incrementally updated (Section 2.9).
create table session_stats (
  session_id    uuid primary key references sessions(id) on delete cascade,
  status_counts jsonb not null default '{}'::jsonb,
  last_updated  timestamptz not null default now()
);

-- fee_structure_templates: reusable fee defaults (Section 2.4).
create table fee_structure_templates (
  id             uuid primary key default gen_random_uuid(),
  institute_id   uuid not null references institutes(id) on delete cascade,
  program_id     uuid references programs(id) on delete set null,
  name           text not null,
  default_amount numeric(12,2) not null default 0
);
create index fee_templates_institute_idx on fee_structure_templates(institute_id);

-- ---------------------------------------------------------------------------
-- Applicant-centric tables
-- ---------------------------------------------------------------------------

create table applicants (
  id                     uuid primary key default gen_random_uuid(),
  institute_id           uuid not null references institutes(id) on delete cascade,
  session_id             uuid not null references sessions(id) on delete cascade,
  program_id             uuid references programs(id) on delete set null,
  application_id         text not null,               -- public-facing code
  form_data              jsonb not null default '{}'::jsonb,
  email                  text,
  phone                  text,
  status                 applicant_status not null default 'Applied',
  source                 applicant_source not null default 'Direct',
  fee_exempt             boolean not null default false,
  fee_exempt_reason      text,
  confirmed_at           timestamptz,
  confirmed_by           uuid references staff(id) on delete set null,
  confirmation_reason    text,
  assigned_staff_id      uuid references staff(id) on delete set null,
  interest_tag           text,
  preferred_contact_method text,
  follow_up_date         date,
  follow_up_resolved     boolean not null default false,
  created_at             timestamptz not null default now()
);
-- Institute-scoped indexes for fast duplicate detection / search (Section 2.5).
create index applicants_inst_email_idx on applicants(institute_id, email);
create index applicants_inst_phone_idx on applicants(institute_id, phone);
create unique index applicants_application_id_idx on applicants(institute_id, application_id);
create index applicants_session_idx on applicants(session_id);
create index applicants_status_idx on applicants(institute_id, status);

-- documents: Premium only (Section 2.14).
create table documents (
  id             uuid primary key default gen_random_uuid(),
  applicant_id   uuid not null references applicants(id) on delete cascade,
  document_label text,
  file_url       text not null,
  file_size      bigint not null default 0,
  uploaded_at    timestamptz not null default now(),
  review_status  doc_review_status not null default 'Pending Review'
);
create index documents_applicant_idx on documents(applicant_id);

create table applicant_fees (
  id                uuid primary key default gen_random_uuid(),
  applicant_id      uuid not null references applicants(id) on delete cascade,
  name              text not null,
  amount            numeric(12,2) not null default 0,
  status            fee_status not null default 'Pending',
  amount_paid       numeric(12,2) not null default 0,
  remaining_balance numeric(12,2) not null default 0
);
create index applicant_fees_applicant_idx on applicant_fees(applicant_id);

create table fee_payment_history (
  id              uuid primary key default gen_random_uuid(),
  applicant_fee_id uuid not null references applicant_fees(id) on delete cascade,
  amount          numeric(12,2) not null,
  paid_on         timestamptz not null default now(),
  recorded_by     uuid references staff(id) on delete set null
);
create index fee_history_fee_idx on fee_payment_history(applicant_fee_id);

create table applicant_tags (
  id           uuid primary key default gen_random_uuid(),
  institute_id uuid not null references institutes(id) on delete cascade,
  name         text not null,
  color        text not null default '#7c74ff'
);
create index applicant_tags_institute_idx on applicant_tags(institute_id);

create table applicant_tag_assignments (
  applicant_id uuid not null references applicants(id) on delete cascade,
  tag_id       uuid not null references applicant_tags(id) on delete cascade,
  primary key (applicant_id, tag_id)
);

create table notes (
  id           uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references applicants(id) on delete cascade,
  staff_id     uuid references staff(id) on delete set null,
  content      text not null,
  category     text,
  pinned       boolean not null default false,
  created_at   timestamptz not null default now()
);
create index notes_applicant_idx on notes(applicant_id);

create table communication_log (
  id           uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references applicants(id) on delete cascade,
  staff_id     uuid references staff(id) on delete set null,
  type         comm_type not null,
  summary      text,
  outcome_tag  text,
  pinned       boolean not null default false,
  created_at   timestamptz not null default now()
);
create index comm_log_applicant_idx on communication_log(applicant_id);

create table interviews (
  id                     uuid primary key default gen_random_uuid(),
  applicant_id           uuid not null references applicants(id) on delete cascade,
  interviewer_staff_id   uuid references staff(id) on delete set null,
  scheduled_by_staff_id  uuid references staff(id) on delete set null,
  scheduled_at           timestamptz not null,
  duration_minutes       int,
  mode                   text,
  round_label            text,
  status                 interview_status not null default 'Scheduled',
  result                 interview_result,
  outcome_notes          text,
  rescheduled_from       timestamptz
);
create index interviews_applicant_idx on interviews(applicant_id);
create index interviews_interviewer_idx on interviews(interviewer_staff_id);

-- ---------------------------------------------------------------------------
-- Platform-level tables
-- ---------------------------------------------------------------------------

-- activity_log: immutable audit trail (Section 2.12).
-- applicant_id is nullable so entries survive applicant deletion (Section 2.5).
create table activity_log (
  id           uuid primary key default gen_random_uuid(),
  institute_id uuid not null references institutes(id) on delete cascade,
  applicant_id uuid references applicants(id) on delete set null,
  staff_id     uuid references staff(id) on delete set null,   -- null = System
  action_type  text not null,
  description  text not null,
  reason       text,
  created_at   timestamptz not null default now()
);
create index activity_log_institute_idx on activity_log(institute_id, created_at desc);
create index activity_log_applicant_idx on activity_log(applicant_id);

create table notifications (
  id            uuid primary key default gen_random_uuid(),
  institute_id  uuid not null references institutes(id) on delete cascade,
  staff_id      uuid references staff(id) on delete cascade,   -- null = institute-wide
  type          text not null,
  message       text not null,
  read          boolean not null default false,
  snoozed_until timestamptz,
  dismissed     boolean not null default false,
  created_at    timestamptz not null default now()
);
create index notifications_institute_idx on notifications(institute_id);
create index notifications_staff_idx on notifications(staff_id);

create table backup_export_jobs (
  id           uuid primary key default gen_random_uuid(),
  institute_id uuid not null references institutes(id) on delete cascade,
  requested_by uuid references staff(id) on delete set null,
  scope        text not null,       -- session/student/custom/full
  format       text not null,       -- PDF/ZIP
  status       text not null default 'Processing',
  file_url     text,
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index backup_jobs_institute_idx on backup_export_jobs(institute_id);

create table announcements (
  id                   uuid primary key default gen_random_uuid(),
  message              text not null,
  target_audience      announce_audience not null default 'All',
  is_promotional_popup boolean not null default false,
  start_date           date,
  end_date             date,
  dismissible          boolean not null default true,
  created_at           timestamptz not null default now()
);

create table super_admin_activity_log (
  id                 uuid primary key default gen_random_uuid(),
  action_type        text not null,
  target_institute_id uuid references institutes(id) on delete set null,
  description        text not null,
  created_at         timestamptz not null default now()
);
