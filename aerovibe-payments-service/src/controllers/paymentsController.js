import { stripe } from '../lib/stripe.js';
import { env } from '../lib/env.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { HttpError } from '../lib/httpError.js';
import {
  createPortalSession,
} from '../services/stripeService.js';
import {
  assertProviderChangeAllowed,
  getNormalizedStatusByUserId,
  getSubscriptionByUserId,
  syncMercadoPagoSnapshot,
} from '../services/subscriptionService.js';
import { handleStripeWebhookEvent } from '../services/webhookHandler.js';
import { handleMercadoPagoWebhookEvent } from '../services/mercadoPagoWebhookHandler.js';
import { isSubscriptionActive, mapMercadoPagoStatus } from '../lib/subscription.js';
import {
  createMercadoPagoSubscription,
  extractMercadoPagoPreapprovalId,
  getMercadoPagoSubscription,
  verifyMercadoPagoWebhookSignature,
} from '../services/mercadoPagoService.js';
import { getUserProfileLocation } from '../services/userProfileService.js';
import {
  basePriceForPlan,
  getAllConfiguredRates,
  getUsdRateByCountry,
  resolvePlan,
  updateExchangeRates,
} from '../services/pricingService.js';
import { countryCodeToCurrency, countryCodeToProvider, normalizeCountryCode } from '../lib/country.js';
import { logger } from '../lib/logger.js';

const ADMIN_ROLES = new Set(['admin', 'moderator', 'superadmin']);

function assertAdminRole(roleRaw) {
  const role = String(roleRaw ?? '').trim().toLowerCase();
  if (ADMIN_ROLES.has(role)) return;
  throw new HttpError(403, 'FORBIDDEN', 'Este endpoint requiere rol administrador.');
}

function subscriptionReasonFromPlan(plan) {
  return plan === 'annual' ? 'AeroVibe Pro Annual' : 'AeroVibe Pro Monthly';
}

function parseIsoOrNull(rawValue) {
  if (!rawValue) return null;
  const ms = Date.parse(String(rawValue));
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function resolveProviderFromProfileLocation(location) {
  const countryCode = normalizeCountryCode(location?.country);
  const city = String(location?.city ?? '').trim();
  if (!countryCode || !city) {
    throw new HttpError(
      400,
      'PROFILE_COUNTRY_REQUIRED',
      'Debes completar país y ciudad en tu perfil para suscribirte desde la web.',
    );
  }

  const provider = countryCodeToProvider(countryCode);
  if (!provider) {
    throw new HttpError(
      403,
      'SUBSCRIPTION_NOT_AVAILABLE_IN_COUNTRY',
      'Las suscripciones web están disponibles actualmente en Chile y Argentina.',
      { countryCode },
    );
  }

  return { provider, countryCode };
}

function resolveMercadoPagoProviderFromWebhookPath(pathname) {
  if (pathname.endsWith('/mercadopago_cl')) return 'mercadopago_cl';
  if (pathname.endsWith('/mercadopago_ar')) return 'mercadopago_ar';
  return null;
}

export const postCheckout = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const email = req.user.email;

  const plan = resolvePlan(req.validatedBody);
  if (!plan) {
    throw new HttpError(
      400,
      'PLAN_REQUIRED',
      'Debes indicar plan=monthly o plan=annual para iniciar el checkout.',
    );
  }

  const profileLocation = await getUserProfileLocation(userId);
  const { provider, countryCode } = resolveProviderFromProfileLocation(profileLocation);
  const currency = countryCodeToCurrency(countryCode);

  const existing = await getSubscriptionByUserId(userId);
  assertProviderChangeAllowed(existing, provider);

  if (existing?.subscription_provider === provider && isSubscriptionActive(existing)) {
    throw new HttpError(
      409,
      'SUBSCRIPTION_ALREADY_ACTIVE',
      'Ya tienes una suscripción activa para este canal. Gestiona cambios cuando termine el período actual.',
      {
        provider,
        currentPeriodEnd: existing.current_period_end,
      },
    );
  }

  const usdRate = await getUsdRateByCountry(countryCode);
  const usdPriceBase = basePriceForPlan(plan);
  const localAmount = Math.round(usdPriceBase * usdRate);

  const createdSubscription = await createMercadoPagoSubscription({
    provider,
    userId,
    email,
    plan,
    localAmount,
    currency,
    reason: subscriptionReasonFromPlan(plan),
  });

  await syncMercadoPagoSnapshot({
    userId,
    provider,
    providerSubscriptionId: createdSubscription.id,
    status: mapMercadoPagoStatus(createdSubscription.status ?? 'pending'),
    currentPeriodEnd: parseIsoOrNull(createdSubscription.nextPaymentDate),
    localAmount,
    usdRateAtCreation: usdRate,
    usdPriceBase,
    currencyLocal: currency,
    countryOrigin: countryCode,
    eventId: 'checkout_init',
    cancelAtPeriodEnd: false,
  });

  return res.status(201).json({
    ok: true,
    provider,
    country: countryCode,
    plan,
    currency,
    amount_usd: usdPriceBase,
    amount_local: localAmount,
    usd_rate: usdRate,
    url: createdSubscription.initPoint,
  });
});

