import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import styles from './NotFoundPage.module.css'
import { useMeta } from '../app/useMeta'

export function NotFoundPage() {
  const { t } = useTranslation()
  useMeta({ title: `AeroVibe — ${t('not_found.title')}` })

  return (
    <div className={styles.wrap}>
      <h1 className={styles.h1}>{t('not_found.title')}</h1>
      <p className={styles.p}>{t('not_found.body')}</p>
      <Link className={styles.cta} to="/">
        {t('common.back_home')}
      </Link>
    </div>
  )
}
