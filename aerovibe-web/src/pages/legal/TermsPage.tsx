import { useTranslation } from 'react-i18next'

import { useMeta } from '../../app/useMeta'
import { LegalLayout } from './LegalLayout'
import { LegalDoc, type LegalBlock } from './LegalDoc'

const UPDATED_ON = '2026-02-16'

export function TermsPage() {
  const { t } = useTranslation()
  useMeta({ title: `AeroVibe — ${t('legal.terms.title')}` })

  const blocks = t('legal.terms.blocks', { returnObjects: true }) as LegalBlock[]

  return (
    <LegalLayout title={t('legal.terms.title')} intro={t('legal.terms.intro')} updatedOn={UPDATED_ON}>
      <LegalDoc blocks={blocks} />
    </LegalLayout>
  )
}
