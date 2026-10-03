import test from 'node:test'
import assert from 'node:assert/strict'
import { createTrendRepository } from '../src/data/trendRepository.js'
import { TREND_CATEGORIES } from '../src/data/trendData.js'
const metric = TREND_CATEGORIES[0], date = '2025-05-31', today = '2026-10-02'
const rows = [{ element_no: '106', time: '02:00', date, value: '0' }]
const ok = data => ({ ok: true, json: async () => data })

test('returning to a previously read category/date uses its snapshot, while refresh bypasses it', async () => {
  let calls = 0, time = 1000
  const repo = createTrendRepository({ apiRoot: '/backend', now: () => time, fetcher: async () => { calls++; return ok(rows) } })
  await repo.loadTrend(metric, date, { today }); time += 1000
  const cached = await repo.loadTrend(metric, date, { today })
  assert.equal(calls, 1); assert.equal(cached.cached, true); assert.equal(cached.receivedAt, 1000); assert.equal(cached.rows[0].value, '0')
  await repo.loadTrend(metric, date, { today, force: true }); assert.equal(calls, 2)
  assert.equal(repo.getCached(TREND_CATEGORIES[1], date), null)
  assert.equal(repo.getCached(metric, '2025-05-30'), null)
})

test('historical, current-day and empty snapshots expire without concealing new readings', async () => {
  for (const [day, data, ttl] of [[date, rows, 300_000], [today, [{ ...rows[0], date: today }], 30_000], [date, [], 15_000]]) {
    let time = 1000, calls = 0
    const repo = createTrendRepository({ apiRoot: '/backend', now: () => time, fetcher: async () => { calls++; return ok(data) } })
    await repo.loadTrend(metric, day, { today }); time += ttl - 1
    assert.ok(repo.getCached(metric, day)); time++
    assert.equal(repo.getCached(metric, day), null)
    await repo.loadTrend(metric, day, { today }); assert.equal(calls, 2)
  }
})

test('failures and malformed responses are not cached; a failed refresh preserves the last valid snapshot', async () => {
  let mode = 'fail'
  const repo = createTrendRepository({ apiRoot: '/backend', fetcher: async () => mode === 'fail' ? { ok: false, status: 503 } : ok(mode === 'valid' ? rows : [null]) })
  await assert.rejects(repo.loadTrend(metric, date, { today }), /HTTP 503/); assert.equal(repo.getCached(metric, date), null)
  mode = 'invalid'; await assert.rejects(repo.loadTrend(metric, date, { today }), /格式/); assert.equal(repo.getCached(metric, date), null)
  mode = 'valid'; await repo.loadTrend(metric, date, { today })
  mode = 'fail'; await assert.rejects(repo.loadTrend(metric, date, { today, force: true }), /HTTP 503/)
  assert.deepEqual(repo.getCached(metric, date).rows, rows)
})

test('session snapshots survive navigation/reload and unusable storage falls back to memory', async () => {
  const values = new Map(), storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }
  const repo = createTrendRepository({ apiRoot: '/backend', storage, fetcher: async () => ok(rows) })
  await repo.loadTrend(metric, date, { today })
  const restored = createTrendRepository({ apiRoot: '/backend', storage, fetcher: () => { throw new Error('Must not request cached history') } })
  assert.equal((await restored.loadTrend(metric, date, { today })).cached, true)
  const broken = createTrendRepository({ apiRoot: '/backend', storage: { getItem: () => '{bad', setItem: () => { throw Error('Quota') } }, fetcher: async () => ok(rows) })
  await broken.loadTrend(metric, date, { today }); assert.ok(broken.getCached(metric, date))
})

test('cancelling a request prevents even a late successful response from being stored', async () => {
  let resolve
  const controller = new AbortController()
  const repo = createTrendRepository({ apiRoot: '/backend', fetcher: () => new Promise(done => { resolve = done }) })
  const request = repo.loadTrend(metric, date, { today, signal: controller.signal })
  controller.abort(); resolve(ok(rows))
  await assert.rejects(request, { name: 'AbortError' }); assert.equal(repo.getCached(metric, date), null)
})

test('a slow latest-date request does not hold up independently requested trend data', async () => {
  let resolveLatest
  const repo = createTrendRepository({ apiRoot: '/backend', fetcher: async url => url.endsWith('data_third.php') ? new Promise(done => { resolveLatest = done }) : ok(rows) })
  const latest = repo.loadLatestDate()
  const trend = await repo.loadTrend(metric, date, { today })
  assert.deepEqual(trend.rows, rows); assert.equal(repo.getLatestDate(), '')
  resolveLatest(ok({ latest_data: [{ year: '2025', month: '5', day: '31' }] }))
  assert.equal(await latest, date); assert.equal(repo.getLatestDate(), date)
})

test('requests time out and never cache an incomplete response', async () => {
  const repo = createTrendRepository({ apiRoot: '/backend', timeoutMs: 10, fetcher: (_, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))) })
  await assert.rejects(repo.loadTrend(metric, date, { today }), { name: 'AbortError' })
  assert.equal(repo.getCached(metric, date), null)
})
