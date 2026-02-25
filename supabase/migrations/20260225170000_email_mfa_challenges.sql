-- Email MFA settings + one-time challenges for privileged roles.

create table if not exists public.user_mfa_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_otp_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mfa_email_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  purpose text not null,
  code_hash text not null,
  code_last4 text not null,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  locale text not null default 'en',
  request_ip text null,
  created_at timestamptz not null default now(),
  constraint mfa_email_challenges_purpose_check
    check (purpose in ('login', 'settings_enable', 'settings_disable')),
  constraint mfa_email_challenges_attempts_check
    check (attempts >= 0),
  constraint mfa_email_challenges_max_attempts_check
    check (max_attempts >= 1)
);

create index if not exists idx_mfa_email_challenges_user_created
  on public.mfa_email_challenges(user_id, created_at desc);

create index if not exists idx_mfa_email_challenges_expiry
  on public.mfa_email_challenges(expires_at);

create index if not exists idx_mfa_email_challenges_open
  on public.mfa_email_challenges(user_id, purpose)
  where consumed_at is null;

alter table if exists public.user_mfa_settings enable row level security;
alter table if exists public.mfa_email_challenges enable row level security;
