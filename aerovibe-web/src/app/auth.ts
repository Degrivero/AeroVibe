export type AuthUser = {
  id: string
  email: string | null
  role: string
  firstName: string | null
  lastName: string | null
  nickname: string | null
  createdAt: string | null
}

export type AuthSession = {
  accessToken: string
  refreshToken: string | null
  user: AuthUser
}

export type AccountModalTab = 'login' | 'create' | 'recover'
export type CheckoutPlan = 'monthly' | 'annual'

type AccountModalOpenDetail = {
  tab?: AccountModalTab
}

const AUTH_STORAGE_KEY = 'aerovibe_web_auth_session_v1'
const AUTH_EVENT = 'aerovibe:auth-session-changed'
const OPEN_ACCOUNT_MODAL_EVENT = 'aerovibe:open-account-modal'
const PENDING_CHECKOUT_PLAN_KEY = 'aerovibe_web_pending_checkout_plan_v2'
const LEGACY_PENDING_CHECKOUT_PRICE_KEY = 'aerovibe_web_pending_checkout_price_id_v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseSession(raw: string | null): AuthSession | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return null

    const accessToken = typeof parsed.accessToken === 'string' ? parsed.accessToken.trim() : ''
    if (!accessToken) return null

    const refreshTokenRaw = parsed.refreshToken
    const refreshToken =
      typeof refreshTokenRaw === 'string' && refreshTokenRaw.trim() ? refreshTokenRaw.trim() : null

    const userRaw = parsed.user
    if (!isRecord(userRaw)) return null
    const id = typeof userRaw.id === 'string' ? userRaw.id.trim() : ''
    const role = typeof userRaw.role === 'string' ? userRaw.role.trim() : 'user'
    if (!id) return null

    return {
      accessToken,
      refreshToken,
      user: {
        id,
        email: typeof userRaw.email === 'string' ? userRaw.email : null,
        role: role || 'user',
        firstName: typeof userRaw.firstName === 'string' ? userRaw.firstName : null,
        lastName: typeof userRaw.lastName === 'string' ? userRaw.lastName : null,
        nickname: typeof userRaw.nickname === 'string' ? userRaw.nickname : null,
        createdAt: typeof userRaw.createdAt === 'string' ? userRaw.createdAt : null,
      },
    }
  } catch {
    return null
  }
}

function emitAuthChange() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(AUTH_EVENT))
}

export function getApiBase() {
  const raw = ((import.meta.env.VITE_API_BASE_URL as string | undefined) || '').trim()
  const trimmed = raw.replace(/\/$/, '')
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed
}

export function readAuthSession(): AuthSession | null {
  if (typeof window === 'undefined') return null
  return parseSession(window.localStorage.getItem(AUTH_STORAGE_KEY))
}

export function writeAuthSession(next: AuthSession) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next))
  emitAuthChange()
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
  emitAuthChange()
}

export function onAuthSessionChange(callback: () => void) {
  if (typeof window === 'undefined') return () => {}

  const onChange = () => callback()
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === AUTH_STORAGE_KEY) callback()
  }

  window.addEventListener(AUTH_EVENT, onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(AUTH_EVENT, onChange)
    window.removeEventListener('storage', onStorage)
  }
}

export function openAccountModal(tab?: AccountModalTab) {
  if (typeof window === 'undefined') return
  const detail: AccountModalOpenDetail = tab ? { tab } : {}
  window.dispatchEvent(new CustomEvent<AccountModalOpenDetail>(OPEN_ACCOUNT_MODAL_EVENT, { detail }))
}

export function onAccountModalOpen(callback: (detail: AccountModalOpenDetail) => void) {
  if (typeof window === 'undefined') return () => {}

  const handler = (event: Event) => {
    const custom = event as CustomEvent<AccountModalOpenDetail>
    callback(custom.detail ?? {})
  }

  window.addEventListener(OPEN_ACCOUNT_MODAL_EVENT, handler as EventListener)
  return () => window.removeEventListener(OPEN_ACCOUNT_MODAL_EVENT, handler as EventListener)
}

function normalizeCheckoutPlan(raw: string): CheckoutPlan | null {
  const normalized = String(raw ?? '').trim().toLowerCase()
  if (normalized === 'monthly') return 'monthly'
  if (normalized === 'annual') return 'annual'
  return null
}

export function setPendingCheckoutPlan(plan: CheckoutPlan) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(PENDING_CHECKOUT_PLAN_KEY, plan)
  window.sessionStorage.removeItem(LEGACY_PENDING_CHECKOUT_PRICE_KEY)
}

export function getPendingCheckoutPlan(): CheckoutPlan | null {
  if (typeof window === 'undefined') return null

  const plan = normalizeCheckoutPlan(String(window.sessionStorage.getItem(PENDING_CHECKOUT_PLAN_KEY) ?? ''))
  if (plan) return plan

  const legacy = String(window.sessionStorage.getItem(LEGACY_PENDING_CHECKOUT_PRICE_KEY) ?? '').trim()
  if (!legacy) return null

  // Compatibilidad: migrar values históricos basados en Stripe price IDs.
  const asAnnual = /annual|year/i.test(legacy)
  return asAnnual ? 'annual' : 'monthly'
}

export function popPendingCheckoutPlan(): CheckoutPlan | null {
  const value = getPendingCheckoutPlan()
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(PENDING_CHECKOUT_PLAN_KEY)
    window.sessionStorage.removeItem(LEGACY_PENDING_CHECKOUT_PRICE_KEY)
  }
  return value
}

// Backward compatibility wrappers.
export function setPendingCheckoutPriceId(priceId: string) {
  const normalized = normalizeCheckoutPlan(priceId)
  if (normalized) {
    setPendingCheckoutPlan(normalized)
    return
  }

  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(LEGACY_PENDING_CHECKOUT_PRICE_KEY, String(priceId || '').trim())
}

export function getPendingCheckoutPriceId() {
  return getPendingCheckoutPlan()
}

export function popPendingCheckoutPriceId() {
  return popPendingCheckoutPlan()
}
