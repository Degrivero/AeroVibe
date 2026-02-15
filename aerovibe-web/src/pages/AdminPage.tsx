import { useEffect, useMemo, useState } from 'react'

import styles from './AdminPage.module.css'
import { useMeta } from '../app/useMeta'

type AuthPayload = {
  accessToken: string
  refreshToken: string | null
  user: { id: string; email: string | null; role: string | null } | null
}

type Metrics = {
  ok: true
  asOf: string
  daysBack: number
  users: {
    total: number
    new: number
    roles: Record<string, number>
    tiers: Record<string, number>
    proCycles: Record<string, number>
    proCancelAtPeriodEnd: { yes: number; no: number }
    sampledUsers: number
    maxRows: number
  }
  content: {
    spots: { total: number; new: number }
    comments: { total: number; new: number }
    favorites: { total: number; new: number }
    flightPlans: { total: number; new: number }
    marketplaceListings: { total: number; new: number }
    supportRequests: { total: number; new: number }
  }
}

type Health = { ok?: boolean; service?: string; ts?: string; error?: string }

const LS_ACCESS = 'aerovibe_admin_access_token'
const LS_REFRESH = 'aerovibe_admin_refresh_token'
const LS_EMAIL = 'aerovibe_admin_email'

function apiBase() {
  const raw = ((import.meta.env.VITE_API_BASE_URL as string | undefined) || '').trim()
  const trimmed = raw.replace(/\/$/, '')
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed
}

function fmt(n: number) {
  try {
    return new Intl.NumberFormat().format(n)
  } catch {
    return String(n)
  }
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init)
  const data = await res.json().catch(() => null)
  return { res, data }
}

