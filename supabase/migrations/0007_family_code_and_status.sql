alter table applicants add column if not exists family_code text;

create index if not exists applicants_family_code_idx
  on applicants (family_code)
  where family_code is not null;

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
  select plan, status into v_plan, v_status
  from institutes where id = p_institute_id;
  if not found or v_status <> 'Active' then
    return jsonb_build_object('error', 'institute_not_found');
  end if;

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

  if v_plan = 'Free'
     and v_session.total_applications_received + v_count > 200 then
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

grant execute on function submit_enquiry_group(uuid, text, jsonb)
  to anon, authenticated;

create or replace function check_family_status(
  p_family_code text,
  p_contact     text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_inst    uuid;
  v_msgs    jsonb;
  v_members jsonb;
begin
  -- Gate: the contact must match at least one member of the family.
  select institute_id into v_inst
  from applicants
  where family_code = p_family_code
    and (email = p_contact or phone = p_contact)
  limit 1;

  if v_inst is null then
    return jsonb_build_object('error', 'not_found');
  end if;

  select status_page_messages into v_msgs
  from institutes where id = v_inst;

  select coalesce(jsonb_agg(
           jsonb_build_object(
             'application_id', application_id,
             'status', status,
             'form_data', form_data,
             'message', coalesce(v_msgs -> (status::text), 'null'::jsonb),
             'submitted_at', created_at
           ) order by created_at
         ), '[]'::jsonb)
  into v_members
  from applicants
  where family_code = p_family_code and institute_id = v_inst;

  return jsonb_build_object('family_code', p_family_code, 'members', v_members);
end;
$$;

grant execute on function check_family_status(text, text) to anon, authenticated;