export const postPortal = asyncHandler(async (req, res) => {
  if (!env.ENABLE_STRIPE) {
    throw new HttpError(503, 'STRIPE_DISABLED', 'El portal web de Stripe no está disponible en este momento.');
  }

  const userId = req.user.id;
  const existing = await getSubscriptionByUserId(userId);

  if (!existing) {
    throw new HttpError(404, 'SUBSCRIPTION_NOT_FOUND', 'No hay suscripción registrada para este usuario.');
  }

  if (existing.subscription_provider !== 'stripe') {
    throw new HttpError(
      409,
      'SUBSCRIPTION_NOT_STRIPE',
      'El portal solo está disponible para suscripciones Stripe.',
      { provider: existing.subscription_provider },
    );
  }

  if (!existing.stripe_customer_id) {
    throw new HttpError(400, 'STRIPE_CUSTOMER_MISSING', 'No existe stripe_customer_id para este usuario.');
  }

  const session = await createPortalSession(existing.stripe_customer_id);
  return res.json({ url: session.url });
});

export const getStatus = asyncHandler(async (req, res) => {
  const status = await getNormalizedStatusByUserId(req.user.id);
  return res.json({ ok: true, subscription: status });
});

export const getAdminPricing = asyncHandler(async (req, res) => {
  assertAdminRole(req.user?.role);

  const rates = await getAllConfiguredRates();
  return res.json({
    ok: true,
    base_prices_usd: {
      monthly: env.PRO_MONTHLY_USD,
      annual: env.PRO_YEARLY_USD,
    },
    countries: rates,
  });
});

export const postAdminPricingUpdate = asyncHandler(async (req, res) => {
  assertAdminRole(req.user?.role);

  const result = await updateExchangeRates({
    clRate: req.validatedBody.clRate,
    arRate: req.validatedBody.arRate,
    updatedBy: req.user.id,
  });

  return res.status(200).json(result);
});

export const verifyStripeWebhook = asyncHandler(async (req, _res, next) => {
  if (!env.ENABLE_STRIPE || !stripe) {
    throw new HttpError(503, 'STRIPE_DISABLED', 'Stripe webhook deshabilitado.');
  }

  const signature = String(req.headers['stripe-signature'] ?? '').trim();
  if (!signature) {
    throw new HttpError(400, 'STRIPE_SIGNATURE_MISSING', 'Falta cabecera stripe-signature.');
  }

  try {
    req.stripeEvent = stripe.webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    throw new HttpError(400, 'STRIPE_SIGNATURE_INVALID', `Firma inválida: ${error.message}`);
  }

  req.webhookProvider = 'stripe';
  req.webhookEventId = req.stripeEvent?.id;
  req.webhookEventType = req.stripeEvent?.type;

  return next();
});

export const postStripeWebhook = asyncHandler(async (req, res) => {
  await handleStripeWebhookEvent(req.stripeEvent);
  return res.status(200).json({ ok: true, received: true });
});

export const verifyMercadoPagoWebhook = asyncHandler(async (req, _res, next) => {
  const provider = resolveMercadoPagoProviderFromWebhookPath(req.path);
  if (!provider) {
    throw new HttpError(400, 'MERCADOPAGO_PROVIDER_INVALID', 'Ruta de webhook Mercado Pago inválida.');
  }

  const preapprovalId = extractMercadoPagoPreapprovalId({ body: req.body, query: req.query });

  req.webhookProvider = provider;
  req.webhookEventId =
    String(req.body?.id ?? '').trim() ||
    String(req.headers['x-request-id'] ?? '').trim() ||
    (preapprovalId ? `${preapprovalId}:${String(req.body?.action ?? 'unknown')}` : null);
  req.webhookEventType = `${String(req.body?.type ?? 'unknown')}.${String(req.body?.action ?? 'unknown')}`;
  req.mercadoPagoPreapprovalId = preapprovalId;

  if (!preapprovalId) {
    req.mercadoPagoIgnore = true;
    return next();
  }

  const valid = verifyMercadoPagoWebhookSignature({
    provider,
    req,
    preapprovalId,
  });

  if (!valid) {
    throw new HttpError(401, 'MERCADOPAGO_SIGNATURE_INVALID', 'Firma de webhook Mercado Pago inválida.');
  }

  return next();
});

export const postMercadoPagoWebhook = asyncHandler(async (req, res) => {
  if (req.mercadoPagoIgnore) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  const provider = req.webhookProvider;
  const preapprovalId = req.mercadoPagoPreapprovalId;

  if (provider === 'mercadopago_ar') {
    logger.info('MP AR webhook received', {
      type: req.body?.type ?? null,
      action: req.body?.action ?? null,
      preapprovalId,
    });
  }

  // Nunca confiar solo en el body del webhook: se consulta el estado real a Mercado Pago.
  const preapproval = await getMercadoPagoSubscription(provider, preapprovalId);

  await handleMercadoPagoWebhookEvent({
    provider,
    providerEventId: req.webhookEventId,
    providerEventType: req.webhookEventType,
    preapproval,
  });

  return res.status(200).json({ ok: true, received: true });
});
