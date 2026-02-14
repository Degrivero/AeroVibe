import { useTranslation } from 'react-i18next'

import { useMeta } from '../../app/useMeta'
import { LegalLayout } from './LegalLayout'
import styles from './LegalLayout.module.css'

const UPDATED_ON = '2026-02-14'

export function CookiesPage() {
  const { t } = useTranslation()
  useMeta({ title: `AeroVibe — ${t('legal.cookies.title')}` })

  const essentialBullets = t('legal.cookies.sections.essential.bullets', { returnObjects: true }) as string[]
  const optionalBullets = t('legal.cookies.sections.optional.bullets', { returnObjects: true }) as string[]

  return (
    <LegalLayout title={t('legal.cookies.title')} intro={t('legal.cookies.intro')} updatedOn={UPDATED_ON}>
      <section className={styles.section}>
        <h2 className={styles.h2}>{t('legal.cookies.sections.essential.title')}</h2>
        <ul className={styles.ul}>
          {essentialBullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>{t('legal.cookies.sections.optional.title')}</h2>
        <ul className={styles.ul}>
          {optionalBullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>{t('legal.cookies.sections.control.title')}</h2>
        <p className={styles.p}>{t('legal.cookies.sections.control.body')}</p>
      </section>
    </LegalLayout>
  )
}
