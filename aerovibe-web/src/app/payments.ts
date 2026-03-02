import { getApiBase, type CheckoutPlan } from './auth'

export type SubscriptionStatus = {
  provider: string | null
  status: string | null
  priceId: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!isRecord(payload)) return fallback

  const message = payload.message
  if (typeof message === 'string' && message.trim()) return message.trim()

  const error = payload.error
  if (typeof error === 'string' && error.trim()) return error.trim()

  const code = payload.code
  if (typeof code === 'string' && code.trim()) return code.trim()

  return fallback
}

function normalizeBase(raw: string) {
  const trimmed = String(raw || '').trim().replace(/\/$/, '')
  if (!trimmed) return ''
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed
}

function paymentsEndpoint(path: string) {
  const directRaw = ((import.meta.env.VITE_PAYMENTS_BASE_URL as string | undefined) || '').trim()
  if (directRaw) {
    const direct = directRaw.replace(/\/$/, '')
    return `${direct}${path}`
  }

  const apiBase = normalizeBase(getApiBase())
  if (!apiBase) return ''
  return `${apiBase}/api${path}`
}

type AuthedRequest = {
  method: 'GET' | 'POST'
  path: string
  accessToken: string
  body?: Record<string, unknown>
}

async function requestJson({ method, path, accessToken, body }: AuthedRequest) {
  const endpoint = paymentsEndpoint(path)
  if (!endpoint) {
    throw new Error('Falta configurar VITE_API_BASE_URL o VITE_PAYMENTS_BASE_URL.')
  }

  const res = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
  })

  const payload: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(extractErrorMessage(payload, 'No pudimos completar la operación de suscripción.'))
  }

  return payload
}

export async function startSubscriptionCheckout({
  accessToken,
  plan,
}: {
  accessToken: string
  plan: CheckoutPlan
}) {
  const payload = await requestJson({
    method: 'POST',
    path: '/payments/subscription/checkout',
    accessToken,
    body: { plan },
  })

  if (isRecord(payload) && typeof payload.url === 'string' && payload.url.trim()) {
    window.location.assign(payload.url)
    return { redirected: true, message: null as string | null }
  }

  const message =
    isRecord(payload) && typeof payload.message === 'string' && payload.message.trim()
      ? payload.message.trim()
      : null

  return { redirected: false, message }
}

export async function getSubscriptionStatus(accessToken: string): Promise<SubscriptionStatus | null> {
  const payload = await requestJson({
    method: 'GET',
    path: '/payments/subscription/status',
    accessToken,
  })

  if (!isRecord(payload) || !isRecord(payload.subscription)) return null
  const subscription = payload.subscription

  return {
    provider: typeof subscription.provider === 'string' ? subscription.provider : null,
    status: typeof subscription.status === 'string' ? subscription.status : null,
    priceId: typeof subscription.priceId === 'string' ? subscription.priceId : null,
    currentPeriodEnd:
      typeof subscription.currentPeriodEnd === 'string' ? subscription.currentPeriodEnd : null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd === true,
  }
}

export async function openStripePortal(accessToken: string) {
  const payload = await requestJson({
    method: 'POST',
    path: '/payments/subscription/portal',
    accessToken,
  })

  if (!isRecord(payload) || typeof payload.url !== 'string' || !payload.url.trim()) {
    throw new Error('No se pudo abrir el portal de suscripción.')
  }

  window.location.assign(payload.url)
}

// Backward compatibility exports while migrating callers.
export type StripeSubscriptionStatus = SubscriptionStatus

export async function startStripeCheckout({ accessToken, priceId }: { accessToken: string; priceId: string }) {
  const normalized = String(priceId ?? '').trim().toLowerCase().includes('annual') ? 'annual' : 'monthly'
  return startSubscriptionCheckout({ accessToken, plan: normalized })
}

export async function getStripeSubscriptionStatus(accessToken: string) {
  return getSubscriptionStatus(accessToken)
}
