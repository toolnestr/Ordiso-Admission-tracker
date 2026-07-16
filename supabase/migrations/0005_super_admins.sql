-- ============================================================================
-- Migration 0005: Super Admin identity (Section 3)
--
-- The platform owner's control panel spans every institute, so its queries
-- must bypass RLS. That is only safe if "who is a super admin" is itself
-- unforgeable, so it lives in its own table with RLS enabled and NO policies:
-- the anon/authenticated roles can never read or write it, and every super
-- admin check runs server-side through the service role.
--
-- Single-owner for now (Section 3); the table shape already allows more later.
-- ============================================================================

create table super_admins (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email        text not null,
  created_at   timestamptz not null default now()
);

-- RLS on, zero policies => unreachable except via the service role.
alter table super_admins enable row level security;

-- ---------------------------------------------------------------------------
-- Grant yourself access.
--
-- Sign up / log in normally first (so an auth user exists), then run:
--
--   insert into super_admins (auth_user_id, email)
--   select id, email from auth.users where email = 'you@example.com';
--
-- To check it worked:
--   select email from super_admins;
-- ---------------------------------------------------------------------------
