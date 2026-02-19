-- Admin schema fixes: support_requests.updated_at + user_reports compatibility

-- 1) support_requests: add updated_at (fixes "record new has no field updated_at")
alter table public.support_requests
  add column if not exists updated_at timestamptz not null default now();

-- Trigger to keep updated_at in sync
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists trg_support_requests_updated_at on public.support_requests;
    create trigger trg_support_requests_updated_at
      before update on public.support_requests
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- 2) user_reports: ensure reported_type exists (reports_v2 may not have run)
--    and status constraint allows 'action_taken'
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_reports' and column_name = 'entity_type'
  ) then
    alter table public.user_reports drop constraint if exists user_reports_entity_type_check;
    alter table public.user_reports rename column entity_type to reported_type;
    -- Migrate old values: marketplace_listing/user -> spot
    update public.user_reports
    set reported_type = 'spot'
    where reported_type not in ('spot', 'comment');
    alter table public.user_reports
      add constraint user_reports_reported_type_check
      check (reported_type in ('spot', 'comment'));
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_reports' and column_name = 'entity_id'
  ) then
    alter table public.user_reports rename column entity_id to reported_id;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_reports' and column_name = 'reporter_id'
  ) then
    alter table public.user_reports rename column reporter_id to reporter_user_id;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_reports' and column_name = 'reason_text'
  ) then
    alter table public.user_reports rename column reason_text to description;
  end if;
end $$;

-- Update status constraint: drop old, migrate values, add new
alter table public.user_reports drop constraint if exists user_reports_status_check;

update public.user_reports
set status = case
  when status = 'confirmed' then 'reviewed'
  when status in ('pending', 'dismissed', 'reviewed', 'action_taken') then status
  else 'pending'
end
where status is not null;

alter table public.user_reports
  add constraint user_reports_status_check
  check (status in ('pending', 'reviewed', 'dismissed', 'action_taken'));
