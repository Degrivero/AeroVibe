import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  onAuthSessionChange,
  openAccountModal,
  readAuthSession,
  setPendingCheckoutPlan,
} from '../app/auth'
import { startSubscriptionCheckout } from '../app/payments'
import styles from './HomePage.module.css'
import { useMeta } from '../app/useMeta'

const GlobeHero = lazy(() =>
  import('../components/GlobeHero').then((module) => ({
    default: module.GlobeHero,
  })),
)

function StoreBadges() {
  const { t } = useTranslation()
  const appStoreUrl = (import.meta.env.VITE_APP_STORE_URL as string | undefined) || '#'
  const googlePlayUrl = (import.meta.env.VITE_GOOGLE_PLAY_URL as string | undefined) || '#'

  return (
    <div className={styles.storeBadges} id="store-badges">
      <a className={styles.badgeLink} href={appStoreUrl} target="_blank" rel="noreferrer">
        <img
          className={styles.badgeImg}
          src="/assets/badges/app-store.svg"
          alt={t('common.badge_app_store_alt')}
          width={144}
          height={48}
          loading="lazy"
        />
      </a>
      <a className={styles.badgeLink} href={googlePlayUrl} target="_blank" rel="noreferrer">
        <img
          className={styles.badgeImg}
          src="/assets/badges/google-play.svg"
          alt={t('common.badge_google_play_alt')}
          width={144}
          height={48}
          loading="lazy"
        />
      </a>
    </div>
  )
}

function PricingCard({
  title,
  price,
  period,
  bullets,
  cta,
  featured,
  badge,
  onAction,
  actionBusy,
}: {
  title: string
  price: string
  period: string
  bullets: string[]
  cta: string
  featured?: boolean
  badge?: string
  onAction?: () => void
  actionBusy?: boolean
}) {
  return (
    <div className={featured ? styles.priceCardFeatured : styles.priceCard}>
      {badge ? <div className={styles.priceBadge}>{badge}</div> : null}
      <div className={styles.priceTitle}>{title}</div>
      <div className={styles.priceRow}>
        <div className={styles.priceValue}>{price}</div>
        <div className={styles.pricePeriod}>{period}</div>
      </div>
      <ul className={styles.priceBullets}>
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
      <button
        className={featured ? styles.priceCtaFeatured : styles.priceCta}
        type="button"
        onClick={onAction}
        disabled={actionBusy}
      >
        {actionBusy ? `${cta}…` : cta}
      </button>
    </div>
  )
}

