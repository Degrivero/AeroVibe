-- Requiere que exista public.user_subscriptions (creada en 001_create_payments_tables.sql).
do $$
begin
  if to_regclass('public.user_subscriptions') is null then
    raise exception 'Missing table public.user_subscriptions. Run 001_create_payments_tables.sql first.';
  end if;
end
$$;

-- Campos multi-provider para suscripciones (Mercado Pago + Stripe)
alter table if exists public.user_subscriptions
  add column if not exists provider_subscription_id text,
  add column if not exists local_amount numeric,
  add column if not exists usd_rate_at_creation numeric,
  add column if not exists usd_price_base numeric,
  add column if not exists currency_local text,
  add column if not exists country_origin text;

create unique index if not exists idx_user_subscriptions_provider_subscription_id
  on public.user_subscriptions (provider_subscription_id)
  where provider_subscription_id is not null;

-- Configuración de tasas USD por país para cálculo dinámico local.
create table if not exists public.exchange_rates (
  country_code text primary key,
  usd_rate numeric not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

insert into public.exchange_rates (country_code, usd_rate)
values
  ('CL', 950),
  ('AR', 1200)
on conflict (country_code) do nothing;
