import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useMeta } from '../app/useMeta'
import styles from './ResetPasswordPage.module.css'

function apiBase() {
  const raw = ((import.meta.env.VITE_API_BASE_URL as string | undefined) || '').trim()
  const trimmed = raw.replace(/\/$/, '')
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed
}

function parseAccessToken(hash: string, search: string) {
  const hashParams = new URLSearchParams(String(hash || '').replace(/^#/, ''))
  const searchParams = new URLSearchParams(String(search || '').replace(/^\?/, ''))

  return (
    hashParams.get('access_token') ||
    hashParams.get('accessToken') ||
    searchParams.get('access_token') ||
    searchParams.get('accessToken') ||
    null
  )
}

export function ResetPasswordPage() {
  const { t } = useTranslation()
  useMeta({ title: `AeroVibe — ${t('reset_password.meta_title')}`, description: t('reset_password.meta_description') })

  const location = useLocation()
  const accessToken = useMemo(() => parseAccessToken(location.hash, location.search), [location.hash, location.search])

  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')

  const appStoreUrl = (import.meta.env.VITE_APP_STORE_URL as string | undefined) || '#'
  const googlePlayUrl = (import.meta.env.VITE_GOOGLE_PLAY_URL as string | undefined) || '#'

  function preferredStoreUrl() {
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
    // Strip tokens from the URL (they often come in the hash).
    if (!location.hash) return
    const params = new URLSearchParams(location.hash.replace(/^#/, ''))
    if (!params.get('access_token') && !params.get('accessToken')) return
    window.history.replaceState(null, '', `${location.pathname}${location.search}`)
  }, [location.hash, location.pathname, location.search])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!accessToken) return setError(t('reset_password.errors.missing_token'))
    if (!password) return setError(t('auth.error_password'))
    if (password !== password2) return setError(t('auth.error_password_match'))

    const base = apiBase()
    if (!base) return setError(t('account_modal.errors.missing_api_base'))

    setBusy(true)
    try {
      const res = await fetch(`${base}/api/iam/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, newPassword: password }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          (data && typeof data.message === 'string' && data.message) ||
          (data && typeof data.error === 'string' && data.error) ||
          null
        throw new Error(msg || t('reset_password.errors.generic'))
      }

      setDone(true)
      setPassword('')
      setPassword2('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reset_password.errors.generic'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className={styles.wrap}>
      <header className={styles.header}>
        <Link className={styles.homeLink} to="/">
          ← {t('common.home')}
        </Link>
        <h1 className={styles.h1}>{t('reset_password.title')}</h1>
        <p className={styles.sub}>{t('reset_password.subtitle')}</p>
      </header>

      <div className={styles.body}>
        {done ? (
          <div className={styles.card}>
            <div className={styles.alertOk}>{t('reset_password.success')}</div>
            <div className={styles.actions}>
              <button className={styles.secondary} type="button" onClick={() => goToStore()}>
                {t('reset_password.go_store')}
              </button>
              <Link className={styles.linkBtn} to="/">
                {t('common.back_home')}
              </Link>
            </div>
          </div>
        ) : (
          <form className={styles.card} onSubmit={onSubmit}>
            {error ? <div className={styles.alertError}>{error}</div> : null}
            {!accessToken ? <div className={styles.alertError}>{t('reset_password.errors.missing_token')}</div> : null}

            <label className={styles.field}>
              <span className={styles.label}>{t('auth.password')}</span>
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

            <label className={styles.field}>
              <span className={styles.label}>{t('auth.password_confirm')}</span>
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

            <div className={styles.actions}>
              <button className={styles.submit} type="submit" disabled={busy || !accessToken}>
                {busy ? t('reset_password.actions.saving') : t('reset_password.actions.submit')}
              </button>
            </div>
          </form>
        )}
      </div>
    </article>
  )
}

