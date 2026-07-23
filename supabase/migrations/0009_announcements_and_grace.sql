-- Super Admin announcements shown to institute staff on login, and a grace
-- period during which an expired paid plan keeps working while the institute
-- is nudged to renew.

create table if not exists announcements (
  id            uuid primary key default gen_random_uuid(),
  institute_id  uuid references institutes(id) on delete cascade, -- null = all
  message       text not null,
  mode          text not null default 'recurring',  -- 'recurring' | 'once'
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists announcements_active_idx
  on announcements (institute_id) where active;

create table if not exists announcement_dismissals (
  announcement_id uuid not null references announcements(id) on delete cascade,
  institute_id    uuid not null references institutes(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (announcement_id, institute_id)
);

-- Locked to clients; only the service role (super admin actions) and the
-- SECURITY DEFINER RPCs below touch these tables.
alter table announcements          enable row level security;
alter table announcement_dismissals enable row level security;

alter table institutes add column if not exists grace_until timestamptz;

-- Active announcements for the caller's institute (or global), excluding
-- 'once' ones this institute already dismissed.
create or replace function get_active_announcements()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_inst uuid;
begin
  v_inst := auth_institute_id();
  if v_inst is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', a.id, 'message', a.message, 'mode', a.mode
           ) order by a.created_at desc)
    from announcements a
    where a.active
      and (a.institute_id = v_inst or a.institute_id is null)
      and not (
        a.mode = 'once'
        and exists (
          select 1 from announcement_dismissals d
          where d.announcement_id = a.id and d.institute_id = v_inst
        )
      )
  ), '[]'::jsonb);
end;
$$;

create or replace function dismiss_announcement(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inst uuid;
begin
  v_inst := auth_institute_id();
  if v_inst is null then return; end if;
  insert into announcement_dismissals (announcement_id, institute_id)
  values (p_id, v_inst)
  on conflict do nothing;
end;
$$;

grant execute on function get_active_announcements() to authenticated;
grant execute on function dismiss_announcement(uuid) to authenticated;