export function HomePage() {
  const { t } = useTranslation()
  const [session, setSession] = useState(() => readAuthSession())
  const [showGlobe, setShowGlobe] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 960 : false,
  )
  const [pricingError, setPricingError] = useState<string | null>(null)
  const [pricingMessage, setPricingMessage] = useState<string | null>(null)
  const [busyPlan, setBusyPlan] = useState<'pro_monthly' | 'pro_annual' | null>(null)

  useEffect(() => {
    const query = window.matchMedia('(min-width: 960px)')
    const listener = (event: MediaQueryListEvent) => setShowGlobe(event.matches)
    setShowGlobe(query.matches)
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }, [])

  useEffect(() => onAuthSessionChange(() => setSession(readAuthSession())), [])

  useMeta({ title: t('meta.title'), description: t('meta.description') })

  const freeBullets = t('sections.pricing.free.bullets', { returnObjects: true }) as string[]
  const proMonthBullets = t('sections.pricing.pro_month.bullets', { returnObjects: true }) as string[]
  const proYearBullets = t('sections.pricing.pro_year.bullets', { returnObjects: true }) as string[]

  async function openProCheckout(plan: 'monthly' | 'annual', planCard: 'pro_monthly' | 'pro_annual') {
    setPricingError(null)
    setPricingMessage(null)

    const accessToken = session?.accessToken
    if (!accessToken) {
      setPendingCheckoutPlan(plan)
      openAccountModal('login')
      return
    }

    setBusyPlan(planCard)
    try {
      const checkout = await startSubscriptionCheckout({ accessToken, plan })
      if (!checkout.redirected && checkout.message) {
        setPricingMessage(checkout.message)
      }
    } catch (error) {
      setPricingError(error instanceof Error ? error.message : t('pricing_actions.errors.generic'))
    } finally {
      setBusyPlan(null)
    }
  }

  const features = [
    {
      title: t('sections.features.cards.map_title'),
      body: t('sections.features.cards.map_body'),
    },
    {
      title: t('sections.features.cards.media_title'),
      body: t('sections.features.cards.media_body'),
    },
    {
      title: t('sections.features.cards.flight_title'),
      body: t('sections.features.cards.flight_body'),
    },
    {
      title: t('sections.features.cards.ranking_title'),
      body: t('sections.features.cards.ranking_body'),
    },
    {
      title: t('sections.features.cards.hangar_title'),
      body: t('sections.features.cards.hangar_body'),
    },
    {
      title: t('sections.features.cards.moderation_title'),
      body: t('sections.features.cards.moderation_body'),
    },
  ]

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true">
          <div className={styles.orb1} />
          <div className={styles.orb2} />
          <div className={styles.radar} />
          <div className={styles.blockOrb1} />
          <div className={styles.blockOrb2} />
        </div>

        <div className={styles.heroInner}>
          <div className={styles.heroGrid}>
            <div className={styles.heroLeft}>
              <div className={styles.kicker}>{t('hero.kicker')}</div>
              <h1 className={styles.title}>{t('hero.title')}</h1>
              <p className={styles.subtitle}>{t('hero.subtitle')}</p>

              <div className={styles.heroBottom}>
                <StoreBadges />
                <div className={styles.heroNote}>{t('hero.note')}</div>
              </div>
            </div>
          </div>
        </div>

        {showGlobe ? (
          <div className={styles.floatingGlobe} aria-hidden="true">
            <Suspense fallback={<div className={styles.floatingGlobeFallback} />}>
              <GlobeHero />
            </Suspense>
          </div>
        ) : null}

        <section className={styles.section} id="features">
          <div className={styles.sectionInner}>
            <div className={styles.featureSplit}>
              <div className={styles.featureCopy}>
                <h2 className={styles.h2}>{t('sections.features.title')}</h2>
                <p className={styles.sectionSub}>{t('sections.features.subtitle')}</p>
              </div>

              <div className={styles.featureList} role="list">
                {features.map((f) => (
                  <div key={f.title} className={styles.featureRow} role="listitem">
                    <div className={styles.featureRowTitle}>{f.title}</div>
                    <div className={styles.featureRowBody}>{f.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section} id="pricing">
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeadCentered}>
              <h2 className={styles.h2}>{t('sections.pricing.title')}</h2>
              <p className={styles.sectionSub}>{t('sections.pricing.subtitle')}</p>
            </div>

            <div className={styles.priceGrid}>
              <PricingCard
                title={t('sections.pricing.free.name')}
                price={t('sections.pricing.free.price')}
                period={t('sections.pricing.free.period')}
                bullets={freeBullets}
                cta={t('sections.pricing.free.cta')}
                onAction={() => {
                  setBusyPlan(null)
                  setPricingError(null)
                  setPricingMessage(null)
                  openAccountModal('create')
                }}
              />
              <PricingCard
                title={t('sections.pricing.pro_month.name')}
                price={t('sections.pricing.pro_month.price')}
                period={t('sections.pricing.pro_month.period')}
                bullets={proMonthBullets}
                cta={t('sections.pricing.pro_month.cta')}
                onAction={() => {
                  void openProCheckout('monthly', 'pro_monthly')
                }}
                actionBusy={busyPlan === 'pro_monthly'}
              />
              <PricingCard
                title={t('sections.pricing.pro_year.name')}
                price={t('sections.pricing.pro_year.price')}
                period={t('sections.pricing.pro_year.period')}
                bullets={proYearBullets}
                cta={t('sections.pricing.pro_year.cta')}
                featured
                badge={t('sections.pricing.best_value')}
                onAction={() => {
                  void openProCheckout('annual', 'pro_annual')
                }}
                actionBusy={busyPlan === 'pro_annual'}
              />
            </div>
            {pricingError ? <div className={styles.pricingAlertError}>{pricingError}</div> : null}
            {pricingMessage ? <div className={styles.pricingAlertOk}>{pricingMessage}</div> : null}
          </div>
        </section>
      </section>
    </div>
  )
}
