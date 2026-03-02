import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import {
  clearAuthSession,
  getApiBase,
  onAuthSessionChange,
  openAccountModal,
  readAuthSession,
} from '../app/auth'
import {
  getSubscriptionStatus,
  openStripePortal,
  type SubscriptionStatus,
} from '../app/payments'
import { countryCityCatalog, findCountryByNameOrCode } from '../app/countryCityCatalog'
import { useMeta } from '../app/useMeta'
import styles from './AccountPage.module.css'

type ProfileData = {
  email: string
  firstName: string
  lastName: string
  nickname: string
  country: string
  city: string
  bio: string
}

type SubscriptionData = {
  tier: 'free' | 'pro'
  billingCycle: 'monthly' | 'annual' | null
  currentPeriodEnd: string | null
  limits: {
    hangar: number
    flightPlansActive: number
    forecastHours: number
    mediaUploadsPerDay: number
    marketplaceActivePosts: number
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function asNullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function apiError(payload: unknown, fallback: string) {
  if (!isRecord(payload)) return fallback
  const message = payload.message
  if (typeof message === 'string' && message.trim()) return message.trim()
  const error = payload.error
  if (typeof error === 'string' && error.trim()) return error.trim()
  return fallback
}

async function fetchAuthedJson(endpoint: string, accessToken: string, init?: RequestInit) {
  const res = await fetch(endpoint, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  const payload: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(apiError(payload, 'No pudimos completar la operación.'))
  }

  return payload
}

function normalizeProfile(payload: unknown): ProfileData {
  if (!isRecord(payload)) {
    return {
      email: '',
      firstName: '',
      lastName: '',
      nickname: '',
      country: '',
      city: '',
      bio: '',
    }
  }

  const location = isRecord(payload.location) ? payload.location : null
  return {
    email: asString(payload.email),
    firstName: asString(payload.firstName),
    lastName: asString(payload.lastName),
    nickname: asString(payload.nickname),
    country: asString(location?.country),
    city: asString(location?.city),
    bio: asString(payload.bio),
  }
}

function normalizeSubscription(payload: unknown): SubscriptionData {
  const record = isRecord(payload) ? payload : {}
  const limitsRaw = isRecord(record.limits) ? record.limits : {}
  const tier = String(record.tier ?? 'free').toLowerCase() === 'pro' ? 'pro' : 'free'
  const cycleRaw = String(record.billingCycle ?? '').toLowerCase()
  const billingCycle = cycleRaw === 'monthly' || cycleRaw === 'annual' ? cycleRaw : null

  return {
    tier,
    billingCycle,
    currentPeriodEnd: asNullableString(record.currentPeriodEnd),
    limits: {
      hangar: asNumber(limitsRaw.hangar, tier === 'pro' ? 5 : 1),
      flightPlansActive: asNumber(limitsRaw.flightPlansActive, tier === 'pro' ? 50 : 3),
      forecastHours: asNumber(limitsRaw.forecastHours, tier === 'pro' ? 168 : 24),
      mediaUploadsPerDay: asNumber(limitsRaw.mediaUploadsPerDay, tier === 'pro' ? 100 : 5),
      marketplaceActivePosts: asNumber(limitsRaw.marketplaceActivePosts, tier === 'pro' ? 10 : 1),
    },
  }
}

function formatDate(raw: string | null) {
  if (!raw) return '—'
  const ms = Date.parse(raw)
  if (!Number.isFinite(ms)) return raw
  return new Date(ms).toLocaleDateString()
}

function cityOptionsForCountry(countryCode: string, currentCity: string) {
  const country = countryCityCatalog.find((entry) => entry.code === countryCode)
  if (!country) return []

  const options = [...country.cities]
  const trimmedCurrent = currentCity.trim()
  if (trimmedCurrent && !options.some((value) => value.toLowerCase() === trimmedCurrent.toLowerCase())) {
    options.unshift(trimmedCurrent)
  }

  return options
}

export function AccountPage() {
  const { t } = useTranslation()
  const [session, setSession] = useState(() => readAuthSession())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [portalBusy, setPortalBusy] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [nickname, setNickname] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [city, setCity] = useState('')
  const [bio, setBio] = useState('')

  const selectedCountry = useMemo(
    () => countryCityCatalog.find((entry) => entry.code === countryCode) ?? null,
    [countryCode],
  )

  const cityOptions = useMemo(() => cityOptionsForCountry(countryCode, city), [countryCode, city])

  useMeta({
    title: `AeroVibe — ${t('account_page.meta_title')}`,
    description: t('account_page.meta_description'),
  })

  useEffect(() => onAuthSessionChange(() => setSession(readAuthSession())), [])

  const isLoggedIn = !!session?.accessToken
  const apiBase = useMemo(() => getApiBase(), [])

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false)
      setLoadError(null)
      setProfile(null)
      setSubscription(null)
      setSubscriptionStatus(null)
      return
    }

    if (!apiBase || !session?.accessToken) {
      setLoading(false)
      setLoadError(t('account_modal.errors.missing_api_base'))
      return
    }

    const accessToken = session.accessToken
    let cancelled = false

    async function loadAll() {
      setLoading(true)
      setLoadError(null)
      try {
        const [profilePayload, subscriptionPayload] = await Promise.all([
          fetchAuthedJson(`${apiBase}/api/users/me`, accessToken),
          fetchAuthedJson(`${apiBase}/api/subscription`, accessToken),
        ])

        let status: SubscriptionStatus | null = null
        try {
          status = await getSubscriptionStatus(accessToken)
        } catch {
          status = null
        }

        if (cancelled) return

        const normalizedProfile = normalizeProfile(profilePayload)
        const normalizedSubscription = normalizeSubscription(subscriptionPayload)
        const normalizedCountry = findCountryByNameOrCode(normalizedProfile.country)

        setProfile(normalizedProfile)
        setSubscription(normalizedSubscription)
        setSubscriptionStatus(status)

        setFirstName(normalizedProfile.firstName)
        setLastName(normalizedProfile.lastName)
        setNickname(normalizedProfile.nickname)
        setCountryCode(normalizedCountry?.code ?? '')
        setCity(normalizedProfile.city)
        setBio(normalizedProfile.bio)
      } catch (error) {
        if (cancelled) return
        setLoadError(error instanceof Error ? error.message : t('account_page.errors.load_failed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadAll()

    return () => {
      cancelled = true
    }
  }, [apiBase, isLoggedIn, session?.accessToken, t])

  async function onSaveProfile(event: React.FormEvent) {
    event.preventDefault()
    setProfileError(null)
    setProfileMessage(null)

    if (!session?.accessToken || !apiBase) {
      setProfileError(t('account_modal.errors.missing_api_base'))
      return
    }

    if (!selectedCountry || !city.trim()) {
      setProfileError(t('account_page.errors.country_city_required'))
      return
    }

    setSavingProfile(true)
    try {
      const payload = await fetchAuthedJson(`${apiBase}/api/users/me`, session.accessToken, {
        method: 'PUT',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          nickname: nickname.trim(),
          country: selectedCountry.name,
          city: city.trim(),
          bio: bio.trim(),
        }),
      })

      const normalized = normalizeProfile(payload)
      const normalizedCountry = findCountryByNameOrCode(normalized.country)

      setProfile(normalized)
      setCountryCode(normalizedCountry?.code ?? selectedCountry.code)
      setCity(normalized.city)
      setProfileMessage(t('account_page.profile.saved'))
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : t('account_page.errors.save_failed'))
    } finally {
      setSavingProfile(false)
    }
  }

  async function onManageSubscription() {
    if (!session?.accessToken) return
    setPortalError(null)
    setPortalBusy(true)
    try {
      await openStripePortal(session.accessToken)
    } catch (error) {
      setPortalError(error instanceof Error ? error.message : t('account_page.errors.portal_failed'))
    } finally {
      setPortalBusy(false)
    }
  }

  if (!isLoggedIn) {
    return (
      <article className={styles.wrap}>
        <header className={styles.header}>
          <h1 className={styles.h1}>{t('account_page.title')}</h1>
          <p className={styles.sub}>{t('account_page.auth_required')}</p>
        </header>
        <div className={styles.gridSingle}>
          <section className={styles.card}>
            <div className={styles.actions}>
              <button className={styles.primaryBtn} type="button" onClick={() => openAccountModal('login')}>
                {t('auth.sign_in')}
              </button>
              <button className={styles.secondaryBtn} type="button" onClick={() => openAccountModal('create')}>
                {t('nav.create_account')}
              </button>
              <Link className={styles.linkBtn} to="/">
                {t('common.back_home')}
              </Link>
            </div>
          </section>
        </div>
      </article>
    )
  }

  return (
    <article className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.h1}>{t('account_page.title')}</h1>
        <p className={styles.sub}>{t('account_page.subtitle')}</p>
      </header>

      {loadError ? <div className={styles.alertError}>{loadError}</div> : null}

      {loading ? (
        <div className={styles.card}>{t('account_page.loading')}</div>
      ) : (
        <div className={styles.grid}>
          <section className={styles.card}>
            <h2 className={styles.h2}>{t('account_page.profile.title')}</h2>
            <form className={styles.form} onSubmit={onSaveProfile}>
              {profileError ? <div className={styles.alertError}>{profileError}</div> : null}
              {profileMessage ? <div className={styles.alertOk}>{profileMessage}</div> : null}

              <label className={styles.field}>
                <span className={styles.label}>{t('account_page.profile.email')}</span>
                <input className={styles.input} value={profile?.email || ''} disabled />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>{t('account_page.profile.first_name')}</span>
                <input
                  className={styles.input}
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  disabled={savingProfile}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>{t('account_page.profile.last_name')}</span>
                <input
                  className={styles.input}
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  disabled={savingProfile}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>{t('account_page.profile.nickname')}</span>
                <input
                  className={styles.input}
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  disabled={savingProfile}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>{t('account_page.profile.country')}</span>
                <select
                  className={styles.input}
                  value={countryCode}
                  onChange={(event) => {
                    const nextCode = event.target.value
                    setCountryCode(nextCode)
                    setCity('')
                  }}
                  disabled={savingProfile}
                >
                  <option value="">{t('account_page.profile.select_country')}</option>
                  {countryCityCatalog.map((entry) => (
                    <option key={entry.code} value={entry.code}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.label}>{t('account_page.profile.city')}</span>
                <select
                  className={styles.input}
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  disabled={savingProfile || !selectedCountry}
                >
                  <option value="">{t('account_page.profile.select_city')}</option>
                  {cityOptions.map((cityValue) => (
                    <option key={cityValue} value={cityValue}>
                      {cityValue}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.fieldWide}>
                <span className={styles.label}>{t('account_page.profile.bio')}</span>
                <textarea
                  className={styles.textarea}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  rows={5}
                  disabled={savingProfile}
                />
              </label>

              <div className={styles.actions}>
                <button className={styles.primaryBtn} type="submit" disabled={savingProfile}>
                  {savingProfile ? t('account_page.profile.saving') : t('account_page.profile.save')}
                </button>
              </div>
            </form>
          </section>

          <section className={styles.card}>
            <h2 className={styles.h2}>{t('account_page.plan.title')}</h2>
            <div className={styles.infoList}>
              <div className={styles.infoRow}>
                <span>{t('account_page.plan.current_plan')}</span>
                <strong>
                  {subscription?.tier === 'pro' ? t('account_page.plan.pro') : t('account_page.plan.free')}
                </strong>
              </div>
              <div className={styles.infoRow}>
                <span>{t('account_page.plan.billing_cycle')}</span>
                <strong>
                  {subscription?.billingCycle === 'monthly'
                    ? t('account_page.plan.monthly')
                    : subscription?.billingCycle === 'annual'
                      ? t('account_page.plan.annual')
                      : '—'}
                </strong>
              </div>
              <div className={styles.infoRow}>
                <span>{t('account_page.plan.next_renewal')}</span>
                <strong>{formatDate(subscription?.currentPeriodEnd ?? null)}</strong>
              </div>
              <div className={styles.infoRow}>
                <span>{t('account_page.plan.provider')}</span>
                <strong>{subscriptionStatus?.provider || '—'}</strong>
              </div>
            </div>

            {portalError ? <div className={styles.alertError}>{portalError}</div> : null}

            {subscriptionStatus?.provider === 'stripe' ? (
              <button className={styles.primaryBtn} type="button" onClick={onManageSubscription} disabled={portalBusy}>
                {portalBusy ? t('account_page.plan.portal_opening') : t('account_page.plan.manage_subscription')}
              </button>
            ) : null}

            <div className={styles.limitBlock}>
              <h3 className={styles.h3}>{t('account_page.plan.current_limits')}</h3>
              <ul className={styles.limits}>
                <li>
                  {t('account_page.limits.hangar')}: <strong>{subscription?.limits.hangar ?? '—'}</strong>
                </li>
                <li>
                  {t('account_page.limits.flight_plans')}: <strong>{subscription?.limits.flightPlansActive ?? '—'}</strong>
                </li>
                <li>
                  {t('account_page.limits.forecast_hours')}: <strong>{subscription?.limits.forecastHours ?? '—'}</strong>
                </li>
                <li>
                  {t('account_page.limits.media_uploads')}: <strong>{subscription?.limits.mediaUploadsPerDay ?? '—'}</strong>
                </li>
                <li>
                  {t('account_page.limits.marketplace_posts')}:{' '}
                  <strong>{subscription?.limits.marketplaceActivePosts ?? '—'}</strong>
                </li>
              </ul>
            </div>

            <div className={styles.actions}>
              <button
                className={styles.secondaryBtn}
                type="button"
                onClick={() => {
                  clearAuthSession()
                }}
              >
                {t('account_page.sign_out')}
              </button>
            </div>
          </section>
        </div>
      )}
    </article>
  )
}
