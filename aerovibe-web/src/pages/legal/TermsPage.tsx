import { useTranslation } from 'react-i18next'

import { useMeta } from '../../app/useMeta'
import { LegalLayout } from './LegalLayout'
import styles from './LegalLayout.module.css'

const UPDATED_ON = '2026-02-14'

export function TermsPage() {
  const { t } = useTranslation()
  useMeta({ title: `AeroVibe — ${t('legal.terms.title')}` })

  const accountBullets = t('legal.terms.sections.accounts.bullets', { returnObjects: true }) as string[]
  const contentBullets = t('legal.terms.sections.content.bullets', { returnObjects: true }) as string[]

  return (
    <LegalLayout title={t('legal.terms.title')} intro={t('legal.terms.intro')} updatedOn={UPDATED_ON}>
      <section className={styles.section}>
        <h2 className={styles.h2}>{t('legal.terms.sections.accounts.title')}</h2>
        <ul className={styles.ul}>
          {accountBullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>{t('legal.terms.sections.content.title')}</h2>
        <ul className={styles.ul}>
          {contentBullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>{t('legal.terms.sections.pro.title')}</h2>
        <p className={styles.p}>{t('legal.terms.sections.pro.body')}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>{t('legal.terms.sections.disclaimer.title')}</h2>
        <p className={styles.p}>{t('legal.terms.sections.disclaimer.body')}</p>
      </section>
    </LegalLayout>
  )
}
