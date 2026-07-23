-- New tiers (existing 'Premium' rows are treated as Pro-level in code).
alter type plan_tier add value if not exists 'Starter';
alter type plan_tier add value if not exists 'Pro';
alter type plan_tier add value if not exists 'Enterprise';

-- Billing cycle + expiry (null expiry = no expiry / free).
alter table institutes add column if not exists billing_cycle   text;
alter table institutes add column if not exists plan_expires_at  timestamptz;

-- ---------------------------------------------------------------------------
-- Free-tier cap is now 150 (was 200) and applies whenever the plan is
-- effectively free: an actual Free plan, OR a paid plan whose expiry has
-- passed. submit_application + submit_enquiry_group both enforce it.
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
  v_expires       timestamptz;
  v_free          boolean;
  v_session       sessions;
  v_app_code      text;
  v_applicant_id  uuid;
  v_dup_id        uuid;
begin
  select plan, status, plan_expires_at into v_plan, v_status, v_expires
  from institutes where id = p_institute_id;
  if not found or v_status <> 'Active' then
    return jsonb_build_object('error', 'institute_not_found');
  end if;

  v_free := (v_plan = 'Free')
            or (v_expires is not null and v_expires < now());

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

  if v_free and v_session.total_applications_received >= 150 then
    return jsonb_build_object('error', 'session_full');
  end if;

  select id into v_dup_id
  from applicants
  where session_id = v_session.id
    and (
      (p_email is not null and email = p_email)
      or (p_phone is not null and phone = p_phone)
    )
  limit 1;

  v_app_code := 'ORD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into applicants (
    institute_id, session_id, program_id, application_id,
    form_data, email, phone, source
  ) values (
    p_institute_id, v_session.id, p_program_id, v_app_code,
    coalesce(p_form_data, '{}'::jsonb), p_email, p_phone, p_source
  ) returning id into v_applicant_id;

  update sessions
  set total_applications_received = total_applications_received + 1
  where id = v_session.id;

  return jsonb_build_object(
    'application_id', v_app_code,
    'possible_duplicate', v_dup_id is not null
  );
end;
$$;

grant execute on function submit_application(uuid, jsonb, text, text, uuid, applicant_source) to anon, authenticated;

create or replace function submit_enquiry_group(
  p_institute_id uuid,
  p_family_label text,
  p_students     jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan       plan_tier;
  v_status     institute_status;
  v_expires    timestamptz;
  v_free       boolean;
  v_session    sessions;
  v_count      int;
  v_family     uuid;
  v_fam_code   text;
  v_results    jsonb := '[]'::jsonb;
  v_student    jsonb;
  v_code       text;
  v_email      text;
  v_phone      text;
  v_prog       uuid;
  v_dup        uuid;
begin
  select plan, status, plan_expires_at into v_plan, v_status, v_expires
  from institutes where id = p_institute_id;
  if not found or v_status <> 'Active' then
    return jsonb_build_object('error', 'institute_not_found');
  end if;

  v_free := (v_plan = 'Free')
            or (v_expires is not null and v_expires < now());

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

  v_count := coalesce(jsonb_array_length(p_students), 0);
  if v_count < 1 then
    return jsonb_build_object('error', 'no_students');
  end if;

  if v_free and v_session.total_applications_received + v_count > 150 then
    return jsonb_build_object('error', 'session_full');
  end if;

  v_family   := gen_random_uuid();
  v_fam_code := 'FAM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  for v_student in select * from jsonb_array_elements(p_students)
  loop
    v_email := nullif(v_student ->> 'email', '');
    v_phone := nullif(v_student ->> 'phone', '');
    v_prog  := nullif(v_student ->> 'program_id', '')::uuid;

    select id into v_dup
    from applicants
    where session_id = v_session.id
      and (
        (v_email is not null and email = v_email)
        or (v_phone is not null and phone = v_phone)
      )
    limit 1;

    v_code := 'ORD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

    insert into applicants (
      institute_id, session_id, program_id, application_id,
      form_data, email, phone, source, family_id, family_label, family_code
    ) values (
      p_institute_id, v_session.id, v_prog, v_code,
      coalesce(v_student -> 'form_data', '{}'::jsonb),
      v_email, v_phone, 'Direct', v_family, nullif(p_family_label, ''), v_fam_code
    );

    v_results := v_results || jsonb_build_object(
      'application_id', v_code,
      'possible_duplicate', v_dup is not null
    );
  end loop;

  update sessions
  set total_applications_received = total_applications_received + v_count
  where id = v_session.id;

  return jsonb_build_object(
    'family_id', v_family,
    'family_code', v_fam_code,
    'students', v_results
  );
end;
$$;

grant execute on function submit_enquiry_group(uuid, text, jsonb) to anon, authenticated;

-- Expose plan expiry on the public form so it can gate uploads correctly.
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

  select * into v_session
  from sessions
  where institute_id = p_institute_id and status = 'Open'
  order by start_date desc
  limit 1;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', id, 'label', field_label, 'type', field_type,
             'required', is_required, 'options', options,
             'conditional_logic', conditional_logic,
             'order', display_order, 'is_document_field', is_document_field
           ) order by display_order
         ), '[]'::jsonb)
  into v_fields
  from form_fields
  where institute_id = p_institute_id;

  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name)), '[]'::jsonb)
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
      'plan_expires_at', v_institute.plan_expires_at,
      'working_hours', v_institute.working_hours
    ),
    'session', case when v_session.id is null then null else jsonb_build_object(
      'id', v_session.id,
      'name', v_session.name,
      'status', v_session.status,
      'is_full', v_session.total_applications_received >= 150
                 and (v_institute.plan = 'Free'
                      or (v_institute.plan_expires_at is not null
                          and v_institute.plan_expires_at < now())),
      'end_date', v_session.end_date
    ) end,
    'fields', v_fields,
    'programs', v_programs
  );
end;
$$;

grant execute on function get_public_form(uuid) to anon, authenticated;
