import crypto from 'crypto';

import { env } from '../lib/env.js';
import { HttpError } from '../lib/httpError.js';

function providerConfig(provider) {
  if (provider === 'mercadopago_cl') {
    if (!env.ENABLE_MP_CHILE) {
      throw new HttpError(503, 'MERCADOPAGO_CL_DISABLED', 'Mercado Pago Chile está deshabilitado.');
    }
    return {
      provider,
      accessToken: env.MP_CHILE_ACCESS_TOKEN,
      webhookSecret: env.MP_CHILE_WEBHOOK_SECRET,
      currency: 'CLP',
    };
  }

  if (provider === 'mercadopago_ar') {
    if (!env.ENABLE_MP_ARG) {
      throw new HttpError(503, 'MERCADOPAGO_AR_DISABLED', 'Mercado Pago Argentina está deshabilitado.');
    }
    return {
      provider,
      accessToken: env.MP_ARG_ACCESS_TOKEN,
      webhookSecret: env.MP_ARG_WEBHOOK_SECRET,
      currency: 'ARS',
    };
  }

  throw new HttpError(400, 'MERCADOPAGO_PROVIDER_INVALID', 'Provider de Mercado Pago inválido.');
}

function apiBase() {
  return env.MP_API_BASE.replace(/\/$/, '');
}

async function mpRequest({ provider, method, path, body }) {
  const config = providerConfig(provider);
  const url = `${apiBase()}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new HttpError(
      response.status,
      'MERCADOPAGO_API_ERROR',
      `Mercado Pago devolvió error en ${method} ${path}.`,
      {
        provider,
        status: response.status,
        payload,
      },
    );
  }

  return payload;
}

export function currencyForMercadoPagoProvider(provider) {
  return providerConfig(provider).currency;
}

export async function createMercadoPagoSubscription({
  provider,
  userId,
  email,
  plan,
  localAmount,
  currency,
  reason,
}) {
  if (!email) {
    throw new HttpError(400, 'PAYER_EMAIL_REQUIRED', 'No se encontró email del usuario para crear la suscripción.');
  }

  const frequency = plan === 'annual' ? 12 : 1;

  const payload = await mpRequest({
    provider,
    method: 'POST',
    path: '/preapproval',
    body: {
      reason,
      external_reference: userId,
      payer_email: email,
      back_url: env.FRONTEND_SUCCESS_URL,
      auto_recurring: {
        frequency,
        frequency_type: 'months',
        transaction_amount: localAmount,
        currency_id: currency,
      },
      status: 'pending',
    },
  });

  const initPoint = String(payload?.init_point ?? payload?.sandbox_init_point ?? '').trim();
  if (!initPoint) {
    throw new HttpError(
      502,
      'MERCADOPAGO_INIT_POINT_MISSING',
      'Mercado Pago no devolvió init_point para el checkout.',
      { provider, payload },
    );
  }

  return {
    id: String(payload?.id ?? '').trim() || null,
    initPoint,
    status: String(payload?.status ?? '').trim() || null,
    nextPaymentDate: payload?.next_payment_date ?? null,
    autoRecurring: payload?.auto_recurring ?? null,
  };
}

export async function getMercadoPagoSubscription(provider, preapprovalId) {
  if (!preapprovalId) {
    throw new HttpError(400, 'MERCADOPAGO_PREAPPROVAL_ID_REQUIRED', 'Falta preapproval_id para consultar suscripción.');
  }

  return mpRequest({
    provider,
    method: 'GET',
    path: `/preapproval/${encodeURIComponent(String(preapprovalId))}`,
  });
}

export function extractMercadoPagoPreapprovalId({ body, query }) {
  const bodyDataId = body?.data?.id;
  if (bodyDataId != null && String(bodyDataId).trim()) return String(bodyDataId).trim();

  const bodyResource = String(body?.resource ?? '').trim();
  if (bodyResource.includes('/preapproval/')) {
    return bodyResource.split('/preapproval/')[1]?.split('?')[0] ?? null;
  }

  const queryDataId = query?.['data.id'] ?? query?.data_id ?? query?.id;
  if (queryDataId != null && String(queryDataId).trim()) return String(queryDataId).trim();

  return null;
}

function parseSignatureHeader(rawSignature) {
  const normalized = String(rawSignature ?? '').trim();
  if (!normalized) return { ts: null, v1: null };

  const parts = normalized.split(',');
  let ts = null;
  let v1 = null;

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 'ts') ts = value ?? null;
    if (key === 'v1') v1 = value ?? null;
  }

  return { ts, v1 };
}

export function verifyMercadoPagoWebhookSignature({ provider, req, preapprovalId }) {
  const config = providerConfig(provider);
  const secret = String(config.webhookSecret ?? '').trim();
  if (!secret) return true;

  const signature = String(req.headers['x-signature'] ?? '').trim();
  const requestId = String(req.headers['x-request-id'] ?? '').trim();
  const { ts, v1 } = parseSignatureHeader(signature);

  if (!ts || !v1 || !requestId || !preapprovalId) {
    return false;
  }

  const manifest = `id:${preapprovalId};request-id:${requestId};ts:${ts};`;
  const digest = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  return digest.toLowerCase() === String(v1).toLowerCase();
}
