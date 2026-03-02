import { logger } from '../lib/logger.js';
import { publishEvent } from '../lib/nats.js';
import { mapMercadoPagoStatus, normalizeStatusRow } from '../lib/subscription.js';
import {
  getSubscriptionByProviderSubscriptionId,
  syncMercadoPagoSnapshot,
} from './subscriptionService.js';

function toIsoOrNull(rawValue) {
  if (!rawValue) return null;
  const ms = Date.parse(String(rawValue));
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value != null && String(value).trim() !== '') return String(value).trim();
  }
  return null;
}

function shouldEmitActivated(previous, next) {
  const prev = normalizeStatusRow(previous);
  const curr = normalizeStatusRow(next);
  return curr.isActive && !prev.isActive;
}

function shouldEmitCanceled(previous, next) {
  const prev = normalizeStatusRow(previous);
  const curr = normalizeStatusRow(next);
  const becameCanceled = curr.status === 'canceled' && prev.status !== 'canceled';
  const becameCancelAtPeriodEnd = curr.isActive && curr.cancelAtPeriodEnd && !prev.cancelAtPeriodEnd;
  return becameCanceled || becameCancelAtPeriodEnd;
}

function shouldEmitExpired(previous, next) {
  const prev = normalizeStatusRow(previous);
  const curr = normalizeStatusRow(next);
  return prev.isActive && !curr.isActive;
}

function shouldEmitFailed(previous, next) {
  const prev = normalizeStatusRow(previous);
  const curr = normalizeStatusRow(next);
  return curr.status === 'past_due' && prev.status !== 'past_due';
}

async function emitLifecycleEvents({ previous, next, providerEventId, source }) {
  const payload = {
    user_id: next.user_id,
    provider: next.subscription_provider,
    subscription_status: next.subscription_status,
    current_period_end: next.current_period_end,
    cancel_at_period_end: next.cancel_at_period_end,
    provider_subscription_id: next.provider_subscription_id,
    currency_local: next.currency_local,
    local_amount: next.local_amount,
    usd_rate_at_creation: next.usd_rate_at_creation,
    usd_price_base: next.usd_price_base,
    country_origin: next.country_origin,
    source,
    provider_event_id: providerEventId,
    ts: new Date().toISOString(),
  };

  if (shouldEmitActivated(previous, next)) {
    await publishEvent('subscription.activated', payload);
  }

  if (shouldEmitCanceled(previous, next)) {
    await publishEvent('subscription.canceled', payload);
  }

  if (shouldEmitExpired(previous, next)) {
    await publishEvent('subscription.expired', payload);
  }

  if (shouldEmitFailed(previous, next)) {
    await publishEvent('subscription.failed', payload);
  }
}

export async function handleMercadoPagoWebhookEvent({
  provider,
  providerEventId,
  providerEventType,
  preapproval,
}) {
  const providerSubscriptionId = firstNonEmpty(preapproval?.id);
  if (!providerSubscriptionId) {
    logger.warn('[mercadopago webhook] missing preapproval id', {
      provider,
      providerEventId,
      providerEventType,
    });
    return;
  }

  const existing = await getSubscriptionByProviderSubscriptionId(providerSubscriptionId);
  const userId = firstNonEmpty(preapproval?.external_reference, existing?.user_id);
  if (!userId) {
    logger.warn('[mercadopago webhook] user id not found', {
      provider,
      providerEventId,
      providerSubscriptionId,
    });
    return;
  }

  const preapprovalStatus = mapMercadoPagoStatus(preapproval?.status);
  const nextPaymentDate = toIsoOrNull(preapproval?.next_payment_date);
  const transactionAmount = Number(preapproval?.auto_recurring?.transaction_amount);

  const { previous, next } = await syncMercadoPagoSnapshot({
    userId,
    provider,
    providerSubscriptionId,
    status: preapprovalStatus,
    currentPeriodEnd: nextPaymentDate,
    localAmount: Number.isFinite(transactionAmount) ? transactionAmount : existing?.local_amount ?? null,
    usdRateAtCreation: existing?.usd_rate_at_creation ?? null,
    usdPriceBase: existing?.usd_price_base ?? null,
    currencyLocal: firstNonEmpty(preapproval?.auto_recurring?.currency_id, existing?.currency_local),
    countryOrigin: existing?.country_origin ?? null,
    eventId: providerEventId,
    cancelAtPeriodEnd: preapprovalStatus === 'canceled',
  });

  await emitLifecycleEvents({
    previous,
    next,
    providerEventId,
    source: providerEventType || 'mercadopago.webhook',
  });
}
