import { useTranslation } from 'react-i18next'

import { useMeta } from '../../app/useMeta'
import { LegalLayout } from './LegalLayout'
import { LegalDoc, type LegalBlock } from './LegalDoc'

const UPDATED_ON = '2026-02-14'

export function PrivacyPage() {
  const { t } = useTranslation()
  useMeta({ title: `AeroVibe — ${t('legal.privacy.title')}` })

  const blocks = t('legal.privacy.blocks', { returnObjects: true }) as LegalBlock[]

  return (
    <LegalLayout title={t('legal.privacy.title')} intro={t('legal.privacy.intro')} updatedOn={UPDATED_ON}>
      <LegalDoc blocks={blocks} />
    </LegalLayout>
  )
}
