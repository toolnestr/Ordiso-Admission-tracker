-- ============================================================================
-- Migration 0017: Free tier — max 2 admission sessions per calendar year
--
-- The per-session 100-applicant cap resets with every new session, and creating
-- sessions is otherwise unlimited — so a Free institute could cycle sessions to
-- process unlimited applicants 100 at a time. This caps Free (and lapsed-paid)
-- institutes to 2 sessions per calendar year.
--
-- Enforced with a BEFORE INSERT trigger so it holds even against a direct REST
-- insert that bypasses the app — mirroring how the open-session rule and the
-- applicant cap are DB-enforced, not app-enforced. "Free" is decided the same
-- way as the applicant-cap RPC: plan = 'Free' OR a paid plan past its expiry
-- (grace is intentionally not considered, matching that RPC).
-- ============================================================================

create or replace function enforce_free_session_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan    plan_tier;
  v_expires timestamptz;
  v_free    boolean;
  v_count   int;
begin
  select plan, plan_expires_at into v_plan, v_expires
  from institutes
  where id = NEW.institute_id;

  v_free := (v_plan = 'Free')
            or (v_expires is not null and v_expires < now());

  if v_free then
    select count(*) into v_count
    from sessions
    where institute_id = NEW.institute_id
      and date_part('year', created_at) = date_part('year', now());

    if v_count >= 2 then
      -- Message is matched in the createSession action; keep the marker stable.
      raise exception 'free_session_quota: Free plan allows 2 sessions per calendar year';
    end if;
  end if;

  return NEW;
end;
$$;

create trigger free_session_quota
  before insert on sessions
  for each row
  execute function enforce_free_session_quota();
