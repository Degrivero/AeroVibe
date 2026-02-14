import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from '../locales/en.json'
import es from '../locales/es.json'
import pt from '../locales/pt.json'

export const LANG_STORAGE_KEY = 'aerovibe_lang'

const SUPPORTED = ['es', 'en', 'pt'] as const
export type SupportedLang = (typeof SUPPORTED)[number]

function detectInitialLang(): SupportedLang {
  if (typeof window === 'undefined') return 'en'

  const saved = window.localStorage.getItem(LANG_STORAGE_KEY)
  if (saved && (SUPPORTED as readonly string[]).includes(saved)) return saved as SupportedLang

  const nav = (navigator.language || 'en').toLowerCase()
  if (nav.startsWith('pt')) return 'pt'
  if (nav.startsWith('es')) return 'es'
  return 'en'
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    pt: { translation: pt },
  },
  lng: detectInitialLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

if (typeof document !== 'undefined') {
  document.documentElement.lang = (i18n.resolvedLanguage || i18n.language || 'en').slice(0, 2)
}

export function setLang(next: SupportedLang) {
  void i18n.changeLanguage(next)
  document.documentElement.lang = next
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, next)
  } catch {
    // ignore
  }
}

export default i18n
