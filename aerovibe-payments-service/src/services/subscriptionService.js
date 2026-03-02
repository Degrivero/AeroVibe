import { supabaseAdmin } from '../lib/supabase.js';
import { env } from '../lib/env.js';
import { HttpError } from '../lib/httpError.js';
import { isSubscriptionActive, mapStripeStatus, normalizeStatusRow } from '../lib/subscription.js';
import { logger } from '../lib/logger.js';

const SUBSCRIPTIONS_TABLE = env.SUBSCRIPTIONS_TABLE;
const WEBHOOK_EVENTS_TABLE = env.PAYMENTS_WEBHOOK_EVENTS_TABLE;

function nowIso() {
  return new Date().toISOString();
}

function periodEndIsoFromUnix(unixSeconds) {
  if (!unixSeconds || !Number.isFinite(Number(unixSeconds))) return null;
  return new Date(Number(unixSeconds) * 1000).toISOString();
}

function normalizeAmount(rawValue) {
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : null;
}

export async function getSubscriptionByUserId(userId) {
  const { data, error } = await supabaseAdmin
    .from(SUBSCRIPTIONS_TABLE)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, 'SUBSCRIPTION_FETCH_ERROR', error.message);
  }
  return data;
}

export async function getSubscriptionByStripeCustomerId(stripeCustomerId) {
  if (!stripeCustomerId) return null;
  const { data, error } = await supabaseAdmin
    .from(SUBSCRIPTIONS_TABLE)
    .select('*')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, 'SUBSCRIPTION_FETCH_ERROR', error.message);
  }
  return data;
}

export async function getSubscriptionByStripeSubscriptionId(stripeSubscriptionId) {
  if (!stripeSubscriptionId) return null;
  const { data, error } = await supabaseAdmin
    .from(SUBSCRIPTIONS_TABLE)
    .select('*')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, 'SUBSCRIPTION_FETCH_ERROR', error.message);
  }
  return data;
}

export async function getSubscriptionByProviderSubscriptionId(providerSubscriptionId) {
  if (!providerSubscriptionId) return null;
  const { data, error } = await supabaseAdmin
    .from(SUBSCRIPTIONS_TABLE)
    .select('*')
    .eq('provider_subscription_id', providerSubscriptionId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, 'SUBSCRIPTION_FETCH_ERROR', error.message);
  }
  return data;
}

export function assertProviderChangeAllowed(existingSubscription, requestedProvider) {
  if (!existingSubscription?.subscription_provider) return;
  if (existingSubscription.subscription_provider === requestedProvider) return;

  if (isSubscriptionActive(existingSubscription)) {
    throw new HttpError(
      409,
      'SUBSCRIPTION_MANAGED_BY_OTHER_PROVIDER',
      `La suscripción activa está gestionada por ${existingSubscription.subscription_provider}.`,
      {
        currentProvider: existingSubscription.subscription_provider,
        requestedProvider,
        currentPeriodEnd: existingSubscription.current_period_end,
      },
    );
  }
}

function buildWebhookEventId(provider, eventId) {
  const rawProvider = String(provider ?? '').trim().toLowerCase() || 'unknown';
  const rawEventId = String(eventId ?? '').trim();
  if (!rawEventId) return null;
  return `${rawProvider}:${rawEventId}`;
}

export async function markWebhookEventAsReceived(eventId, eventType, provider = 'stripe') {
  const normalizedEventId = buildWebhookEventId(provider, eventId);
  if (!normalizedEventId) return true;

  const payload = {
    event_id: normalizedEventId,
    event_type: eventType,
    received_at: nowIso(),
  };

  const { error } = await supabaseAdmin
    .from(WEBHOOK_EVENTS_TABLE)
    .insert(payload);

  if (!error) return true;

  const message = String(error.message ?? '').toLowerCase();
  if (error.code === '23505' || message.includes('duplicate key')) {
    return false;
  }

  // Fallback si la tabla de eventos aún no existe.
  if (error.code === '42P01' || message.includes('does not exist')) {
    const { count, error: fallbackError } = await supabaseAdmin
      .from(SUBSCRIPTIONS_TABLE)
      .select('user_id', { count: 'exact', head: true })
      .eq('last_stripe_event_id', String(eventId ?? '').trim());

    if (fallbackError) {
      throw new HttpError(500, 'WEBHOOK_IDEMPOTENCY_ERROR', fallbackError.message);
    }
    return (count ?? 0) === 0;
  }

  throw new HttpError(500, 'WEBHOOK_IDEMPOTENCY_ERROR', error.message);
}

export async function markStripeEventAsReceived(eventId, eventType) {
  return markWebhookEventAsReceived(eventId, eventType, 'stripe');
}

export async function upsertSubscription(row) {
  const payload = {
    user_id: row.user_id,
    subscription_provider: row.subscription_provider ?? null,
    subscription_status: row.subscription_status ?? 'inactive',
    stripe_customer_id: row.stripe_customer_id ?? null,
    stripe_subscription_id: row.stripe_subscription_id ?? null,
    provider_subscription_id: row.provider_subscription_id ?? null,
    price_id: row.price_id ?? null,
    local_amount: normalizeAmount(row.local_amount),
    usd_rate_at_creation: normalizeAmount(row.usd_rate_at_creation),
    usd_price_base: normalizeAmount(row.usd_price_base),
    currency_local: row.currency_local ?? null,
    country_origin: row.country_origin ?? null,
    current_period_end: row.current_period_end ?? null,
    cancel_at_period_end: Boolean(row.cancel_at_period_end),
    last_stripe_event_id: row.last_stripe_event_id ?? null,
    updated_at: nowIso(),
  };

  const { data, error } = await supabaseAdmin
    .from(SUBSCRIPTIONS_TABLE)
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) {
    throw new HttpError(500, 'SUBSCRIPTION_UPSERT_ERROR', error.message);
  }
  return data;
}

