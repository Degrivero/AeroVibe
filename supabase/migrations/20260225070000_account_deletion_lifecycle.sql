-- Account deletion lifecycle registry (audit + execution control)

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text null,
  locale text not null default 'en',
  status text not null default 'scheduled',
  requested_at timestamptz not null default now(),
  scheduled_for timestamptz not null,
  cancelled_at timestamptz null,
  executed_at timestamptz null,
  cancel_token_hash text null,
  cancel_token_expires_at timestamptz null,
  source text null,
  support_request_id uuid null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_deletion_requests_status_check
    check (status in ('scheduled', 'cancelled', 'executed', 'failed'))
);

create unique index if not exists account_deletion_requests_user_uidx
  on public.account_deletion_requests (user_id);

create unique index if not exists account_deletion_requests_cancel_token_uidx
  on public.account_deletion_requests (cancel_token_hash)
  where cancel_token_hash is not null;

create index if not exists account_deletion_requests_status_idx
  on public.account_deletion_requests (status);

create index if not exists account_deletion_requests_scheduled_for_idx
  on public.account_deletion_requests (scheduled_for)
  where status = 'scheduled';

create or replace function public.set_updated_at_account_deletion_requests()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_account_deletion_requests_updated_at
  on public.account_deletion_requests;

create trigger trg_account_deletion_requests_updated_at
before update on public.account_deletion_requests
for each row
execute function public.set_updated_at_account_deletion_requests();
