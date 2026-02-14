import { useTranslation } from 'react-i18next'

import { useMeta } from '../app/useMeta'
import styles from './AboutPage.module.css'

export function AboutPage() {
  const { t } = useTranslation()
  useMeta({ title: `AeroVibe — ${t('sections.about.title')}` })

  return (
    <article className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.h1}>{t('sections.about.title')}</h1>
      </header>

      <div className={styles.body}>
        <p className={styles.p}>{t('sections.about.p1')}</p>
        <p className={styles.p}>{t('sections.about.p2')}</p>
        <p className={styles.p}>{t('sections.about.p3')}</p>
        <p className={styles.p}>{t('sections.about.p4')}</p>
        <p className={styles.p}>{t('sections.about.p5')}</p>
        <p className={styles.p}>{t('sections.about.p6')}</p>
        <p className={styles.p}>{t('sections.about.p7')}</p>
      </div>
    </article>
  )
}