export async function syncStripeSnapshot({
  userId,
  stripeSubscription,
  stripeCustomerId,
  eventId,
  forceStatus,
}) {
  if (!userId) {
    throw new HttpError(400, 'USER_ID_REQUIRED', 'No se pudo resolver user_id para actualizar suscripción.');
  }

  const previous = await getSubscriptionByUserId(userId);
  const item = stripeSubscription?.items?.data?.[0] ?? null;
  const nextStatus = forceStatus || mapStripeStatus(stripeSubscription?.status);

  const next = await upsertSubscription({
    user_id: userId,
    subscription_provider: 'stripe',
    subscription_status: nextStatus,
    stripe_customer_id: stripeCustomerId ?? stripeSubscription?.customer ?? previous?.stripe_customer_id ?? null,
    stripe_subscription_id: stripeSubscription?.id ?? previous?.stripe_subscription_id ?? null,
    provider_subscription_id: stripeSubscription?.id ?? previous?.provider_subscription_id ?? null,
    price_id: item?.price?.id ?? previous?.price_id ?? null,
    local_amount: previous?.local_amount ?? null,
    usd_rate_at_creation: previous?.usd_rate_at_creation ?? null,
    usd_price_base: previous?.usd_price_base ?? null,
    currency_local: previous?.currency_local ?? null,
    country_origin: previous?.country_origin ?? null,
    current_period_end:
      periodEndIsoFromUnix(stripeSubscription?.current_period_end) ?? previous?.current_period_end ?? null,
    cancel_at_period_end:
      Boolean(stripeSubscription?.cancel_at_period_end) || false,
    last_stripe_event_id: eventId ?? previous?.last_stripe_event_id ?? null,
  });

  return { previous, next };
}

export async function syncMercadoPagoSnapshot({
  userId,
  provider,
  providerSubscriptionId,
  status,
  currentPeriodEnd,
  localAmount,
  usdRateAtCreation,
  usdPriceBase,
  currencyLocal,
  countryOrigin,
  eventId,
  cancelAtPeriodEnd,
}) {
  if (!userId) {
    throw new HttpError(400, 'USER_ID_REQUIRED', 'No se pudo resolver user_id para actualizar suscripción.');
  }

  const previous = await getSubscriptionByUserId(userId);

  const next = await upsertSubscription({
    user_id: userId,
    subscription_provider: provider,
    subscription_status: status,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    provider_subscription_id: providerSubscriptionId ?? previous?.provider_subscription_id ?? null,
    price_id: null,
    local_amount: localAmount ?? previous?.local_amount ?? null,
    usd_rate_at_creation: usdRateAtCreation ?? previous?.usd_rate_at_creation ?? null,
    usd_price_base: usdPriceBase ?? previous?.usd_price_base ?? null,
    currency_local: currencyLocal ?? previous?.currency_local ?? null,
    country_origin: countryOrigin ?? previous?.country_origin ?? null,
    current_period_end: currentPeriodEnd ?? previous?.current_period_end ?? null,
    cancel_at_period_end: Boolean(cancelAtPeriodEnd),
    last_stripe_event_id: eventId ?? previous?.last_stripe_event_id ?? null,
  });

  return { previous, next };
}

export async function getNormalizedStatusByUserId(userId) {
  const existing = await getSubscriptionByUserId(userId);

  if (!existing) {
    return {
      userId,
      ...normalizeStatusRow(null),
    };
  }

  let row = existing;
  const normalized = normalizeStatusRow(existing);
  if (normalized.status === 'expired' && String(existing.subscription_status).toLowerCase() === 'active') {
    row = await upsertSubscription({
      ...existing,
      subscription_status: 'expired',
      last_stripe_event_id: existing.last_stripe_event_id,
    });
  }

  return {
    userId,
    ...normalizeStatusRow(row),
  };
}

export async function activateInternalPromo(userId, days) {
  const parsedDays = Number(days);
  if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
    throw new HttpError(400, 'INVALID_PROMO_DAYS', 'days debe ser un entero positivo.');
  }

  const existing = await getSubscriptionByUserId(userId);
  assertProviderChangeAllowed(existing, 'internal_promo');

  const end = new Date(Date.now() + parsedDays * 24 * 60 * 60 * 1000).toISOString();

  const updated = await upsertSubscription({
    user_id: userId,
    subscription_provider: 'internal_promo',
    subscription_status: 'active',
    stripe_customer_id: null,
    stripe_subscription_id: null,
    provider_subscription_id: 'internal_promo',
    price_id: null,
    local_amount: null,
    usd_rate_at_creation: null,
    usd_price_base: null,
    currency_local: null,
    country_origin: null,
    current_period_end: end,
    cancel_at_period_end: false,
    last_stripe_event_id: 'internal_promo',
  });

  logger.info('internal promo activated', { userId, days: parsedDays, currentPeriodEnd: end });
  return updated;
}
