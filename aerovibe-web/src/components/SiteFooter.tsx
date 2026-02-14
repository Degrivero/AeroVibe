import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import styles from './SiteFooter.module.css'

export function SiteFooter() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <div className={styles.brandRow}>
            <img className={styles.brandLogo} src="/assets/brand/logo.png" alt="AeroVibe" width={22} height={22} />
            <span className={styles.brandText}>AeroVibe</span>
          </div>
          <div className={styles.madeFor}>{t('footer.made_for')}</div>
        </div>

        <div className={styles.linksRow} aria-label="Footer links">
          <Link className={styles.link} to="/privacy">
            {t('footer.links.privacy')}
          </Link>
          <Link className={styles.link} to="/terms">
            {t('footer.links.terms')}
          </Link>
          <Link className={styles.link} to="/cookies">
            {t('footer.links.cookies')}
          </Link>
          <Link className={styles.link} to="/faq">
            {t('footer.links.faq')}
          </Link>
        </div>
      </div>

      <div className={styles.bottom}>
        <span>{t('footer.rights', { year })}</span>
      </div>
    </footer>
  )
}
