-- ============================================================================
-- Migration 0016: Public "Contact us" messages
--
-- Submissions from the public landing /contact page. There is no auth context
-- for a visitor, so — unlike institute-scoped `feedback` — this table is written
-- only through the service role in the contact server action. RLS is enabled
-- with NO policies, so the anon/authenticated roles can neither read nor insert
-- directly (no public REST surface to spam or scrape); the platform owner reads
-- and resolves messages in the Super Admin panel via the service role.
-- ============================================================================

create table contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 120),
  email       text not null check (char_length(email) between 3 and 200),
  message     text not null check (char_length(message) between 1 and 4000),
  status      text not null default 'New' check (status in ('New', 'Resolved')),
  created_at  timestamptz not null default now()
);

create index contact_messages_status_idx on contact_messages(status);

-- RLS on, zero policies => unreachable except via the service role.
alter table contact_messages enable row level security;
