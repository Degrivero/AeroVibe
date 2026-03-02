const ACTIVE_STATUSES = new Set(['active']);

function parseIso(raw) {
  if (!raw) return null;
  const ms = Date.parse(String(raw));
  return Number.isFinite(ms) ? new Date(ms) : null;
}

export function isSubscriptionActive(row) {
  if (!row) return false;
  if (!ACTIVE_STATUSES.has(String(row.subscription_status ?? '').toLowerCase())) {
    return false;
  }
  const periodEnd = parseIso(row.current_period_end);
  if (!periodEnd) return false;
  return Date.now() < periodEnd.getTime();
}

export function normalizeStatusRow(row) {
  if (!row) {
    return {
      provider: null,
      status: 'inactive',
      isActive: false,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      priceId: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      providerSubscriptionId: null,
      currencyLocal: null,
      localAmount: null,
      countryOrigin: null,
      updatedAt: null,
    };
  }

  const isActive = isSubscriptionActive(row);
  let status = String(row.subscription_status ?? 'inactive').toLowerCase();
  if (status === 'active' && !isActive) {
    status = 'expired';
  }

  return {
    provider: row.subscription_provider ?? null,
    status,
    isActive,
    currentPeriodEnd: row.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    priceId: row.price_id ?? null,
    stripeCustomerId: row.stripe_customer_id ?? null,
    stripeSubscriptionId: row.stripe_subscription_id ?? null,
    providerSubscriptionId: row.provider_subscription_id ?? null,
    currencyLocal: row.currency_local ?? null,
    localAmount: row.local_amount ?? null,
    countryOrigin: row.country_origin ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function mapStripeStatus(status) {
  const normalized = String(status ?? '').toLowerCase();
  if (normalized === 'trialing') return 'active';
  if (!normalized) return 'inactive';
  return normalized;
}

export function mapMercadoPagoStatus(status) {
  const normalized = String(status ?? '').trim().toLowerCase();

  if (!normalized) return 'inactive';
  if (normalized === 'authorized' || normalized === 'paused') return 'active';
  if (normalized === 'pending') return 'inactive';
  if (normalized === 'cancelled' || normalized === 'canceled' || normalized === 'stopped') return 'canceled';
  if (normalized === 'finished') return 'expired';
  if (normalized === 'payment_failed' || normalized === 'rejected') return 'past_due';

  return normalized;
}
