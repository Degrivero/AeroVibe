-- Notifications delivery service: logs, templates, rate limits

create extension if not exists "pgcrypto";

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  recipient_email text,
  event_type text not null,
  channel text not null default 'email',
  status text not null default 'pending',
  provider text,
  provider_id text,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint notification_logs_channel_check check (channel in ('email', 'push')),
  constraint notification_logs_status_check check (status in ('pending', 'sent', 'failed', 'skipped')),
  constraint notification_logs_retry_count_check check (retry_count >= 0)
);

create index if not exists notification_logs_user_idx
  on public.notification_logs (user_id, created_at desc);

create index if not exists notification_logs_event_idx
  on public.notification_logs (event_type, created_at desc);

create index if not exists notification_logs_status_idx
  on public.notification_logs (status, created_at desc);

create table if not exists public.notification_rate_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  recipient_key text not null,
  event_type text not null,
  count integer not null default 0,
  window_start timestamptz not null,
  window_minutes integer not null default 60,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_rate_limits_count_check check (count >= 0),
  constraint notification_rate_limits_window_minutes_check check (window_minutes > 0),
  constraint notification_rate_limits_unique_window unique (recipient_key, event_type, window_start, window_minutes)
);

create index if not exists notification_rate_limits_user_idx
  on public.notification_rate_limits (user_id, event_type, window_start desc);

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  locale text not null,
  subject text not null,
  html_body text not null,
  text_body text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_templates_unique_event_locale unique (event_type, locale)
);

create index if not exists notification_templates_active_idx
  on public.notification_templates (event_type, locale)
  where active = true;

alter table public.notification_logs enable row level security;
alter table public.notification_rate_limits enable row level security;
alter table public.notification_templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_logs'
      and policyname = 'notification_logs_admin_read'
  ) then
    create policy notification_logs_admin_read
      on public.notification_logs
      for select
      to authenticated
      using (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_rate_limits'
      and policyname = 'notification_rate_limits_admin_read'
  ) then
    create policy notification_rate_limits_admin_read
      on public.notification_rate_limits
      for select
      to authenticated
      using (public.is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_templates'
      and policyname = 'notification_templates_admin_read'
  ) then
    create policy notification_templates_admin_read
      on public.notification_templates
      for select
      to authenticated
      using (public.is_admin());
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    drop trigger if exists trg_notification_rate_limits_updated_at on public.notification_rate_limits;
    create trigger trg_notification_rate_limits_updated_at
      before update on public.notification_rate_limits
      for each row execute function public.set_updated_at();

    drop trigger if exists trg_notification_templates_updated_at on public.notification_templates;
    create trigger trg_notification_templates_updated_at
      before update on public.notification_templates
      for each row execute function public.set_updated_at();
  end if;
end $$;

create or replace function public.bump_notification_rate_limit(
  p_recipient_key text,
  p_user_id uuid,
  p_event_type text,
  p_window_start timestamptz,
  p_window_minutes integer,
  p_limit integer
)
returns table(current_count integer, allowed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_limit integer := greatest(coalesce(p_limit, 1), 1);
  v_window_minutes integer := greatest(coalesce(p_window_minutes, 1), 1);
begin
  if p_recipient_key is null or btrim(p_recipient_key) = '' then
    raise exception 'p_recipient_key is required';
  end if;

  if p_event_type is null or btrim(p_event_type) = '' then
    raise exception 'p_event_type is required';
  end if;

  insert into public.notification_rate_limits (
    user_id,
    recipient_key,
    event_type,
    count,
    window_start,
    window_minutes
  ) values (
    p_user_id,
    p_recipient_key,
    p_event_type,
    1,
    p_window_start,
    v_window_minutes
  )
  on conflict (recipient_key, event_type, window_start, window_minutes)
  do update set
    count = public.notification_rate_limits.count + 1,
    updated_at = now(),
    user_id = coalesce(public.notification_rate_limits.user_id, excluded.user_id)
  returning count into v_count;

  return query
  select v_count, (v_count <= v_limit);
end;
$$;

revoke all on function public.bump_notification_rate_limit(text, uuid, text, timestamptz, integer, integer) from public;
grant execute on function public.bump_notification_rate_limit(text, uuid, text, timestamptz, integer, integer) to service_role;

insert into public.notification_templates (event_type, locale, subject, html_body, text_body, active)
values
  (
    'user.password.reset.requested',
    'es',
    'Restablecer contraseña en AeroVibe',
    '<p>Hola {{user_name}},</p><p>Recibimos una solicitud para restablecer tu contraseña.</p><p><a href="{{reset_link}}">Restablecer contraseña</a></p><p>Si no fuiste vos, ignorá este mensaje.</p>',
    'Hola {{user_name}},\n\nRecibimos una solicitud para restablecer tu contraseña.\nRestablecer contraseña: {{reset_link}}\n\nSi no fuiste vos, ignorá este mensaje.',
    true
  ),
  (
    'user.password.reset.requested',
    'en',
    'Reset your AeroVibe password',
    '<p>Hi {{user_name}},</p><p>We received a request to reset your password.</p><p><a href="{{reset_link}}">Reset password</a></p><p>If this was not you, you can ignore this email.</p>',
    'Hi {{user_name}},\n\nWe received a request to reset your password.\nReset password: {{reset_link}}\n\nIf this was not you, you can ignore this email.',
    true
  ),
  (
    'user.password.reset.requested',
    'pt',
    'Redefina sua senha no AeroVibe',
    '<p>Olá {{user_name}},</p><p>Recebemos uma solicitação para redefinir sua senha.</p><p><a href="{{reset_link}}">Redefinir senha</a></p><p>Se não foi você, ignore este e-mail.</p>',
    'Olá {{user_name}},\n\nRecebemos uma solicitação para redefinir sua senha.\nRedefinir senha: {{reset_link}}\n\nSe não foi você, ignore este e-mail.',
    true
  ),
  (
    'user.registered',
    'es',
    'Bienvenido a AeroVibe',
    '<p>Hola {{user_name}},</p><p>Tu cuenta ya está activa. Gracias por unirte a AeroVibe.</p>',
    'Hola {{user_name}},\n\nTu cuenta ya está activa. Gracias por unirte a AeroVibe.',
    true
  ),
  (
    'user.registered',
    'en',
    'Welcome to AeroVibe',
    '<p>Hi {{user_name}},</p><p>Your account is now active. Thanks for joining AeroVibe.</p>',
    'Hi {{user_name}},\n\nYour account is now active. Thanks for joining AeroVibe.',
    true
  ),
  (
    'user.registered',
    'pt',
    'Bem-vindo ao AeroVibe',
    '<p>Olá {{user_name}},</p><p>Sua conta está ativa. Obrigado por entrar no AeroVibe.</p>',
    'Olá {{user_name}},\n\nSua conta está ativa. Obrigado por entrar no AeroVibe.',
    true
  )
on conflict (event_type, locale) do nothing;
