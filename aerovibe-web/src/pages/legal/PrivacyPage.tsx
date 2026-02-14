import { useTranslation } from 'react-i18next'

import { useMeta } from '../../app/useMeta'
import { LegalLayout } from './LegalLayout'
import styles from './LegalLayout.module.css'

const UPDATED_ON = '2026-02-14'
const CONTACT_EMAIL = 'support@aerovibe.app'

export function PrivacyPage() {
  const { t } = useTranslation()
  useMeta({ title: `AeroVibe — ${t('legal.privacy.title')}` })

  const dataBullets = t('legal.privacy.sections.data.bullets', { returnObjects: true }) as string[]
  const useBullets = t('legal.privacy.sections.use.bullets', { returnObjects: true }) as string[]
  const sharingBullets = t('legal.privacy.sections.sharing.bullets', { returnObjects: true }) as string[]

  return (
    <LegalLayout
      title={t('legal.privacy.title')}
      intro={t('legal.privacy.intro')}
      updatedOn={UPDATED_ON}
    >
      <section className={styles.section}>
        <h2 className={styles.h2}>{t('legal.privacy.sections.data.title')}</h2>
        <ul className={styles.ul}>
          {dataBullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>{t('legal.privacy.sections.use.title')}</h2>
        <ul className={styles.ul}>
          {useBullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>{t('legal.privacy.sections.sharing.title')}</h2>
        <ul className={styles.ul}>
          {sharingBullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>{t('legal.privacy.sections.retention.title')}</h2>
        <p className={styles.p}>{t('legal.privacy.sections.retention.body')}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>{t('legal.privacy.sections.rights.title')}</h2>
        <p className={styles.p}>{t('legal.privacy.sections.rights.body')}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>{t('legal.privacy.sections.contact.title')}</h2>
        <p className={styles.p}>{t('legal.privacy.sections.contact.body', { email: CONTACT_EMAIL })}</p>
      </section>
    </LegalLayout>
  )
}
