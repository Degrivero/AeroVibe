import { useTranslation } from 'react-i18next'

import { useMeta } from '../app/useMeta'
import styles from './FaqPage.module.css'

type FaqItem = { q: string; a: string }

export function FaqPage() {
  const { t } = useTranslation()
  useMeta({ title: `AeroVibe — ${t('faq.title')}` })

  const items = t('faq.items', { returnObjects: true }) as FaqItem[]

  return (
    <article className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.h1}>{t('faq.title')}</h1>
        <p className={styles.sub}>{t('faq.subtitle')}</p>
      </header>

      <div className={styles.list}>
        {items.map((item) => (
          <details key={item.q} className={styles.item}>
            <summary className={styles.summary}>{item.q}</summary>
            <div className={styles.answer}>{item.a}</div>
          </details>
        ))}
      </div>
    </article>
  )
}

