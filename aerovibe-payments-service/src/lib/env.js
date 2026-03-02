import dotenv from 'dotenv';

dotenv.config();

function required(name) {
  const value = String(process.env[name] ?? '').trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(name, fallback = '') {
  const value = String(process.env[name] ?? '').trim();
  return value || fallback;
}

function parseBool(value, fallback = false) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return fallback;
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function requiredWhen(name, condition, message) {
  if (!condition) return optional(name, '');
  const value = String(process.env[name] ?? '').trim();
  if (!value) {
    throw new Error(message || `Missing required env var: ${name}`);
  }
  return value;
}

const nodeEnv = optional('NODE_ENV', 'development').toLowerCase();
const enableStripe = parseBool(optional('ENABLE_STRIPE', 'false'), false);
const enableMpChile = parseBool(optional('ENABLE_MP_CHILE', 'true'), true);
const enableMpArgentina = parseBool(optional('ENABLE_MP_ARG', 'true'), true);

export const env = Object.freeze({
  NODE_ENV: nodeEnv,
  PORT: Number(optional('PORT', '3006')),
  BIND_HOST: optional('BIND_HOST', '127.0.0.1'),

  ENABLE_STRIPE: enableStripe,
  ENABLE_MP_CHILE: enableMpChile,
  ENABLE_MP_ARG: enableMpArgentina,

  STRIPE_SECRET_KEY: requiredWhen(
    'STRIPE_SECRET_KEY',
    enableStripe,
    'Missing required env var: STRIPE_SECRET_KEY (required when ENABLE_STRIPE=true)',
  ),
  STRIPE_WEBHOOK_SECRET: requiredWhen(
    'STRIPE_WEBHOOK_SECRET',
    enableStripe,
    'Missing required env var: STRIPE_WEBHOOK_SECRET (required when ENABLE_STRIPE=true)',
  ),
  STRIPE_PRICE_MONTHLY: requiredWhen(
    'STRIPE_PRICE_MONTHLY',
    enableStripe,
    'Missing required env var: STRIPE_PRICE_MONTHLY (required when ENABLE_STRIPE=true)',
  ),
  STRIPE_PRICE_ANNUAL: requiredWhen(
    'STRIPE_PRICE_ANNUAL',
    enableStripe,
    'Missing required env var: STRIPE_PRICE_ANNUAL (required when ENABLE_STRIPE=true)',
  ),
  STRIPE_PRODUCT_ID: requiredWhen(
    'STRIPE_PRODUCT_ID',
    enableStripe,
    'Missing required env var: STRIPE_PRODUCT_ID (required when ENABLE_STRIPE=true)',
  ),
  STRIPE_PORTAL_RETURN_URL: optional('STRIPE_PORTAL_RETURN_URL'),

  FRONTEND_SUCCESS_URL: required('FRONTEND_SUCCESS_URL'),
  FRONTEND_CANCEL_URL: required('FRONTEND_CANCEL_URL'),

  MP_API_BASE: optional('MP_API_BASE', 'https://api.mercadopago.com'),
  MP_CHILE_ACCESS_TOKEN: requiredWhen(
    'MP_CHILE_ACCESS_TOKEN',
    enableMpChile,
    'Missing required env var: MP_CHILE_ACCESS_TOKEN (required when ENABLE_MP_CHILE=true)',
  ),
  MP_CHILE_WEBHOOK_SECRET: optional('MP_CHILE_WEBHOOK_SECRET'),
  MP_ARG_ACCESS_TOKEN: requiredWhen(
    'MP_ARG_ACCESS_TOKEN',
    enableMpArgentina,
    'Missing required env var: MP_ARG_ACCESS_TOKEN (required when ENABLE_MP_ARG=true)',
  ),
  MP_ARG_WEBHOOK_SECRET: optional('MP_ARG_WEBHOOK_SECRET'),

  PRO_MONTHLY_USD: parseNumber(optional('PRO_MONTHLY_USD', '4.99'), 4.99),
  PRO_YEARLY_USD: parseNumber(optional('PRO_YEARLY_USD', '49.99'), 49.99),
  USD_RATE_CL: parseNumber(optional('USD_RATE_CL', '0'), 0),
  USD_RATE_AR: parseNumber(optional('USD_RATE_AR', '0'), 0),

  SUPABASE_URL: required('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY'),

  NATS_URL: required('NATS_URL'),

  CORS_ORIGINS: optional('CORS_ORIGINS')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean),

  SUBSCRIPTIONS_TABLE: optional('SUBSCRIPTIONS_TABLE', 'user_subscriptions'),
  PAYMENTS_WEBHOOK_EVENTS_TABLE: optional('PAYMENTS_WEBHOOK_EVENTS_TABLE', 'payments_webhook_events'),
  USER_PROFILES_TABLE: optional('USER_PROFILES_TABLE', 'user_profiles'),
  EXCHANGE_RATES_TABLE: optional('EXCHANGE_RATES_TABLE', 'exchange_rates'),
  ALLOW_DIRECT_JWT: parseBool(optional('ALLOW_DIRECT_JWT', nodeEnv !== 'production' ? 'true' : 'false')),
});
