import { useTranslation } from 'react-i18next'

import styles from './ShopPage.module.css'
import { useMeta } from '../app/useMeta'

export function ShopPage() {
  const { t } = useTranslation()
  useMeta({ title: t('shop.meta_title'), description: t('shop.meta_description') })

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.h1}>{t('shop.title')}</h1>
        <p className={styles.p}>{t('shop.body')}</p>
      </div>
    </div>
  )
}

