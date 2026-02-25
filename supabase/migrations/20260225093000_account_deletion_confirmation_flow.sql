-- Account deletion confirmation flow:
-- pending_confirmation -> scheduled (after email confirm) -> executed (after 365d job)

alter table if exists public.account_deletion_requests
  add column if not exists confirm_token_hash text null,
  add column if not exists confirm_token_expires_at timestamptz null,
  add column if not exists confirmed_at timestamptz null;

drop index if exists account_deletion_requests_confirm_token_uidx;
create unique index if not exists account_deletion_requests_confirm_token_uidx
  on public.account_deletion_requests (confirm_token_hash)
  where confirm_token_hash is not null;

alter table if exists public.account_deletion_requests
  drop constraint if exists account_deletion_requests_status_check;

alter table if exists public.account_deletion_requests
  add constraint account_deletion_requests_status_check
  check (status in ('pending_confirmation', 'scheduled', 'cancelled', 'executed', 'failed'));
