import { useEffect } from 'react'
import { Link, Outlet, useLocation, useRouteError } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import styles from './RootLayout.module.css'
import { SiteHeader } from './SiteHeader'
import { SiteFooter } from './SiteFooter'
import { CookieConsent } from './CookieConsent'

function RouteErrorView({ error }: { error: unknown }) {
  const { t } = useTranslation()
  return (
    <div className={styles.routeError}>
      <h1>{t('not_found.title')}</h1>
      <p className={styles.routeErrorBody}>{t('not_found.body')}</p>
      <Link className={styles.routeErrorCta} to="/">
        {t('common.back_home')}
      </Link>
      {import.meta.env.DEV ? (
        <pre className={styles.routeErrorPre}>
          {typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error)}
        </pre>
      ) : null}
    </div>
  )
}

export function RootLayout({ isError }: { isError?: boolean }) {
  const location = useLocation()
  const error = useRouteError()

  useEffect(() => {
    const hash = location.hash?.replace('#', '')
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const el = document.getElementById(hash)
    if (el) {
      const header = document.querySelector('header')
      const headerH = header instanceof HTMLElement ? header.getBoundingClientRect().height : 0
      const extra = 14
      const top = el.getBoundingClientRect().top + window.scrollY - headerH - extra
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    }
  }, [location.pathname, location.hash])

  return (
    <div className={styles.app}>
      <SiteHeader />
      <main className={styles.main}>
        {isError ? <RouteErrorView error={error} /> : <Outlet />}
      </main>
      <SiteFooter />
      <CookieConsent />
    </div>
  )
}
