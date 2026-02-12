-- Moderation system: logs + reports

create table if not exists public.moderation_action_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete restrict,
  actor_role text not null,
  target_user_id uuid null references auth.users(id) on delete set null,
  entity_type text not null check (entity_type in ('spot', 'comment', 'marketplace_listing', 'user')),
  entity_id uuid not null,
  action text not null check (action in ('delete', 'reject', 'promote', 'demote', 'report')),
  reason_code text not null,
  reason_text text null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists moderation_logs_actor_idx
  on public.moderation_action_logs (actor_id, created_at desc);

create index if not exists moderation_logs_target_idx
  on public.moderation_action_logs (target_user_id, created_at desc);

create index if not exists moderation_logs_entity_idx
  on public.moderation_action_logs (entity_type, entity_id, created_at desc);

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('spot', 'comment', 'marketplace_listing', 'user')),
  entity_id uuid null,
  reason_code text not null,
  reason_text text null,
  status text not null default 'pending' check (status in ('pending', 'dismissed', 'confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_by uuid null references auth.users(id) on delete set null,
  resolved_at timestamptz null
);

create index if not exists user_reports_target_idx
  on public.user_reports (reported_user_id, status, created_at desc);

create index if not exists user_reports_reporter_idx
  on public.user_reports (reporter_id, created_at desc);

alter table public.moderation_action_logs enable row level security;
alter table public.user_reports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'moderation_action_logs'
      and policyname = 'moderation_logs_select_own'
  ) then
    create policy moderation_logs_select_own
      on public.moderation_action_logs
      for select
      to authenticated
      using (
        actor_id = auth.uid()
        or target_user_id = auth.uid()
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_reports'
      and policyname = 'user_reports_select_own'
  ) then
    create policy user_reports_select_own
      on public.user_reports
      for select
      to authenticated
      using (
        reporter_id = auth.uid()
        or reported_user_id = auth.uid()
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_reports'
      and policyname = 'user_reports_insert_reporter'
  ) then
    create policy user_reports_insert_reporter
      on public.user_reports
      for insert
      to authenticated
      with check (reporter_id = auth.uid());
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists trg_user_reports_updated_at on public.user_reports;
    create trigger trg_user_reports_updated_at
      before update on public.user_reports
      for each row execute function public.set_updated_at();
  end if;
end $$;
