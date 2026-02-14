import { useTranslation } from 'react-i18next'

import styles from './HomePage.module.css'
import { useMeta } from '../app/useMeta'

function StoreButtons() {
  const { t } = useTranslation()
  const appStoreUrl = (import.meta.env.VITE_APP_STORE_URL as string | undefined) || '#'
  const googlePlayUrl = (import.meta.env.VITE_GOOGLE_PLAY_URL as string | undefined) || '#'

  return (
    <div className={styles.storeRow}>
      <a className={styles.storeBtn} href={appStoreUrl} target="_blank" rel="noreferrer">
        <span className={styles.storeTop}>{t('common.download_app')}</span>
        <span className={styles.storeBottom}>{t('common.app_store')}</span>
      </a>
      <a className={styles.storeBtn} href={googlePlayUrl} target="_blank" rel="noreferrer">
        <span className={styles.storeTop}>{t('common.download_app')}</span>
        <span className={styles.storeBottom}>{t('common.google_play')}</span>
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

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true">
          <div className={styles.grid} />
          <div className={styles.orb1} />
          <div className={styles.orb2} />
          <div className={styles.radar} />
        </div>

        <div className={styles.heroInner}>
          <div className={styles.kicker}>{t('hero.kicker')}</div>
          <h1 className={styles.title}>{t('hero.title')}</h1>
          <p className={styles.subtitle}>{t('hero.subtitle')}</p>

          <div className={styles.heroCtas}>
            <a className={styles.primaryCta} href="#pricing">
              {t('hero.cta_primary')}
            </a>
            <a className={styles.secondaryCta} href="#features">
              {t('hero.cta_secondary')}
            </a>
          </div>

          <div className={styles.note}>{t('hero.note')}</div>

          <StoreButtons />

          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <div className={styles.statValue}>{t('hero.stats.map.value')}</div>
              <div className={styles.statLabel}>{t('hero.stats.map.label')}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>{t('hero.stats.media.value')}</div>
              <div className={styles.statLabel}>{t('hero.stats.media.label')}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>{t('hero.stats.plans.value')}</div>
              <div className={styles.statLabel}>{t('hero.stats.plans.label')}</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="features">
        <div className={styles.sectionInner}>
          <h2 className={styles.h2}>{t('sections.features.title')}</h2>
          <p className={styles.sectionSub}>{t('sections.features.subtitle')}</p>

          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureTitle}>{t('sections.features.cards.map_title')}</div>
              <div className={styles.featureBody}>{t('sections.features.cards.map_body')}</div>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureTitle}>{t('sections.features.cards.media_title')}</div>
              <div className={styles.featureBody}>{t('sections.features.cards.media_body')}</div>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureTitle}>{t('sections.features.cards.flight_title')}</div>
              <div className={styles.featureBody}>{t('sections.features.cards.flight_body')}</div>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureTitle}>{t('sections.features.cards.ranking_title')}</div>
              <div className={styles.featureBody}>{t('sections.features.cards.ranking_body')}</div>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureTitle}>{t('sections.features.cards.hangar_title')}</div>
              <div className={styles.featureBody}>{t('sections.features.cards.hangar_body')}</div>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureTitle}>{t('sections.features.cards.moderation_title')}</div>
              <div className={styles.featureBody}>{t('sections.features.cards.moderation_body')}</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <h2 className={styles.h2}>{t('sections.showcase.title')}</h2>
          <p className={styles.sectionSub}>{t('sections.showcase.subtitle')}</p>

          <div className={styles.chipRow}>
            <span className={styles.chip}>{t('sections.showcase.chips.dark')}</span>
            <span className={styles.chip}>{t('sections.showcase.chips.light')}</span>
            <span className={styles.chip}>{t('sections.showcase.chips.i18n')}</span>
          </div>

          <div className={styles.screenRow}>
            <div className={styles.screen}>
              <div className={styles.screenTitle}>{t('sections.showcase.screens.map')}</div>
              <div className={styles.screenMockMap} aria-hidden="true" />
            </div>
            <div className={styles.screen}>
              <div className={styles.screenTitle}>{t('sections.showcase.screens.spot')}</div>
              <div className={styles.screenMockSpot} aria-hidden="true" />
            </div>
            <div className={styles.screen}>
              <div className={styles.screenTitle}>{t('sections.showcase.screens.plan')}</div>
              <div className={styles.screenMockPlan} aria-hidden="true" />
            </div>
            <div className={styles.screen}>
              <div className={styles.screenTitle}>{t('sections.showcase.screens.profile')}</div>
              <div className={styles.screenMockProfile} aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="pricing">
        <div className={styles.sectionInner}>
          <h2 className={styles.h2}>{t('sections.pricing.title')}</h2>
          <p className={styles.sectionSub}>{t('sections.pricing.subtitle')}</p>

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

          <div className={styles.priceNote}>{t('hero.note')}</div>
        </div>
      </section>

      <section className={styles.section} id="about">
        <div className={styles.sectionInner}>
          <h2 className={styles.h2}>{t('sections.about.title')}</h2>
          <div className={styles.aboutCard}>
            <p className={styles.aboutP}>{t('sections.about.p1')}</p>
            <p className={styles.aboutP}>{t('sections.about.p2')}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
