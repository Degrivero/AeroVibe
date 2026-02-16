import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'

import styles from './AdminPage.module.css'
import { useMeta } from '../app/useMeta'

type AdminUsersItem = {
  id: string
  email: string | null
  created_at: string | null
  confirmed_at: string | null
  last_sign_in_at: string | null
  role: string
  tier: string
  pro_cycle: string | null
  app_meta?: Record<string, unknown> | null
  profile?: {
    nickname?: string | null
    first_name?: string | null
    last_name?: string | null
    avatar_url?: string | null
    country?: string | null
    city?: string | null
  } | null
}

type AdminUsersResponse = {
  ok: true
  asOf: string
  total: number
  totalAuth?: number
  totalFiltered?: number
  truncated?: boolean
  page: number
  perPage: number
  pageCount: number
  hasPrev: boolean
  hasNext: boolean
  count: number
  items: AdminUsersItem[]
}

type AdminSpotItem = {
  id: string | number
  title?: string | null
  description?: string | null
  created_by?: string | null
  created_at?: string | null
  created_by_profile?: {
    nickname?: string | null
  } | null
}

type AdminSpotsResponse = {
  ok: true
  asOf: string
  total: number
  totalFiltered?: number
  page: number
  perPage: number
  pageCount: number
  hasPrev: boolean
  hasNext: boolean
  count: number
  items: AdminSpotItem[]
}

type SupportItem = {
  id: string | null
  name: string | null
  app_username: string | null
  email: string | null
  reason: string
  status: string
  subject: string | null
  message: string
  created_at: string | null
  updated_at: string | null
  resolved_at: string | null
}

type SupportResponse = {
  ok: true
  asOf: string
  total: number
  totalFiltered?: number
  page: number
  perPage: number
  pageCount: number
  hasPrev: boolean
  hasNext: boolean
  count: number
  items: SupportItem[]
}

type TrendPoint = {
  date: string
  count: number
}

type TrendResponse = {
  ok: true
  asOf: string
  daysBack: number
  total: number
  series: TrendPoint[]
}

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

type Health = { ok?: boolean; service?: string; ts?: string; since?: string; checkedAt?: string; error?: string }

type RangeDays = 30 | 90 | 180 | 365

type SectionKey = 'users' | 'spots' | 'pro' | 'support'

type TrendChartProps = {
  title: string
  description: string
  ariaLabel: string
  points: TrendPoint[]
  rangeDays: RangeDays
  onRangeChange: (value: RangeDays) => void
  loading: boolean
  error: string | null
}

const LS_ACCESS = 'aerovibe_admin_access_token'
const LS_REFRESH = 'aerovibe_admin_refresh_token'
const LS_EMAIL = 'aerovibe_admin_email'
const LS_HEALTH = 'aerovibe_admin_health_v1'
const PER_PAGE = 20

const RANGE_OPTIONS: Array<{ value: RangeDays; label: string }> = [
  { value: 30, label: '30 días' },
  { value: 90, label: '90 días' },
  { value: 180, label: '180 días' },
  { value: 365, label: '1 año' },
]

function apiBase() {
  const raw = ((import.meta.env.VITE_API_BASE_URL as string | undefined) || '').trim()
  const trimmed = raw.replace(/\/$/, '')
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '-'
  const dt = new Date(iso)
  if (!Number.isFinite(dt.getTime())) return '-'
  return `${pad2(dt.getDate())}-${pad2(dt.getMonth() + 1)}-${dt.getFullYear()} ${pad2(dt.getHours())}:${pad2(
    dt.getMinutes()
  )}`
}

function fmtDateOnly(isoDay: string) {
  const dt = new Date(`${isoDay}T00:00:00Z`)
  if (!Number.isFinite(dt.getTime())) return isoDay
  return `${pad2(dt.getUTCDate())}-${pad2(dt.getUTCMonth() + 1)}-${dt.getUTCFullYear()}`
}

function fmt(n: number) {
  try {
    return new Intl.NumberFormat().format(n)
  } catch {
    return String(n)
  }
}

function truncateText(value: string | null | undefined, max = 120) {
  const str = String(value ?? '').trim()
  if (!str) return '-'
  if (str.length <= max) return str
  return `${str.slice(0, max - 1)}…`
}

function normalizeDays(value: number): RangeDays {
  if (value === 90 || value === 180 || value === 365) return value
  return 30
}

function useDebouncedValue<T>(value: T, delayMs = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init)
  const data = await res.json().catch(() => null)
  return { res, data }
}

