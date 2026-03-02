import { logger } from '../lib/logger.js';
import { publishEvent } from '../lib/nats.js';
import { retrieveStripeSubscription } from './stripeService.js';
import {
  getSubscriptionByStripeCustomerId,
  getSubscriptionByStripeSubscriptionId,
  syncStripeSnapshot,
} from './subscriptionService.js';
import { normalizeStatusRow } from '../lib/subscription.js';

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value != null && String(value).trim() !== '') return String(value).trim();
  }
  return null;
}

function resolvePriceIdFromInvoice(invoice) {
  return invoice?.lines?.data?.[0]?.price?.id ?? null;
}

function shouldEmitActivated(previous, next) {
  const prev = normalizeStatusRow(previous);
  const curr = normalizeStatusRow(next);
  return curr.isActive && !prev.isActive;
}

function shouldEmitCanceled(previous, next) {
  const prev = normalizeStatusRow(previous);
  const curr = normalizeStatusRow(next);
  return curr.isActive && curr.cancelAtPeriodEnd && !prev.cancelAtPeriodEnd;
}

function shouldEmitExpired(previous, next) {
  const prev = normalizeStatusRow(previous);
  const curr = normalizeStatusRow(next);
  return prev.isActive && !curr.isActive;
}

async function emitLifecycleEvents({ previous, next, stripeEventId, source }) {
  const payload = {
    user_id: next.user_id,
    provider: next.subscription_provider,
    subscription_status: next.subscription_status,
    current_period_end: next.current_period_end,
    cancel_at_period_end: next.cancel_at_period_end,
    stripe_customer_id: next.stripe_customer_id,
    stripe_subscription_id: next.stripe_subscription_id,
    price_id: next.price_id,
    source,
    stripe_event_id: stripeEventId,
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
}

async function handleCheckoutSessionCompleted(event) {
  const session = event.data.object;
  const userId = firstNonEmpty(
    session?.metadata?.user_id,
    session?.client_reference_id,
  );

  const subscriptionId = firstNonEmpty(session?.subscription);
  if (!subscriptionId || !userId) {
    logger.warn('[webhook] checkout.session.completed missing identifiers', {
      eventId: event.id,
      userId,
      subscriptionId,
    });
    return;
  }

  const stripeSubscription = await retrieveStripeSubscription(subscriptionId);
  const { previous, next } = await syncStripeSnapshot({
    userId,
    stripeSubscription,
    stripeCustomerId: firstNonEmpty(session?.customer),
    eventId: event.id,
  });

  await emitLifecycleEvents({
    previous,
    next,
    stripeEventId: event.id,
    source: 'checkout.session.completed',
  });
}

async function handleInvoicePaid(event) {
  const invoice = event.data.object;
  const subscriptionId = firstNonEmpty(invoice?.subscription);
  const customerId = firstNonEmpty(invoice?.customer);

  if (!subscriptionId) return;

  const existing =
    (await getSubscriptionByStripeSubscriptionId(subscriptionId)) ||
    (await getSubscriptionByStripeCustomerId(customerId));

  const userId = existing?.user_id ?? firstNonEmpty(invoice?.metadata?.user_id);
  if (!userId) {
    logger.warn('[webhook] invoice.paid without matching user', {
      eventId: event.id,
      subscriptionId,
      customerId,
    });
    return;
  }

  const stripeSubscription = await retrieveStripeSubscription(subscriptionId);

  // Si invoice trae price más reciente, lo usamos como fallback.
  if (!stripeSubscription.items?.data?.[0]?.price?.id) {
    const fallbackPriceId = resolvePriceIdFromInvoice(invoice);
    if (fallbackPriceId) {
      stripeSubscription.items = {
        data: [{
          id: 'invoice_fallback_item',
          price: { id: fallbackPriceId },
        }],
      };
    }
  }

  const { previous, next } = await syncStripeSnapshot({
    userId,
    stripeSubscription,
    stripeCustomerId: customerId,
    eventId: event.id,
  });

  await emitLifecycleEvents({
    previous,
    next,
    stripeEventId: event.id,
    source: 'invoice.paid',
  });
}

async function handleSubscriptionUpdated(event) {
  const sub = event.data.object;
  const subscriptionId = sub?.id ? String(sub.id) : null;
  const customerId = sub?.customer ? String(sub.customer) : null;

  const existing =
    (await getSubscriptionByStripeSubscriptionId(subscriptionId)) ||
    (await getSubscriptionByStripeCustomerId(customerId));

  const userId = existing?.user_id ?? firstNonEmpty(sub?.metadata?.user_id);
  if (!userId) {
    logger.warn('[webhook] customer.subscription.updated without matching user', {
      eventId: event.id,
      subscriptionId,
      customerId,
    });
    return;
  }

  const { previous, next } = await syncStripeSnapshot({
    userId,
    stripeSubscription: sub,
    stripeCustomerId: customerId,
    eventId: event.id,
  });

  await emitLifecycleEvents({
    previous,
    next,
    stripeEventId: event.id,
    source: 'customer.subscription.updated',
  });
}

async function handleSubscriptionDeleted(event) {
  const sub = event.data.object;
  const subscriptionId = sub?.id ? String(sub.id) : null;
  const customerId = sub?.customer ? String(sub.customer) : null;

  const existing =
    (await getSubscriptionByStripeSubscriptionId(subscriptionId)) ||
    (await getSubscriptionByStripeCustomerId(customerId));

  const userId = existing?.user_id ?? firstNonEmpty(sub?.metadata?.user_id);
  if (!userId) {
    logger.warn('[webhook] customer.subscription.deleted without matching user', {
      eventId: event.id,
      subscriptionId,
      customerId,
    });
    return;
  }

  const { previous, next } = await syncStripeSnapshot({
    userId,
    stripeSubscription: sub,
    stripeCustomerId: customerId,
    eventId: event.id,
    forceStatus: 'expired',
  });

  await emitLifecycleEvents({
    previous,
    next,
    stripeEventId: event.id,
    source: 'customer.subscription.deleted',
  });
}

export async function handleStripeWebhookEvent(event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event);
      return;
    case 'invoice.paid':
      await handleInvoicePaid(event);
      return;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event);
      return;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event);
      return;
    default:
      logger.info('[webhook] ignored event', { eventType: event.type, eventId: event.id });
  }
}
