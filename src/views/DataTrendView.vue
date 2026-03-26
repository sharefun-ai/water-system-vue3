<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import screenBg from '../assets/screen_2.png'

const { t } = useI18n()

// ===== Category definitions =====
const categoryKeys = [
  'cumulativeFlow',
  'instantaneousFlow',
  'conductivity',
  'turbidity',
  'rawWaterLevel',
  'productWaterLevel',
  'ptValues',
]

// Map i18n keys to the raw Chinese names used in demo data generation
const categoryRawNames = {
  cumulativeFlow: '累計流量',
  instantaneousFlow: '瞬間流量',
  conductivity: '導電度計',
  turbidity: '產水濁度',
  rawWaterLevel: '原水液位',
  productWaterLevel: '產水液位',
  ptValues: 'PT數值',
}

// ===== State =====
const activeCategoryKey = ref('cumulativeFlow')
const selectedDate = ref(getTaiwanDate())
const maxDate = ref(getTaiwanDate())
const loading = ref(false)
const chartData = ref([])
const expandedStat = ref(null)
const isHoveringChart = ref(false)
const chartRef = ref(null)

const chartStats = reactive({
  max: 0,
  min: 0,
  avg: 0,
  changeRate: 0,
})

// DEMO base values persist across refreshes for smooth transitions
const demoBaseValues = ref({})

// Timers
let updateTimerId = null

// ===== Computed =====
const activeCategory = computed(() => categoryRawNames[activeCategoryKey.value])

const seriesColors = ['#5bf4de', '#5de6ff', '#67ccff', '#ff716c', '#4ad8f0', '#48e5d0']

const indicatorColor = computed(() => {
  const colors = {
    cumulativeFlow: '#5bf4de',
    instantaneousFlow: '#5de6ff',
    conductivity: '#67ccff',
    turbidity: '#ff716c',
    rawWaterLevel: '#4ad8f0',
    productWaterLevel: '#48e5d0',
    ptValues: '#ff716c',
  }
  return colors[activeCategoryKey.value] || '#5bf4de'
})

