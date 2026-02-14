import { useTranslation } from 'react-i18next'

import { useMeta } from '../../app/useMeta'
import { LegalLayout } from './LegalLayout'
import { LegalDoc, type LegalBlock } from './LegalDoc'

const UPDATED_ON = '2026-02-14'

export function CookiesPage() {
  const { t } = useTranslation()
  useMeta({ title: `AeroVibe — ${t('legal.cookies.title')}` })

  const blocks = t('legal.cookies.blocks', { returnObjects: true }) as LegalBlock[]

  return (
    <LegalLayout title={t('legal.cookies.title')} intro={t('legal.cookies.intro')} updatedOn={UPDATED_ON}>
      <LegalDoc blocks={blocks} />
    </LegalLayout>
  )
}
