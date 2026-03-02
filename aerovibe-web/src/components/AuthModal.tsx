import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import styles from './AuthModal.module.css'

type Mode = 'sign_in' | 'sign_up' | 'reset'

export function AuthModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('sign_in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement | null>(null)

  const title = useMemo(() => {
    if (mode === 'sign_up') return t('auth.sign_up')
    if (mode === 'reset') return t('auth.reset')
    return t('auth.sign_in')
  }, [mode, t])

  useEffect(() => {
    // Lock scroll behind the modal.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Focus first input once mounted.
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
    if (!trimmed || !trimmed.includes('@')) return t('auth.error_email')
    if (mode === 'reset') return null
    if (!password) return t('auth.error_password')
    if (mode === 'sign_up' && password !== password2) return t('auth.error_password_match')
    return null
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const v = validate()
    if (v) {
      setError(v)
      setMessage(null)
      return
    }

    // UI-only for now. Wiring to IAM/Supabase can be added later.
    setError(null)
    setMessage(t('auth.coming_soon'))
  }

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label={t('auth.title')}>
      <div className={styles.scrim} onClick={onClose} aria-hidden="true" />

      <div className={styles.modal} role="document">
        <div className={styles.top}>
          <div className={styles.heading}>
            <div className={styles.kicker}>{t('auth.title')}</div>
            <div className={styles.h1}>{title}</div>
          </div>
          <button className={styles.close} type="button" onClick={onClose} aria-label={t('auth.close')}>
            ×
          </button>
        </div>

        <div className={styles.tabs} role="tablist" aria-label={t('auth.title')}>
          <button
            className={mode === 'sign_in' ? styles.tabActive : styles.tab}
            type="button"
            role="tab"
            aria-selected={mode === 'sign_in'}
            onClick={() => {
              setMode('sign_in')
              setError(null)
              setMessage(null)
            }}
          >
            {t('auth.sign_in')}
          </button>
          <button
            className={mode === 'sign_up' ? styles.tabActive : styles.tab}
            type="button"
            role="tab"
            aria-selected={mode === 'sign_up'}
            onClick={() => {
              setMode('sign_up')
              setError(null)
              setMessage(null)
            }}
          >
            {t('auth.sign_up')}
          </button>
          <button
            className={mode === 'reset' ? styles.tabActive : styles.tab}
            type="button"
            role="tab"
            aria-selected={mode === 'reset'}
            onClick={() => {
              setMode('reset')
              setError(null)
              setMessage(null)
            }}
          >
            {t('auth.reset')}
          </button>
        </div>

        <form className={styles.form} onSubmit={onSubmit}>
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
              required
            />
          </label>

          {mode !== 'reset' ? (
            <label className={styles.label}>
              <span className={styles.labelText}>{t('auth.password')}</span>
              <input
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete={mode === 'sign_up' ? 'new-password' : 'current-password'}
                required
              />
            </label>
          ) : null}

          {mode === 'sign_up' ? (
            <label className={styles.label}>
              <span className={styles.labelText}>{t('auth.password_confirm')}</span>
              <input
                className={styles.input}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                type="password"
                autoComplete="new-password"
                required
              />
            </label>
          ) : null}

          <button className={styles.primary} type="submit">
            {mode === 'reset' ? t('auth.send_link') : t('auth.continue')}
          </button>
        </form>
      </div>
    </div>
  )
}
