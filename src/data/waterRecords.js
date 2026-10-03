import { TREND_CATEGORIES, TREND_METERS, shiftDate, taiwanDate } from './trendData.js'

export const RECORD_METERS = [109,110,111,106,107,108,112,113,114,115,101,102,103,104].map(id => {
  const category = TREND_CATEGORIES.find(item => item.ids.includes(id))
  return { id, ...TREND_METERS[id], unit: category.unit, category: category.key, cumulative: category.key === 'cumulativeFlow' }
})
export const REPORT_GROUPS = [
  { key: 'cumulativeFlow', title: '累計水量', icon: 'waves', ids: [109,110,111], note: '每日末筆讀值', unit: 'm³' },
  { key: 'instantaneousFlow', title: '瞬間流量', icon: 'flow', ids: [106,107,108], note: '每日原始記錄平均', unit: 'm³/h' },
  { key: 'otherValues', title: '水質與液位', icon: 'drop', ids: [112,113,114,115], note: '每日原始記錄平均', unit: '各測點單位' },
  { key: 'ptValues', title: '壓力', icon: 'pressure', ids: [101,102,103,104], note: '每日原始記錄平均', unit: 'kg/cm²' },
]
export function validDate(date) { return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && shiftDate(date,0) === date }
export function numeric(value) {
  if (value === null || value === undefined || typeof value === 'boolean' || String(value).trim() === '') return null
  const n = Number(value); return Number.isFinite(n) ? n : null
}
export function validRecords(rows) {
  if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== 'object')) throw new Error('量測記錄格式不正確')
  const dates = new Map()
  const checkedDate = date => { if (!dates.has(date)) dates.set(date, validDate(date)); return dates.get(date) }
  return rows.filter(row => RECORD_METERS.some(m => m.id === Number(row.element_no)) && checkedDate(row.date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(row.time) && numeric(row.value) !== null)
}
export function elapsedHours(date, now = new Date()) {
  const today = taiwanDate(now)
  if (date < today) return 24
  if (date > today) return 0
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', hourCycle: 'h23' }).format(now)) + 1
}
export function buildCoverage(rows, date, now = new Date()) {
  const hours = elapsedHours(date, now), buckets = new Set()
  for (const row of validRecords(rows)) if (row.date === date) buckets.add(`${row.element_no}/${Number(row.time.slice(0,2))}`)
  const missing = [], meters = RECORD_METERS.map(meter => {
    const present = Array.from({ length: 24 }, (_, hour) => hour >= hours ? null : buckets.has(`${meter.id}/${hour}`))
    present.forEach((value, hour) => { if (value === false) missing.push({ ...meter, date, hour, time: `${String(hour).padStart(2,'0')}:00` }) })
    return { ...meter, present, missing: present.filter(value => value === false).length, recorded: present.filter(value => value === true).length }
  })
  const expected = hours * RECORD_METERS.length, recorded = expected - missing.length
  return { meters, missing, hours, expected, recorded, affected: meters.filter(m => m.missing).length, integrity: expected ? recorded / expected * 100 : null, latestMissing: missing.length ? Math.max(...missing.map(m => m.hour)) : null }
}
export function missingIntervals(missing) {
  const groups = []
  for (const meter of RECORD_METERS) {
    const own = missing.filter(m => m.id === meter.id).sort((a,b) => a.hour-b.hour)
    let interval
    for (const item of own) {
      if (!interval || item.hour !== interval.end + 1) { interval = { ...meter, date:item.date, start:item.hour, end:item.hour, count:1 }; groups.push(interval) }
      else { interval.end = item.hour; interval.count++ }
    }
  }
  return groups.sort((a,b) => b.end-a.end || a.id-b.id)
}
const hourLabel = hour => `${String(hour).padStart(2,'0')}:00`
export const intervalLabel = interval => interval.start === interval.end ? hourLabel(interval.start) : `${hourLabel(interval.start)}–${hourLabel(interval.end)}`
export function monthDays(month) {
  const [year, number] = month.split('-').map(Number)
  return Array.from({ length: new Date(Date.UTC(year,number,0)).getUTCDate() }, (_, i) => `${month}-${String(i+1).padStart(2,'0')}`)
}
function aggregate(rows, ids, periods, key) {
  const buckets = new Map()
  for (const row of validRecords(rows)) {
    const id = Number(row.element_no), period = key(row)
    if (!ids.includes(id) || !periods.includes(period)) continue
    const address = `${period}/${id}`, n = numeric(row.value), stamp = `${row.date} ${row.time}/${String(row.id || 0).padStart(12,'0')}`
    let bucket = buckets.get(address)
    if (!bucket) { bucket = { sum:0, count:0, latest:null, stamp:'' }; buckets.set(address,bucket) }
    bucket.sum += n; bucket.count++
    if (stamp >= bucket.stamp) { bucket.stamp = stamp; bucket.latest = n }
  }
  return periods.map(period => ({ period, values: ids.map(id => { const b = buckets.get(`${period}/${id}`), meter = RECORD_METERS.find(m => m.id===id); return b ? meter.cumulative ? b.latest : b.sum/b.count : null }), counts: ids.map(id => buckets.get(`${period}/${id}`)?.count || 0) }))
}
export function dailyReport(rows, month, group) { return aggregate(rows, group.ids, monthDays(month), row => row.date) }
export function hourlyReport(rows, date, group) { return aggregate(rows.filter(row => row.date===date), group.ids, Array.from({length:24},(_,h)=>hourLabel(h)), row=>row.time.slice(0,2)+':00') }
export function monthlyCoverage(rows, month, now = new Date()) {
  const days = monthDays(month), buckets = new Set(), hours = new Map(days.map(date=>[date,elapsedHours(date,now)])), records = validRecords(rows).filter(row=>row.date.startsWith(month+'-'))
  for (const row of records) if (Number(row.time.slice(0,2)) < hours.get(row.date)) buckets.add(`${row.date}/${row.element_no}/${row.time.slice(0,2)}`)
  const expected = days.reduce((sum,date)=>sum+hours.get(date)*RECORD_METERS.length,0)
  return { expected, recorded:buckets.size, integrity:expected?buckets.size/expected*100:null, days: new Set(records.map(r=>r.date)).size, rawCount: records.length }
}
const csvCell = value => `"${String(value ?? '').replaceAll('"','""')}"`
export const toCsv = rows => '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')
export function rawReportRows(rows, start, end, group) {
  const selected = validRecords(rows).filter(row=>row.date>=start&&row.date<=end), keys = [...new Set(selected.map(row=>row.date+' '+row.time))].sort()
  const values = new Map()
  for(const row of selected) values.set(`${row.date} ${row.time}/${row.element_no}`,numeric(row.value))
  const meters=group.ids.map(id=>RECORD_METERS.find(m=>m.id===id))
  return [['日期','時間',...meters.map(m=>`${m.tag} ${m.title} (${m.unit})`)],...keys.map(key=>[...key.split(' '),...meters.map(m=>values.get(`${key}/${m.id}`)??null)])]
}
