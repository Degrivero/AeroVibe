-- Notifications + settings

create extension if not exists "pgcrypto";

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null,
  actor_id uuid,
  type text not null,
  title text,
  body text,
  entity_id uuid,
  user_name text,
  user_avatar_url text,
  spot_id uuid,
  spot_title text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (recipient_id, is_read);

create table if not exists public.notification_settings (
  user_id uuid primary key,
  enabled boolean not null default true,
  comment_on_my_spot boolean not null default true,
  reply_to_my_comment boolean not null default true,
  added_as_copilot boolean not null default true,
  removed_as_copilot boolean not null default true,
  spot_favorited boolean not null default true,
  flight_intent boolean not null default true,
  report_moderation boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
alter table public.notification_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_select_own'
  ) then
    create policy notifications_select_own
      on public.notifications
      for select
      to authenticated
      using (recipient_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_update_own'
  ) then
    create policy notifications_update_own
      on public.notifications
      for update
      to authenticated
      using (recipient_id = auth.uid())
      with check (recipient_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notification_settings' and policyname = 'notification_settings_select_own'
  ) then
    create policy notification_settings_select_own
      on public.notification_settings
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notification_settings' and policyname = 'notification_settings_insert_own'
  ) then
    create policy notification_settings_insert_own
      on public.notification_settings
      for insert
      to authenticated
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notification_settings' and policyname = 'notification_settings_update_own'
  ) then
    create policy notification_settings_update_own
      on public.notification_settings
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists trg_notification_settings_updated_at on public.notification_settings;
    create trigger trg_notification_settings_updated_at
      before update on public.notification_settings
      for each row execute function public.set_updated_at();
  end if;
end $$;
