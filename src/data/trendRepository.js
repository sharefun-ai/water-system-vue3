import { buildTrend, latestAvailableDate, taiwanDate, shiftDate } from './trendData.js'
import { requireDataSource } from './dataSource.js'

const CACHE_VERSION = 'aquatic-trends-v1'
const HISTORICAL_TTL = 5 * 60_000, CURRENT_TTL = 30_000, EMPTY_TTL = 15_000

// Session-scoped, bounded snapshots; no failed responses or indefinitely stale readings.
export function createTrendRepository({ apiRoot, fetcher = globalThis.fetch, storage = null, now = Date.now, timeoutMs = 15000 }) {
  const storageKey = `${CACHE_VERSION}:${apiRoot}`, snapshots = new Map()
  try {
    const saved = JSON.parse(storage?.getItem(storageKey) || '[]')
    if (Array.isArray(saved)) saved.slice(-30).forEach(([key, entry]) => snapshots.set(key, entry))
  } catch { /* Storage may be unavailable or contain an older malformed snapshot. */ }
  function save(key, entry) {
    snapshots.delete(key); snapshots.set(key, entry)
    while (snapshots.size > 30) snapshots.delete(snapshots.keys().next().value)
    try { storage?.setItem(storageKey, JSON.stringify([...snapshots])) } catch { /* Memory cache remains available. */ }
  }
  function read(key) {
    const entry = snapshots.get(key)
    if (!entry || !Number.isFinite(entry.receivedAt) || !Number.isFinite(entry.expiresAt) || now() < entry.receivedAt || now() >= entry.expiresAt) return null
    return entry
  }
  async function json(endpoint, options, signal) {
    requireDataSource()
    signal?.throwIfAborted()
    const controller = new AbortController(), abort = () => controller.abort()
    signal?.addEventListener('abort', abort, { once: true })
    const timer = setTimeout(abort, timeoutMs)
    try {
      const response = await fetcher(`${apiRoot}/${endpoint}`, { credentials: 'same-origin', cache: 'no-store', ...options, signal: controller.signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const payload = await response.json()
      controller.signal.throwIfAborted()
      return payload
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort) }
  }
  function validate(rows, metric, date) {
    if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error('歷史資料格式不正確')
    return buildTrend(rows, metric, date)
  }
  function getCached(metric, date) {
    const entry = read(`${metric.key}/${date}`)
    if (!entry) return null
    try { validate(entry.rows, metric, date); return { rows: entry.rows, receivedAt: entry.receivedAt, cached: true } } catch { return null }
  }
  async function loadTrend(metric, date, { today = taiwanDate(), force = false, signal } = {}) {
    signal?.throwIfAborted()
    const cached = !force && getCached(metric, date)
    if (cached) return cached
    const rows = await json('search_chart_3.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activeButton: metric.api, today_date: date }) }, signal)
    const trend = validate(rows, metric, date), receivedAt = now()
    const ttl = trend.count === 0 ? EMPTY_TTL : date < today ? HISTORICAL_TTL : CURRENT_TTL
    save(`${metric.key}/${date}`, { rows, receivedAt, expiresAt: receivedAt + ttl })
    return { rows, receivedAt, cached: false }
  }
  function getLatestDate() {
    const date = read('latest')?.date
    return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && shiftDate(date, 0) === date && date <= taiwanDate() ? date : ''
  }
  async function loadLatestDate({ signal } = {}) {
    signal?.throwIfAborted()
    const cached = getLatestDate()
    if (cached) return cached
    const date = latestAvailableDate(await json('data_third.php', {}, signal)) || ''
    if (date) { const receivedAt = now(); save('latest', { date, receivedAt, expiresAt: receivedAt + 60_000 }) }
    return date
  }
  return { getCached, loadTrend, getLatestDate, loadLatestDate }
}

const repositories = new Map()
export function getTrendRepository(apiRoot) {
  if (!repositories.has(apiRoot)) {
    let storage = null
    try { storage = globalThis.sessionStorage } catch { /* Private browsing still supports the in-memory cache. */ }
    repositories.set(apiRoot, createTrendRepository({ apiRoot, storage }))
  }
  return repositories.get(apiRoot)
}
