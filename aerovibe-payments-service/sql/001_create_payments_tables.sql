-- Suscripciones por usuario
create table if not exists public.user_subscriptions (
  user_id uuid primary key,
  subscription_provider text,
  subscription_status text not null default 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text,
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  last_stripe_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_user_subscriptions_stripe_customer_id
  on public.user_subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists idx_user_subscriptions_stripe_subscription_id
  on public.user_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- Idempotencia de webhooks Stripe
create table if not exists public.payments_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);
