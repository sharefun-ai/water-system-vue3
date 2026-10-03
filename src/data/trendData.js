export const TREND_CATEGORIES = Object.freeze([
  { key: 'instantaneousFlow', label: '瞬間流量', api: '瞬間流量', unit: 'm³/h', icon: 'flow', aggregation: '每小時平均', ids: [106, 107, 108] },
  { key: 'cumulativeFlow', label: '累計水量', api: '累計流量', unit: 'm³', icon: 'waves', aggregation: '每小時末筆', ids: [109, 110, 111] },
  { key: 'conductivity', label: '導電度', api: '導電度計', unit: 'μS/cm', icon: 'flow', aggregation: '每小時平均', ids: [112] },
  { key: 'turbidity', label: '產水濁度', api: '產水濁度', unit: 'NTU', icon: 'drop', aggregation: '每小時平均', ids: [113] },
  { key: 'rawWaterLevel', label: '原水液位', api: '原水液位', unit: 'cm', icon: 'layers', aggregation: '每小時平均', ids: [114] },
  { key: 'productWaterLevel', label: '產水液位', api: '產水液位', unit: 'cm', icon: 'drop', aggregation: '每小時平均', ids: [115] },
  { key: 'ptValues', label: '壓力', api: 'PT數值', unit: 'kg/cm²', icon: 'pressure', aggregation: '每小時平均', ids: [101, 102, 103, 104] },
])
export const TREND_METERS = Object.freeze({
  106: { tag: 'FIT-01', title: '電磁入水流量' }, 107: { tag: 'FIT-02', title: '原水入水流量' }, 108: { tag: 'FIT-03', title: 'UF 產水流量' },
  109: { tag: 'FIT-01', title: '電磁入水累計' }, 110: { tag: 'FIT-02', title: '原水入水累計' }, 111: { tag: 'FIT-03', title: 'UF 產水累計' },
  112: { tag: 'EC-01', title: '產水導電度' }, 113: { tag: 'TU-01', title: '產水濁度' },
  114: { tag: 'T-01', title: '原水液位' }, 115: { tag: 'T-02', title: 'UF 產水液位' },
  101: { tag: 'PT1', title: '過濾入口壓力' }, 102: { tag: 'PT2', title: '過濾出口壓力' }, 103: { tag: 'PT3', title: '膜組入口壓力' }, 104: { tag: 'PT4', title: '膜組出口壓力' },
})
export const TREND_COLORS = ['#8ee6ca', '#83c8f0', '#e6bc83', '#bea8ef']
const HOURS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`)

export function taiwanDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
export function shiftDate(date, days) {
  const time = Date.parse(`${date}T00:00:00Z`)
  return Number.isFinite(time) ? new Date(time + days * 86400000).toISOString().slice(0, 10) : date
}
export function latestAvailableDate(payload) {
  const dates = (payload?.latest_data || []).map(row => {
    const date = `${row.year}-${String(row.month).padStart(2, '0')}-${String(row.day).padStart(2, '0')}`
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T00:00:00Z`)) && shiftDate(date, 0) === date ? date : null
  }).filter(Boolean)
  return dates.sort().at(-1) || null
}
function validNumber(value) {
  if (value === null || value === undefined || typeof value === 'boolean' || String(value).trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}
export function buildTrend(rows, category, date) {
  if (!Array.isArray(rows)) throw new Error('歷史資料格式不正確')
  const points = rows.filter(row => (!row.date || row.date === date) && category.ids.includes(Number(row.element_no)) && /^([01]\d|2[0-3]):00$/.test(row.time))
  const series = category.ids.map((id, index) => {
    const own = points.filter(row => Number(row.element_no) === id)
    const byHour = new Map(own.map(row => [row.time, validNumber(row.value)]))
    const data = HOURS.map(hour => byHour.get(hour) ?? null)
    const stats = summarize(data)
    return { id, ...TREND_METERS[id], name: own[0]?.name || TREND_METERS[id].title, color: TREND_COLORS[index], data, stats }
  })
  return { hours: HOURS, series, count: series.reduce((sum, item) => sum + item.stats.count, 0) }
}
export function summarize(data) {
  const valid = data.filter(value => typeof value === 'number' && Number.isFinite(value))
  if (!valid.length) return { count: 0, latest: null, first: null, min: null, max: null, average: null, delta: null, percent: null, latestHour: null, minHour: null, maxHour: null }
  const min = Math.min(...valid), max = Math.max(...valid), first = valid[0], latest = valid.at(-1)
  const latestIndex = data.findLastIndex(value => typeof value === 'number' && Number.isFinite(value))
  return { count: valid.length, first, latest, min, max, average: valid.reduce((sum, value) => sum + value, 0) / valid.length, delta: latest - first, percent: first === 0 ? null : (latest - first) / Math.abs(first) * 100, latestHour: HOURS[latestIndex], minHour: HOURS[data.indexOf(min)], maxHour: HOURS[data.indexOf(max)] }
}
export function formatTrendValue(value) {
  return value === null || value === undefined ? '—' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(value)
}
const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`
export function trendCsv(trend, date, unit) {
  const rows = [['日期', '時間', ...trend.series.map(item => `${item.name} (${unit})`)], ...trend.hours.map((hour, index) => [date, hour, ...trend.series.map(item => item.data[index])])]
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')
}
