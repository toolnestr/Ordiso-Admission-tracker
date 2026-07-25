-- ============================================================================
-- Migration 0014: Simplify applicant source to two real buckets
-- Before: enum ('QR','Direct','Shared') but nothing ever set QR/Shared — every
-- row was 'Direct', so the source chart was meaningless.
-- After: two buckets that actually reflect how a record was created —
--   * public application form (QR or a shared link — same thing) => 'Direct',
--     shown in the UI as "QR / Link"
--   * staff-added walk-in / manual entry => new value 'Manual'
-- Existing rows stay 'Direct' (they all came through the public form), so they
-- correctly read as "QR / Link". 'QR' and 'Shared' become unused (hidden in UI).
-- ============================================================================

alter type applicant_source add value if not exists 'Manual';

-- submit_enquiry_group needs to know who's submitting so a staff-added family
-- can be tagged 'Manual'. Add p_source (defaults 'Direct' = public form). The
-- old 3-arg signature is dropped so a 3-arg call isn't ambiguous. Body is the
-- 0013 (cap-100) version with the hardcoded 'Direct' replaced by p_source.
drop function if exists submit_enquiry_group(uuid, text, jsonb);

create function submit_enquiry_group(
  p_institute_id uuid,
  p_family_label text,
  p_students     jsonb,
  p_source       applicant_source default 'Direct'
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

  if v_free and v_session.total_applications_received + v_count > 100 then
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
      v_email, v_phone, p_source, v_family, nullif(p_family_label, ''), v_fam_code
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

grant execute on function submit_enquiry_group(uuid, text, jsonb, applicant_source) to anon, authenticated;