function TrendChart({
  title,
  description,
  ariaLabel,
  points,
  rangeDays,
  onRangeChange,
  loading,
  error,
}: TrendChartProps) {
  const sparkRef = useRef<HTMLDivElement | null>(null)
  const [hovered, setHovered] = useState<{ x: number; y: number; day: string; count: number } | null>(null)
  const isDenseRange = points.length > 180

  const maxCount = useMemo(() => {
    const max = points.reduce((acc, p) => Math.max(acc, p.count), 0)
    return max > 0 ? max : 1
  }, [points])

  function updateHover(e: MouseEvent<HTMLDivElement>, point: TrendPoint) {
    const host = sparkRef.current
    if (!host) return
    const rect = host.getBoundingClientRect()
    const xRaw = e.clientX - rect.left + host.scrollLeft
    const x = Math.max(36, Math.min(rect.width - 36, xRaw))
    const y = Math.max(8, e.clientY - rect.top)
    setHovered({ x, y, day: point.date, count: point.count })
  }

  return (
    <div className={styles.sparkWrap}>
      <div className={styles.sparkHeader}>
        <div className={styles.sparkTitle}>{title}</div>
        <select
          className={styles.sparkSelect}
          value={rangeDays}
          onChange={(e) => onRangeChange(normalizeDays(Number(e.target.value)))}
          aria-label="Rango de tiempo"
        >
          {RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.sparkHelp}>{description}</div>

      <div
        ref={sparkRef}
        className={styles.spark}
        style={
          isDenseRange
            ? {
                gridAutoColumns: '2px',
                gap: '1px',
                justifyContent: 'start',
                minWidth: `${Math.max(points.length * 3, 320)}px`,
              }
            : undefined
        }
        aria-label={ariaLabel}
        onMouseLeave={() => setHovered(null)}
      >
        {points.map((point) => {
          const height = Math.max(4, Math.round((point.count / maxCount) * 100))
          return (
            <div
              key={point.date}
              className={styles.bar}
              style={{ height: `${height}%` }}
              role="img"
              aria-label={`${fmtDateOnly(point.date)}: ${point.count}`}
              onMouseEnter={(e) => updateHover(e, point)}
              onMouseMove={(e) => updateHover(e, point)}
              onMouseLeave={() => setHovered(null)}
            />
          )
        })}

        {hovered ? (
          <div className={styles.sparkTooltip} style={{ left: hovered.x, top: hovered.y }}>
            {fmtDateOnly(hovered.day)} · {hovered.count}
          </div>
        ) : null}
      </div>

      {loading ? <div className={styles.sparkState}>Cargando evolución…</div> : null}
      {error ? <div className={styles.errorInline}>{error}</div> : null}
      {isDenseRange ? <div className={styles.sparkState}>Tip: podés desplazar horizontalmente el gráfico.</div> : null}
    </div>
  )
}

