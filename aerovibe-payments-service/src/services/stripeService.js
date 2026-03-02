import { stripe } from '../lib/stripe.js';
import { env } from '../lib/env.js';
import { HttpError } from '../lib/httpError.js';

const allowedPriceIds = new Set([env.STRIPE_PRICE_MONTHLY, env.STRIPE_PRICE_ANNUAL].filter(Boolean));
const verifiedProductPriceIds = new Set();

function assertStripeEnabled() {
  if (!env.ENABLE_STRIPE || !stripe) {
    throw new HttpError(503, 'STRIPE_DISABLED', 'Stripe está deshabilitado actualmente.');
  }
}

async function assertPriceBelongsToConfiguredProduct(priceId) {
  if (verifiedProductPriceIds.has(priceId)) return;

  assertStripeEnabled();
  const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
  const productId = typeof price.product === 'string' ? price.product : price.product?.id;

  if (productId !== env.STRIPE_PRODUCT_ID) {
    throw new HttpError(
      400,
      'PRICE_PRODUCT_MISMATCH',
      'El priceId no corresponde al producto AeroVibe Pro configurado.',
      { priceId, expectedProductId: env.STRIPE_PRODUCT_ID, gotProductId: productId ?? null },
    );
  }

  verifiedProductPriceIds.add(priceId);
}

export async function assertAllowedPriceId(priceId) {
  assertStripeEnabled();
  if (!allowedPriceIds.has(priceId)) {
    throw new HttpError(400, 'PRICE_ID_NOT_ALLOWED', 'priceId no permitido para AeroVibe Pro.');
  }
  await assertPriceBelongsToConfiguredProduct(priceId);
}

export async function ensureStripeCustomer({ userId, email, existingCustomerId }) {
  assertStripeEnabled();

  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId);
      if (customer && !customer.deleted) return customer.id;
    } catch (_) {
      // Si no existe, lo recreamos.
    }
  }

  const customer = await stripe.customers.create({
    email: email || undefined,
    metadata: {
      user_id: userId,
      channel: 'web',
    },
  });

  return customer.id;
}

export async function createCheckoutSession({ userId, email, customerId, priceId }) {
  assertStripeEnabled();
  await assertAllowedPriceId(priceId);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    customer_email: customerId ? undefined : email || undefined,
    success_url: `${env.FRONTEND_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: env.FRONTEND_CANCEL_URL,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      user_id: userId,
      channel: 'web',
      price_id: priceId,
    },
    subscription_data: {
      metadata: {
        user_id: userId,
        channel: 'web',
        price_id: priceId,
      },
      trial_period_days: undefined,
    },
  });

  if (!session.url) {
    throw new HttpError(500, 'CHECKOUT_URL_MISSING', 'Stripe no devolvió URL de checkout.');
  }

  return session;
}

export async function createPortalSession(customerId) {
  assertStripeEnabled();

  const returnUrl = String(env.STRIPE_PORTAL_RETURN_URL ?? '').trim();
  if (!returnUrl) {
    throw new HttpError(500, 'STRIPE_PORTAL_URL_MISSING', 'Falta STRIPE_PORTAL_RETURN_URL en configuración.');
  }

  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export async function retrieveStripeSubscription(subscriptionId) {
  assertStripeEnabled();
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price.product'],
  });
}

export async function scheduleStripePriceChange({ stripeSubscriptionId, newPriceId }) {
  assertStripeEnabled();
  await assertAllowedPriceId(newPriceId);

  const current = await retrieveStripeSubscription(stripeSubscriptionId);
  const currentItem = current.items?.data?.[0];
  if (!currentItem?.id) {
    throw new HttpError(500, 'STRIPE_SUBSCRIPTION_ITEM_MISSING', 'No se encontró item de suscripción en Stripe.');
  }

  if (currentItem.price?.id === newPriceId) {
    return current;
  }

  return stripe.subscriptions.update(stripeSubscriptionId, {
    items: [{
      id: currentItem.id,
      price: newPriceId,
    }],
    proration_behavior: 'none',
    billing_cycle_anchor: 'unchanged',
  });
}
