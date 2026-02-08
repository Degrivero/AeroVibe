-- Notifications + settings (RLS)
-- NOTE: Safe to re-run; uses IF NOT EXISTS and defensive checks.

create extension if not exists "pgcrypto";

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null,
  actor_id uuid,
  type text not null,
  title text not null,
  body text,
  entity_id uuid,
  spot_id uuid,
  spot_title text,
  user_name text,
  user_avatar_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Ensure columns exist (in case table was created manually before)
alter table public.notifications
  add column if not exists recipient_id uuid,
  add column if not exists actor_id uuid,
  add column if not exists type text,
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists entity_id uuid,
  add column if not exists spot_id uuid,
  add column if not exists spot_title text,
  add column if not exists user_name text,
  add column if not exists user_avatar_url text,
  add column if not exists is_read boolean,
  add column if not exists created_at timestamptz;

alter table public.notifications
  alter column is_read set default false,
  alter column created_at set default now();

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id);
create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id, is_read);
create index if not exists notifications_created_at_idx
  on public.notifications (created_at desc);

alter table public.notifications enable row level security;

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

-- Settings
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

alter table public.notification_settings
  add column if not exists enabled boolean,
  add column if not exists comment_on_my_spot boolean,
  add column if not exists reply_to_my_comment boolean,
  add column if not exists added_as_copilot boolean,
  add column if not exists removed_as_copilot boolean,
  add column if not exists spot_favorited boolean,
  add column if not exists flight_intent boolean,
  add column if not exists report_moderation boolean,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.notification_settings
  alter column enabled set default true,
  alter column comment_on_my_spot set default true,
  alter column reply_to_my_comment set default true,
  alter column added_as_copilot set default true,
  alter column removed_as_copilot set default true,
  alter column spot_favorited set default true,
  alter column flight_intent set default true,
  alter column report_moderation set default true,
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.notification_settings enable row level security;

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

-- Updated_at trigger if helper exists
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists trg_notification_settings_updated_at on public.notification_settings;
    create trigger trg_notification_settings_updated_at
      before update on public.notification_settings
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- Normalize legacy rows (if any)
update public.notifications
set is_read = false
where is_read is null;

update public.notifications
set created_at = now()
where created_at is null;

update public.notification_settings
set enabled = coalesce(enabled, true),
    comment_on_my_spot = coalesce(comment_on_my_spot, true),
    reply_to_my_comment = coalesce(reply_to_my_comment, true),
    added_as_copilot = coalesce(added_as_copilot, true),
    removed_as_copilot = coalesce(removed_as_copilot, true),
    spot_favorited = coalesce(spot_favorited, true),
    flight_intent = coalesce(flight_intent, true),
    report_moderation = coalesce(report_moderation, true)
where enabled is null
   or comment_on_my_spot is null
   or reply_to_my_comment is null
   or added_as_copilot is null
   or removed_as_copilot is null
   or spot_favorited is null
   or flight_intent is null
   or report_moderation is null;
