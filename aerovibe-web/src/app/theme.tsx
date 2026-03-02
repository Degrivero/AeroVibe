/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type ThemeMode = 'dark' | 'light'

const THEME_STORAGE_KEY = 'aerovibe_theme'

type ThemeContextValue = {
  theme: ThemeMode
  setTheme: (next: ThemeMode) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function detectInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'

  const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (saved === 'dark' || saved === 'light') return saved

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? true
  return prefersDark ? 'dark' : 'light'
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => detectInitialTheme())

  useEffect(() => {
    applyTheme(theme)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])

  const value = useMemo<ThemeContextValue>(() => {
    return {
      theme,
      setTheme: (next) => setThemeState(next),
      toggle: () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark')),
    }
  }, [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
