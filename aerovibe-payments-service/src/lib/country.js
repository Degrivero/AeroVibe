const COUNTRY_ALIASES = new Map([
  ['cl', 'CL'],
  ['chile', 'CL'],
  ['republica de chile', 'CL'],
  ['republic of chile', 'CL'],

  ['ar', 'AR'],
  ['argentina', 'AR'],
  ['republica argentina', 'AR'],
  ['republic of argentina', 'AR'],
]);

export function normalizeCountryCode(rawValue) {
  const raw = String(rawValue ?? '').trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  if (upper === 'CL' || upper === 'AR') return upper;

  const normalized = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return COUNTRY_ALIASES.get(normalized) ?? null;
}

export function countryCodeToCurrency(countryCode) {
  if (countryCode === 'CL') return 'CLP';
  if (countryCode === 'AR') return 'ARS';
  return null;
}

export function countryCodeToProvider(countryCode) {
  if (countryCode === 'CL') return 'mercadopago_cl';
  if (countryCode === 'AR') return 'mercadopago_ar';
  return null;
}
