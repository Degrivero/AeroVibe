import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import styles from './CookieConsent.module.css'

const STORAGE_KEY = 'aerovibe_cookie_consent_v1'

function getInitialVisible() {
  // SSR-safety (even though we are client-only today).
  if (typeof window === 'undefined') return false
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return !v
  } catch {
    // If storage is blocked, show banner anyway.
    return true
  }
}

export function CookieConsent() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(getInitialVisible)

  if (!visible) return null

  const setChoice = (choice: 'accepted' | 'rejected') => {
    try {
      localStorage.setItem(STORAGE_KEY, choice)
    } catch {
      // ignore
    }
    setVisible(false)
  }

  return (
    <div className={styles.wrap} role="dialog" aria-live="polite" aria-label={t('cookie.title')}>
      <div className={styles.card}>
        <div className={styles.text}>
          <div className={styles.title}>{t('cookie.title')}</div>
          <div className={styles.body}>
            {t('cookie.message')}{' '}
            <Link className={styles.link} to="/cookies">
              {t('cookie.learn_more')}
            </Link>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.reject} type="button" onClick={() => setChoice('rejected')}>
            {t('cookie.reject')}
          </button>
          <button className={styles.accept} type="button" onClick={() => setChoice('accepted')}>
            {t('cookie.accept')}
          </button>
        </div>
      </div>
    </div>
  )
}
