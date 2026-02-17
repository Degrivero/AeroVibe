import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import styles from './LegalLayout.module.css'

export function LegalLayout({
  title,
  intro,
  updatedOn,
  children,
}: {
  title: string
  intro: string
  updatedOn: string
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <article className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.h1}>{title}</h1>
        <p className={styles.updated}>{t('common.last_updated', { date: updatedOn })}</p>
        {intro ? <p className={styles.intro}>{intro}</p> : null}
      </header>
      <div className={styles.body}>{children}</div>
    </article>
  )
}