export function AdminPage() {
  useMeta({ title: 'Admin — AeroVibe', description: 'Admin dashboard' })

  const base = useMemo(() => apiBase(), [])
  const [section, setSection] = useState<'dashboard' | 'users' | 'spots' | 'pro' | 'support'>('dashboard')
  const [email, setEmail] = useState(() => window.localStorage.getItem(LS_EMAIL) || '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [accessToken, setAccessToken] = useState<string | null>(() => window.localStorage.getItem(LS_ACCESS))
  const [refreshToken, setRefreshToken] = useState<string | null>(() => window.localStorage.getItem(LS_REFRESH))

  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [health, setHealth] = useState<Record<string, Health>>({})

  const [rangeBySection, setRangeBySection] = useState<Record<SectionKey, RangeDays>>({
    users: 30,
    spots: 30,
    pro: 30,
    support: 30,
  })

  const [users, setUsers] = useState<AdminUsersItem[]>([])
  const [usersMeta, setUsersMeta] = useState({
    totalAuth: 0,
    totalFiltered: 0,
    asOf: null as string | null,
    truncated: false,
    page: 1,
    perPage: PER_PAGE,
    pageCount: 1,
    hasPrev: false,
    hasNext: false,
  })
  const [usersBusy, setUsersBusy] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [usersQueryInput, setUsersQueryInput] = useState('')
  const usersQuery = useDebouncedValue(usersQueryInput, 280)
  const [usersSort, setUsersSort] = useState<'created_at' | 'last_sign_in_at' | 'email' | 'role' | 'tier'>('created_at')
  const [usersDir, setUsersDir] = useState<'asc' | 'desc'>('desc')
  const [usersPage, setUsersPage] = useState(1)

  const [usersTrend, setUsersTrend] = useState<TrendResponse | null>(null)
  const [usersTrendBusy, setUsersTrendBusy] = useState(false)
  const [usersTrendError, setUsersTrendError] = useState<string | null>(null)

  const [proTrend, setProTrend] = useState<TrendResponse | null>(null)
  const [proTrendBusy, setProTrendBusy] = useState(false)
  const [proTrendError, setProTrendError] = useState<string | null>(null)

  const [spots, setSpots] = useState<AdminSpotItem[]>([])
  const [spotsMeta, setSpotsMeta] = useState({
    total: 0,
    asOf: null as string | null,
    page: 1,
    perPage: PER_PAGE,
    pageCount: 1,
    hasPrev: false,
    hasNext: false,
  })
  const [spotsBusy, setSpotsBusy] = useState(false)
  const [spotsError, setSpotsError] = useState<string | null>(null)
  const [spotsQueryInput, setSpotsQueryInput] = useState('')
  const spotsQuery = useDebouncedValue(spotsQueryInput, 280)
  const [spotsSort, setSpotsSort] = useState<'created_at' | 'title' | 'created_by'>('created_at')
  const [spotsDir, setSpotsDir] = useState<'asc' | 'desc'>('desc')
  const [spotsPage, setSpotsPage] = useState(1)

  const [spotsTrend, setSpotsTrend] = useState<TrendResponse | null>(null)
  const [spotsTrendBusy, setSpotsTrendBusy] = useState(false)
  const [spotsTrendError, setSpotsTrendError] = useState<string | null>(null)

  const [support, setSupport] = useState<SupportItem[]>([])
  const [supportMeta, setSupportMeta] = useState({
    total: 0,
    asOf: null as string | null,
    page: 1,
    perPage: PER_PAGE,
    pageCount: 1,
    hasPrev: false,
    hasNext: false,
  })
  const [supportBusy, setSupportBusy] = useState(false)
  const [supportError, setSupportError] = useState<string | null>(null)
  const [supportQueryInput, setSupportQueryInput] = useState('')
  const supportQuery = useDebouncedValue(supportQueryInput, 280)
  const [supportStatus, setSupportStatus] = useState<'all' | 'new' | 'open' | 'pending' | 'resolved' | 'closed'>('all')
  const [supportReason, setSupportReason] = useState<'all' | 'support' | 'bug' | 'account' | 'moderation' | 'marketplace' | 'other'>('all')
  const [supportSort, setSupportSort] = useState<'created_at' | 'updated_at' | 'email' | 'reason' | 'status'>('created_at')
  const [supportDir, setSupportDir] = useState<'asc' | 'desc'>('desc')
  const [supportPage, setSupportPage] = useState(1)

  const [supportTrend, setSupportTrend] = useState<TrendResponse | null>(null)
  const [supportTrendBusy, setSupportTrendBusy] = useState(false)
  const [supportTrendError, setSupportTrendError] = useState<string | null>(null)

  const rolesSummary = useMemo(() => {
    const roles = metrics?.users?.roles || {}
    const entries = Object.entries(roles).sort((a, b) => (b[1] || 0) - (a[1] || 0))
    const top = entries.filter(([, n]) => (n || 0) > 0).slice(0, 8)
    if (top.length === 0) return '-'
    return top.map(([k, n]) => `${k} ${fmt(n || 0)}`).join(' · ')
  }, [metrics])

  async function authedGet(path: string, tokenOverride?: string | null) {
    if (!base) throw new Error('Falta configurar VITE_API_BASE_URL.')
    const token = tokenOverride ?? accessToken
    if (!token) throw new Error('No hay sesión activa.')

    const { res, data } = await fetchJson(`${base}${path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.status === 401 && refreshToken) {
      const refreshed = await refreshSession()
      if (refreshed) return authedGet(path, refreshed)
    }

    if (!res.ok) {
      const msg = (data && typeof data.message === 'string' && data.message) || 'No pudimos cargar el recurso.'
      throw new Error(msg)
    }

    return data
  }

  async function loadHealth() {
    if (!base) return
    const nowIso = new Date().toISOString()
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
          return [label, { ok: false, error: `HTTP ${res?.status ?? 0}`, checkedAt: nowIso }] as const
        }

        const ok = typeof data?.ok === 'boolean' ? Boolean(data.ok) : true
        const ts = typeof data?.ts === 'string' ? String(data.ts) : nowIso
        return [label, ({ ...(data || {}), ok, ts, checkedAt: nowIso } as Health)] as const
      })
    )

    const map: Record<string, Health> = {}
    for (const [k, v] of results) map[k] = v

    const prevRaw = window.localStorage.getItem(LS_HEALTH)
    const prev = (prevRaw ? (JSON.parse(prevRaw) as Record<string, { ok: boolean; since: string }>) : {}) || {}
    const next: Record<string, { ok: boolean; since: string }> = { ...prev }
    for (const [name, h] of Object.entries(map)) {
      const ok = Boolean(h.ok)
      const prevRow = prev[name]
      if (!prevRow || prevRow.ok !== ok) {
        next[name] = { ok, since: nowIso }
      }
      map[name] = { ...h, since: next[name]?.since ?? nowIso }
    }
    window.localStorage.setItem(LS_HEALTH, JSON.stringify(next))

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

  async function loadUsers() {
    setUsersBusy(true)
    setUsersError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(usersPage))
      params.set('perPage', String(PER_PAGE))
      params.set('sort', usersSort)
      params.set('dir', usersDir)
      if (usersQuery.trim()) params.set('q', usersQuery.trim())
      if (section === 'pro') params.set('tier', 'pro')

      const data = (await authedGet(`/api/admin/users?${params.toString()}`)) as AdminUsersResponse
      setUsers(Array.isArray(data.items) ? data.items : [])
      const safePage = Number(data.page || usersPage)
      setUsersMeta({
        totalAuth: Number(data.totalAuth ?? data.total ?? 0),
        totalFiltered: Number(data.totalFiltered ?? data.total ?? 0),
        asOf: data.asOf || null,
        truncated: Boolean(data.truncated),
        page: safePage,
        perPage: Number(data.perPage || PER_PAGE),
        pageCount: Number(data.pageCount || 1),
        hasPrev: Boolean(data.hasPrev),
        hasNext: Boolean(data.hasNext),
      })
      if (safePage !== usersPage) setUsersPage(safePage)
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : 'No pudimos cargar usuarios.')
    } finally {
      setUsersBusy(false)
    }
  }

  async function loadUsersTrend(kind: 'users' | 'pro', days: RangeDays) {
    if (kind === 'users') {
      setUsersTrendBusy(true)
      setUsersTrendError(null)
    } else {
      setProTrendBusy(true)
      setProTrendError(null)
    }

    try {
      const data = (await authedGet(`/api/admin/users/trend?kind=${kind}&days=${days}`)) as TrendResponse
      if (kind === 'users') setUsersTrend(data)
      else setProTrend(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No pudimos cargar evolución de usuarios.'
      if (kind === 'users') setUsersTrendError(msg)
      else setProTrendError(msg)
    } finally {
      if (kind === 'users') setUsersTrendBusy(false)
      else setProTrendBusy(false)
    }
  }

  async function loadSpots() {
    setSpotsBusy(true)
    setSpotsError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(spotsPage))
      params.set('perPage', String(PER_PAGE))
      params.set('sort', spotsSort)
      params.set('dir', spotsDir)
      if (spotsQuery.trim()) params.set('q', spotsQuery.trim())

      const data = (await authedGet(`/api/admin/spots?${params.toString()}`)) as AdminSpotsResponse
      setSpots(Array.isArray(data.items) ? data.items : [])
      const safePage = Number(data.page || spotsPage)
      setSpotsMeta({
        total: Number(data.totalFiltered ?? data.total ?? 0),
        asOf: data.asOf || null,
        page: safePage,
        perPage: Number(data.perPage || PER_PAGE),
        pageCount: Number(data.pageCount || 1),
        hasPrev: Boolean(data.hasPrev),
        hasNext: Boolean(data.hasNext),
      })
      if (safePage !== spotsPage) setSpotsPage(safePage)
    } catch (e) {
      setSpotsError(e instanceof Error ? e.message : 'No pudimos cargar spots.')
    } finally {
      setSpotsBusy(false)
    }
  }

  async function loadSpotsTrend(days: RangeDays) {
    setSpotsTrendBusy(true)
    setSpotsTrendError(null)
    try {
      const q = spotsQuery.trim()
      const suffix = q ? `&q=${encodeURIComponent(q)}` : ''
      const data = (await authedGet(`/api/admin/spots/trend?days=${days}${suffix}`)) as TrendResponse
      setSpotsTrend(data)
    } catch (e) {
      setSpotsTrendError(e instanceof Error ? e.message : 'No pudimos cargar evolución de spots.')
    } finally {
      setSpotsTrendBusy(false)
    }
  }

  async function loadSupport() {
    setSupportBusy(true)
    setSupportError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(supportPage))
      params.set('perPage', String(PER_PAGE))
      params.set('sort', supportSort)
      params.set('dir', supportDir)
      if (supportQuery.trim()) params.set('q', supportQuery.trim())
      if (supportStatus !== 'all') params.set('status', supportStatus)
      if (supportReason !== 'all') params.set('reason', supportReason)

      const data = (await authedGet(`/api/admin/support/requests?${params.toString()}`)) as SupportResponse
      setSupport(Array.isArray(data.items) ? data.items : [])
      const safePage = Number(data.page || supportPage)
      setSupportMeta({
        total: Number(data.totalFiltered ?? data.total ?? 0),
        asOf: data.asOf || null,
        page: safePage,
        perPage: Number(data.perPage || PER_PAGE),
        pageCount: Number(data.pageCount || 1),
        hasPrev: Boolean(data.hasPrev),
        hasNext: Boolean(data.hasNext),
      })
      if (safePage !== supportPage) setSupportPage(safePage)
    } catch (e) {
      setSupportError(e instanceof Error ? e.message : 'No pudimos cargar solicitudes de soporte.')
    } finally {
      setSupportBusy(false)
    }
  }

  async function loadSupportTrend(days: RangeDays) {
    setSupportTrendBusy(true)
    setSupportTrendError(null)
    try {
      const params = new URLSearchParams()
      params.set('days', String(days))
      if (supportStatus !== 'all') params.set('status', supportStatus)
      if (supportReason !== 'all') params.set('reason', supportReason)

      const data = (await authedGet(`/api/admin/support/trend?${params.toString()}`)) as TrendResponse
      setSupportTrend(data)
    } catch (e) {
      setSupportTrendError(e instanceof Error ? e.message : 'No pudimos cargar evolución de soporte.')
    } finally {
      setSupportTrendBusy(false)
    }
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

  useEffect(() => {
    if (!accessToken) return
    if (section !== 'users' && section !== 'pro') return
    void loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, section, usersPage, usersSort, usersDir, usersQuery])

  useEffect(() => {
    if (!accessToken) return
    if (section === 'users') {
      void loadUsersTrend('users', rangeBySection.users)
    }
    if (section === 'pro') {
      void loadUsersTrend('pro', rangeBySection.pro)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, section, rangeBySection.users, rangeBySection.pro])

  useEffect(() => {
    if (!accessToken) return
    if (section !== 'spots') return
    void loadSpots()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, section, spotsPage, spotsSort, spotsDir, spotsQuery])

  useEffect(() => {
    if (!accessToken) return
    if (section !== 'spots') return
    void loadSpotsTrend(rangeBySection.spots)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, section, rangeBySection.spots, spotsQuery])

  useEffect(() => {
    if (!accessToken) return
    if (section !== 'support') return
    void loadSupport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, section, supportPage, supportSort, supportDir, supportQuery, supportStatus, supportReason])

  useEffect(() => {
    if (!accessToken) return
    if (section !== 'support') return
    void loadSupportTrend(rangeBySection.support)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, section, rangeBySection.support, supportStatus, supportReason])

  function setSectionRange(key: SectionKey, value: RangeDays) {
    setRangeBySection((prev) => ({ ...prev, [key]: value }))
  }

  function renderPager({
    page,
    pageCount,
    hasPrev,
    hasNext,
    onPrev,
    onNext,
    busy,
  }: {
    page: number
    pageCount: number
    hasPrev: boolean
    hasNext: boolean
    onPrev: () => void
    onNext: () => void
    busy: boolean
  }) {
    return (
      <div className={styles.pager}>
        <button className={styles.btnGhost} type="button" onClick={onPrev} disabled={!hasPrev || busy}>
          Anterior
        </button>
        <div className={styles.pagerLabel}>
          Página {fmt(page)} de {fmt(pageCount)}
        </div>
        <button className={styles.btnGhost} type="button" onClick={onNext} disabled={!hasNext || busy}>
          Siguiente
        </button>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <div>
            <h1 className={styles.h1}>Admin</h1>
            <div className={styles.muted}>Dashboard privado.</div>
          </div>
          {accessToken ? (
            <div className={styles.headActions}>
              {section !== 'dashboard' ? (
                <button className={styles.btnGhost} type="button" onClick={() => setSection('dashboard')}>
                  Volver
                </button>
              ) : null}
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
            {section === 'dashboard' ? (
              <>
                <div className={styles.grid}>
                  <button className={`${styles.card} ${styles.cardBtn}`} type="button" onClick={() => setSection('users')}>
                    <div className={styles.cardTitle}>Usuarios</div>
                    <div className={styles.big}>{fmt(metrics?.users.total ?? 0)}</div>
                    <div className={styles.muted}>Nuevos (30d): {fmt(metrics?.users.new ?? 0)}</div>
                  </button>
                  <button className={`${styles.card} ${styles.cardBtn}`} type="button" onClick={() => setSection('spots')}>
                    <div className={styles.cardTitle}>Spots</div>
                    <div className={styles.big}>{fmt(metrics?.content.spots.total ?? 0)}</div>
                    <div className={styles.muted}>Nuevos (30d): {fmt(metrics?.content.spots.new ?? 0)}</div>
                  </button>
                  <button className={`${styles.card} ${styles.cardBtn}`} type="button" onClick={() => setSection('pro')}>
                    <div className={styles.cardTitle}>Pro</div>
                    <div className={styles.big}>{fmt(metrics?.users.tiers.pro ?? 0)}</div>
                    <div className={styles.muted}>
                      Mensual: {fmt(metrics?.users.proCycles.monthly ?? 0)} · Anual: {fmt(metrics?.users.proCycles.annual ?? 0)}
                    </div>
                  </button>
                  <button className={`${styles.card} ${styles.cardBtn}`} type="button" onClick={() => setSection('support')}>
                    <div className={styles.cardTitle}>Soporte</div>
                    <div className={styles.big}>{fmt(metrics?.content.supportRequests.total ?? 0)}</div>
                    <div className={styles.muted}>Nuevos (30d): {fmt(metrics?.content.supportRequests.new ?? 0)}</div>
                  </button>
                </div>

                <div className={styles.split}>
                  <div className={styles.card}>
                    <div className={styles.cardTitle}>Salud de servicios</div>
                    <div className={styles.healthList}>
                      {Object.entries(health).map(([name, h]) => (
                        <div key={name} className={styles.healthRow}>
                          <div>
                            <div className={styles.healthName}>{name}</div>
                            <div className={styles.healthMeta}>
                              {h.ok ? 'OK' : 'ERROR'} desde {fmtDateTime(h.since)} · check {fmtDateTime(h.checkedAt)}
                            </div>
                          </div>
                          <div className={h.ok ? styles.pillOk : styles.pillBad}>{h.ok ? 'OK' : 'ERROR'}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.card}>
                    <div className={styles.cardTitle}>Detalle</div>
                    <div className={styles.kv}>
                      <div className={styles.k}>Roles</div>
                      <div className={styles.v}>{rolesSummary}</div>
                    </div>
                    <div className={styles.kv}>
                      <div className={styles.k}>Contenido</div>
                      <div className={styles.v}>
                        comentarios {fmt(metrics?.content.comments.total ?? 0)} · likes {fmt(metrics?.content.favorites.total ?? 0)} · planes{' '}
                        {fmt(metrics?.content.flightPlans.total ?? 0)}
                      </div>
                    </div>
                    <div className={styles.kv}>
                      <div className={styles.k}>Actualizado</div>
                      <div className={styles.v}>{fmtDateTime(metrics?.asOf ?? null)}</div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {section === 'users' || section === 'pro' ? (
              <div className={styles.card}>
                <div className={styles.cardTitle}>{section === 'pro' ? 'Usuarios Pro' : 'Usuarios'}</div>

                <TrendChart
                  title={`Evolución (${rangeBySection[section]}d) — nuevos`}
                  description={
                    section === 'pro'
                      ? 'Altas Pro por día en UTC. Tooltip inmediato sobre cada barra.'
                      : 'Usuarios creados por día en UTC. Tooltip inmediato sobre cada barra.'
                  }
                  ariaLabel="Evolución de usuarios"
                  points={section === 'pro' ? proTrend?.series ?? [] : usersTrend?.series ?? []}
                  rangeDays={rangeBySection[section]}
                  onRangeChange={(value) => setSectionRange(section, value)}
                  loading={section === 'pro' ? proTrendBusy : usersTrendBusy}
                  error={section === 'pro' ? proTrendError : usersTrendError}
                />

                <div className={styles.toolbar}>
                  <input
                    className={styles.search}
                    value={usersQueryInput}
                    onChange={(e) => {
                      setUsersQueryInput(e.target.value)
                      setUsersPage(1)
                    }}
                    placeholder="Buscar por email, id, rol, nombre…"
                  />
                  <select
                    className={styles.select}
                    value={usersSort}
                    onChange={(e) => {
                      setUsersSort(e.target.value as any)
                      setUsersPage(1)
                    }}
                  >
                    <option value="created_at">Creado</option>
                    <option value="last_sign_in_at">Ult. login</option>
                    <option value="email">Email</option>
                    <option value="role">Rol</option>
                    <option value="tier">Tier</option>
                  </select>
                  <select
                    className={styles.select}
                    value={usersDir}
                    onChange={(e) => {
                      setUsersDir(e.target.value as any)
                      setUsersPage(1)
                    }}
                  >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                  </select>
                  <button className={styles.btnGhost} type="button" onClick={() => void loadUsers()} disabled={usersBusy}>
                    {usersBusy ? 'Cargando…' : 'Recargar'}
                  </button>
                </div>

                {usersError ? <div className={styles.error}>{usersError}</div> : null}

                <div className={styles.legendLine}>
                  Mostrando {fmt(users.length)} en esta página · Total {section === 'pro' ? 'Pro' : 'usuarios'} {fmt(usersMeta.totalFiltered)} ·
                  Usuarios en Auth {fmt(usersMeta.totalAuth)} · Actualizado {fmtDateTime(usersMeta.asOf)}
                  {usersMeta.truncated ? ' · (muestreo truncado por maxUsers)' : ''}
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Nickname</th>
                        <th>Rol</th>
                        <th>Tier</th>
                        <th>Ciclo</th>
                        <th>Creado</th>
                        <th>Ult. login</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td className={styles.mono}>{u.email || '-'}</td>
                          <td>{u.profile?.nickname || '-'}</td>
                          <td className={styles.mono}>{u.role}</td>
                          <td className={styles.mono}>{u.tier}</td>
                          <td className={styles.mono}>{u.pro_cycle || '-'}</td>
                          <td className={styles.mono}>{fmtDateTime(u.created_at)}</td>
                          <td className={styles.mono}>{fmtDateTime(u.last_sign_in_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {renderPager({
                  page: usersMeta.page,
                  pageCount: usersMeta.pageCount,
                  hasPrev: usersMeta.hasPrev,
                  hasNext: usersMeta.hasNext,
                  onPrev: () => setUsersPage((p) => Math.max(1, p - 1)),
                  onNext: () => setUsersPage((p) => p + 1),
                  busy: usersBusy,
                })}
              </div>
            ) : null}

            {section === 'spots' ? (
              <div className={styles.card}>
                <div className={styles.cardTitle}>Spots</div>

                <TrendChart
                  title={`Evolución (${rangeBySection.spots}d) — nuevos`}
                  description="Spots creados por día en UTC. Tooltip inmediato sobre cada barra."
                  ariaLabel="Evolución de spots"
                  points={spotsTrend?.series ?? []}
                  rangeDays={rangeBySection.spots}
                  onRangeChange={(value) => setSectionRange('spots', value)}
                  loading={spotsTrendBusy}
                  error={spotsTrendError}
                />

                <div className={styles.toolbar}>
                  <input
                    className={styles.search}
                    value={spotsQueryInput}
                    onChange={(e) => {
                      setSpotsQueryInput(e.target.value)
                      setSpotsPage(1)
                    }}
                    placeholder="Buscar por id, title, created_by…"
                  />
                  <select
                    className={styles.select}
                    value={spotsSort}
                    onChange={(e) => {
                      setSpotsSort(e.target.value as any)
                      setSpotsPage(1)
                    }}
                  >
                    <option value="created_at">Creado</option>
                    <option value="title">Title</option>
                    <option value="created_by">Autor</option>
                  </select>
                  <select
                    className={styles.select}
                    value={spotsDir}
                    onChange={(e) => {
                      setSpotsDir(e.target.value as any)
                      setSpotsPage(1)
                    }}
                  >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                  </select>
                  <button className={styles.btnGhost} type="button" onClick={() => void loadSpots()} disabled={spotsBusy}>
                    {spotsBusy ? 'Cargando…' : 'Recargar'}
                  </button>
                </div>

                {spotsError ? <div className={styles.error}>{spotsError}</div> : null}

                <div className={styles.legendLine}>
                  Mostrando {fmt(spots.length)} en esta página · Total spots {fmt(spotsMeta.total)} · Actualizado {fmtDateTime(spotsMeta.asOf)}
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Autor</th>
                        <th>Creado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spots.map((s, idx) => (
                        <tr key={String(s?.id ?? `spot-${idx}`)}>
                          <td className={styles.mono}>{String(s?.id ?? '-')}</td>
                          <td>{String(s?.title ?? '-')}</td>
                          <td className={styles.mono}>{String(s?.created_by_profile?.nickname ?? s?.created_by ?? '-')}</td>
                          <td className={styles.mono}>{fmtDateTime(s?.created_at ?? null)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {renderPager({
                  page: spotsMeta.page,
                  pageCount: spotsMeta.pageCount,
                  hasPrev: spotsMeta.hasPrev,
                  hasNext: spotsMeta.hasNext,
                  onPrev: () => setSpotsPage((p) => Math.max(1, p - 1)),
                  onNext: () => setSpotsPage((p) => p + 1),
                  busy: spotsBusy,
                })}
              </div>
            ) : null}

            {section === 'support' ? (
              <div className={styles.card}>
                <div className={styles.cardTitle}>Soporte</div>

                <TrendChart
                  title={`Evolución (${rangeBySection.support}d) — nuevos`}
                  description="Solicitudes recibidas por el formulario de contacto (UTC)."
                  ariaLabel="Evolución de soporte"
                  points={supportTrend?.series ?? []}
                  rangeDays={rangeBySection.support}
                  onRangeChange={(value) => setSectionRange('support', value)}
                  loading={supportTrendBusy}
                  error={supportTrendError}
                />

                <div className={styles.toolbar}>
                  <input
                    className={styles.search}
                    value={supportQueryInput}
                    onChange={(e) => {
                      setSupportQueryInput(e.target.value)
                      setSupportPage(1)
                    }}
                    placeholder="Buscar por id, email, usuario, motivo o mensaje…"
                  />
                  <select
                    className={styles.select}
                    value={supportStatus}
                    onChange={(e) => {
                      setSupportStatus(e.target.value as any)
                      setSupportPage(1)
                    }}
                  >
                    <option value="all">Estado: todos</option>
                    <option value="new">new</option>
                    <option value="open">open</option>
                    <option value="pending">pending</option>
                    <option value="resolved">resolved</option>
                    <option value="closed">closed</option>
                  </select>
                  <select
                    className={styles.select}
                    value={supportReason}
                    onChange={(e) => {
                      setSupportReason(e.target.value as any)
                      setSupportPage(1)
                    }}
                  >
                    <option value="all">Motivo: todos</option>
                    <option value="support">support</option>
                    <option value="bug">bug</option>
                    <option value="account">account</option>
                    <option value="moderation">moderation</option>
                    <option value="marketplace">marketplace</option>
                    <option value="other">other</option>
                  </select>
                  <select
                    className={styles.select}
                    value={supportSort}
                    onChange={(e) => {
                      setSupportSort(e.target.value as any)
                      setSupportPage(1)
                    }}
                  >
                    <option value="created_at">Creado</option>
                    <option value="updated_at">Actualizado</option>
                    <option value="email">Email</option>
                    <option value="reason">Motivo</option>
                    <option value="status">Estado</option>
                  </select>
                  <select
                    className={styles.select}
                    value={supportDir}
                    onChange={(e) => {
                      setSupportDir(e.target.value as any)
                      setSupportPage(1)
                    }}
                  >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                  </select>
                  <button className={styles.btnGhost} type="button" onClick={() => void loadSupport()} disabled={supportBusy}>
                    {supportBusy ? 'Cargando…' : 'Recargar'}
                  </button>
                </div>

                {supportError ? <div className={styles.error}>{supportError}</div> : null}

                <div className={styles.legendLine}>
                  Mostrando {fmt(support.length)} en esta página · Total solicitudes {fmt(supportMeta.total)} · Actualizado{' '}
                  {fmtDateTime(supportMeta.asOf)}
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Email</th>
                        <th>Usuario app</th>
                        <th>Motivo</th>
                        <th>Estado</th>
                        <th>Creado</th>
                        <th>Mensaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {support.map((row, idx) => (
                        <tr key={String(row.id ?? `support-${idx}`)}>
                          <td className={styles.mono}>{row.id || '-'}</td>
                          <td className={styles.mono}>{row.email || '-'}</td>
                          <td className={styles.mono}>{row.app_username || '-'}</td>
                          <td className={styles.mono}>{row.reason || '-'}</td>
                          <td className={styles.mono}>{row.status || '-'}</td>
                          <td className={styles.mono}>{fmtDateTime(row.created_at)}</td>
                          <td>{truncateText(row.message, 140)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {renderPager({
                  page: supportMeta.page,
                  pageCount: supportMeta.pageCount,
                  hasPrev: supportMeta.hasPrev,
                  hasNext: supportMeta.hasNext,
                  onPrev: () => setSupportPage((p) => Math.max(1, p - 1)),
                  onNext: () => setSupportPage((p) => p + 1),
                  busy: supportBusy,
                })}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
