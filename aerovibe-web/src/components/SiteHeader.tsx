import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import styles from './SiteHeader.module.css'
import { setLang, type SupportedLang } from '../app/i18n'
import { useTheme } from '../app/theme'
import { AuthModal } from './AuthModal'

function IconSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 13.2A7.8 7.8 0 0 1 10.8 3a6.9 6.9 0 1 0 10.2 10.2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconMenu() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconGlobe() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M2 12h20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 2c2.6 2.6 4 6 4 10s-1.4 7.4-4 10c-2.6-2.6-4-6-4-10s1.4-7.4 4-10Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  )
}

function ThemeButton({ label }: { label: string }) {
  const { theme, toggle } = useTheme()
  return (
    <button
      className={styles.iconBtn}
      type="button"
      onClick={toggle}
      aria-label={label}
    >
      {theme === 'dark' ? <IconSun /> : <IconMoon />}
    </button>
  )
}

function LangMenu() {
  const { i18n, t } = useTranslation()
  const value = (i18n.resolvedLanguage || i18n.language || 'en').slice(0, 2) as SupportedLang
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    const onPointerDown = (e: PointerEvent) => {
      const el = wrapRef.current
      if (!el) return
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  const options: Array<{ lang: SupportedLang; label: string }> = [
    { lang: 'es', label: '🇪🇸 ES' },
    { lang: 'en', label: '🇺🇸 EN' },
    { lang: 'pt', label: '🇧🇷 PT' },
  ]

  return (
    <div className={styles.tipWrap} data-tip={t('nav.language')} data-open={open ? 'true' : 'false'}>
      <div className={styles.langWrap} ref={wrapRef}>
        <button
          className={styles.langBtn}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={t('nav.language')}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <IconGlobe />
        </button>

        {open ? (
          <div className={styles.langMenu} role="listbox" aria-label={t('nav.language')}>
            {options.map((opt) => (
              <button
                key={opt.lang}
                className={value === opt.lang ? styles.langOptionActive : styles.langOption}
                type="button"
                role="option"
                aria-selected={value === opt.lang}
                onClick={() => {
                  setLang(opt.lang)
                  setOpen(false)
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function HeaderNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  const location = useLocation()

  const homeTo = useMemo(() => {
    // Preserve hash navigation when already on home.
    const isHome = location.pathname === '/'
    return (hash: string) => (isHome ? hash : `/${hash}`)
  }, [location.pathname])

  return (
    <nav className={styles.nav} aria-label="Primary">
      <NavLink to={homeTo('#features')} className={styles.navLink} onClick={onNavigate}>
        {t('nav.features')}
      </NavLink>
      <NavLink to={homeTo('#pricing')} className={styles.navLink} onClick={onNavigate}>
        {t('nav.pricing')}
      </NavLink>
      <NavLink to="/about" className={styles.navLink} onClick={onNavigate}>
        {t('nav.about')}
      </NavLink>
    </nav>
  )
}

export function SiteHeader() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link className={styles.brand} to="/" onClick={() => setOpen(false)}>
            <img className={styles.brandLogo} src="/assets/brand/logo.png" alt="AeroVibe" width={26} height={26} />
            <span className={styles.brandText}>AeroVibe</span>
          </Link>

          <div className={styles.desktopOnly}>
            <HeaderNav />
          </div>

          <div className={styles.actions}>
            <div className={styles.actionLinks} aria-label={t('nav.quick_links')}>
              <button className={styles.actionLinkDisabled} type="button" disabled aria-disabled="true">
                {t('nav.shop')}
                <span className={styles.actionSoon}>{t('nav.coming_soon')}</span>
              </button>
              <button className={styles.actionLink} type="button" onClick={() => setAuthOpen(true)}>
                {t('nav.sign_in')}
              </button>
            </div>
            <LangMenu />
            <div className={styles.tipWrap} data-tip={t('nav.theme')}>
              <ThemeButton label={t('nav.theme')} />
            </div>
            <button
              className={styles.menuBtn}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? t('nav.close_menu') : t('nav.open_menu')}
              aria-expanded={open}
            >
              {open ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>

        {open ? (
          <div className={styles.mobilePanel}>
            <HeaderNav onNavigate={() => setOpen(false)} />
            <div className={styles.mobileLegal}>
              <Link className={styles.legalLink} to="/privacy" onClick={() => setOpen(false)}>
                {t('nav.privacy')}
              </Link>
              <Link className={styles.legalLink} to="/terms" onClick={() => setOpen(false)}>
                {t('nav.terms')}
              </Link>
              <Link className={styles.legalLink} to="/cookies" onClick={() => setOpen(false)}>
                {t('nav.cookies')}
              </Link>
              <Link className={styles.legalLink} to="/faq" onClick={() => setOpen(false)}>
                {t('footer.links.faq')}
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      {authOpen ? <AuthModal onClose={() => setAuthOpen(false)} /> : null}
    </>
  )
}