// ===== Helper functions =====
function getTaiwanDate() {
  return new Date()
    .toLocaleDateString('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    .split('/')
    .join('-')
}

function getUniqueNames() {
  const names = []
  const seen = new Set()
  chartData.value.forEach((item) => {
    if (item.name && !seen.has(item.name)) {
      seen.add(item.name)
      names.push(item.name)
    }
  })
  return names
}

function getUniqueNameCount() {
  return getUniqueNames().length
}

function getSeriesName(index) {
  const names = getUniqueNames()
  return names[index] || ''
}

function formatValue(value) {
  if (value === undefined || value === null) return '\u2013'
  if (typeof value === 'number') {
    return value.toLocaleString('zh-TW', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
  return value
}

// ===== DEMO data generation =====
const FORCE_DEMO = true

const categoryConfig = {
  '累計流量': [
    { name: '入水超音波流量(累計)', base: 17550, range: 20 },
    { name: '產水超音波流量(累計)', base: 17490, range: 15 },
    { name: '入水電磁式流量(累計)', base: 17540, range: 18 },
  ],
  '瞬間流量': [
    { name: '入水超音波流量(瞬間)', base: 43, range: 8 },
    { name: '產水超音波流量(瞬間)', base: 155, range: 30 },
    { name: '入水電磁式流量(瞬間)', base: 105, range: 20 },
  ],
  '導電度計': [
    { name: '導電度計', base: 1700, range: 100 },
  ],
  '產水濁度': [
    { name: '產水濁度', base: 3.0, range: 1.5 },
  ],
  '原水液位': [
    { name: '原水液位', base: 0.8, range: 0.5 },
  ],
  '產水液位': [
    { name: '產水液位', base: 4.0, range: 1.0 },
  ],
  'PT數值': [
    { name: 'PT1', base: 7.0, range: 1.0 },
    { name: 'PT2', base: 4.5, range: 0.8 },
    { name: 'PT3', base: 7.0, range: 0.5 },
    { name: 'PT4', base: 5.5, range: 1.0 },
  ],
}

function generateDemoData() {
  const category = activeCategory.value
  const now = new Date()
  const data = []

  const lines = categoryConfig[category] || []

  lines.forEach((line) => {
    const key = `${category}_${line.name}`
    if (!demoBaseValues.value[key]) {
      demoBaseValues.value[key] = line.base
    }
    demoBaseValues.value[key] += (Math.random() - 0.5) * line.range * 0.05
  })

  const pointCount = 24
  for (let i = pointCount; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 3600000)
    const timeStr = `${t.getHours().toString().padStart(2, '0')}:00`

    lines.forEach((line) => {
      const key = `${category}_${line.name}`
      const baseVal = demoBaseValues.value[key]
      const sinWave = Math.sin((pointCount - i) / 15) * line.range * 0.3
      const noise = (Math.random() - 0.5) * line.range * 0.2
      const value = baseVal + sinWave + noise

      data.push({
        name: line.name,
        time: timeStr,
        value: value.toFixed(2),
      })
    })
  }

  return data
}

// ===== Fetch data =====
async function fetchData(showLoading = false) {
  if (showLoading) {
    loading.value = true
  }

  if (FORCE_DEMO) {
    chartData.value = generateDemoData()
    calculateStats()
    if (showLoading) {
      setTimeout(() => {
        loading.value = false
      }, 300)
    }
    return
  }

  // Non-demo: API call path (kept for future use)
  try {
    const axios = (await import('axios')).default
    const response = await axios.post('./backend/search_chart_3.php', {
      activeButton: activeCategory.value,
      today_date: selectedDate.value,
    })

    if (response.data && Array.isArray(response.data)) {
      chartData.value = response.data
      calculateStats()
    }
  } catch (error) {
    console.error('Error fetching data:', error)
    chartData.value = generateDemoData()
    calculateStats()
  } finally {
    if (showLoading) {
      setTimeout(() => {
        loading.value = false
      }, 500)
    }
  }
}

// ===== Calculate stats =====
function calculateStats() {
  if (chartData.value.length === 0) {
    Object.assign(chartStats, { max: 0, min: 0, avg: 0, changeRate: 0 })
    return
  }

  const values = chartData.value
    .map((item) => parseFloat(item.value))
    .filter((val) => !isNaN(val))

  if (values.length === 0) {
    Object.assign(chartStats, { max: 0, min: 0, avg: 0, changeRate: 0 })
    return
  }

  const max = Math.max(...values)
  const min = Math.min(...values)
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length

  const nameGroups = {}
  chartData.value.forEach((item) => {
    if (!nameGroups[item.name]) nameGroups[item.name] = []
    nameGroups[item.name].push({ time: item.time, value: parseFloat(item.value) })
  })

  let totalChangeRate = 0
  let groupCount = 0

  Object.keys(nameGroups).forEach((name) => {
    const group = nameGroups[name].sort((a, b) => a.time.localeCompare(b.time))
    if (group.length >= 2) {
      const firstVal = group[0].value
      const lastVal = group[group.length - 1].value
      if (firstVal !== 0) {
        const rate = ((lastVal - firstVal) / Math.abs(firstVal)) * 100
        totalChangeRate += rate
        groupCount++
      }
    }
  })

  const changeRate = groupCount > 0 ? totalChangeRate / groupCount : 0
  Object.assign(chartStats, { max, min, avg, changeRate })
}

// ===== Preprocess chart data for ApexCharts =====
function preprocessChartData() {
  const nameGroups = {}

  chartData.value.forEach((item) => {
    if (!nameGroups[item.name]) nameGroups[item.name] = []
    nameGroups[item.name].push({
      x: item.time,
      y: parseFloat(item.value) || 0,
    })
  })

  const series = Object.keys(nameGroups).map((name) => {
    const points = nameGroups[name].sort((a, b) => a.x.localeCompare(b.x))
    return { name, data: points }
  })

  return series
}

// ===== ApexCharts options (computed to be reactive) =====
const chartSeries = computed(() => {
  if (chartData.value.length === 0) return []

  const seriesData = preprocessChartData()
  const allTimes = [...new Set(chartData.value.map((d) => d.time))].sort()

  return seriesData.map((s) => ({
    name: s.name,
    data: allTimes.map((t) => {
      const point = s.data.find((p) => p.x === t)
      return point ? point.y : null
    }),
  }))
})

const chartCategories = computed(() => {
  if (chartData.value.length === 0) return []
  return [...new Set(chartData.value.map((d) => d.time))].sort()
})

const chartOptions = computed(() => ({
  chart: {
    type: 'line',
    height: 600,
    fontFamily: 'Inter, sans-serif',
    animations: {
      enabled: true,
      easing: 'linear',
      speed: 800,
      animateGradually: { enabled: false },
      dynamicAnimation: { enabled: true, speed: 1000 },
    },
    events: {
      mouseMove() {
        isHoveringChart.value = true
      },
      mouseLeave() {
        isHoveringChart.value = false
        fetchData(false)
      },
    },
    toolbar: {
      show: false,
      tools: {
        download: true,
        selection: true,
        zoom: true,
        zoomin: true,
        zoomout: true,
        pan: true,
        reset: true,
      },
      autoSelected: 'zoom',
    },
    zoom: { enabled: true, type: 'x' },
    background: 'transparent',
    dropShadow: {
      enabled: true,
      top: 3,
      left: 2,
      blur: 4,
      opacity: 0.1,
    },
  },
  stroke: {
    curve: 'straight',
    width: 3,
  },
  colors: seriesColors,
  dataLabels: { enabled: false },
  markers: {
    size: 5,
    strokeWidth: 2,
    strokeColors: '#010e24',
    hover: { size: 8 },
  },
  grid: {
    show: true,
    borderColor: '#1a2640',
    strokeDashArray: 3,
    position: 'back',
    xaxis: { lines: { show: true } },
    yaxis: { lines: { show: true } },
    padding: { top: 10, right: 10, bottom: 10, left: 10 },
  },
  xaxis: {
    type: 'category',
    categories: chartCategories.value,
    labels: {
      show: true,
      style: {
        colors: '#9eabc8',
        fontSize: '12px',
        fontWeight: 500,
        fontFamily: 'Space Grotesk, sans-serif',
      },
      formatter(value) {
        return value
      },
    },
    axisBorder: { show: true, color: '#1a2640' },
    axisTicks: { show: true, color: '#1a2640' },
    tooltip: { enabled: true },
  },
  yaxis: {
    labels: {
      style: {
        colors: '#9eabc8',
        fontSize: '12px',
        fontWeight: 500,
        fontFamily: 'Space Grotesk, sans-serif',
      },
      formatter(val) {
        return val != null ? val.toFixed(2) : ''
      },
    },
    axisBorder: { show: true, color: '#1a2640' },
  },
  tooltip: {
    theme: 'dark',
    shared: false,
    intersect: true,
    x: { show: true, format: 'HH:mm' },
    y: {
      formatter(val) {
        return val != null ? val.toFixed(2) : ''
      },
    },
    marker: { show: true },
    style: {
      fontSize: '12px',
      fontFamily: 'Inter, sans-serif',
    },
  },
  legend: {
    show: true,
    position: 'top',
    horizontalAlign: typeof window !== 'undefined' && window.innerWidth < 768 ? 'left' : 'right',
    fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? '10px' : '12px',
    fontFamily: 'Inter, sans-serif',
    floating: false,
    offsetY: 0,
    labels: { colors: '#9eabc8' },
    markers: { width: 8, height: 8, radius: 8 },
    itemMargin: { horizontal: 8, vertical: 2 },
    onItemClick: { toggleDataSeries: true },
    onItemHover: { highlightDataSeries: true },
  },
  responsive: [
    {
      breakpoint: 1600,
      options: { chart: { height: 600 } },
    },
    {
      breakpoint: 1200,
      options: { chart: { height: 500 } },
    },
    {
      breakpoint: 768,
      options: {
        chart: { height: 400 },
        xaxis: {
          tickAmount: 8,
          labels: {
            rotate: -45,
            rotateAlways: true,
            hideOverlappingLabels: true,
            style: { fontSize: '10px' },
          },
        },
        markers: { size: 3 },
      },
    },
    {
      breakpoint: 480,
      options: {
        chart: { height: 300 },
        xaxis: {
          tickAmount: 4,
          labels: {
            rotate: -45,
            rotateAlways: true,
            hideOverlappingLabels: true,
            style: { fontSize: '9px' },
          },
        },
        markers: { size: 2 },
        stroke: { width: 2 },
      },
    },
  ],
}))

// ===== Actions =====
function setActiveCategory(key) {
  activeCategoryKey.value = key
  fetchData(true)
}

function toggleFullscreen() {
  const chartEl = document.querySelector('.chart-glass-panel')
  if (!document.fullscreenElement) {
    chartEl?.requestFullscreen?.()
  } else {
    document.exitFullscreen?.()
  }
}

function exportData() {
  if (chartData.value.length === 0) {
    alert('No data to export')
    return
  }

  const nameGroups = {}
  chartData.value.forEach((item) => {
    if (!nameGroups[item.name]) nameGroups[item.name] = []
    nameGroups[item.name].push(item)
  })

  const allTimes = [...new Set(chartData.value.map((item) => item.time))].sort()

  let csvContent = 'data:text/csv;charset=utf-8,Time'
  const names = Object.keys(nameGroups)

  names.forEach((name) => {
    csvContent += `,${name}`
  })
  csvContent += '\n'

  allTimes.forEach((time) => {
    csvContent += time
    names.forEach((name) => {
      const dataPoint = chartData.value.find(
        (item) => item.time === time && item.name === name
      )
      csvContent += `,${dataPoint ? dataPoint.value : ''}`
    })
    csvContent += '\n'
  })

  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', `${activeCategory.value}_${selectedDate.value}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// ===== Stats definition for template =====
const statCards = computed(() => [
  {
    key: 'max',
    label: t('chart.maxValue'),
    short: 'Max',
    value: formatValue(chartStats.max),
    unit: '',
  },
  {
    key: 'min',
    label: t('chart.minValue'),
    short: 'Min',
    value: formatValue(chartStats.min),
    unit: '',
  },
  {
    key: 'avg',
    label: t('chart.avgValue'),
    short: 'Avg',
    value: formatValue(chartStats.avg),
    unit: '',
  },
  {
    key: 'pts',
    label: t('chart.dataPoints'),
    short: 'Points',
    value: String(chartData.value.length),
    unit: 'log',
  },
  {
    key: 'lines',
    label: t('chart.dataLines'),
    short: 'Lines',
    value: String(getUniqueNameCount()).padStart(2, '0'),
    unit: 'streams',
  },
])

// ===== Watchers =====
watch(selectedDate, () => {
  fetchData(true)
})

// ===== Lifecycle =====
onMounted(() => {
  fetchData(true)

  updateTimerId = setInterval(() => {
    if (!isHoveringChart.value) {
      fetchData(false)
    }
  }, 2000)
})

onBeforeUnmount(() => {
  if (updateTimerId) {
    clearInterval(updateTimerId)
  }
})
</script>

<template>
  <div class="relative min-h-[calc(100vh-3.5rem)]">
    <!-- Aquatic Background -->
    <div class="fixed inset-0 z-[-2] bg-gradient-to-b from-[#02132b] to-[#010e24]" />
    <div
      class="fixed inset-0 z-[-1] bg-cover bg-center opacity-40"
      :style="{ backgroundImage: `url(${screenBg})` }"
    />

    <!-- Main Content -->
    <div class="px-4 md:px-8 pt-6 pb-12">
      <!-- Category Buttons -->
      <div
        class="flex gap-2 md:gap-3 mb-6 md:justify-center overflow-x-auto pb-2 md:flex-wrap scrollbar-hide"
      >
        <button
          v-for="key in categoryKeys"
          :key="key"
          @click="setActiveCategory(key)"
          :class="[
            'px-4 py-2 md:px-5 md:py-2.5 rounded-full text-xs md:text-sm font-medium transition-all duration-300 border whitespace-nowrap flex-shrink-0',
            activeCategoryKey === key
              ? 'bg-primary/20 text-primary border-primary/40 shadow-[0_0_12px_rgba(91,244,222,0.15)]'
              : 'bg-surface-container-high/60 text-on-surface-variant border-outline-variant/20 hover:bg-primary/10 hover:text-primary hover:border-primary/30',
          ]"
        >
          {{ t(`chart.${key}`) }}
        </button>
      </div>

      <!-- Date Picker -->
      <div class="flex justify-center mb-8">
        <div class="glass-panel rounded-full px-6 py-3 flex items-center gap-3">
          <span class="material-symbols-outlined text-primary text-sm">calendar_today</span>
          <input
            type="date"
            class="bg-transparent border-none text-on-surface font-medium text-sm focus:outline-none focus:ring-0 tabular-nums cursor-pointer"
            v-model="selectedDate"
            :max="maxDate"
          />
        </div>
      </div>

      <!-- Chart Card -->
      <section class="mb-8 relative">
        <div
          class="chart-glass-panel glass-panel rounded-2xl md:rounded-3xl overflow-hidden min-h-[350px] md:min-h-[500px] flex flex-col relative"
        >
          <!-- Chart Header -->
          <div
            class="p-4 md:p-6 flex justify-between items-center border-b border-primary/10"
          >
            <!-- Legend dots: dynamically generated for all series, hidden on mobile -->
            <div class="hidden md:flex items-center gap-6 flex-wrap">
              <div
                v-for="(s, idx) in chartSeries"
                :key="s.name"
                class="flex items-center gap-2"
              >
                <span
                  class="w-3 h-3 rounded-full"
                  :style="{
                    backgroundColor: seriesColors[idx % seriesColors.length],
                    boxShadow: `0 0 8px ${seriesColors[idx % seriesColors.length]}cc`
                  }"
                />
                <span class="text-xs font-bold uppercase tracking-widest text-on-surface/70">{{ s.name }}</span>
              </div>
            </div>
            <!-- Mobile: show category name -->
            <span class="md:hidden text-xs font-bold text-primary uppercase tracking-widest">
              {{ t(`chart.${activeCategoryKey}`) }}
            </span>
            <!-- Action buttons -->
            <div class="flex gap-2">
              <button
                class="p-2 hover:bg-white/5 rounded-lg transition-colors"
                :title="'Export data'"
                @click="exportData"
              >
                <span class="material-symbols-outlined text-on-surface-variant">download</span>
              </button>
              <button
                class="p-2 hover:bg-white/5 rounded-lg transition-colors"
                :title="'Refresh'"
                @click="fetchData(true)"
              >
                <span class="material-symbols-outlined text-on-surface-variant">refresh</span>
              </button>
              <button
                class="p-2 hover:bg-white/5 rounded-lg transition-colors"
                :title="'Fullscreen'"
                @click="toggleFullscreen"
              >
                <span class="material-symbols-outlined text-on-surface-variant">fullscreen</span>
              </button>
            </div>
          </div>

          <!-- Chart Area -->
          <div class="flex-1 chart-grid relative p-4">
            <apexchart
              ref="chartRef"
              type="line"
              :options="chartOptions"
              :series="chartSeries"
              :height="chartOptions.chart.height"
            />

            <!-- Loading overlay -->
            <div
              v-if="loading"
              class="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm z-10 rounded-b-3xl"
            >
              <div class="spinner" />
              <p class="text-on-surface-variant text-sm">Loading data...</p>
            </div>

            <!-- No data overlay -->
            <div
              v-if="!loading && chartData.length === 0"
              class="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm z-10 rounded-b-3xl"
            >
              <span
                class="material-symbols-outlined text-on-surface-variant/40 text-5xl mb-4"
              >show_chart</span>
              <p class="text-on-surface-variant text-sm">No data available for selected date</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Stats Grid -->
      <section class="flex flex-wrap gap-2 md:gap-4 lg:gap-6 lg:grid lg:grid-cols-5">
        <div
          v-for="stat in statCards"
          :key="stat.key"
          @click="expandedStat = expandedStat === stat.key ? null : stat.key"
          class="bg-white/[0.05] backdrop-blur-xl rounded-xl md:rounded-2xl border border-white/5 min-w-0 overflow-hidden cursor-pointer transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] lg:h-28 lg:col-span-1"
          :class="[
            expandedStat === stat.key
              ? 'basis-full p-4 md:p-5 border-primary/30 bg-primary/[0.08] order-first'
              : expandedStat && expandedStat !== stat.key
                ? 'basis-[calc(50%-4px)] md:basis-auto p-3 md:p-5 opacity-70'
                : 'basis-[calc(33.333%-6px)] md:basis-auto p-3 md:p-5',
          ]"
        >
          <div class="flex items-center justify-between mb-1 md:mb-2">
            <span
              class="text-[9px] md:text-xs font-bold text-on-surface/50 uppercase tracking-wider md:tracking-widest"
            >
              {{ expandedStat === stat.key ? stat.label : stat.short }}
            </span>
            <span
              v-if="expandedStat === stat.key"
              class="material-symbols-outlined text-primary/40 text-sm"
            >close</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span
              class="font-bold font-body text-[#57f1db] drop-shadow-[0_0_12px_rgba(87,241,219,0.3)] tabular-nums transition-all duration-300"
              :class="
                expandedStat === stat.key
                  ? 'text-3xl md:text-4xl'
                  : 'text-base md:text-2xl lg:text-3xl truncate'
              "
            >{{ stat.value }}</span>
            <span
              v-if="stat.unit"
              class="text-[8px] md:text-[10px] text-primary/60 font-mono flex-shrink-0"
            >{{ stat.unit }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* Hide scrollbar for horizontal scroll */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Chart grid pattern */
.chart-grid {
  background-image: linear-gradient(
      rgba(91, 244, 222, 0.05) 1px,
      transparent 1px
    ),
    linear-gradient(90deg, rgba(91, 244, 222, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* Loading spinner */
.spinner {
  border: 3px solid rgba(91, 244, 222, 0.2);
  border-radius: 50%;
  border-top: 3px solid #5bf4de;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Tabular nums for date input and values */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}

/* Transition duration-400 utility */
.duration-400 {
  transition-duration: 400ms;
}

/* Date input dark mode fixes */
input[type='date']::-webkit-calendar-picker-indicator {
  filter: invert(1) brightness(0.8);
  cursor: pointer;
}
</style>

<style>
/* ApexCharts dark tooltip override (global, not scoped) */
.apexcharts-tooltip {
  background: rgba(1, 14, 36, 0.9) !important;
  backdrop-filter: blur(16px) !important;
  border: 1px solid rgba(91, 244, 222, 0.15) !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
  color: #dbe6ff !important;
}
.apexcharts-tooltip-title {
  background: rgba(91, 244, 222, 0.08) !important;
  border-bottom: 1px solid rgba(91, 244, 222, 0.1) !important;
  color: #9eabc8 !important;
  font-family: 'Space Grotesk', sans-serif !important;
}
.apexcharts-tooltip-text-y-value {
  color: #5bf4de !important;
  font-weight: 700 !important;
}
.apexcharts-tooltip-series-group {
  padding: 4px 10px !important;
}
.apexcharts-xaxistooltip {
  background: rgba(1, 14, 36, 0.9) !important;
  border: 1px solid rgba(91, 244, 222, 0.15) !important;
  color: #9eabc8 !important;
}
.apexcharts-xaxistooltip-bottom::before,
.apexcharts-xaxistooltip-bottom::after {
  border-bottom-color: rgba(91, 244, 222, 0.15) !important;
}
</style>
