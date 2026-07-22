-- ===========================================================================
-- 0006_family_enquiries.sql
-- Sibling / family grouping.
--
-- One enquiry can cover several students (brothers/sisters), each applying to
-- their own program and each moving through their own pipeline. We keep every
-- student as a SEPARATE applicant (own status / program / fees) and merely link
-- them with a shared family_id so the UI can show "the Khan family — 3 kids"
-- and let you jump between siblings. Each sibling still counts as one applicant
-- against the free-tier cap.
-- ===========================================================================

alter table applicants add column if not exists family_id    uuid;
alter table applicants add column if not exists family_label text;

-- Partial index: only grouped applicants carry a family_id, so keep the index
-- small and only over rows that actually participate in a family.
create index if not exists applicants_family_id_idx
  on applicants (family_id)
  where family_id is not null;

-- ---------------------------------------------------------------------------
-- submit_enquiry_group(institute, family_label, students[])
-- Atomically creates 1..N applicants that share one family_id, with a single
-- race-free cap check for the whole group. Mirrors submit_application's rules
-- (institute active, one open session, duplicate flagging, immutable counter)
-- but for a batch. p_students is a JSON array; each element:
--   { "form_data": {...}, "email": "...", "phone": "...", "program_id": "uuid" }
-- Returns: { family_id, students: [{ application_id, possible_duplicate }, ...] }
-- or { error }.
-- ---------------------------------------------------------------------------
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
  v_plan     plan_tier;
  v_status   institute_status;
  v_session  sessions;
  v_count    int;
  v_family   uuid;
  v_results  jsonb := '[]'::jsonb;
  v_student  jsonb;
  v_code     text;
  v_email    text;
  v_phone    text;
  v_prog     uuid;
  v_dup      uuid;
begin
  select plan, status into v_plan, v_status
  from institutes where id = p_institute_id;
  if not found or v_status <> 'Active' then
    return jsonb_build_object('error', 'institute_not_found');
  end if;

  -- Lock the open session so the batch cap check is race-free.
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

  -- The WHOLE group must fit under the cap — no partial family.
  if v_plan = 'Free'
     and v_session.total_applications_received + v_count > 200 then
    return jsonb_build_object('error', 'session_full');
  end if;

  v_family := gen_random_uuid();

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
      form_data, email, phone, source, family_id, family_label
    ) values (
      p_institute_id, v_session.id, v_prog, v_code,
      coalesce(v_student -> 'form_data', '{}'::jsonb),
      v_email, v_phone, 'Direct', v_family, nullif(p_family_label, '')
    );

    v_results := v_results || jsonb_build_object(
      'application_id', v_code,
      'possible_duplicate', v_dup is not null
    );
  end loop;

  update sessions
  set total_applications_received = total_applications_received + v_count
  where id = v_session.id;

  return jsonb_build_object('family_id', v_family, 'students', v_results);
end;
$$;

grant execute on function submit_enquiry_group(uuid, text, jsonb)
  to anon, authenticated;
