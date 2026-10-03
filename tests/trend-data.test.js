import test from 'node:test'
import assert from 'node:assert/strict'
import { TREND_CATEGORIES, buildTrend, summarize, trendCsv, latestAvailableDate, shiftDate, taiwanDate } from '../src/data/trendData.js'
const category = TREND_CATEGORIES[0], date = '2025-05-31'
test('historical readings align to the selected day and preserve gaps, zero and invalid readings', () => {
  const trend = buildTrend([
    { element_no: '106', time: '02:00', date, value: '0', name: '磁流量' },
    { element_no: '106', time: '01:00', date, value: '20' },
    { element_no: '106', time: '03:00', date, value: '' },
    { element_no: '106', time: '04:00', date, value: 'NaN' },
    { element_no: '106', time: '05:00', date: '2025-05-30', value: '999' },
    { element_no: '101', time: '06:00', date, value: '999' },
    { element_no: '106', time: '24:00', date, value: '999' },
  ], category, date)
  assert.equal(trend.hours.length, 24); assert.equal(trend.count, 2)
  assert.deepEqual(trend.series[0].data.slice(0, 6), [null, 20, 0, null, null, null])
  assert.equal(trend.series[0].stats.latest, 0); assert.equal(trend.series[0].stats.latestHour, '02:00')
  assert.equal(trend.series[1].stats.average, null)
  assert.throws(() => buildTrend({ error: 'failed' }, category, date))
})
test('statistics describe one meter, including missing data and a zero starting value', () => {
  const stats = summarize([null, 0, 8, null, 4])
  assert.equal(stats.average, 4); assert.equal(stats.delta, 4); assert.equal(stats.percent, null)
  assert.equal(stats.maxHour, '02:00'); assert.equal(stats.minHour, '01:00')
  assert.equal(summarize([null, null]).latest, null)
})
test('CSV exports exact values and blank gaps with quoted names and a UTF-8 BOM', () => {
  const trend = buildTrend([{ element_no: 106, time: '00:00', date, value: 0, name: 'A,"B"' }], category, date)
  const csv = trendCsv(trend, date, 'm³/h')
  assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes('"A,""B"" (m³/h)"'))
  assert.ok(csv.includes('"2025-05-31","00:00","0","",""')); assert.ok(csv.includes('"2025-05-31","01:00","","",""'))
})
test('date selection uses actual backend dates and Taiwan calendar boundaries', () => {
  assert.equal(latestAvailableDate({ latest_data: [{ year: '2025', month: '5', day: '30' }, { year: '2025', month: '5', day: '31' }, { year: '2025', month: '2', day: '31' }, { year: '2025', month: '13', day: '1' }] }), date)
  assert.equal(latestAvailableDate({}), null); assert.equal(shiftDate(date, 1), '2025-06-01')
  assert.equal(taiwanDate(new Date('2026-10-01T16:30:00Z')), '2026-10-02')
})
