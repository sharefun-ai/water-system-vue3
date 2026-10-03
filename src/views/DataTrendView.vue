<script setup>
import { computed, inject, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TwinIcon from '../digital-twin/TwinIcon.vue'
import WaterLoading from '../data/WaterLoading.vue'
import { getTrendRepository } from '../data/trendRepository.js'
import { TREND_CATEGORIES, buildTrend, formatTrendValue as fmt, shiftDate, taiwanDate, trendCsv } from '../data/trendData.js'
import '../data/trend.css'
import { DATA_API_ROOT } from '../data/dataSource.js'

const route = useRoute(), router = useRouter()
const updateHeader = inject('setAquaticStatus', () => {})
const today = taiwanDate()
const activeKey = ref(TREND_CATEGORIES.some(item => item.key === route.query.metric) ? route.query.metric : 'instantaneousFlow')
const queryDate = typeof route.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.date) && Number.isFinite(Date.parse(route.query.date)) && shiftDate(route.query.date, 0) === route.query.date && route.query.date <= today ? route.query.date : ''
const apiRoot = DATA_API_ROOT
const repository = getTrendRepository(apiRoot)
const latestDate = ref(repository.getLatestDate())
const selectedDate = ref(queryDate || latestDate.value || today)
const loadingPhase = ref(queryDate || latestDate.value ? 'trend' : 'latest'), slowLoading = ref(false)
const rows = ref([]), loading = ref(true), error = ref(''), receivedAt = ref(''), focusId = ref(null), hiddenIds = ref([])
const focused = ref(false), chartRef = ref(null), chartStage = ref(null), chartHeight = ref(356)
const category = computed(() => TREND_CATEGORIES.find(item => item.key === activeKey.value))
const trend = computed(() => buildTrend(rows.value, category.value, selectedDate.value))
const focusMeter = computed(() => trend.value.series.find(item => item.id === focusId.value) || trend.value.series[0])
const visibleMeters = computed(() => trend.value.series.filter(item => !hiddenIds.value.includes(item.id)))
const chartSeries = computed(() => visibleMeters.value.map(item => ({ name: `${item.tag} · ${item.title}`, data: item.data })))
const historical = computed(() => selectedDate.value < today)
const dateLabel = computed(() => selectedDate.value.replaceAll('-', ' / '))
const canNext = computed(() => selectedDate.value < today)
const hasReadings = computed(() => trend.value.count > 0)
const initialLoading = computed(() => loading.value && !hasReadings.value)
const loadingTitle = computed(() => loadingPhase.value === 'latest' ? '正在尋找最新資料日' : hasReadings.value ? '正在更新趨勢' : '正在讀取水系統資料')
const loadingDetail = computed(() => loadingPhase.value === 'latest' ? '連結歷史記錄，準備觀測資料' : `${dateLabel.value} · ${category.value.label}`)
const headerStatus = computed(() => ({ label: loading.value ? '資料讀取中' : error.value ? '資料讀取失敗' : !hasReadings.value ? '此日無資料' : historical.value ? '歷史數據' : '當日數據', tone: loading.value ? 'neutral' : error.value || historical.value || !hasReadings.value ? 'warning' : 'connected' }))
watch(headerStatus, value => updateHeader(value), { immediate: true })
const stats = computed(() => {
  const reading = focusMeter.value.stats
  return [
    { label: '末筆數值', value: reading.latest, note: reading.latestHour ? `${reading.latestHour} · ${category.value.aggregation}` : '尚無有效資料', icon: 'waves', primary: true },
    { label: '日內最高', value: reading.max, note: reading.maxHour ? `${reading.maxHour} 記錄` : '尚無有效資料', icon: 'chart' },
    { label: '日內最低', value: reading.min, note: reading.minHour ? `${reading.minHour} 記錄` : '尚無有效資料', icon: 'flow' },
    { label: '全日平均', value: reading.average, note: `${reading.count} / 24 個有效時段`, icon: 'drop' },
  ]
})
const chartOptions = computed(() => ({
  chart: { id: 'aquatic-history', type: 'area', background: 'transparent', fontFamily: "Inter, 'Noto Sans TC', sans-serif", foreColor: '#a9c1ce', parentHeightOffset: 0, toolbar: { show: false }, zoom: { enabled: true, type: 'x', autoScaleYaxis: true }, animations: { enabled: false }, selection: { fill: { color: '#8ee6ca', opacity: .12 }, stroke: { color: '#8ee6ca', opacity: .5 } } },
  colors: visibleMeters.value.map(item => item.color),
  stroke: { curve: 'straight', width: 2.5, lineCap: 'round' },
  fill: { type: 'gradient', gradient: { shade: 'dark', type: 'vertical', opacityFrom: .22, opacityTo: .01, stops: [0, 100] } },
  markers: { size: 0, hover: { size: 5 }, strokeWidth: 2, strokeColors: '#0d222c' },
  dataLabels: { enabled: false },
  grid: { borderColor: '#294450', strokeDashArray: 4, padding: { left: 10, right: 24, top: 5, bottom: 0 } },
  xaxis: { categories: trend.value.hours, tickAmount: 6, axisBorder: { show: false }, axisTicks: { show: false }, labels: { rotate: 0, hideOverlappingLabels: true, style: { colors: '#9ebac8', fontSize: '11px', fontFamily: 'Space Grotesk, monospace' } }, tooltip: { enabled: false }, crosshairs: { stroke: { color: '#a9ded8', width: 1, dashArray: 4 } } },
  yaxis: { forceNiceScale: true, tickAmount: 4, decimalsInFloat: 1, labels: { minWidth: 44, maxWidth: 85, formatter: value => fmt(value), style: { colors: '#9ebac8', fontSize: '11px', fontFamily: 'Space Grotesk, monospace' } } },
  tooltip: { theme: 'dark', shared: true, intersect: false, x: { formatter: (_, context) => `${selectedDate.value} ${trend.value.hours[context.dataPointIndex] || ''}` }, y: { formatter: value => value === null || value === undefined ? '無資料' : `${fmt(value)} ${category.value.unit}` }, marker: { show: true } },
  legend: { show: false },
  noData: { text: '' },
  responsive: [{ breakpoint: 767, options: { xaxis: { tickAmount: 4 }, grid: { padding: { left: 0, right: 14 } } } }],
}))
let initialized = false, disposed = false, controller, latestController, requestNumber = 0, selectionRevision = 0, lastRequest = '', refreshTimer, slowTimer, resizeObserver, resizeFrame, previousOverflow = ''
function showSnapshot(snapshot) {
  rows.value = snapshot.rows
  receivedAt.value = new Date(snapshot.receivedAt).toLocaleTimeString('en-GB', { hour12: false })
}
async function fetchTrend({ force = false } = {}) {
  if (!initialized) return
  const number = ++requestNumber, date = selectedDate.value, metric = category.value
  controller?.abort(); controller = new AbortController()
  const requestKey = `${metric.key}/${date}`
  clearTimeout(slowTimer); slowLoading.value = false
  if (lastRequest !== requestKey) { rows.value = []; receivedAt.value = '' }
  lastRequest = requestKey; error.value = ''; loadingPhase.value = 'trend'
  const cached = !force && repository.getCached(metric, date)
  if (cached) { showSnapshot(cached); loading.value = false; return }
  loading.value = true
  slowTimer = setTimeout(() => { slowLoading.value = true }, 6000)
  try {
    const snapshot = await repository.loadTrend(metric, date, { today, force, signal: controller.signal })
    if (number !== requestNumber || disposed) return
    showSnapshot(snapshot)
  } catch (problem) {
    if (number !== requestNumber || disposed) return
    error.value = problem.name === 'AbortError' ? '資料讀取逾時，請稍後重新整理。' : `無法讀取歷史資料：${problem.message}`
  } finally { if (number === requestNumber) { clearTimeout(slowTimer); loading.value = false } }
}
function changeDay(days) { const next = shiftDate(selectedDate.value, days); if (next <= today) selectedDate.value = next }
function setDate(event) {
  const date = event.target.value
  if (date && date <= today && Number.isFinite(Date.parse(date)) && shiftDate(date, 0) === date) selectedDate.value = date
  else event.target.value = selectedDate.value
}
function selectCategory(key) { activeKey.value = key }
function toggleMeter(id) {
  if (hiddenIds.value.includes(id)) hiddenIds.value = hiddenIds.value.filter(value => value !== id)
  else if (visibleMeters.value.length > 1) hiddenIds.value = [...hiddenIds.value, id]
}
function signed(value) { return value === null ? '—' : `${value > 0 ? '+' : ''}${fmt(value)}` }
function exportCsv() {
  const blob = new Blob([trendCsv(trend.value, selectedDate.value, category.value.unit)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = `AQUATIC_${category.value.api}_${selectedDate.value}.csv`
  document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000)
}
function escape(event) {
  if (event.key === 'Escape') focused.value = false
  if (event.key === 'Tab' && focused.value) {
    const controls = [...chartStage.value.parentElement.querySelectorAll('button:not([disabled])')].filter(button => button.getClientRects().length)
    if (event.shiftKey && event.target === controls[0]) { event.preventDefault(); controls.at(-1)?.focus() }
    else if (!event.shiftKey && event.target === controls.at(-1)) { event.preventDefault(); controls[0]?.focus() }
  }
}
watch(focused, async value => { if (value) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden' } else document.body.style.overflow = previousOverflow; await nextTick(); chartStage.value?.parentElement.querySelector('button[aria-pressed]')?.focus({ preventScroll: true }) })
watch([selectedDate, activeKey], () => {
  selectionRevision++; focusId.value = category.value.ids[0]; hiddenIds.value = []
  if (initialized) { router.replace({ query: { ...route.query, date: selectedDate.value, metric: activeKey.value } }); fetchTrend() }
})
onMounted(async () => {
  document.addEventListener('keydown', escape)
  resizeObserver = new ResizeObserver(entries => { const height = Math.round(entries[0].contentRect.height); cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(() => { if (!disposed && height > 0 && height !== chartHeight.value) chartHeight.value = height }) })
  resizeObserver.observe(chartStage.value)
  initialized = true; focusId.value = category.value.ids[0]
  latestController = new AbortController()
  const startingRevision = selectionRevision, needsLatest = !queryDate && !latestDate.value
  if (!needsLatest) {
    router.replace({ query: { ...route.query, date: selectedDate.value, metric: activeKey.value } })
    fetchTrend()
  } else slowTimer = setTimeout(() => { slowLoading.value = true }, 6000)
  // Date metadata and a specified day's readings are independent requests.
  refreshTimer = setInterval(() => { if (!historical.value && !loading.value && !document.hidden) fetchTrend({ force: true }) }, 60000)
  try {
    const date = await repository.loadLatestDate({ signal: latestController.signal })
    if (disposed) return
    latestDate.value = date && date <= today ? date : ''
  } catch { /* A metadata failure must not prevent querying the selected day. */ }
  if (disposed || !needsLatest || selectionRevision !== startingRevision) return
  const date = latestDate.value || today
  if (selectedDate.value !== date) selectedDate.value = date
  else {
    router.replace({ query: { ...route.query, date, metric: activeKey.value } })
    fetchTrend()
  }
})
onBeforeUnmount(() => { disposed = true; initialized = false; requestNumber++; controller?.abort(); latestController?.abort(); clearTimeout(slowTimer); resizeObserver?.disconnect(); cancelAnimationFrame(resizeFrame); clearInterval(refreshTimer); document.removeEventListener('keydown', escape); if (focused.value) document.body.style.overflow = previousOverflow })
</script>

<template>
  <div class="trend-page" :class="{ 'is-loading-data': initialLoading }">
    <div class="trend-content">
      <header class="trend-hero">
        <div><p class="trend-eyebrow"><span /> WATER INTELLIGENCE / ANALYTICS</p><h1>數據趨勢<span>讀懂水的每一次變化</span></h1><p class="trend-intro">沿著流量、水質與壓力，掌握製程的運行脈絡。</p></div>
        <div class="trend-period">
          <span class="period-caption">觀測日期 <small>{{ historical ? 'HISTORICAL' : 'TODAY' }}</small></span>
          <div class="date-controls">
            <button aria-label="前一天" @click="changeDay(-1)"><TwinIcon name="chevron" :size="16" class="previous-day" /></button>
            <label class="trend-date"><TwinIcon name="calendar" :size="17" /><input :value="selectedDate" @change="setDate" aria-label="觀測日期" type="date" :max="today" required /></label>
            <button aria-label="後一天" :disabled="!canNext" @click="changeDay(1)"><TwinIcon name="chevron" :size="16" /></button>
          </div>
          <button v-if="latestDate" class="latest-date" :disabled="selectedDate === latestDate" @click="selectedDate = latestDate">最新資料日 <span>{{ latestDate.replaceAll('-', '/') }}</span><TwinIcon name="arrow" :size="13" /></button>
        </div>
      </header>

      <nav class="trend-categories" aria-label="數據類別">
        <button v-for="item in TREND_CATEGORIES" :key="item.key" :class="{ 'is-active': activeKey === item.key }" :aria-pressed="activeKey === item.key" @click="selectCategory(item.key)"><TwinIcon :name="item.icon" :size="17" />{{ item.label }}</button>
      </nav>

      <div class="summary-heading"><span>測點摘要 <b :style="{ color: focusMeter.color }">{{ focusMeter.tag }} · {{ focusMeter.title }}</b></span><span class="summary-period">{{ category.aggregation }} / {{ dateLabel }}</span></div>
      <section class="trend-stats" aria-label="選取測點的統計摘要" :aria-busy="loading">
        <article v-for="stat in stats" :key="stat.label" class="trend-stat" :class="{ 'is-primary': stat.primary, 'is-pending': initialLoading }">
          <div class="stat-top"><span>{{ stat.label }}</span><TwinIcon :name="stat.icon" :size="18" /></div>
          <div v-if="initialLoading" class="stat-skeleton" aria-hidden="true"><i /><i /></div>
          <div v-else class="stat-number"><strong>{{ fmt(stat.value) }}</strong><span>{{ category.unit }}</span></div>
          <p><span v-if="stat.primary && stat.value !== null" class="reading-dot" />{{ initialLoading ? '正在讀取測點…' : stat.note }}</p>
        </article>
      </section>

      <Teleport to="body" :disabled="!focused">
      <section class="trend-chart-panel" :class="{ 'is-expanded': focused }" :role="focused ? 'dialog' : 'region'" :aria-modal="focused ? true : undefined" aria-label="逐時數據趨勢">
        <div class="trend-chart-heading">
          <div><p class="trend-eyebrow">DAILY PROFILE</p><h2>{{ category.label }}<span>{{ category.unit }}</span></h2><p class="chart-description">{{ dateLabel }}<i />{{ category.aggregation }}<i />{{ initialLoading ? '讀取逐時記錄中' : `${trend.count} 筆有效記錄` }}</p></div>
          <div class="chart-actions">
            <button class="chart-reset" :disabled="!hasReadings" @click="chartRef?.resetSeries()"><TwinIcon name="reset" :size="15" /><span>全日檢視</span></button>
            <button aria-label="重新整理趨勢資料" title="重新整理" :disabled="loading" @click="fetchTrend({ force: true })"><TwinIcon name="reset" :size="18" :class="{ 'is-spinning': loading }" /></button>
            <button aria-label="匯出趨勢 CSV" title="匯出 CSV" :disabled="!hasReadings || loading" @click="exportCsv"><TwinIcon name="download" :size="18" /></button>
            <button :aria-label="focused ? '離開專注趨勢圖' : '專注趨勢圖'" :title="focused ? '返回頁面' : '放大圖表'" :aria-pressed="focused" @click="focused = !focused"><TwinIcon :name="focused ? 'close' : 'expand'" :size="18" /></button>
          </div>
        </div>
        <div class="trend-chart-legend" aria-label="趨勢曲線顯示">
          <button v-for="item in trend.series" :key="item.id" :class="{ 'is-hidden': hiddenIds.includes(item.id) }" :aria-pressed="!hiddenIds.includes(item.id)" :aria-label="`${hiddenIds.includes(item.id) ? '顯示' : '隱藏'} ${item.title}曲線`" @click="toggleMeter(item.id)"><i :style="{ backgroundColor: item.color }" /><b>{{ item.tag }}</b><span>{{ item.title }}</span></button>
          <span class="chart-resolution">24H <i /> 1H INTERVAL</span>
        </div>
        <div ref="chartStage" class="trend-chart-stage" :aria-busy="loading">
          <span class="chart-unit">{{ category.unit }}</span>
          <apexchart v-if="hasReadings" :key="chartHeight" ref="chartRef" type="area" :height="chartHeight" :options="chartOptions" :series="chartSeries" />
          <Transition name="water-reveal"><WaterLoading v-if="loading" :title="loadingTitle" :detail="loadingDetail" :slow="slowLoading" :compact="hasReadings" /></Transition>
          <div v-if="!loading && !hasReadings" class="trend-empty" role="status"><TwinIcon :name="error ? 'alarm' : 'waves'" :size="36" /><h3>{{ error ? '資料暫時無法讀取' : '這一天沒有有效記錄' }}</h3><p>{{ error || `${selectedDate} · 可切換日期查看既有資料。` }}</p><button v-if="!loading && error" class="trend-text-button" @click="fetchTrend({ force: true })">重新讀取 <TwinIcon name="arrow" :size="15" /></button><button v-else-if="!loading && latestDate && selectedDate !== latestDate" class="trend-text-button" @click="selectedDate = latestDate">查看最新資料日 <TwinIcon name="arrow" :size="15" /></button></div>
        </div>
        <footer class="trend-chart-footer"><span><TwinIcon name="info" :size="13" />{{ historical ? '歷史記錄' : '當日記錄' }} · 拖曳圖表可縮放時間範圍；缺測時段保留空白。</span><span>{{ loading ? '正在讀取…' : receivedAt ? `資料讀取 ${receivedAt}` : '等待資料' }}</span></footer>
        <p v-if="error && hasReadings" class="trend-error" role="alert">{{ error }} 畫面保留上次成功讀取的資料。</p>
      </section>
      </Teleport>

      <div class="stream-heading"><h2>測點一覽</h2><span>選取測點，查看上方統計摘要</span></div>
      <section class="trend-streams" :style="{ '--stream-count': trend.series.length }" aria-label="各測點數據摘要">
        <button v-for="item in trend.series" :key="item.id" class="stream-card" :class="{ 'is-selected': focusMeter.id === item.id }" :style="{ '--stream-color': item.color }" :aria-pressed="focusMeter.id === item.id" @click="focusId = item.id">
          <div class="stream-name"><span><i />{{ item.tag }}</span><small>{{ initialLoading ? '讀取中' : `${item.stats.count}/24 時段` }}</small></div>
          <h3>{{ item.title }}</h3>
          <div v-if="initialLoading" class="stream-skeleton" aria-hidden="true" /><div v-else class="stream-reading"><strong>{{ fmt(item.stats.latest) }}</strong><span>{{ category.unit }}</span><TwinIcon name="chevron" :size="17" /></div>
          <div v-if="!initialLoading" class="stream-range"><span>高 {{ fmt(item.stats.max) }} <i />低 {{ fmt(item.stats.min) }}</span><span>首末差 <b>{{ signed(item.stats.delta) }}</b></span></div>
        </button>
      </section>

      <details class="trend-records">
        <summary><span><TwinIcon name="report" :size="17" />逐時數據紀錄 <small>{{ initialLoading ? '讀取中' : `${trend.count} 筆` }}</small></span><TwinIcon name="chevron" :size="16" /></summary>
        <div class="trend-table-wrap"><table><caption>{{ selectedDate }} {{ category.label }}，單位 {{ category.unit }}</caption><thead><tr><th scope="col">時間</th><th v-for="item in trend.series" :key="item.id" scope="col">{{ item.tag }} · {{ item.title }}</th></tr></thead><tbody><tr v-for="(hour, index) in trend.hours" :key="hour"><th scope="row">{{ hour }}</th><td v-for="item in trend.series" :key="item.id">{{ fmt(item.data[index]) }}</td></tr></tbody></table></div>
      </details>
      <footer class="trend-page-footer"><span><TwinIcon name="drop" :size="13" /> AQUATIC · PROCESS INTELLIGENCE</span><span>歷史資料依既有測點記錄呈現</span></footer>
    </div>
  </div>
</template>
