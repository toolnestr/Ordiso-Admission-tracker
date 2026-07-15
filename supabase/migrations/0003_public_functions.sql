-- ============================================================================
-- Migration 0003: Public (no-auth) functions for the student application flow
-- Students never log in (Section 4). These SECURITY DEFINER RPCs are the only
-- way the anon key touches applicant data, enforcing the 200-cap and returning
-- only public-safe fields.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- get_public_form(institute_id)
-- Returns the institute's public identity + published form definition so the
-- /apply/{institute_id} page can render, without exposing internal data.
-- ---------------------------------------------------------------------------
create or replace function get_public_form(p_institute_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_institute institutes;
  v_session   sessions;
  v_fields    jsonb;
  v_programs  jsonb;
begin
  select * into v_institute from institutes where id = p_institute_id;
  if not found or v_institute.status <> 'Active' then
    return jsonb_build_object('error', 'institute_not_found');
  end if;

  -- current open session, if any
  select * into v_session
  from sessions
  where institute_id = p_institute_id and status = 'Open'
  order by start_date desc
  limit 1;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', id,
             'label', field_label,
             'type', field_type,
             'required', is_required,
             'options', options,
             'conditional_logic', conditional_logic,
             'order', display_order,
             'is_document_field', is_document_field
           ) order by display_order
         ), '[]'::jsonb)
  into v_fields
  from form_fields
  where institute_id = p_institute_id;

  select coalesce(jsonb_agg(
           jsonb_build_object('id', id, 'name', name)
         ), '[]'::jsonb)
  into v_programs
  from programs
  where institute_id = p_institute_id;

  return jsonb_build_object(
    'institute', jsonb_build_object(
      'id', v_institute.id,
      'display_name', v_institute.display_name,
      'logo_url', v_institute.logo_url,
      'currency', v_institute.currency,
      'plan', v_institute.plan,
      'working_hours', v_institute.working_hours
    ),
    'session', case when v_session.id is null then null else jsonb_build_object(
      'id', v_session.id,
      'name', v_session.name,
      'status', v_session.status,
      'is_full', v_session.total_applications_received >= 200
                 and v_institute.plan = 'Free',
      'end_date', v_session.end_date
    ) end,
    'fields', v_fields,
    'programs', v_programs
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- submit_application(...)
-- The single gated entry point for a student submission. Enforces the
-- immutable 200-cap counter (Section 2.5) atomically, flags duplicates
-- (Section 2.5), and returns the public Application ID.
-- ---------------------------------------------------------------------------
create or replace function submit_application(
  p_institute_id uuid,
  p_form_data    jsonb,
  p_email        text default null,
  p_phone        text default null,
  p_program_id   uuid default null,
  p_source       applicant_source default 'Direct'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan          plan_tier;
  v_status        institute_status;
  v_session       sessions;
  v_app_code      text;
  v_applicant_id  uuid;
  v_dup_id        uuid;
begin
  select plan, status into v_plan, v_status
  from institutes where id = p_institute_id;
  if not found or v_status <> 'Active' then
    return jsonb_build_object('error', 'institute_not_found');
  end if;

  -- Lock the open session row so the cap check is race-free.
  select * into v_session
  from sessions
  where institute_id = p_institute_id and status = 'Open'
  for update;

  if not found then
    return jsonb_build_object('error', 'no_open_session');
  end if;

  if v_session.end_date < current_date then
    return jsonb_build_object('error', 'session_closed');
  end if;

  -- Free-tier hard cap checked against the immutable counter, never COUNT(*).
  if v_plan = 'Free' and v_session.total_applications_received >= 200 then
    return jsonb_build_object('error', 'session_full');
  end if;

  -- Duplicate detection: flag, don't block (Section 2.5).
  select id into v_dup_id
  from applicants
  where session_id = v_session.id
    and (
      (p_email is not null and email = p_email)
      or (p_phone is not null and phone = p_phone)
    )
  limit 1;

  -- Human-friendly public code, e.g. ORD-7F3A9C.
  v_app_code := 'ORD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into applicants (
    institute_id, session_id, program_id, application_id,
    form_data, email, phone, source
  ) values (
    p_institute_id, v_session.id, p_program_id, v_app_code,
    coalesce(p_form_data, '{}'::jsonb), p_email, p_phone, p_source
  ) returning id into v_applicant_id;

  -- Increment the immutable counter (never decremented, even on delete).
  update sessions
  set total_applications_received = total_applications_received + 1
  where id = v_session.id;

  return jsonb_build_object(
    'application_id', v_app_code,
    'possible_duplicate', v_dup_id is not null
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- check_application_status(application_id, email_or_phone)
-- Self-serve status lookup, gated by contact info (Section 4.1 / 4.3).
-- ---------------------------------------------------------------------------
create or replace function check_application_status(
  p_application_id text,
  p_contact        text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_app applicants;
  v_msgs jsonb;
begin
  select * into v_app
  from applicants
  where application_id = p_application_id
    and (email = p_contact or phone = p_contact)
  limit 1;

  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  select status_page_messages into v_msgs
  from institutes where id = v_app.institute_id;

  return jsonb_build_object(
    'application_id', v_app.application_id,
    'status', v_app.status,
    'message', coalesce(v_msgs -> (v_app.status::text), 'null'::jsonb),
    'submitted_at', v_app.created_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Expose these to the anon + authenticated roles. Underlying tables stay
-- locked by RLS; only these vetted functions can be called without auth.
-- ---------------------------------------------------------------------------
grant execute on function get_public_form(uuid)                     to anon, authenticated;
grant execute on function submit_application(uuid, jsonb, text, text, uuid, applicant_source) to anon, authenticated;
grant execute on function check_application_status(text, text)      to anon, authenticated;
