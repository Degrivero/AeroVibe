import { env } from '../lib/env.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { HttpError } from '../lib/httpError.js';

const EXCHANGE_RATES_TABLE = env.EXCHANGE_RATES_TABLE;

const BASE_PRICE_USD = Object.freeze({
  monthly: env.PRO_MONTHLY_USD,
  annual: env.PRO_YEARLY_USD,
});

function fallbackRateByCountry(countryCode) {
  if (countryCode === 'CL' && env.USD_RATE_CL > 0) return env.USD_RATE_CL;
  if (countryCode === 'AR' && env.USD_RATE_AR > 0) return env.USD_RATE_AR;
  return null;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeNumericRate(rawRate) {
  const rate = Number(rawRate);
  if (!Number.isFinite(rate) || rate <= 0) {
    return null;
  }
  return rate;
}

export function normalizePlan(planRaw) {
  const normalized = String(planRaw ?? '').trim().toLowerCase();
  if (normalized === 'monthly' || normalized === 'month') return 'monthly';
  if (normalized === 'annual' || normalized === 'yearly' || normalized === 'year') return 'annual';
  return null;
}

export function resolvePlan({ plan, priceId }) {
  const normalizedPlan = normalizePlan(plan);
  if (normalizedPlan) return normalizedPlan;

  const normalizedPriceId = String(priceId ?? '').trim();
  if (!normalizedPriceId) return null;
  if (normalizedPriceId === env.STRIPE_PRICE_MONTHLY) return 'monthly';
  if (normalizedPriceId === env.STRIPE_PRICE_ANNUAL) return 'annual';
  return null;
}

export function basePriceForPlan(plan) {
  if (plan === 'monthly') return BASE_PRICE_USD.monthly;
  if (plan === 'annual') return BASE_PRICE_USD.annual;
  throw new HttpError(400, 'PLAN_INVALID', 'Plan inválido. Debe ser monthly o annual.');
}

export function buildRateSummary(countryCode, usdRate) {
  const monthlyUsd = BASE_PRICE_USD.monthly;
  const annualUsd = BASE_PRICE_USD.annual;
  return {
    country: countryCode,
    usd_rate: usdRate,
    monthly_usd: monthlyUsd,
    annual_usd: annualUsd,
    monthly_local: Math.round(monthlyUsd * usdRate),
    annual_local: Math.round(annualUsd * usdRate),
  };
}

export async function getUsdRateByCountry(countryCode) {
  const { data, error } = await supabaseAdmin
    .from(EXCHANGE_RATES_TABLE)
    .select('usd_rate')
    .eq('country_code', countryCode)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, 'EXCHANGE_RATE_FETCH_ERROR', error.message);
  }

  const fromDb = normalizeNumericRate(data?.usd_rate);
  if (fromDb != null) return fromDb;

  const fallback = fallbackRateByCountry(countryCode);
  if (fallback != null) return fallback;

  throw new HttpError(
    409,
    'EXCHANGE_RATE_NOT_CONFIGURED',
    `No hay tasa USD configurada para ${countryCode}.`,
    { countryCode },
  );
}

export async function getAllConfiguredRates() {
  const { data, error } = await supabaseAdmin
    .from(EXCHANGE_RATES_TABLE)
    .select('country_code, usd_rate, updated_at, updated_by')
    .in('country_code', ['CL', 'AR']);

  if (error) {
    throw new HttpError(500, 'EXCHANGE_RATE_FETCH_ERROR', error.message);
  }

  const byCountry = new Map();
  for (const row of data ?? []) {
    byCountry.set(String(row.country_code).toUpperCase(), {
      country: String(row.country_code).toUpperCase(),
      usd_rate: Number(row.usd_rate),
      updated_at: row.updated_at ?? null,
      updated_by: row.updated_by ?? null,
      monthly_local: Math.round(BASE_PRICE_USD.monthly * Number(row.usd_rate)),
      annual_local: Math.round(BASE_PRICE_USD.annual * Number(row.usd_rate)),
    });
  }

  for (const countryCode of ['CL', 'AR']) {
    if (!byCountry.has(countryCode)) {
      const fallback = fallbackRateByCountry(countryCode);
      if (fallback != null) {
        byCountry.set(countryCode, {
          country: countryCode,
          usd_rate: fallback,
          updated_at: null,
          updated_by: null,
          monthly_local: Math.round(BASE_PRICE_USD.monthly * fallback),
          annual_local: Math.round(BASE_PRICE_USD.annual * fallback),
        });
      }
    }
  }

  return ['CL', 'AR']
    .filter((countryCode) => byCountry.has(countryCode))
    .map((countryCode) => byCountry.get(countryCode));
}

export async function updateExchangeRates({ clRate, arRate, updatedBy }) {
  const normalizedClRate = normalizeNumericRate(clRate);
  const normalizedArRate = normalizeNumericRate(arRate);

  if (normalizedClRate == null || normalizedArRate == null) {
    throw new HttpError(
      400,
      'EXCHANGE_RATE_INVALID',
      'Las tasas USD deben ser numéricas y mayores a 0.',
      {
        clRate,
        arRate,
      },
    );
  }

  const payload = [
    {
      country_code: 'CL',
      usd_rate: normalizedClRate,
      updated_at: nowIso(),
      updated_by: updatedBy,
    },
    {
      country_code: 'AR',
      usd_rate: normalizedArRate,
      updated_at: nowIso(),
      updated_by: updatedBy,
    },
  ];

  const { error } = await supabaseAdmin
    .from(EXCHANGE_RATES_TABLE)
    .upsert(payload, { onConflict: 'country_code' });

  if (error) {
    throw new HttpError(500, 'EXCHANGE_RATE_UPDATE_ERROR', error.message);
  }

  return {
    ok: true,
    updated_at: nowIso(),
    base_prices_usd: {
      monthly: BASE_PRICE_USD.monthly,
      annual: BASE_PRICE_USD.annual,
    },
    countries: [
      buildRateSummary('CL', normalizedClRate),
      buildRateSummary('AR', normalizedArRate),
    ],
  };
}
