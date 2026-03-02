import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getApiBase } from '../app/auth'
import { useMeta } from '../app/useMeta'
import styles from './ContactPage.module.css'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function ContactPage() {
  const { t } = useTranslation()
  useMeta({ title: `AeroVibe — ${t('contact.title')}` })

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('support')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName('')
    setUsername('')
    setEmail('')
    setReason('support')
    setMessage('')
    setError(null)
    setSent(false)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSent(false)

    if (!name.trim()) return setError(t('contact.errors.name_required'))
    if (!isValidEmail(email)) return setError(t('contact.errors.email_invalid'))
    if (!message.trim()) return setError(t('contact.errors.message_required'))

    const base = getApiBase()
    if (!base) return setError('Falta configurar VITE_API_BASE_URL.')
    const endpoint = `${base}/api/support/contact`

    setBusy(true)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          app_username: username.trim() || null,
          email: email.trim().toLowerCase(),
          reason: String(reason || 'support'),
          message: message.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        const msg = (data && typeof data.message === 'string' && data.message) || null
        throw new Error(msg || t('contact.errors.submit_failed'))
      }

      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('contact.errors.submit_failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.h1}>{t('contact.title')}</h1>
        <p className={styles.sub}>{t('contact.subtitle')}</p>
      </header>

      <div className={styles.body}>
        <form className={styles.form} onSubmit={onSubmit}>
          {error ? <div className={styles.alertError}>{error}</div> : null}
          {sent ? <div className={styles.alertOk}>{t('contact.success')}</div> : null}

          <label className={styles.field}>
            <span className={styles.label}>{t('contact.fields.name')}</span>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              disabled={busy}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{t('contact.fields.username')}</span>
            <input
              className={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('contact.fields.username_placeholder')}
              disabled={busy}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{t('contact.fields.email')}</span>
            <input
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              disabled={busy}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{t('contact.fields.reason')}</span>
            <select
              className={styles.select}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
            >
              <option value="support">{t('contact.reasons.support')}</option>
              <option value="bug">{t('contact.reasons.bug')}</option>
              <option value="account">{t('contact.reasons.account')}</option>
              <option value="moderation">{t('contact.reasons.moderation')}</option>
              <option value="marketplace">{t('contact.reasons.marketplace')}</option>
              <option value="other">{t('contact.reasons.other')}</option>
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{t('contact.fields.message')}</span>
            <textarea
              className={styles.textarea}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
              disabled={busy}
            />
          </label>

          <div className={styles.actions}>
            <button className={styles.cancel} type="button" onClick={reset} disabled={busy}>
              {t('contact.actions.cancel')}
            </button>
            <button className={styles.submit} type="submit" disabled={busy}>
              {busy ? t('contact.actions.sending') : t('contact.actions.submit')}
            </button>
          </div>
        </form>
      </div>
    </article>
  )
}
