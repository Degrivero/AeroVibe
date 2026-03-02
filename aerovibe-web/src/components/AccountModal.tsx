import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  getApiBase,
  popPendingCheckoutPlan,
  type AccountModalTab,
  type AuthSession,
  writeAuthSession,
} from '../app/auth'
import { startSubscriptionCheckout } from '../app/payments'
import styles from './AccountModal.module.css'

type Mode = 'login' | 'create' | 'recover'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase())
}

function modeFromTab(tab: AccountModalTab): Mode {
  if (tab === 'create') return 'create'
  if (tab === 'recover') return 'recover'
  return 'login'
}

function formatError(payload: unknown, fallback: string) {
  if (!isRecord(payload)) return fallback
  const message = payload.message
  if (typeof message === 'string' && message.trim()) return message.trim()
  const error = payload.error
  if (typeof error === 'string' && error.trim()) return error.trim()
  return fallback
}

function mapSession(payload: unknown): AuthSession | null {
  if (!isRecord(payload)) return null
  const token =
    (typeof payload.accessToken === 'string' && payload.accessToken.trim()) ||
    (typeof payload.token === 'string' && payload.token.trim()) ||
    null

  if (!token) return null

  const refreshToken =
    typeof payload.refreshToken === 'string' && payload.refreshToken.trim()
      ? payload.refreshToken.trim()
      : null

  const userRaw = payload.user
  if (!isRecord(userRaw)) return null

  const id = typeof userRaw.id === 'string' ? userRaw.id.trim() : ''
  if (!id) return null

  const role = typeof userRaw.role === 'string' ? userRaw.role : 'user'

  return {
    accessToken: token,
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
}

export function AccountModal({
  onClose,
  initialTab = 'login',
}: {
  onClose: () => void
  initialTab?: AccountModalTab
}) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>(() => modeFromTab(initialTab))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [createdOk, setCreatedOk] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [legalAccepted, setLegalAccepted] = useState(false)
  const emailRef = useRef<HTMLInputElement | null>(null)

  const appStoreUrl = (import.meta.env.VITE_APP_STORE_URL as string | undefined) || '#'
  const googlePlayUrl = (import.meta.env.VITE_GOOGLE_PLAY_URL as string | undefined) || '#'
  const legalAcceptanceMethod = 'web_account_modal_checkbox_v1'

  const title = useMemo(() => {
    if (mode === 'login') return t('auth.sign_in')
    if (mode === 'recover') return t('nav.recover_password')
    return t('nav.create_account')
  }, [mode, t])

  function resetFeedback() {
    setError(null)
    setMessage(null)
    setCreatedOk(false)
  }

  function changeMode(nextMode: Mode) {
    if (mode !== nextMode) {
      setPassword('')
      setPassword2('')
      setLegalAccepted(false)
    }
    setMode(nextMode)
    resetFeedback()
  }

  useEffect(() => {
    changeMode(modeFromTab(initialTab))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab])

  function preferredStoreUrl() {
    if (typeof navigator === 'undefined') return null
    const ua = navigator.userAgent || ''
    const isIOS = /iPhone|iPad|iPod/i.test(ua)
    const isAndroid = /Android/i.test(ua)
    const app = appStoreUrl && appStoreUrl !== '#' ? appStoreUrl : null
    const gp = googlePlayUrl && googlePlayUrl !== '#' ? googlePlayUrl : null

    if (isIOS) return app || gp
    if (isAndroid) return gp || app
    return app || gp
  }

  function goToStore() {
    const url = preferredStoreUrl()
    if (!url) return
    window.location.assign(url)
  }

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const id = window.setTimeout(() => emailRef.current?.focus(), 0)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(id)
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const validate = () => {
    const trimmed = email.trim()
    if (!trimmed || !isValidEmail(trimmed)) return t('auth.error_email')
    if (mode === 'recover') return null
    if (!password) return t('auth.error_password')
    if (mode === 'create' && password !== password2) return t('auth.error_password_match')
    if (mode === 'create' && !legalAccepted) return t('account_modal.errors.legal_required')
    return null
  }

  async function handleLogin(payload: unknown) {
    const session = mapSession(payload)
    if (!session) {
      throw new Error(formatError(payload, t('account_modal.errors.generic')))
    }

    writeAuthSession(session)

    const pendingPlan = popPendingCheckoutPlan()
    if (!pendingPlan) {
      onClose()
      return
    }

    try {
      const checkout = await startSubscriptionCheckout({
        accessToken: session.accessToken,
        plan: pendingPlan,
      })
      if (!checkout.redirected) {
        if (checkout.message) setMessage(checkout.message)
        onClose()
      }
    } catch (checkoutError) {
      throw checkoutError instanceof Error
        ? checkoutError
        : new Error(t('account_modal.errors.checkout_after_login_failed'))
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    resetFeedback()

    const v = validate()
    if (v) {
      setError(v)
      return
    }

    const base = getApiBase()
    if (!base) {
      setError(t('account_modal.errors.missing_api_base'))
      return
    }

    setBusy(true)
    try {
      let endpoint = `${base}/api/iam/login`
      let payload: Record<string, unknown> = {
        email: email.trim().toLowerCase(),
        password,
      }

      if (mode === 'recover') {
        endpoint = `${base}/api/iam/recover`
        payload = { email: email.trim().toLowerCase() }
      } else if (mode === 'create') {
        endpoint = `${base}/api/iam/register`
        payload = {
          email: email.trim().toLowerCase(),
          password,
          legalAccepted: true,
          legalAcceptanceMethod,
          legalAcceptedAtClient: new Date().toISOString(),
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data: unknown = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(formatError(data, t('account_modal.errors.generic')))
      }

      if (mode === 'recover') {
        setMessage(t('account_modal.recover_ok'))
        return
      }

      if (mode === 'create') {
        setPassword('')
        setPassword2('')
        setLegalAccepted(false)
        setCreatedOk(true)
        return
      }

      await handleLogin(data)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('account_modal.errors.generic'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label={t('nav.account')}>
      <div className={styles.scrim} onClick={onClose} aria-hidden="true" />

      <div className={styles.modal} role="document">
        <div className={styles.top}>
          <div className={styles.heading}>
            <div className={styles.kicker}>AeroVibe</div>
            <div className={styles.h1}>{t('nav.account')}</div>
            <div className={styles.sub}>{t('account_modal.subtitle')}</div>
          </div>
          <button className={styles.close} type="button" onClick={onClose} aria-label={t('auth.close')}>
            ×
          </button>
        </div>

        <div className={styles.tabs} role="tablist" aria-label={t('nav.account')}>
          <button
            className={mode === 'login' ? styles.tabActive : styles.tab}
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            onClick={() => changeMode('login')}
          >
            {t('auth.sign_in')}
          </button>
          <button
            className={mode === 'create' ? styles.tabActive : styles.tab}
            type="button"
            role="tab"
            aria-selected={mode === 'create'}
            onClick={() => changeMode('create')}
          >
            {t('nav.create_account')}
          </button>
          <button
            className={mode === 'recover' ? styles.tabActive : styles.tab}
            type="button"
            role="tab"
            aria-selected={mode === 'recover'}
            onClick={() => changeMode('recover')}
          >
            {t('nav.recover_password')}
          </button>
        </div>

        <form className={styles.form} onSubmit={onSubmit} aria-label={title}>
          {error ? <div className={styles.alertError}>{error}</div> : null}
          {message ? <div className={styles.alertOk}>{message}</div> : null}

          <label className={styles.label}>
            <span className={styles.labelText}>{t('auth.email')}</span>
            <input
              ref={emailRef}
              className={styles.input}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              disabled={busy}
              required
            />
          </label>

          {mode !== 'recover' ? (
            <label className={styles.label}>
              <span className={styles.labelText}>{t('auth.password')}</span>
              <input
                className={styles.input}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                disabled={busy}
                required
              />
            </label>
          ) : null}

          {mode === 'create' ? (
            <>
              <label className={styles.label}>
                <span className={styles.labelText}>{t('auth.password_confirm')}</span>
                <input
                  className={styles.input}
                  value={password2}
                  onChange={(event) => setPassword2(event.target.value)}
                  type="password"
                  autoComplete="new-password"
                  disabled={busy}
                  required
                />
              </label>

              <label className={styles.legalRow}>
                <input
                  className={styles.legalCheck}
                  type="checkbox"
                  checked={legalAccepted}
                  onChange={(event) => setLegalAccepted(event.target.checked)}
                  disabled={busy}
                />
                <span className={styles.legalText}>
                  {t('account_modal.legal.prefix')}{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer">
                    {t('account_modal.legal.terms_link')}
                  </a>{' '}
                  {t('account_modal.legal.middle')}{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer">
                    {t('account_modal.legal.privacy_link')}
                  </a>
                </span>
              </label>
            </>
          ) : null}

          <button className={styles.primary} type="submit" disabled={busy}>
            {busy
              ? `${mode === 'recover' ? t('auth.send_link') : title}…`
              : mode === 'recover'
                ? t('auth.send_link')
                : title}
          </button>
        </form>

        {createdOk ? (
          <div
            className={styles.successOverlay}
            role="alertdialog"
            aria-modal="true"
            aria-label={t('account_modal.created_title')}
          >
            <div className={styles.successCard}>
              <div className={styles.successTitle}>{t('account_modal.created_title')}</div>
              <div className={styles.successBody}>{t('account_modal.create_ok')}</div>
              <div className={styles.successActions}>
                <button
                  className={styles.secondary}
                  type="button"
                  onClick={() => {
                    setCreatedOk(false)
                    onClose()
                  }}
                >
                  {t('account_modal.created_accept')}
                </button>
                <button
                  className={styles.primary}
                  type="button"
                  onClick={() => {
                    setCreatedOk(false)
                    onClose()
                    goToStore()
                  }}
                >
                  {t('account_modal.created_go_store')}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
