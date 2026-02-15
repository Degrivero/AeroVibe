import { useTranslation } from 'react-i18next'

import styles from './SignInPage.module.css'
import { useMeta } from '../app/useMeta'

export function SignInPage() {
  const { t } = useTranslation()
  useMeta({ title: t('signin.meta_title'), description: t('signin.meta_description') })

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.h1}>{t('signin.title')}</h1>
        <p className={styles.p}>{t('signin.body')}</p>
      </div>
    </div>
  )
}