export function AdminPage() {
  useMeta({ title: 'Admin — AeroVibe', description: 'Admin dashboard' })

  const base = useMemo(() => apiBase(), [])
  const [email, setEmail] = useState(() => window.localStorage.getItem(LS_EMAIL) || '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [accessToken, setAccessToken] = useState<string | null>(() => window.localStorage.getItem(LS_ACCESS))
  const [refreshToken, setRefreshToken] = useState<string | null>(() => window.localStorage.getItem(LS_REFRESH))

  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [health, setHealth] = useState<Record<string, Health>>({})

  async function loadHealth() {
    if (!base) return
    const urls: Array<[string, string]> = [
      ['Gateway', `${base}/health`],
      ['API', `${base}/api/health`],
      ['IAM', `${base}/api/iam/health`],
      ['Users', `${base}/api/users/health`],
      ['Spots', `${base}/api/spots/health`],
    ]

    const results = await Promise.all(
      urls.map(async ([label, url]) => {
        const { res, data } = await fetchJson(url, { method: 'GET' }).catch(() => ({ res: null, data: null }))
        if (!res || !res.ok) {
          return [label, { ok: false, error: `HTTP ${res?.status ?? 0}` }] as const
        }
        return [label, (data || { ok: true, service: label }) as Health] as const
      })
    )

    const map: Record<string, Health> = {}
    for (const [k, v] of results) map[k] = v
    setHealth(map)
  }

  async function refreshSession(): Promise<string | null> {
    if (!base || !refreshToken) return null
    const { res, data } = await fetchJson(`${base}/api/iam/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok || !data?.accessToken) return null
    const nextAccess = String(data.accessToken)
    const nextRefresh = String(data.refreshToken || refreshToken)

    window.localStorage.setItem(LS_ACCESS, nextAccess)
    window.localStorage.setItem(LS_REFRESH, nextRefresh)
    setAccessToken(nextAccess)
    setRefreshToken(nextRefresh)
    return nextAccess
  }

  async function loadMetrics(tokenOverride?: string | null) {
    if (!base) return
    const token = tokenOverride ?? accessToken
    if (!token) return

    const { res, data } = await fetchJson(`${base}/api/admin/dashboard/metrics?days=30`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.status === 401 && refreshToken) {
      const refreshed = await refreshSession()
      if (refreshed) return loadMetrics(refreshed)
    }

    if (!res.ok) {
      const msg = (data && typeof data.message === 'string' && data.message) || 'No pudimos cargar el dashboard.'
      throw new Error(msg)
    }

    setMetrics(data as Metrics)
  }

  async function signIn() {
    setError(null)
    if (!base) return setError('Falta configurar VITE_API_BASE_URL.')
    if (!email.trim() || !password) return setError('Completá email y contraseña.')

    setBusy(true)
    try {
      const { res, data } = await fetchJson(`${base}/api/iam/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })

      if (!res.ok) {
        const msg =
          (data && typeof data.message === 'string' && data.message) ||
          (data && typeof data.error === 'string' && data.error) ||
          'No pudimos iniciar sesión.'
        throw new Error(msg)
      }

      const payload = data as AuthPayload
      if (!payload?.accessToken) throw new Error('Respuesta inválida del servidor.')

      // Validate admin access BEFORE persisting tokens locally.
      await Promise.all([loadMetrics(payload.accessToken), loadHealth()])

      window.localStorage.setItem(LS_EMAIL, email.trim())
      window.localStorage.setItem(LS_ACCESS, payload.accessToken)
      window.localStorage.setItem(LS_REFRESH, payload.refreshToken || '')

      setAccessToken(payload.accessToken)
      setRefreshToken(payload.refreshToken || null)
      setPassword('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos iniciar sesión.')
    } finally {
      setBusy(false)
    }
  }

  function signOut() {
    window.localStorage.removeItem(LS_ACCESS)
    window.localStorage.removeItem(LS_REFRESH)
    setAccessToken(null)
    setRefreshToken(null)
    setMetrics(null)
  }

  useEffect(() => {
    void loadHealth()
    if (accessToken) {
      void loadMetrics().catch(() => {
        // ignore initial errors; user can login again
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <div>
            <div className={styles.kicker}>AeroVibe</div>
            <h1 className={styles.h1}>Admin</h1>
            <div className={styles.muted}>Dashboard privado.</div>
          </div>
          {accessToken ? (
            <div className={styles.headActions}>
              <button className={styles.btn} type="button" onClick={() => void Promise.all([loadMetrics(), loadHealth()])}>
                Actualizar
              </button>
              <button className={styles.btnGhost} type="button" onClick={signOut}>
                Cerrar sesión
              </button>
            </div>
          ) : null}
        </div>

        {!accessToken ? (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Acceso</div>
            {error ? <div className={styles.error}>{error}</div> : null}
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <div className={styles.label}>Email</div>
                <input className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
              </label>
              <label className={styles.field}>
                <div className={styles.label}>Contraseña</div>
                <input
                  className={styles.input}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                />
              </label>
            </div>
            <div className={styles.formActions}>
              <button className={styles.btn} type="button" onClick={() => void signIn()} disabled={busy}>
                {busy ? 'Ingresando…' : 'Ingresar'}
              </button>
            </div>
          </div>
        ) : null}

        {accessToken ? (
          <>
            <div className={styles.grid}>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Usuarios</div>
                <div className={styles.big}>{fmt(metrics?.users.total ?? 0)}</div>
                <div className={styles.muted}>Nuevos (30d): {fmt(metrics?.users.new ?? 0)}</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Spots</div>
                <div className={styles.big}>{fmt(metrics?.content.spots.total ?? 0)}</div>
                <div className={styles.muted}>Nuevos (30d): {fmt(metrics?.content.spots.new ?? 0)}</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Pro</div>
                <div className={styles.big}>{fmt(metrics?.users.tiers.pro ?? 0)}</div>
                <div className={styles.muted}>
                  Mensual: {fmt(metrics?.users.proCycles.monthly ?? 0)} · Anual: {fmt(metrics?.users.proCycles.annual ?? 0)}
                </div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Soporte</div>
                <div className={styles.big}>{fmt(metrics?.content.supportRequests.total ?? 0)}</div>
                <div className={styles.muted}>Nuevos (30d): {fmt(metrics?.content.supportRequests.new ?? 0)}</div>
              </div>
            </div>

            <div className={styles.split}>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Salud de servicios</div>
                <div className={styles.healthList}>
                  {Object.entries(health).map(([name, h]) => (
                    <div key={name} className={styles.healthRow}>
                      <div className={styles.healthName}>{name}</div>
                      <div className={h.ok ? styles.pillOk : styles.pillBad}>{h.ok ? 'OK' : 'ERROR'}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardTitle}>Detalle</div>
                <div className={styles.kv}>
                  <div className={styles.k}>Roles</div>
                  <div className={styles.v}>
                    admin {fmt(metrics?.users.roles.admin ?? 0)} · moderator {fmt(metrics?.users.roles.moderator ?? 0)} · user{' '}
                    {fmt(metrics?.users.roles.user ?? 0)}
                  </div>
                </div>
                <div className={styles.kv}>
                  <div className={styles.k}>Contenido</div>
                  <div className={styles.v}>
                    comentarios {fmt(metrics?.content.comments.total ?? 0)} · likes {fmt(metrics?.content.favorites.total ?? 0)} · planes{' '}
                    {fmt(metrics?.content.flightPlans.total ?? 0)}
                  </div>
                </div>
                <div className={styles.kv}>
                  <div className={styles.k}>Estado</div>
                  <div className={styles.v}>asOf {metrics?.asOf ?? '-'}</div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
