import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useMeta } from '../app/useMeta'
import styles from './EmailVerifiedPage.module.css'

type Copy = {
  title: string
  body: string
  statusOk: string
  statusError: string
  appStoreAlt: string
  playStoreAlt: string
  backHome: string
}

const COPY: Record<'es' | 'en' | 'pt', Copy> = {
  es: {
    title: 'Email verificado correctamente',
    body: 'Tu cuenta ya está activa. Descarga AeroVibe y empieza a explorar spots con tu comunidad.',
    statusOk: 'Verificación completada',
    statusError: 'No pudimos verificar tu email con este enlace. Solicita uno nuevo desde la app.',
    appStoreAlt: 'Descargar en App Store',
    playStoreAlt: 'Disponible en Google Play',
    backHome: 'Volver al inicio',
  },
  en: {
    title: 'Email verified successfully',
    body: 'Your account is now active. Download AeroVibe and start exploring spots with your community.',
    statusOk: 'Verification completed',
    statusError: 'We could not verify your email with this link. Request a new one in the app.',
    appStoreAlt: 'Download on the App Store',
    playStoreAlt: 'Get it on Google Play',
    backHome: 'Back home',
  },
  pt: {
    title: 'Email verificado com sucesso',
    body: 'Sua conta já está ativa. Baixe o AeroVibe e comece a explorar spots com sua comunidade.',
    statusOk: 'Verificação concluída',
    statusError: 'Não foi possível verificar seu email com este link. Solicite um novo no app.',
    appStoreAlt: 'Baixar na App Store',
    playStoreAlt: 'Disponível no Google Play',
    backHome: 'Voltar ao início',
  },
}

function normalizeLang(raw: string | undefined): 'es' | 'en' | 'pt' {
  const value = String(raw || '').trim().toLowerCase()
  if (value.startsWith('es')) return 'es'
  if (value.startsWith('pt')) return 'pt'
  return 'en'
}

export function EmailVerifiedPage() {
  const { i18n } = useTranslation()
  const location = useLocation()
  const lang = normalizeLang(i18n.resolvedLanguage || i18n.language)
  const copy = COPY[lang]

  useMeta({
    title: `AeroVibe — ${copy.title}`,
    description: copy.body,
  })

  const search = new URLSearchParams(location.search)
  const hasError = Boolean(search.get('error') || search.get('error_description'))

  const appStoreUrl = (import.meta.env.VITE_APP_STORE_URL as string | undefined) || 'https://apps.apple.com'
  const googlePlayUrl =
    (import.meta.env.VITE_GOOGLE_PLAY_URL as string | undefined) || 'https://play.google.com/store'

  return (
    <article className={styles.wrap}>
      <div className={styles.card}>
        <img className={styles.logo} src="/assets/brand/logotipo.png" alt="AeroVibe" width={200} height={200} />

        <div className={hasError ? styles.statusError : styles.statusOk}>
          {hasError ? copy.statusError : copy.statusOk}
        </div>

        <h1 className={styles.h1}>{copy.title}</h1>
        <p className={styles.body}>{copy.body}</p>

        <div className={styles.badges}>
          <a className={styles.badgeLink} href={appStoreUrl} target="_blank" rel="noreferrer">
            <img
              className={styles.badge}
              src="/assets/badges/app-store.svg"
              alt={copy.appStoreAlt}
              width={168}
              height={50}
              loading="lazy"
            />
          </a>
          <a className={styles.badgeLink} href={googlePlayUrl} target="_blank" rel="noreferrer">
            <img
              className={styles.badge}
              src="/assets/badges/google-play.svg"
              alt={copy.playStoreAlt}
              width={168}
              height={50}
              loading="lazy"
            />
          </a>
        </div>

        <Link className={styles.homeLink} to="/">
          {copy.backHome}
        </Link>
      </div>
    </article>
  )
}
