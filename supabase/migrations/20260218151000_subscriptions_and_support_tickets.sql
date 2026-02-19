-- Subscriptions: gestión de suscripciones in-app (Google Billing, Apple IAP)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  product_id text not null,
  status text not null default 'active' check (
    status in ('active', 'expired', 'cancelled', 'pending_validation')
  ),
  expires_at timestamptz,
  original_transaction_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_idx on public.subscriptions (user_id);
create index if not exists subscriptions_status_expires_idx
  on public.subscriptions (user_id, status, expires_at desc);
create unique index if not exists subscriptions_platform_tx_unique
  on public.subscriptions (platform, original_transaction_id)
  where original_transaction_id is not null and original_transaction_id != '';

alter table public.subscriptions enable row level security;

-- Solo el propio usuario puede ver sus suscripciones
create policy subscriptions_select_own
  on public.subscriptions for select to authenticated
  using (user_id = auth.uid());

-- Insert/update vía servicio (service_role) o endpoint /subscriptions/validate
-- Cliente no inserta/actualiza directamente por seguridad
revoke insert, update, delete on public.subscriptions from anon, authenticated;


-- Support tickets: formulario de contacto desde la app (usuarios autenticados)
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_user_idx on public.support_tickets (user_id);
create index if not exists support_tickets_status_idx on public.support_tickets (status);

alter table public.support_tickets enable row level security;

-- Usuario solo ve sus propios tickets
create policy support_tickets_select_own
  on public.support_tickets for select to authenticated
  using (user_id = auth.uid());

-- Usuario puede crear tickets
create policy support_tickets_insert_own
  on public.support_tickets for insert to authenticated
  with check (user_id = auth.uid());
