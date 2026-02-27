import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'

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
  pro_expires_at?: string | null
  suspended?: boolean
  blocked?: boolean
  report_count?: number
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
  suspended_at?: string | null
  report_count?: number
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
  last_message_preview?: string | null
  created_at: string | null
  updated_at: string | null
  resolved_at: string | null
  resolution_note?: string | null
  user_replies?: string | null
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

type AdminReportItem = {
  id: string
  reporter_user_id: string | null
  reported_user_id: string | null
  reported_type: 'spot' | 'comment'
  reported_id: string | null
  reason_code: string
  description: string | null
  status: 'new' | 'pending' | 'reviewed' | 'dismissed' | 'action_taken'
  created_at: string | null
  resolved_at?: string | null
  reporter_profile?: {
    nickname?: string | null
    first_name?: string | null
    last_name?: string | null
    avatar_url?: string | null
  } | null
  reported_profile?: {
    nickname?: string | null
    first_name?: string | null
    last_name?: string | null
    avatar_url?: string | null
  } | null
}

type AdminReportsResponse = {
  ok: true
  page: number
  perPage: number
  total: number
  items: AdminReportItem[]
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

type PendingMfaChallenge = {
  email: string
  password: string
  challengeId: string
  maskedEmail: string
  expiresInMinutes: number
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object') return value as Record<string, unknown>
  return {}
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function parseMfaRequiredPayload(payload: unknown) {
  const root = asRecord(payload)
  const data = asRecord(root.data)
  const payloadNode = asRecord(root.payload)
  const result = asRecord(root.result)
  const nested = asRecord(root.mfa)
  const nestedDataMfa = asRecord(data.mfa)
  const nestedPayloadMfa = asRecord(payloadNode.mfa)
  const nodes = [root, data, payloadNode, result, nested, nestedDataMfa, nestedPayloadMfa]
  const pickString = (...keys: string[]) => {
    for (const node of nodes) {
      for (const key of keys) {
        const value = asString(node[key])
        if (value) return value
      }
    }
    return null
  }

  const code = pickString('code')
  const challengeId = pickString('challengeId', 'challenge_id')
  const maskedEmail = pickString('maskedEmail', 'masked_email')
  const expiresRaw =
    root.expiresInMinutes ??
    root.expires_in_minutes ??
    data.expiresInMinutes ??
    data.expires_in_minutes ??
    payloadNode.expiresInMinutes ??
    payloadNode.expires_in_minutes ??
    result.expiresInMinutes ??
    result.expires_in_minutes ??
    nested.expiresInMinutes ??
    nested.expires_in_minutes ??
    nestedDataMfa.expiresInMinutes ??
    nestedDataMfa.expires_in_minutes ??
    nestedPayloadMfa.expiresInMinutes ??
    nestedPayloadMfa.expires_in_minutes
  const expiresParsed = Number(expiresRaw)
  const expiresInMinutes = Number.isFinite(expiresParsed) && expiresParsed > 0 ? expiresParsed : 10
  const required =
    code === 'MFA_EMAIL_REQUIRED' ||
    code === 'MFA_REQUIRED' ||
    code === 'MFA_CHALLENGE_REQUIRED' ||
    root.mfaRequired === true ||
    root.mfa_required === true ||
    data.mfaRequired === true ||
    data.mfa_required === true ||
    payloadNode.mfaRequired === true ||
    payloadNode.mfa_required === true ||
    result.mfaRequired === true ||
    result.mfa_required === true ||
    nested.required === true ||
    nestedDataMfa.required === true ||
    nestedPayloadMfa.required === true ||
    Boolean(challengeId)

  return { required, challengeId, maskedEmail, expiresInMinutes }
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
    supportRequests: { total: number; new: number; newCount?: number; supportPendingNew?: number }
  }
  reports?: { pending?: number; newCount?: number }
}

type Health = { ok?: boolean; service?: string; ts?: string; since?: string; checkedAt?: string; error?: string }

type RangeDays = 30 | 90 | 180

type SectionKey = 'users' | 'spots' | 'pro' | 'support' | 'reports'

const SECTION_CYCLE: SectionKey[] = ['users', 'spots', 'pro', 'support', 'reports']

type ReportModalState = {
  section: SectionKey
  from: string
  to: string
}

type TrendChartProps = {
  description: string
  ariaLabel: string
  points: TrendPoint[]
  rangeDays: RangeDays
  onRangeChange: (value: RangeDays) => void
  onOpenReport: () => void
  reportDisabled?: boolean
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
]

function reportStatusToApi(value: string): string {
  if (value === 'new') return 'pending'
  if (value === 'action_taken' || value === 'resolved') return 'action_taken'
  if (value === 'pending') return 'reviewed' // pending en UI = en revisión
  return value
}

function reportStatusFromApi(value: string): string {
  if (value === 'pending') return 'new'
  if (value === 'action_taken') return 'action_taken'
  return 'pending' // reviewed, dismissed -> pending
}

const REASON_LABELS: Record<string, string> = {
  illegal: 'Actividad ilegal o restringida',
  spam: 'Spam o contenido repetitivo',
  offensive: 'Contenido ofensivo o acoso',
  unsafe: 'Contenido peligroso / vuelo inseguro',
  copyright: 'Infracción de derechos de autor',
  scam: 'Estafa o engaño',
  policy: 'Incumplimiento de políticas de la comunidad',
  other: 'Otro',
}

const REPORT_SECTION_LABELS: Record<SectionKey, string> = {
  users: 'usuarios',
  pro: 'usuarios-pro',
  spots: 'spots',
  support: 'soporte',
  reports: 'reportes',
}

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

function formatUserLabel(
  profile?: { nickname?: string | null; first_name?: string | null; last_name?: string | null } | null,
  fallbackId?: string | null
) {
  const nickname = profile?.nickname?.trim()
  if (nickname) return nickname
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim()
  if (fullName) return fullName
  return fallbackId || '-'
}

function truncateText(value: string | null | undefined, max = 120) {
  const str = String(value ?? '').trim()
  if (!str) return '-'
  if (str.length <= max) return str
  return `${str.slice(0, max - 1)}…`
}

function normalizeDays(value: number): RangeDays {
  if (value === 90 || value === 180) return value
  return 30
}

function toIsoDayUTC(date: Date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
}

function shiftUtcDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function escapeCsvCell(value: string | number) {
  const text = String(value)
  if (!/[",\n]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}

function triggerCsvDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
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

type ThreadEntry = { date: string; text: string; author: 'admin' | 'user' }

function fmtThreadDate(iso: string): string {
  if (!iso?.trim()) return '-'
  try {
    const d = new Date(iso.trim())
    if (!Number.isFinite(d.getTime())) return iso
    return d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

function parseSupportThread(resolutionNote?: string | null, userReplies?: string | null): ThreadEntry[] {
  const entries: ThreadEntry[] = []
  function parseBlock(raw: string | null | undefined, author: 'admin' | 'user') {
    if (!raw?.trim()) return
    const parts = raw.split(/\n\n--- /)
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i].trim()
      if (!p) continue
      if (i === 0 && !p.includes(' ---')) {
        const firstLineEnd = p.indexOf('\n')
        const date = firstLineEnd >= 0 ? p.slice(0, firstLineEnd).replace(/ ---$/, '').trim() : ''
        const text = firstLineEnd >= 0 ? p.slice(firstLineEnd + 1).trim() : p
        if (text) entries.push({ date, text, author })
      } else {
        const sep = p.indexOf(' ---\n')
        const date = sep >= 0 ? p.slice(0, sep).trim() : ''
        const text = sep >= 0 ? p.slice(sep + 5).trim() : p
        if (text) entries.push({ date, text, author })
      }
    }
  }
  parseBlock(resolutionNote, 'admin')
  parseBlock(userReplies, 'user')
  entries.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  return entries
}

function TrendChart({
  description,
  ariaLabel,
  points,
  rangeDays,
  onRangeChange,
  onOpenReport,
  reportDisabled,
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
        <div className={styles.sparkControls}>
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
          <button className={styles.sparkDownload} type="button" onClick={onOpenReport} disabled={reportDisabled}>
            Descargar reporte
          </button>
        </div>
      </div>

      {description ? <div className={styles.sparkHelp}>{description}</div> : null}

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
              title={`${fmtDateOnly(point.date)}: ${point.count}`}
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
  const [section, setSection] = useState<'dashboard' | 'users' | 'spots' | 'pro' | 'support' | 'reports'>('dashboard')
  const [email, setEmail] = useState(() => window.localStorage.getItem(LS_EMAIL) || '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mfaPending, setMfaPending] = useState<PendingMfaChallenge | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaBusy, setMfaBusy] = useState(false)
  const [mfaError, setMfaError] = useState<string | null>(null)
  const mfaInputRef = useRef<HTMLInputElement | null>(null)

  const [accessToken, setAccessToken] = useState<string | null>(() => window.localStorage.getItem(LS_ACCESS))
  const [refreshToken, setRefreshToken] = useState<string | null>(() => window.localStorage.getItem(LS_REFRESH))

  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [health, setHealth] = useState<Record<string, Health>>({})

  const [rangeBySection, setRangeBySection] = useState<Record<SectionKey, RangeDays>>({
    users: 30,
    spots: 30,
    pro: 30,
    support: 30,
    reports: 30,
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
  const [userMessageModal, setUserMessageModal] = useState<AdminUsersItem | null>(null)
  const [userMessageText, setUserMessageText] = useState('')
  const [userMessageBusy, setUserMessageBusy] = useState(false)
  const [userMessageError, setUserMessageError] = useState<string | null>(null)
  const [usersQueryInput, setUsersQueryInput] = useState('')
  const usersQuery = useDebouncedValue(usersQueryInput, 280)
  const [usersSort, setUsersSort] = useState<'created_at' | 'last_sign_in_at' | 'email' | 'role' | 'tier'>('created_at')
  const [usersDir, setUsersDir] = useState<'asc' | 'desc'>('desc')
  const [usersStatus, setUsersStatus] = useState<'all' | 'active' | 'inactive'>('all')
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
  const [spotsStatus, setSpotsStatus] = useState<'all' | 'active' | 'inactive'>('all')
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
  const [supportStatus, setSupportStatus] = useState<'all' | 'new' | 'pending' | 'resolved'>('all')
  const [supportReason, setSupportReason] = useState<'all' | 'support' | 'bug' | 'account' | 'moderation' | 'marketplace' | 'other'>('all')
  const [supportSort, setSupportSort] = useState<'created_at' | 'updated_at' | 'email' | 'reason' | 'status'>('created_at')
  const [supportDir, setSupportDir] = useState<'asc' | 'desc'>('desc')
  const [supportPage, setSupportPage] = useState(1)

  const [supportTrend, setSupportTrend] = useState<TrendResponse | null>(null)
  const [supportTrendBusy, setSupportTrendBusy] = useState(false)
  const [supportTrendError, setSupportTrendError] = useState<string | null>(null)

  const [reports, setReports] = useState<AdminReportItem[]>([])
  const [reportsMeta, setReportsMeta] = useState({
    total: 0,
    page: 1,
    perPage: PER_PAGE,
    pageCount: 1,
    hasPrev: false,
    hasNext: false,
  })
  const [reportsBusy, setReportsBusy] = useState(false)
  const [reportsError, setReportsError] = useState<string | null>(null)
  const [reportsQueryInput, setReportsQueryInput] = useState('')
  const reportsQuery = useDebouncedValue(reportsQueryInput, 280)
  const [reportsStatus, setReportsStatus] = useState<'all' | AdminReportItem['status']>('all')
  const [reportsType, setReportsType] = useState<'all' | AdminReportItem['reported_type']>('all')
  const [reportsPage, setReportsPage] = useState(1)

  const [reportsTrend, setReportsTrend] = useState<TrendResponse | null>(null)
  const [reportsTrendBusy, setReportsTrendBusy] = useState(false)
  const [reportsTrendError, setReportsTrendError] = useState<string | null>(null)

  const [reportModal, setReportModal] = useState<ReportModalState | null>(null)
  const [reportStatusUpdating, setReportStatusUpdating] = useState<string | null>(null)
  const [reportDetailModal, setReportDetailModal] = useState<AdminReportItem | null>(null)
  const [reportDetailMessageToReporter, setReportDetailMessageToReporter] = useState('')
  const [reportDetailMessageToReported, setReportDetailMessageToReported] = useState('')
  const [reportDetailStatus, setReportDetailStatus] = useState<string>('pending')
  const [reportDetailBusy, setReportDetailBusy] = useState(false)
  const [reportDetailError, setReportDetailError] = useState<string | null>(null)
  const [reportBusy, setReportBusy] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  const [supportStatusUpdating, setSupportStatusUpdating] = useState<string | null>(null)
  const [supportModal, setSupportModal] = useState<SupportItem | null>(null)
  const [supportModalBusy, setSupportModalBusy] = useState(false)
  const [supportModalThreadLoading, setSupportModalThreadLoading] = useState(false)
  const [supportModalError, setSupportModalError] = useState<string | null>(null)
  const [supportModalMessage, setSupportModalMessage] = useState('')
  const [supportModalStatus, setSupportModalStatus] = useState<string>('pending')

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

  async function authedPost(path: string, body?: Record<string, unknown>, tokenOverride?: string | null) {
    if (!base) throw new Error('Falta configurar VITE_API_BASE_URL.')
    const token = tokenOverride ?? accessToken
    if (!token) throw new Error('No hay sesión activa.')

    const { res, data } = await fetchJson(`${base}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (res.status === 401 && refreshToken) {
      const refreshed = await refreshSession()
      if (refreshed) return authedPost(path, body, refreshed)
    }

    if (!res.ok) {
      const msg = (data && typeof data.message === 'string' && data.message) || 'No pudimos completar la acción.'
      throw new Error(msg)
    }

    return data
  }

  async function authedPatch(path: string, body?: Record<string, unknown>, tokenOverride?: string | null) {
    if (!base) throw new Error('Falta configurar VITE_API_BASE_URL.')
    const token = tokenOverride ?? accessToken
    if (!token) throw new Error('No hay sesión activa.')

    const { res, data } = await fetchJson(`${base}${path}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (res.status === 401 && refreshToken) {
      const refreshed = await refreshSession()
      if (refreshed) return authedPatch(path, body, refreshed)
    }

    if (!res.ok) {
      const msg = (data && typeof data.message === 'string' && data.message) || 'No pudimos actualizar.'
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
      if (usersStatus !== 'all') params.set('status', usersStatus)

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
      if (spotsStatus !== 'all') params.set('status', spotsStatus)

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

  async function loadReportsTrend(days: RangeDays) {
    setReportsTrendBusy(true)
    setReportsTrendError(null)
    try {
      const params = new URLSearchParams()
      params.set('days', String(days))
      if (reportsStatus !== 'all') params.set('status', reportStatusToApi(reportsStatus))
      if (reportsType !== 'all') params.set('reported_type', reportsType)
      const data = (await authedGet(`/api/admin/reports/trend?${params.toString()}`)) as TrendResponse
      setReportsTrend(data)
    } catch (e) {
      setReportsTrendError(e instanceof Error ? e.message : 'No pudimos cargar evolución de reportes.')
    } finally {
      setReportsTrendBusy(false)
    }
  }

  async function loadReports() {
    setReportsBusy(true)
    setReportsError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(reportsPage))
      params.set('perPage', String(PER_PAGE))
      if (reportsStatus !== 'all') params.set('status', reportStatusToApi(reportsStatus))
      if (reportsType !== 'all') params.set('reported_type', reportsType)
      if (reportsQuery.trim()) params.set('search', reportsQuery.trim())

      const data = (await authedGet(`/api/admin/reports?${params.toString()}`)) as AdminReportsResponse
      setReports(Array.isArray(data.items) ? data.items : [])
      const total = Number(data.total ?? 0)
      const perPage = Number(data.perPage || PER_PAGE)
      const pageCount = Math.max(1, Math.ceil(total / perPage))
      const safePage = Number(data.page || reportsPage)
      setReportsMeta({
        total,
        page: safePage,
        perPage,
        pageCount,
        hasPrev: safePage > 1,
        hasNext: safePage < pageCount,
      })
      if (safePage !== reportsPage) setReportsPage(safePage)
    } catch (e) {
      setReportsError(e instanceof Error ? e.message : 'No pudimos cargar reportes.')
    } finally {
      setReportsBusy(false)
    }
  }

  async function handleReportAction(reportId: string, action: 'resolve' | 'delete' | 'suspend') {
    setReportsBusy(true)
    setReportsError(null)
    try {
      if (action === 'resolve') {
        await authedPost(`/api/admin/reports/${reportId}/resolve`)
      } else if (action === 'delete') {
        await authedPost(`/api/admin/reports/${reportId}/delete-content`)
      } else {
        await authedPost(`/api/admin/reports/${reportId}/suspend-user`)
      }
      await loadReports()
    } catch (e) {
      setReportsError(e instanceof Error ? e.message : 'No pudimos actualizar el reporte.')
    } finally {
      setReportsBusy(false)
    }
  }

  async function updateReportStatus(id: string, newStatus: string) {
    if (!id) return
    setReportStatusUpdating(id)
    setReportsError(null)
    try {
      await authedPost(`/api/admin/reports/${id}/update-status`, { status: reportStatusToApi(newStatus) })
      await loadReports()
      setReportDetailModal((prev) => (prev?.id === id ? { ...prev, status: reportStatusToApi(newStatus) as AdminReportItem['status'] } : prev))
    } catch (e) {
      setReportsError(e instanceof Error ? e.message : 'No pudimos actualizar el estado.')
    } finally {
      setReportStatusUpdating(null)
    }
  }

  function openReportDetailModal(row: AdminReportItem) {
    setReportDetailModal(row)
    setReportDetailStatus(reportStatusFromApi(row.status))
    setReportDetailMessageToReporter('')
    setReportDetailMessageToReported('')
    setReportDetailError(null)
  }

  async function sendReportDetailMessages() {
    if (!reportDetailModal?.id || !base || !accessToken) return
    const hasMsg = reportDetailMessageToReporter.trim() || reportDetailMessageToReported.trim()
    if (!hasMsg) return
    setReportDetailBusy(true)
    setReportDetailError(null)
    try {
      await authedPost(`/api/admin/reports/${reportDetailModal.id}/messages`, {
        messageToReporter: reportDetailMessageToReporter.trim() || undefined,
        messageToReported: reportDetailMessageToReported.trim() || undefined,
        status: reportStatusToApi(reportDetailStatus),
      })
      setReportDetailMessageToReporter('')
      setReportDetailMessageToReported('')
      await loadReports()
      setReportDetailModal((prev) =>
        prev ? { ...prev, status: reportStatusToApi(reportDetailStatus) as AdminReportItem['status'] } : prev
      )
    } catch (e) {
      setReportDetailError(e instanceof Error ? e.message : 'No pudimos enviar.')
    } finally {
      setReportDetailBusy(false)
    }
  }

  async function handleUserUnsuspend(userId: string) {
    setUsersBusy(true)
    setUsersError(null)
    try {
      await authedPost('/api/admin/users/unsuspend', { userId })
      await loadUsers()
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : 'No pudimos reactivar al usuario.')
    } finally {
      setUsersBusy(false)
    }
  }

  async function handleUserBlock(userId: string) {
    setUsersBusy(true)
    setUsersError(null)
    try {
      await authedPost('/api/admin/users/block', { userId })
      await loadUsers()
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : 'No pudimos bloquear al usuario.')
    } finally {
      setUsersBusy(false)
    }
  }

  function openUserMessageModal(user: AdminUsersItem) {
    setUserMessageModal(user)
    setUserMessageText('')
    setUserMessageError(null)
  }

  async function updateUserRole(userId: string, newRole: string) {
    if (!base || !accessToken) return
    setUsersBusy(true)
    setUsersError(null)
    try {
      await authedPost(`/api/admin/users/${userId}/role`, {
        role: newRole,
        reason_code: 'policy',
      })
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : 'No pudimos actualizar el rol.')
    } finally {
      setUsersBusy(false)
    }
  }

  async function sendUserMessage() {
    if (!userMessageModal?.id || !userMessageText.trim() || !base || !accessToken) return
    setUserMessageBusy(true)
    setUserMessageError(null)
    try {
      await authedPost(`/api/admin/users/${userMessageModal.id}/message`, {
        message: userMessageText.trim(),
      })
      setUserMessageText('')
      setUserMessageModal(null)
    } catch (e) {
      setUserMessageError(e instanceof Error ? e.message : 'No pudimos enviar.')
    } finally {
      setUserMessageBusy(false)
    }
  }

  async function handleUserUnblock(userId: string) {
    setUsersBusy(true)
    setUsersError(null)
    try {
      await authedPost('/api/admin/users/unblock', { userId })
      await loadUsers()
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : 'No pudimos desbloquear al usuario.')
    } finally {
      setUsersBusy(false)
    }
  }

  async function openSupportModal(item: SupportItem) {
    setSupportModal(item)
    setSupportModalMessage('')
    setSupportModalStatus(item.status === 'new' ? 'pending' : item.status === 'resolved' ? 'resolved' : 'pending')
    setSupportModalError(null)
    setSupportModalThreadLoading(true)
    if (item.id && item.status === 'new') {
      try {
        await authedPost(`/api/admin/support/requests/${item.id}/open`, {})
        await loadSupport()
        setSupportModal((prev) => (prev ? { ...prev, status: 'pending' } : prev))
        setSupportModalStatus('pending')
      } catch {}
    }
    if (item.id) {
      try {
        const full = (await authedGet(`/api/admin/support/requests/${item.id}`)) as SupportItem
        setSupportModal((prev) => (prev?.id === full.id ? { ...prev, ...full } : prev))
      } catch {
        setSupportModal((prev) => prev)
      } finally {
        setSupportModalThreadLoading(false)
      }
    } else {
      setSupportModalThreadLoading(false)
    }
  }

  async function updateSupportStatus(id: string, newStatus: string) {
    if (!id) return
    setSupportStatusUpdating(id)
    setSupportError(null)
    try {
      await authedPatch(`/api/admin/support/requests/${id}/status`, { status: newStatus })
      await loadSupport()
      setSupportModal((prev) => (prev?.id === id ? { ...prev, status: newStatus } : prev))
    } catch (e) {
      setSupportError(e instanceof Error ? e.message : 'No pudimos actualizar el estado.')
    } finally {
      setSupportStatusUpdating(null)
    }
  }

  async function sendSupportReply() {
    if (!supportModal?.id || !base || !accessToken) return
    setSupportModalBusy(true)
    setSupportModalError(null)
    try {
      await authedPost(`/api/admin/support/requests/${supportModal.id}/reply`, {
        message: supportModalMessage.trim(),
        status: supportModalStatus,
      })
      setSupportModalMessage('')
      await loadSupport()
      if (supportModalStatus === 'resolved') {
        setSupportModal(null)
      } else {
        const full = (await authedGet(`/api/admin/support/requests/${supportModal.id}`)) as SupportItem
        setSupportModal((prev) => (prev?.id === full.id ? { ...prev, ...full } : prev))
      }
    } catch (e) {
      setSupportModalError(e instanceof Error ? e.message : 'No pudimos enviar.')
    } finally {
      setSupportModalBusy(false)
    }
  }

  async function handleSpotReactivate(spotId: string | number) {
    setSpotsBusy(true)
    setSpotsError(null)
    try {
      await authedPost(`/api/admin/spots/${spotId}/reactivate`)
      await loadSpots()
    } catch (e) {
      setSpotsError(e instanceof Error ? e.message : 'No pudimos reactivar el spot.')
    } finally {
      setSpotsBusy(false)
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
    setMfaError(null)
    if (!base) return setError('Falta configurar VITE_API_BASE_URL.')
    if (!email.trim() || !password) return setError('Completá email y contraseña.')

    setBusy(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()

      const completeSignIn = async (payload: AuthPayload) => {
        if (!payload?.accessToken) throw new Error('Respuesta inválida del servidor.')

        await Promise.all([loadMetrics(payload.accessToken), loadHealth()])

        window.localStorage.setItem(LS_EMAIL, normalizedEmail)
        window.localStorage.setItem(LS_ACCESS, payload.accessToken)
        window.localStorage.setItem(LS_REFRESH, payload.refreshToken || '')

        setAccessToken(payload.accessToken)
        setRefreshToken(payload.refreshToken || null)
        setPassword('')
        setMfaPending(null)
        setMfaCode('')
        setMfaError(null)
      }

      const { res, data } = await fetchJson(`${base}/api/iam/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      })

      const mfaPayload = parseMfaRequiredPayload(data)
      const isMfaLoginFlow = res.status === 202 || mfaPayload.required
      if (isMfaLoginFlow) {
        if (!mfaPayload.challengeId) {
          throw new Error('El servidor pidió MFA pero no devolvió challengeId.')
        }
        setMfaPending({
          email: normalizedEmail,
          password,
          challengeId: mfaPayload.challengeId,
          maskedEmail: mfaPayload.maskedEmail || normalizedEmail,
          expiresInMinutes: mfaPayload.expiresInMinutes,
        })
        setMfaCode('')
        setMfaError(null)
        setPassword('')
        return
      }

      if (!res.ok) {
        const msg =
          (data && typeof data.message === 'string' && data.message) ||
          (data && typeof data.error === 'string' && data.error) ||
          'No pudimos iniciar sesión.'
        throw new Error(msg)
      }

      await completeSignIn(data as AuthPayload)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos iniciar sesión.')
    } finally {
      setBusy(false)
    }
  }

  async function submitMfaCode() {
    if (!base || !mfaPending) return
    const typedCode = mfaCode.trim()
    if (!typedCode) {
      setMfaError('Ingresa el código MFA para continuar.')
      return
    }

    setMfaBusy(true)
    setMfaError(null)
    setError(null)

    try {
      const verify = await fetchJson(`${base}/api/iam/mfa/login/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: mfaPending.email,
          password: mfaPending.password,
          challengeId: mfaPending.challengeId,
          code: typedCode,
        }),
      })

      if (!verify.res.ok) {
        const msg =
          (verify.data && typeof verify.data.message === 'string' && verify.data.message) ||
          (verify.data && typeof verify.data.error === 'string' && verify.data.error) ||
          'No pudimos verificar MFA.'
        throw new Error(msg)
      }

      const payload = verify.data as AuthPayload
      if (!payload?.accessToken) {
        throw new Error('Respuesta inválida del servidor al verificar MFA.')
      }

      await Promise.all([loadMetrics(payload.accessToken), loadHealth()])
      window.localStorage.setItem(LS_EMAIL, mfaPending.email)
      window.localStorage.setItem(LS_ACCESS, payload.accessToken)
      window.localStorage.setItem(LS_REFRESH, payload.refreshToken || '')
      setAccessToken(payload.accessToken)
      setRefreshToken(payload.refreshToken || null)
      setMfaPending(null)
      setMfaCode('')
      setMfaError(null)
    } catch (e) {
      setMfaError(e instanceof Error ? e.message : 'No pudimos verificar MFA.')
    } finally {
      setMfaBusy(false)
    }
  }

  useEffect(() => {
    if (!mfaPending) return
    const timer = window.setTimeout(() => mfaInputRef.current?.focus(), 50)
    return () => window.clearTimeout(timer)
  }, [mfaPending])

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
  }, [accessToken, section, usersPage, usersSort, usersDir, usersQuery, usersStatus])

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
  }, [accessToken, section, spotsPage, spotsSort, spotsDir, spotsQuery, spotsStatus])

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

  useEffect(() => {
    if (!accessToken) return
    if (section !== 'reports') return
    void loadReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, section, reportsPage, reportsQuery, reportsStatus, reportsType])

  useEffect(() => {
    if (!accessToken) return
    if (section !== 'reports') return
    void loadReportsTrend(rangeBySection.reports)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, section, rangeBySection.reports, reportsStatus, reportsType])

  function setSectionRange(key: SectionKey, value: RangeDays) {
    setRangeBySection((prev) => ({ ...prev, [key]: value }))
  }

  function openReportModal(sectionKey: SectionKey, points: TrendPoint[]) {
    const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
    const now = new Date()
    const from = sorted[0]?.date || toIsoDayUTC(shiftUtcDays(now, -29))
    const to = sorted[sorted.length - 1]?.date || toIsoDayUTC(now)
    setReportError(null)
    setReportModal({ section: sectionKey, from, to })
  }

  function buildTrendPathForReport(sectionKey: SectionKey, days: number) {
    if (sectionKey === 'users') return `/api/admin/users/trend?kind=users&days=${days}`
    if (sectionKey === 'pro') return `/api/admin/users/trend?kind=pro&days=${days}`
    if (sectionKey === 'spots') {
      const q = spotsQuery.trim()
      return `/api/admin/spots/trend?days=${days}${q ? `&q=${encodeURIComponent(q)}` : ''}`
    }

    if (sectionKey === 'support') {
      const params = new URLSearchParams()
      params.set('days', String(days))
      if (supportStatus !== 'all') params.set('status', supportStatus)
      if (supportReason !== 'all') params.set('reason', supportReason)
      return `/api/admin/support/trend?${params.toString()}`
    }
    if (sectionKey === 'reports') {
      const params = new URLSearchParams()
      params.set('days', String(days))
      if (reportsStatus !== 'all') params.set('status', reportStatusToApi(reportsStatus))
      if (reportsType !== 'all') params.set('reported_type', reportsType)
      return `/api/admin/reports/trend?${params.toString()}`
    }
    return `/api/admin/support/trend?days=${days}`
  }

  async function downloadReportCsv() {
    if (!reportModal) return
    setReportBusy(true)
    setReportError(null)
    try {
      const fromDay = reportModal.from
      const toDay = reportModal.to
      if (!fromDay || !toDay) throw new Error('Seleccioná fecha desde y hasta.')
      if (fromDay > toDay) throw new Error('La fecha "desde" no puede ser mayor a "hasta".')

      const fromMs = Date.parse(`${fromDay}T00:00:00Z`)
      const toMs = Date.parse(`${toDay}T00:00:00Z`)
      if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) throw new Error('Rango de fechas inválido.')

      const rawDays = Math.floor((toMs - fromMs) / 86400000) + 1
      const queryDays = Math.max(7, Math.min(365, rawDays))
      const path = buildTrendPathForReport(reportModal.section, queryDays)
      const data = (await authedGet(path)) as TrendResponse

      const filtered = (data.series || []).filter((point) => point.date >= fromDay && point.date <= toDay)
      const header = ['fecha', 'cantidad', 'seccion']
      const rows = filtered.map((point) => [point.date, String(point.count), REPORT_SECTION_LABELS[reportModal.section]])
      const csv = [header, ...rows].map((row) => row.map((cell) => escapeCsvCell(cell)).join(',')).join('\n')

      const filename = `admin-${REPORT_SECTION_LABELS[reportModal.section]}-${fromDay}_a_${toDay}.csv`
      triggerCsvDownload(csv, filename)
      setReportModal(null)
    } catch (e) {
      setReportError(e instanceof Error ? e.message : 'No pudimos generar el reporte.')
    } finally {
      setReportBusy(false)
    }
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
            <h1 className={styles.h1}>
              <Link to="/__admin" className={styles.adminLink} onClick={() => setSection('dashboard')}>Admin</Link>
            </h1>
            <div className={styles.muted}>
              Dashboard privado
              {accessToken ? (
                <>
                  {' · '}
                  <button
                    className={styles.btnGhost}
                    type="button"
                    onClick={() => void Promise.all([loadMetrics(), loadHealth()])}
                    style={{ display: 'inline', padding: '0 8px', height: 'auto', marginLeft: 4 }}
                  >
                    Actualizar
                  </button>
                </>
              ) : null}
            </div>
          </div>
          {accessToken ? (
            <div className={styles.headActions}>
              <button
                className={styles.btnGhost}
                type="button"
                onClick={() => {
                  const idx = section === 'dashboard' ? SECTION_CYCLE.length : SECTION_CYCLE.indexOf(section as SectionKey)
                  const nextIdx = idx <= 0 ? SECTION_CYCLE.length - 1 : idx - 1
                  setSection(SECTION_CYCLE[nextIdx])
                }}
              >
                Anterior
              </button>
              <button
                className={styles.btnGhost}
                type="button"
                onClick={() => {
                  const idx = section === 'dashboard' ? -1 : SECTION_CYCLE.indexOf(section as SectionKey)
                  const nextIdx = idx < 0 || idx >= SECTION_CYCLE.length - 1 ? 0 : idx + 1
                  setSection(SECTION_CYCLE[nextIdx])
                }}
              >
                Siguiente
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
                    <div className={styles.big}>{fmt(metrics?.content.supportRequests.supportPendingNew ?? metrics?.content.supportRequests.total ?? 0)}</div>
                    <div className={styles.muted}>new: {fmt(metrics?.content.supportRequests.newCount ?? metrics?.content.supportRequests.new ?? 0)}</div>
                  </button>
                  <button className={`${styles.card} ${styles.cardBtn}`} type="button" onClick={() => setSection('reports')}>
                    <div className={styles.cardTitle}>Reportes</div>
                    <div className={styles.big}>{fmt(metrics?.reports?.pending ?? 0)}</div>
                    <div className={styles.muted}>Pendientes de revisión</div>
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
                  description=""
                  ariaLabel="Evolución de usuarios"
                  points={section === 'pro' ? proTrend?.series ?? [] : usersTrend?.series ?? []}
                  rangeDays={rangeBySection[section]}
                  onRangeChange={(value) => setSectionRange(section, value)}
                  onOpenReport={() => openReportModal(section, section === 'pro' ? proTrend?.series ?? [] : usersTrend?.series ?? [])}
                  reportDisabled={section === 'pro' ? proTrendBusy : usersTrendBusy}
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
                  <select
                    className={styles.select}
                    value={usersStatus}
                    onChange={(e) => {
                      setUsersStatus(e.target.value as 'all' | 'active' | 'inactive')
                      setUsersPage(1)
                    }}
                  >
                    <option value="all">Estado: todos</option>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo (suspendidos)</option>
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
                        <th>Nickname</th>
                        <th>Email</th>
                        <th>Rol</th>
                        <th>Tier</th>
                        <th>Estado</th>
                        <th>Ciclo</th>
                        <th>Creado</th>
                        <th>Ult. login</th>
                        {section === 'pro' ? (
                          <th>Fecha de vencimiento</th>
                        ) : (
                          <th>Acciones</th>
                        )}
                        <th>Reportes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr
                          key={u.id}
                          className={styles.clickableRow}
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest('button')) return
                            openUserMessageModal(u)
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if ((e.target as HTMLElement).closest('button')) return
                            if (e.key === 'Enter') openUserMessageModal(u)
                          }}
                        >
                          <td>{u.profile?.nickname || '-'}</td>
                          <td className={styles.mono}>{u.email || '-'}</td>
                          <td>
                            <select
                              className={styles.select}
                              value={u.role}
                              onChange={(e) => {
                                e.stopPropagation()
                                void updateUserRole(u.id, e.target.value)
                              }}
                              onClick={(e) => e.stopPropagation()}
                              disabled={usersBusy}
                            >
                              <option value="user">user</option>
                              <option value="moderator">moderator</option>
                              <option value="admin">admin</option>
                            </select>
                          </td>
                          <td className={styles.mono}>{u.tier}</td>
                          <td className={styles.mono}>{u.suspended ? 'Inactivo' : 'Activo'}</td>
                          <td className={styles.mono}>{u.pro_cycle || '-'}</td>
                          <td className={styles.mono}>{fmtDateTime(u.created_at)}</td>
                          <td className={styles.mono}>{fmtDateTime(u.last_sign_in_at)}</td>
                          {section === 'pro' ? (
                            <td className={styles.mono}>{u.pro_expires_at ? fmtDateTime(u.pro_expires_at) : '-'}</td>
                          ) : (
                          <td>
                            {u.suspended ? (
                              <button
                                className={styles.btnSmall}
                                type="button"
                                onClick={() => void handleUserUnsuspend(u.id)}
                                disabled={usersBusy}
                              >
                                Reactivar
                              </button>
                            ) : u.blocked ? (
                              <button
                                className={styles.btnSmall}
                                type="button"
                                onClick={() => void handleUserUnblock(u.id)}
                                disabled={usersBusy}
                              >
                                Desbloquear
                              </button>
                            ) : (
                              <button
                                className={styles.btnSmall}
                                type="button"
                                onClick={() => void handleUserBlock(u.id)}
                                disabled={usersBusy}
                              >
                                Bloquear
                              </button>
                            )}
                          </td>
                          )}
                          <td>
                            <button
                              type="button"
                              className={`${styles.reportCountBtn} ${
                                (u.report_count ?? 0) === 0
                                  ? styles.reportCountOk
                                  : (u.report_count ?? 0) <= 2
                                    ? styles.reportCountWarn
                                    : styles.reportCountDanger
                              }`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setReportsStatus('all')
                                setReportsQueryInput(u.id)
                                setSection('reports')
                              }}
                              disabled={usersBusy}
                            >
                              {u.report_count ?? 0}
                            </button>
                          </td>
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
                  description=""
                  ariaLabel="Evolución de spots"
                  points={spotsTrend?.series ?? []}
                  rangeDays={rangeBySection.spots}
                  onRangeChange={(value) => setSectionRange('spots', value)}
                  onOpenReport={() => openReportModal('spots', spotsTrend?.series ?? [])}
                  reportDisabled={spotsTrendBusy}
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
                  <select
                    className={styles.select}
                    value={spotsStatus}
                    onChange={(e) => {
                      setSpotsStatus(e.target.value as 'all' | 'active' | 'inactive')
                      setSpotsPage(1)
                    }}
                  >
                    <option value="all">Estado: todos</option>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo (suspendidos)</option>
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
                        <th>Spots</th>
                        <th>ID</th>
                        <th>Autor</th>
                        <th>Estado</th>
                        <th>Creado</th>
                        <th>Acciones</th>
                        <th>Reportes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spots.map((s, idx) => (
                        <tr key={String(s?.id ?? `spot-${idx}`)}>
                          <td>{String(s?.title ?? '-')}</td>
                          <td className={styles.mono}>{String(s?.id ?? '-')}</td>
                          <td className={styles.mono}>{String(s?.created_by_profile?.nickname ?? s?.created_by ?? '-')}</td>
                          <td className={styles.mono}>{s?.suspended_at ? 'Inactivo' : 'Activo'}</td>
                          <td className={styles.mono}>{fmtDateTime(s?.created_at ?? null)}</td>
                          <td>
                            {s?.suspended_at ? (
                              <button
                                className={styles.btnSmall}
                                type="button"
                                onClick={() => void handleSpotReactivate(s?.id ?? '')}
                                disabled={spotsBusy}
                              >
                                Reactivar
                              </button>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`${styles.reportCountBtn} ${
                                (s?.report_count ?? 0) === 0
                                  ? styles.reportCountOk
                                  : (s?.report_count ?? 0) <= 2
                                    ? styles.reportCountWarn
                                    : styles.reportCountDanger
                              }`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setReportsStatus('all')
                                setReportsQueryInput(String(s?.id ?? ''))
                                setSection('reports')
                              }}
                              disabled={spotsBusy}
                            >
                              {s?.report_count ?? 0}
                            </button>
                          </td>
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
                  description=""
                  ariaLabel="Evolución de soporte"
                  points={supportTrend?.series ?? []}
                  rangeDays={rangeBySection.support}
                  onRangeChange={(value) => setSectionRange('support', value)}
                  onOpenReport={() => openReportModal('support', supportTrend?.series ?? [])}
                  reportDisabled={supportTrendBusy}
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
                    <option value="new">New</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
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
                        <th>Usuario</th>
                        <th>Email</th>
                        <th>Motivo</th>
                        <th>Estado</th>
                        <th>Creado</th>
                        <th>Última actualización</th>
                        <th>Mensaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {support.map((row, idx) => (
                        <tr
                          key={String(row.id ?? `support-${idx}`)}
                          className={styles.clickableRow}
                          onClick={() => void openSupportModal(row)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && openSupportModal(row)}
                        >
                          <td className={styles.mono}>
                            {[row.name, row.app_username].filter(Boolean).join(' / ') || '-'}
                          </td>
                          <td className={styles.mono}>{row.email || '-'}</td>
                          <td className={styles.mono}>{row.reason || '-'}</td>
                          <td className={styles.mono} onClick={(e) => e.stopPropagation()}>
                            <select
                              className={styles.select}
                              value={row.status || 'new'}
                              onChange={(e) => {
                                const v = e.target.value as 'new' | 'pending' | 'resolved'
                                void updateSupportStatus(String(row.id), v)
                              }}
                              disabled={supportStatusUpdating === row.id}
                              style={{ minWidth: 90, padding: '4px 6px', fontSize: 12 }}
                            >
                              <option value="new">new</option>
                              <option value="pending">pending</option>
                              <option value="resolved">resolved</option>
                            </select>
                          </td>
                          <td className={styles.mono}>{fmtDateTime(row.created_at)}</td>
                          <td className={styles.mono}>{fmtDateTime(row.updated_at)}</td>
                          <td>{truncateText(row.last_message_preview ?? row.message, 140)}</td>
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

            {section === 'reports' ? (
              <div className={styles.card}>
                <div className={styles.cardTitle}>Reportes</div>

                <TrendChart
                  description=""
                  ariaLabel="Evolución de reportes"
                  points={reportsTrend?.series ?? []}
                  rangeDays={rangeBySection.reports}
                  onRangeChange={(value) => setSectionRange('reports', value)}
                  onOpenReport={() => openReportModal('reports', reportsTrend?.series ?? [])}
                  reportDisabled={reportsTrendBusy}
                  loading={reportsTrendBusy}
                  error={reportsTrendError}
                />

                <div className={styles.toolbar}>
                  <input
                    className={styles.search}
                    value={reportsQueryInput}
                    onChange={(e) => {
                      setReportsQueryInput(e.target.value)
                      setReportsPage(1)
                    }}
                    placeholder="Buscar por id o usuario…"
                  />
                  <select
                    className={styles.select}
                    value={reportsStatus}
                    onChange={(e) => {
                      setReportsStatus(e.target.value as any)
                      setReportsPage(1)
                    }}
                  >
                    <option value="all">Estado: todos</option>
                    <option value="new">new</option>
                    <option value="pending">pending</option>
                    <option value="action_taken">resolved</option>
                  </select>
                  <select
                    className={styles.select}
                    value={reportsType}
                    onChange={(e) => {
                      setReportsType(e.target.value as any)
                      setReportsPage(1)
                    }}
                  >
                    <option value="all">Tipo: todos</option>
                    <option value="spot">spot</option>
                    <option value="comment">comment</option>
                  </select>
                  <button className={styles.btnGhost} type="button" onClick={() => void loadReports()} disabled={reportsBusy}>
                    {reportsBusy ? 'Cargando…' : 'Recargar'}
                  </button>
                </div>

                {reportsError ? <div className={styles.error}>{reportsError}</div> : null}

                <div className={styles.legendLine}>
                  Mostrando {fmt(reports.length)} en esta página · Total reportes {fmt(reportsMeta.total)}
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Reportado por</th>
                        <th>Reportado</th>
                        <th>Tipo</th>
                        <th>Estado</th>
                        <th>Creado</th>
                        <th>Fecha resolución</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((row, idx) => (
                        <tr
                          key={String(row.id ?? `report-${idx}`)}
                          className={styles.clickableRow}
                          onClick={() => openReportDetailModal(row)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && openReportDetailModal(row)}
                        >
                          <td className={styles.mono}>
                            {formatUserLabel(row.reporter_profile, row.reporter_user_id)}
                          </td>
                          <td className={styles.mono}>
                            {formatUserLabel(row.reported_profile, row.reported_user_id)}
                          </td>
                          <td className={styles.mono}>{row.reported_type}</td>
                          <td className={styles.mono} onClick={(e) => e.stopPropagation()}>
                            <select
                              className={styles.select}
                              value={reportStatusFromApi(row.status)}
                              onChange={(e) => {
                                const v = e.target.value as 'new' | 'pending' | 'action_taken'
                                void updateReportStatus(String(row.id), v)
                              }}
                              disabled={reportStatusUpdating === row.id}
                              style={{ minWidth: 90, padding: '4px 6px', fontSize: 12 }}
                            >
                              <option value="new">new</option>
                              <option value="pending">pending</option>
                              <option value="action_taken">resolved</option>
                            </select>
                          </td>
                          <td className={styles.mono}>{fmtDateTime(row.created_at)}</td>
                          <td className={styles.mono}>{fmtDateTime(row.resolved_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {renderPager({
                  page: reportsMeta.page,
                  pageCount: reportsMeta.pageCount,
                  hasPrev: reportsMeta.hasPrev,
                  hasNext: reportsMeta.hasNext,
                  onPrev: () => setReportsPage((p) => Math.max(1, p - 1)),
                  onNext: () => setReportsPage((p) => p + 1),
                  busy: reportsBusy,
                })}
              </div>
            ) : null}

            {supportModal ? (
              <div
                className={styles.modalBackdrop}
                role="presentation"
                onClick={(e) => {
                  if (e.target === e.currentTarget && !supportModalBusy) setSupportModal(null)
                }}
              >
                <div className={styles.modalCard} role="dialog" aria-modal="true" aria-label="Responder soporte">
                  <div className={styles.modalTitle}>
                    Soporte — {supportModal.name || supportModal.app_username || '-'} · {supportModal.email || '-'}
                  </div>
                  <div className={styles.modalSub}>
                    Motivo: {supportModal.reason} · Estado: {supportModal.status}
                  </div>
                  <div className={styles.threadContainer}>
                    <div className={styles.threadLabel}>Historial</div>
                    {supportModalThreadLoading ? (
                      <div className={styles.threadLoading}>Cargando conversación…</div>
                    ) : (
                      <div className={styles.threadList}>
                        <div className={styles.threadBubble} data-author="user">
                          <span className={styles.threadMeta}>Usuario · {fmtThreadDate(supportModal.created_at || '')}</span>
                          <div className={styles.threadText}>{supportModal.message}</div>
                        </div>
                        {parseSupportThread(supportModal.resolution_note, supportModal.user_replies).map((e, i) => (
                          <div key={i} className={styles.threadBubble} data-author={e.author}>
                            <span className={styles.threadMeta}>
                              {e.author === 'admin' ? 'Equipo' : 'Usuario'} · {fmtThreadDate(e.date)}
                            </span>
                            <div className={styles.threadText}>{e.text}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {supportModalError ? <div className={styles.error}>{supportModalError}</div> : null}
                  <label className={styles.field} style={{ marginTop: 16 }}>
                    <div className={styles.label}>Mensaje (se envía por correo y notificación)</div>
                    <textarea
                      className={styles.textarea}
                      value={supportModalMessage}
                      onChange={(e) => setSupportModalMessage(e.target.value)}
                      rows={4}
                      disabled={supportModalBusy}
                      placeholder="Escribí tu respuesta…"
                    />
                  </label>
                  <label className={styles.field}>
                    <div className={styles.label}>Estado</div>
                    <select
                      className={styles.select}
                      value={supportModalStatus}
                      onChange={(e) => setSupportModalStatus(e.target.value)}
                      disabled={supportModalBusy}
                    >
                      <option value="pending">Pendiente</option>
                      <option value="resolved">Resuelto</option>
                    </select>
                  </label>
                  <div className={styles.modalActions}>
                    <button
                      className={styles.btnGhost}
                      type="button"
                      onClick={() => setSupportModal(null)}
                      disabled={supportModalBusy}
                    >
                      Cerrar
                    </button>
                    <button
                      className={styles.btn}
                      type="button"
                      onClick={() => void sendSupportReply()}
                      disabled={supportModalBusy || !supportModalMessage.trim()}
                    >
                      {supportModalBusy ? 'Enviando…' : 'Enviar'}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {userMessageModal ? (
              <div
                className={styles.modalBackdrop}
                role="presentation"
                onClick={(e) => {
                  if (e.target === e.currentTarget && !userMessageBusy) setUserMessageModal(null)
                }}
              >
                <div className={styles.modalCard} role="dialog" aria-modal="true" aria-label="Enviar mensaje" onClick={(e) => e.stopPropagation()}>
                  <div className={styles.modalTitle}>
                    {userMessageModal.profile?.nickname || '-'} · {userMessageModal.email || '-'}
                  </div>
                  {userMessageError ? <div className={styles.error}>{userMessageError}</div> : null}
                  <label className={styles.field} style={{ marginTop: 16 }}>
                    <div className={styles.label}>Mensaje (llega a notificaciones y correo)</div>
                    <textarea
                      className={styles.textarea}
                      value={userMessageText}
                      onChange={(e) => setUserMessageText(e.target.value)}
                      rows={4}
                      disabled={userMessageBusy}
                      placeholder="Escribí tu mensaje…"
                    />
                  </label>
                  <div className={styles.modalActions}>
                    <button
                      className={styles.btnGhost}
                      type="button"
                      onClick={() => setUserMessageModal(null)}
                      disabled={userMessageBusy}
                    >
                      Cerrar
                    </button>
                    <button
                      className={styles.btn}
                      type="button"
                      onClick={() => void sendUserMessage()}
                      disabled={userMessageBusy || !userMessageText.trim()}
                    >
                      {userMessageBusy ? 'Enviando…' : 'Enviar'}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {reportDetailModal ? (
              <div
                className={styles.modalBackdrop}
                role="presentation"
                onClick={(e) => {
                  if (e.target === e.currentTarget && !reportDetailBusy) setReportDetailModal(null)
                }}
              >
                <div className={styles.modalCard} role="dialog" aria-modal="true" aria-label="Detalle del reporte" onClick={(e) => e.stopPropagation()}>
                  <div className={styles.modalTitle}>Reporte #{reportDetailModal.id}</div>
                  <div className={styles.modalSub}>
                    <strong>Motivo:</strong> {REASON_LABELS[reportDetailModal.reason_code] ?? reportDetailModal.reason_code}
                  </div>
                  {reportDetailModal.description ? (
                    <div className={styles.modalSub} style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>
                      <strong>Descripción (mensaje opcional del usuario):</strong> {reportDetailModal.description}
                    </div>
                  ) : null}
                  <label className={styles.field} style={{ marginTop: 16 }}>
                    <div className={styles.label}>Mensaje para el reportador (llega a notificaciones y correo)</div>
                    <textarea
                      className={styles.textarea}
                      value={reportDetailMessageToReporter}
                      onChange={(e) => setReportDetailMessageToReporter(e.target.value)}
                      rows={2}
                      disabled={reportDetailBusy}
                      placeholder="Responder a quien reportó…"
                    />
                  </label>
                  <label className={styles.field}>
                    <div className={styles.label}>Mensaje para el reportado (llega a notificaciones y correo)</div>
                    <textarea
                      className={styles.textarea}
                      value={reportDetailMessageToReported}
                      onChange={(e) => setReportDetailMessageToReported(e.target.value)}
                      rows={2}
                      disabled={reportDetailBusy}
                      placeholder="Enviar mensaje al usuario reportado…"
                    />
                  </label>
                  <div className={styles.modalSub} style={{ marginTop: 12 }}>
                    <strong>Acciones:</strong>
                    <div className={styles.actionRow} style={{ marginTop: 8 }}>
                      <button
                        className={styles.btnSmall}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void handleReportAction(reportDetailModal.id, 'delete') }}
                        disabled={reportDetailBusy || reportsBusy}
                      >
                        Ocultar contenido
                      </button>
                      <button
                        className={styles.btnSmall}
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void handleReportAction(reportDetailModal.id, 'suspend') }}
                        disabled={reportDetailBusy || reportsBusy}
                      >
                        Suspender
                      </button>
                    </div>
                  </div>
                  <div className={styles.actionRow} style={{ marginTop: 16, alignItems: 'center', gap: 8 }}>
                    <label className={styles.field} style={{ margin: 0, flex: 1 }}>
                      <div className={styles.label}>Estado (se actualiza al enviar)</div>
                      <select
                        className={styles.select}
                        value={reportDetailStatus}
                        onChange={(e) => setReportDetailStatus(e.target.value)}
                        disabled={reportDetailBusy}
                      >
                        <option value="new">new</option>
                        <option value="pending">pending</option>
                        <option value="action_taken">resolved</option>
                      </select>
                    </label>
                    <button
                      className={styles.btn}
                      type="button"
                      onClick={() => void sendReportDetailMessages()}
                      disabled={reportDetailBusy || (!reportDetailMessageToReporter.trim() && !reportDetailMessageToReported.trim())}
                    >
                      {reportDetailBusy ? 'Enviando…' : 'Enviar mensajes'}
                    </button>
                  </div>
                  {reportDetailError ? <div className={styles.error}>{reportDetailError}</div> : null}
                  <div className={styles.modalActions} style={{ marginTop: 16 }}>
                    <button
                      className={styles.btnGhost}
                      type="button"
                      onClick={() => setReportDetailModal(null)}
                      disabled={reportDetailBusy}
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {reportModal ? (
              <div
                className={styles.modalBackdrop}
                role="presentation"
                onClick={(e) => {
                  if (e.target === e.currentTarget && !reportBusy) setReportModal(null)
                }}
              >
                <div className={styles.modalCard} role="dialog" aria-modal="true" aria-label="Descargar reporte CSV">
                  <div className={styles.modalTitle}>Descargar reporte CSV</div>
                  <div className={styles.modalSub}>
                    Sección: {REPORT_SECTION_LABELS[reportModal.section]} · elegí el rango de fechas (UTC).
                  </div>

                  {reportError ? <div className={styles.error}>{reportError}</div> : null}

                  <div className={styles.modalGrid}>
                    <label className={styles.field}>
                      <div className={styles.label}>Desde</div>
                      <input
                        className={styles.input}
                        type="date"
                        value={reportModal.from}
                        onChange={(e) => setReportModal((prev) => (prev ? { ...prev, from: e.target.value } : prev))}
                        disabled={reportBusy}
                      />
                    </label>
                    <label className={styles.field}>
                      <div className={styles.label}>Hasta</div>
                      <input
                        className={styles.input}
                        type="date"
                        value={reportModal.to}
                        onChange={(e) => setReportModal((prev) => (prev ? { ...prev, to: e.target.value } : prev))}
                        disabled={reportBusy}
                      />
                    </label>
                  </div>

                  <div className={styles.modalActions}>
                    <button className={styles.btnGhost} type="button" onClick={() => setReportModal(null)} disabled={reportBusy}>
                      Cancelar
                    </button>
                    <button className={styles.btn} type="button" onClick={() => void downloadReportCsv()} disabled={reportBusy}>
                      {reportBusy ? 'Descargando…' : 'Descargar'}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

          </>
        ) : null}

        {!accessToken && mfaPending ? (
          <div
            className={styles.modalBackdrop}
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget && !mfaBusy) {
                setMfaPending(null)
                setMfaCode('')
                setMfaError(null)
              }
            }}
          >
            <div className={styles.modalCard} role="dialog" aria-modal="true" aria-label="Verificación MFA" onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalTitle}>Verificación en 2 pasos</div>
              <div className={styles.modalSub}>
                Te enviamos un código a <strong>{mfaPending.maskedEmail}</strong>. Expira en {mfaPending.expiresInMinutes} minutos.
              </div>
              {mfaError ? <div className={styles.error}>{mfaError}</div> : null}
              <label className={styles.field} style={{ marginTop: 16 }}>
                <div className={styles.label}>Código MFA</div>
                <input
                  ref={mfaInputRef}
                  className={styles.input}
                  inputMode="numeric"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\s+/g, ''))}
                  maxLength={8}
                  disabled={mfaBusy}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void submitMfaCode()
                    }
                  }}
                  placeholder="Ej: 123456"
                />
              </label>
              <div className={styles.modalActions}>
                <button
                  className={styles.btnGhost}
                  type="button"
                  onClick={() => {
                    setMfaPending(null)
                    setMfaCode('')
                    setMfaError(null)
                  }}
                  disabled={mfaBusy}
                >
                  Cancelar
                </button>
                <button className={styles.btn} type="button" onClick={() => void submitMfaCode()} disabled={mfaBusy || !mfaCode.trim()}>
                  {mfaBusy ? 'Verificando…' : 'Validar código'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
