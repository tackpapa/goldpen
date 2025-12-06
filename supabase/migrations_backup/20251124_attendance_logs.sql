-- Create attendance_logs table to store institution-wide check-in/out history
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='attendance_logs'
  ) then
    create table public.attendance_logs (
      id uuid primary key default gen_random_uuid(),
      org_id uuid not null references public.organizations(id) on delete cascade,
      student_id uuid not null references public.students(id) on delete cascade,
      check_in_time timestamptz not null,
      check_out_time timestamptz,
      duration_minutes integer,
      source text default 'seats' not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create index attendance_logs_org_id_idx on public.attendance_logs(org_id);
    create index attendance_logs_student_idx on public.attendance_logs(org_id, student_id, check_in_time desc);
  end if;
end$$;

-- trigger to keep updated_at
create or replace function public.attendance_logs_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'attendance_logs_set_updated_at_tr'
  ) then
    create trigger attendance_logs_set_updated_at_tr
      before update on public.attendance_logs
      for each row
      execute function public.attendance_logs_set_updated_at();
  end if;
end$$;

-- RLS
alter table public.attendance_logs enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename='attendance_logs' and policyname='allow_org_access') then
    create policy allow_org_access on public.attendance_logs
      using (org_id = get_user_org_id());
  end if;
end$$;

