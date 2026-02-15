import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import styles from './AccountModal.module.css'

type Mode = 'create' | 'recover'

function apiBase() {
  const raw = ((import.meta.env.VITE_API_BASE_URL as string | undefined) || '').trim()
  const trimmed = raw.replace(/\/$/, '')
  // Avoid common misconfig: people set base like "https://gateway.../api".
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase())
}

export function AccountModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('create')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const emailRef = useRef<HTMLInputElement | null>(null)

  const title = useMemo(() => {
    return mode === 'recover' ? t('nav.recover_password') : t('nav.create_account')
  }, [mode, t])

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
    if (password !== password2) return t('auth.error_password_match')
    return null
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    const v = validate()
    if (v) {
      setError(v)
      return
    }

    const base = apiBase()
    if (!base) {
      setError(t('account_modal.errors.missing_api_base'))
      return
    }

    setBusy(true)
    try {
      const endpoint =
        mode === 'recover' ? `${base}/api/iam/recover` : `${base}/api/iam/register`

      const payload =
        mode === 'recover'
          ? { email: email.trim().toLowerCase() }
          : { email: email.trim().toLowerCase(), password }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          (data && typeof data.message === 'string' && data.message) ||
          (data && typeof data.error === 'string' && data.error) ||
          null
        throw new Error(msg || t('account_modal.errors.generic'))
      }

      if (mode === 'recover') {
        setMessage(t('account_modal.recover_ok'))
      } else {
        setPassword('')
        setPassword2('')
        setMessage(t('account_modal.create_ok'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('account_modal.errors.generic'))
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
            className={mode === 'create' ? styles.tabActive : styles.tab}
            type="button"
            role="tab"
            aria-selected={mode === 'create'}
            onClick={() => {
              setMode('create')
              setError(null)
              setMessage(null)
            }}
          >
            {t('nav.create_account')}
          </button>
          <button
            className={mode === 'recover' ? styles.tabActive : styles.tab}
            type="button"
            role="tab"
            aria-selected={mode === 'recover'}
            onClick={() => {
              setMode('recover')
              setError(null)
              setMessage(null)
            }}
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
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              disabled={busy}
              required
            />
          </label>

          {mode === 'create' ? (
            <>
              <label className={styles.label}>
                <span className={styles.labelText}>{t('auth.password')}</span>
                <input
                  className={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  disabled={busy}
                  required
                />
              </label>

              <label className={styles.label}>
                <span className={styles.labelText}>{t('auth.password_confirm')}</span>
                <input
                  className={styles.input}
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  disabled={busy}
                  required
                />
              </label>
            </>
          ) : null}

          <button className={styles.primary} type="submit" disabled={busy}>
            {busy
              ? `${mode === 'recover' ? t('auth.send_link') : t('nav.create_account')}…`
              : mode === 'recover'
                ? t('auth.send_link')
                : t('nav.create_account')}
          </button>
        </form>
      </div>
    </div>
  )
}
