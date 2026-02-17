import { useTranslation } from 'react-i18next'

import styles from './HomePage.module.css'
import { useMeta } from '../app/useMeta'

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
}: {
  title: string
  price: string
  period: string
  bullets: string[]
  cta: string
  featured?: boolean
  badge?: string
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
      <button className={featured ? styles.priceCtaFeatured : styles.priceCta} type="button">
        {cta}
      </button>
    </div>
  )
}

export function HomePage() {
  const { t } = useTranslation()
  useMeta({ title: t('meta.title'), description: t('meta.description') })

  const freeBullets = t('sections.pricing.free.bullets', { returnObjects: true }) as string[]
  const proMonthBullets = t('sections.pricing.pro_month.bullets', { returnObjects: true }) as string[]
  const proYearBullets = t('sections.pricing.pro_year.bullets', { returnObjects: true }) as string[]

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

  const heroPins = [
    { key: 'community', left: '18%', top: '38%', preview: '/assets/hero/pin-community.png' },
    { key: 'beach', left: '62%', top: '30%', preview: '/assets/hero/pin-beach.png' },
    { key: 'mountain', left: '46%', top: '64%', preview: '/assets/hero/pin-mountain.png' },
  ] as const

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

            <div className={styles.heroRight} aria-hidden="true">
              <div className={styles.heroPanel}>
                <div className={styles.heroPanelSweep} />
                {heroPins.map((pin) => (
                  <div key={pin.key} className={styles.heroPin} style={{ left: pin.left, top: pin.top }}>
                    <img className={styles.heroThumb} src={pin.preview} alt="" loading="lazy" />
                  </div>
                ))}
                <div className={styles.heroPath} />
              </div>
            </div>
          </div>
        </div>

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
              />
              <PricingCard
                title={t('sections.pricing.pro_month.name')}
                price={t('sections.pricing.pro_month.price')}
                period={t('sections.pricing.pro_month.period')}
                bullets={proMonthBullets}
                cta={t('sections.pricing.pro_month.cta')}
              />
              <PricingCard
                title={t('sections.pricing.pro_year.name')}
                price={t('sections.pricing.pro_year.price')}
                period={t('sections.pricing.pro_year.period')}
                bullets={proYearBullets}
                cta={t('sections.pricing.pro_year.cta')}
                featured
                badge={t('sections.pricing.best_value')}
              />
            </div>
          </div>
        </section>

      </section>
    </div>
  )
}
