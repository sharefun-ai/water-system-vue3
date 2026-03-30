<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import * as XLSX from 'xlsx'
import screenBg from '../assets/screen_2.png'

const { t } = useI18n()

// ─── State ───
const today = new Date()
const currentYear = today.getFullYear()
const currentMonth = today.getMonth() + 1

const buttonKeys = ['cumulativeFlow', 'instantaneousFlow', 'otherValues', 'ptValues']
const activeButton = ref('cumulativeFlow')

const selectedYear = ref(currentYear)
const selectedMonth = ref(currentMonth)
const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)
const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

const isLoading = ref(true)
const searchData = ref([])

// Detail modal
const showDetailModal = ref(false)
const clickDate = ref('')
const detailData = ref([])

// Excel export modal
const showDateRangeModal = ref(false)
const startDate = ref('')
const endDate = ref('')
const formatOption = ref('xlsx')

// ─── Category Definitions ───
const categories = [
  { name: '入水電磁式流量(累計)', base: 17500, range: 100 },
  { name: '入水電磁式流量(瞬間)', base: 100, range: 30 },
  { name: '入水超音波流量(累計)', base: 17500, range: 100 },
  { name: '入水超音波流量(瞬間)', base: 45, range: 15 },
  { name: '產水超音波流量(累計)', base: 17400, range: 100 },
  { name: '產水超音波流量(瞬間)', base: 160, range: 30 },
  { name: '導電度計', base: 1700, range: 80 },
  { name: '產水濁度', base: 3, range: 2 },
  { name: '原水液位', base: 0.9, range: 0.5 },
  { name: '產水液位', base: 4, range: 1.5 },
  { name: 'PT1', base: 7, range: 1 },
  { name: 'PT2', base: 4.5, range: 1 },
  { name: 'PT3', base: 7, range: 1 },
  { name: 'PT4', base: 5.5, range: 1 },
]

// ─── Table Column Definitions ───
const tableColumns = {
  cumulativeFlow: {
    headers: ['日期', '入水電磁式流量(累計)', '入水超音波流量(累計)', '產水超音波流量(累計)'],
    fields: ['electromagnetic', 'inflow_ultrasonic', 'outflow_ultrasonic'],
  },
  instantaneousFlow: {
    headers: ['日期', '入水電磁式流量(瞬間)', '入水超音波流量(瞬間)', '產水超音波流量(瞬間)'],
    fields: ['electromagnetic', 'inflow_ultrasonic', 'outflow_ultrasonic'],
  },
  otherValues: {
    headers: ['日期', '導電度計', '產水濁度', '原水液位', '產水液位'],
    fields: ['conductivity', 'turbidity', 'water_level', 'get_water_level'],
  },
  ptValues: {
    headers: ['日期', 'PT1', 'PT2', 'PT3', 'PT4'],
    fields: ['PT1', 'PT2', 'PT3', 'PT4'],
  },
}

// Detail modal column headers (time replaces date)
const detailColumns = {
  cumulativeFlow: ['時間', '入水電磁式流量(累計)', '入水超音波流量(累計)', '產水超音波流量(累計)'],
  instantaneousFlow: ['時間', '入水電磁式流量(瞬間)', '入水超音波流量(瞬間)', '產水超音波流量(瞬間)'],
  otherValues: ['時間', '導電度計', '產水濁度', '原水液位', '產水液位'],
  ptValues: ['時間', 'PT1', 'PT2', 'PT3', 'PT4'],
}

// Name filters per category (for raw data lookup)
const nameFilters = {
  cumulativeFlow: ['入水電磁式流量(累計)', '入水超音波流量(累計)', '產水超音波流量(累計)'],
  instantaneousFlow: ['入水電磁式流量(瞬間)', '入水超音波流量(瞬間)', '產水超音波流量(瞬間)'],
  otherValues: ['導電度計', '產水濁度', '原水液位', '產水液位'],
  ptValues: ['PT1', 'PT2', 'PT3', 'PT4'],
}

// ─── DEMO Data Generation ───
function fetchData() {
  isLoading.value = true
  const year = selectedYear.value
  const month = String(selectedMonth.value).padStart(2, '0')
  const daysInMonth = new Date(year, selectedMonth.value, 0).getDate()
  const demoData = []
  let id = 1

  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${month}-${String(d).padStart(2, '0')}`
    for (let h = 0; h < 24; h++) {
      const time = `${String(h).padStart(2, '0')}:00`
      for (const cat of categories) {
        const val = cat.base + (Math.random() - 0.5) * cat.range
        demoData.push({
          id: String(id++),
          value: String(parseFloat(val.toFixed(2))),
          name: cat.name,
          element_no: String(categories.indexOf(cat) + 1),
          date,
          time,
        })
      }
    }
  }

  searchData.value = demoData
  isLoading.value = false
}

// ─── Computed: Processed Table Data ───

// 累積流量 — uses last (max time) value per day
const organizedData = computed(() => {
  const processedData = {}
  const dates = new Set(searchData.value.map((item) => item.date))
  const fields = ['入水電磁式流量(累計)', '入水超音波流量(累計)', '產水超音波流量(累計)']

  dates.forEach((date) => {
    processedData[date] = {}
    fields.forEach((f) => { processedData[date][f] = { time: '', value: 0 } })
  })

  for (const entry of searchData.value) {
    if (fields.includes(entry.name)) {
      const cur = processedData[entry.date][entry.name]
      if (!cur.time || entry.time > cur.time) {
        processedData[entry.date][entry.name] = { time: entry.time, value: entry.value }
      }
    }
  }

  return Object.keys(processedData)
    .sort((a, b) => new Date(a) - new Date(b))
    .map((date) => ({
      date,
      electromagnetic: Math.round(parseFloat(processedData[date]['入水電磁式流量(累計)']?.value) || 0),
      inflow_ultrasonic: Math.round(parseFloat(processedData[date]['入水超音波流量(累計)']?.value) || 0),
      outflow_ultrasonic: Math.round(parseFloat(processedData[date]['產水超音波流量(累計)']?.value) || 0),
    }))
})

// Helper: compute daily average for a set of field names
function computeDailyAvg(fieldNames) {
  const result = {}
  const dates = new Set(searchData.value.map((item) => item.date))

  dates.forEach((date) => {
    result[date] = {}
    fieldNames.forEach((f) => { result[date][f] = { total: 0, count: 0, avg: 0 } })
  })

  searchData.value.forEach((item) => {
    if (fieldNames.includes(item.name)) {
      const val = parseFloat(item.value) || 0
      result[item.date][item.name].total += val
      result[item.date][item.name].count++
    }
  })

  Object.values(result).forEach((dateObj) => {
    Object.keys(dateObj).forEach((key) => {
      if (dateObj[key].count > 0) {
        dateObj[key].avg = dateObj[key].total / dateObj[key].count
      }
    })
  })

  return result
}

// 瞬間流量
const organizedDataInstant = computed(() => {
  const fields = ['入水電磁式流量(瞬間)', '入水超音波流量(瞬間)', '產水超音波流量(瞬間)']
  const dataByDate = computeDailyAvg(fields)
  return Object.entries(dataByDate)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([date, values]) => ({
      date,
      electromagnetic: (values['入水電磁式流量(瞬間)']?.avg || 0).toFixed(1),
      inflow_ultrasonic: (values['入水超音波流量(瞬間)']?.avg || 0).toFixed(1),
      outflow_ultrasonic: (values['產水超音波流量(瞬間)']?.avg || 0).toFixed(1),
    }))
})

// 其他數值
const organizedDataOthers = computed(() => {
  const fields = ['導電度計', '產水濁度', '原水液位', '產水液位']
  const dataByDate = computeDailyAvg(fields)
  return Object.entries(dataByDate)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([date, values]) => ({
      date,
      conductivity: (values['導電度計']?.avg || 0).toFixed(1),
      turbidity: (values['產水濁度']?.avg || 0).toFixed(1),
      water_level: (values['原水液位']?.avg || 0).toFixed(1),
      get_water_level: (values['產水液位']?.avg || 0).toFixed(1),
    }))
})

// PT數值
const organizedDataPressure = computed(() => {
  const fields = ['PT1', 'PT2', 'PT3', 'PT4']
  const dataByDate = computeDailyAvg(fields)
  return Object.entries(dataByDate)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([date, values]) => ({
      date,
      PT1: (values['PT1']?.avg || 0).toFixed(1),
      PT2: (values['PT2']?.avg || 0).toFixed(1),
      PT3: (values['PT3']?.avg || 0).toFixed(1),
      PT4: (values['PT4']?.avg || 0).toFixed(1),
    }))
})

// Active dataset for the current category
const activeTableData = computed(() => {
  switch (activeButton.value) {
    case 'cumulativeFlow': return organizedData.value
    case 'instantaneousFlow': return organizedDataInstant.value
    case 'otherValues': return organizedDataOthers.value
    case 'ptValues': return organizedDataPressure.value
    default: return []
  }
})

const activeHeaders = computed(() => tableColumns[activeButton.value]?.headers || [])
const activeFields = computed(() => tableColumns[activeButton.value]?.fields || [])
const activeDetailHeaders = computed(() => detailColumns[activeButton.value] || [])
const activeDetailFields = computed(() => tableColumns[activeButton.value]?.fields || [])
const activeColSpan = computed(() => activeHeaders.value.length)

// ─── Methods ───
function setActive(btn) {
  activeButton.value = btn
}

function onRowClick(date) {
  clickDate.value = date
  const filter = nameFilters[activeButton.value]
  const filtered = searchData.value.filter(
    (item) => item.date === date && filter.includes(item.name),
  )

  const timeMap = {}
  filtered.forEach((item) => {
    if (!timeMap[item.time]) timeMap[item.time] = {}
    const val = parseFloat(item.value) || 0

    if (activeButton.value === 'cumulativeFlow') {
      if (item.name === '入水電磁式流量(累計)') timeMap[item.time].electromagnetic = Math.round(val)
      else if (item.name === '入水超音波流量(累計)') timeMap[item.time].inflow_ultrasonic = Math.round(val)
      else if (item.name === '產水超音波流量(累計)') timeMap[item.time].outflow_ultrasonic = Math.round(val)
    } else if (activeButton.value === 'instantaneousFlow') {
      if (item.name === '入水電磁式流量(瞬間)') timeMap[item.time].electromagnetic = val.toFixed(1)
      else if (item.name === '入水超音波流量(瞬間)') timeMap[item.time].inflow_ultrasonic = val.toFixed(1)
      else if (item.name === '產水超音波流量(瞬間)') timeMap[item.time].outflow_ultrasonic = val.toFixed(1)
    } else if (activeButton.value === 'otherValues') {
      if (item.name === '導電度計') timeMap[item.time].conductivity = val.toFixed(1)
      else if (item.name === '產水濁度') timeMap[item.time].turbidity = val.toFixed(1)
      else if (item.name === '原水液位') timeMap[item.time].water_level = val.toFixed(1)
      else if (item.name === '產水液位') timeMap[item.time].get_water_level = val.toFixed(1)
    } else if (activeButton.value === 'ptValues') {
      if (item.name === 'PT1') timeMap[item.time].PT1 = val.toFixed(1)
      else if (item.name === 'PT2') timeMap[item.time].PT2 = val.toFixed(1)
      else if (item.name === 'PT3') timeMap[item.time].PT3 = val.toFixed(1)
      else if (item.name === 'PT4') timeMap[item.time].PT4 = val.toFixed(1)
    }
  })

  detailData.value = Object.keys(timeMap)
    .sort((a, b) => new Date(`1970/01/01 ${a}`) - new Date(`1970/01/01 ${b}`))
    .map((time) => ({ time, ...timeMap[time] }))

  showDetailModal.value = true
}

function openDateRangeModal() {
  const firstDay = new Date(selectedYear.value, selectedMonth.value - 1, 1)
  const lastDay = new Date(selectedYear.value, selectedMonth.value, 0)
  startDate.value = firstDay.toISOString().split('T')[0]
  endDate.value = lastDay.toISOString().split('T')[0]
  showDateRangeModal.value = true
}

function generateReport() {
  if (!startDate.value || !endDate.value) {
    alert('請選擇開始和結束日期')
    return
  }
  if (new Date(startDate.value) > new Date(endDate.value)) {
    alert('開始日期不能晚於結束日期')
    return
  }

  showDateRangeModal.value = false

  // In DEMO mode, generate a mock Excel download using the XLSX library if available
  // For production, this would POST to backend/csv_reload_3.php
  try {
    if (XLSX) {
      const workbook = XLSX.utils.book_new()
      workbook.Props = {
        Title: `水資源監控報表_${startDate.value}至${endDate.value}`,
        Author: '水資源監控系統',
        CreatedDate: new Date(),
      }

      if (formatOption.value === 'xlsx') {
        // Separate sheets per category
        const catDefs = {
          '累積流量': ['入水電磁式流量(累計)', '入水超音波流量(累計)', '產水超音波流量(累計)'],
          '瞬間流量': ['入水電磁式流量(瞬間)', '入水超音波流量(瞬間)', '產水超音波流量(瞬間)'],
          '其他數值': ['導電度計', '產水濁度', '原水液位', '產水液位'],
          'PT數值': ['PT1', 'PT2', 'PT3', 'PT4'],
        }
        Object.entries(catDefs).forEach(([category, fields]) => {
          const filtered = searchData.value.filter(
            (item) => fields.includes(item.name) && item.date >= startDate.value && item.date <= endDate.value,
          )
          const grouped = {}
          filtered.forEach((item) => {
            const key = `${item.date}_${item.time}`
            if (!grouped[key]) grouped[key] = { date: item.date, time: item.time }
            const val = parseFloat(item.value) || 0
            grouped[key][item.name] = item.name.includes('累計') ? Math.round(val) : Math.round(val * 10) / 10
          })
          const rows = [['日期', '時間', ...fields]]
          Object.values(grouped)
            .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
            .forEach((row) => {
              rows.push([row.date, row.time, ...fields.map((f) => row[f] || 0)])
            })
          const ws = XLSX.utils.aoa_to_sheet(rows)
          XLSX.utils.book_append_sheet(workbook, ws, category)
        })
        XLSX.writeFile(workbook, `水資源監控報表_分頁式_${startDate.value}至${endDate.value}.xlsx`)
      } else {
        // Single sheet with all fields
        const allFields = [
          '入水電磁式流量(累計)', '入水超音波流量(累計)', '產水超音波流量(累計)',
          '入水電磁式流量(瞬間)', '入水超音波流量(瞬間)', '產水超音波流量(瞬間)',
          '導電度計', '產水濁度', '原水液位', '產水液位',
          'PT1', 'PT2', 'PT3', 'PT4',
        ]
        const filtered = searchData.value.filter(
          (item) => allFields.includes(item.name) && item.date >= startDate.value && item.date <= endDate.value,
        )
        const grouped = {}
        filtered.forEach((item) => {
          const key = `${item.date}_${item.time}`
          if (!grouped[key]) grouped[key] = { date: item.date, time: item.time }
          const val = parseFloat(item.value) || 0
          grouped[key][item.name] = item.name.includes('累計') ? Math.round(val) : Math.round(val * 10) / 10
        })
        const rows = [['日期', '時間', ...allFields]]
        Object.values(grouped)
          .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
          .forEach((row) => {
            rows.push([row.date, row.time, ...allFields.map((f) => row[f] || 0)])
          })
        const ws = XLSX.utils.aoa_to_sheet(rows)
        XLSX.utils.book_append_sheet(workbook, ws, '水資源監控數據')
        XLSX.writeFile(workbook, `水資源監控報表_一頁式_${startDate.value}至${endDate.value}.xlsx`)
      }
      alert('報表已生成，下載完成')
    } else {
      alert('[DEMO] XLSX 庫未加載，正式環境下會透過後端 API 匯出報表')
    }
  } catch (err) {
    console.error('Export error:', err)
    alert('[DEMO] 報表匯出模擬完成')
  }
}

// ─── Watchers ───
watch([selectedYear, selectedMonth], () => {
  fetchData()
})

// ─── Lifecycle ───
let refreshTimer = null
onMounted(() => {
  fetchData()
  refreshTimer = setInterval(fetchData, 60000)
})
onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<template>
  <!-- Background Layer -->
  <div class="fixed inset-0 -z-10">
    <div class="absolute inset-0 bg-gradient-to-b from-background/80 to-background/40"></div>
    <div class="absolute inset-0 opacity-30" style="background-image: radial-gradient(circle at 50% -20%, rgba(91,244,222,0.13) 0%, transparent 60%)"></div>
    <div class="absolute inset-0" style="background: linear-gradient(45deg, rgba(91,244,222,0.05) 0%, transparent 70%); pointer-events: none"></div>
    <img
      :src="screenBg"
      alt="water background"
      class="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-screen"
    />
  </div>

  <div class="max-w-[1400px] mx-auto px-4 md:px-6 pt-4 pb-8">
    <!-- Title Section (desktop) -->
    <div class="hidden md:block text-center my-6">
      <h1 class="text-3xl lg:text-4xl font-bold text-on-surface font-headline">
        {{ t('report.title', { year: selectedYear, month: selectedMonth }) }}
      </h1>
      <h2 class="text-lg text-on-surface-variant font-medium mt-1">{{ t(`report.${activeButton}`) }}</h2>
    </div>

    <!-- Category Buttons -->
    <div class="flex items-center gap-2 sm:gap-2.5 mb-4 px-4 overflow-x-auto scrollbar-hide">
      <button
        v-for="key in buttonKeys"
        :key="key"
        @click="setActive(key)"
        class="shrink-0 px-4 sm:px-6 py-2 sm:py-2.5 rounded-[10px] text-[13px] sm:text-[15px] font-label transition-all duration-200 backdrop-blur-lg whitespace-nowrap"
        :class="activeButton === key
          ? 'bg-primary/15 border border-primary/40 text-primary font-bold shadow-[0_0_12px_rgba(91,244,222,0.15)]'
          : 'bg-white/[0.03] border border-white/[0.08] text-white/60 font-medium hover:border-white/20 hover:text-white/80'"
      >
        {{ t(`report.${key}`) }}
      </button>
    </div>

    <!-- Year/Month + Excel Export Row -->
    <div class="flex items-center justify-between gap-2 mb-6 px-2">
      <!-- Year/Month Selector -->
      <div class="flex items-center gap-0 bg-white/[0.03] border border-white/[0.06] rounded-xl py-2 sm:py-2.5 px-1 backdrop-blur-xl min-w-0">
        <div class="flex items-center px-2 sm:px-3.5">
          <span class="material-symbols-outlined text-primary text-lg sm:text-xl">calendar_today</span>
        </div>
        <select
          v-model="selectedYear"
          class="bg-transparent border-none text-on-surface text-sm sm:text-base font-semibold cursor-pointer outline-none px-1 sm:px-1.5 py-0.5 font-label"
        >
          <option
            v-for="year in yearOptions"
            :key="year"
            :value="year"
            class="bg-surface-container-high text-on-surface"
          >{{ year }}</option>
        </select>
        <span class="text-white/30 text-xs sm:text-[15px] mx-0.5 sm:mx-1">年</span>
        <select
          v-model="selectedMonth"
          class="bg-transparent border-none text-on-surface text-sm sm:text-base font-semibold cursor-pointer outline-none px-1 sm:px-1.5 py-0.5 font-label"
        >
          <option
            v-for="month in monthOptions"
            :key="month"
            :value="month"
            class="bg-surface-container-high text-on-surface"
          >{{ month }}</option>
        </select>
        <span class="text-white/30 text-xs sm:text-[15px] mr-2 sm:mr-3.5">月</span>
      </div>

      <!-- Excel Export Button -->
      <button
        @click="openDateRangeModal()"
        class="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl border-none cursor-pointer font-bold text-xs sm:text-[15px] text-on-primary font-label shrink-0 transition-transform duration-200 hover:scale-[1.02]"
        style="background: linear-gradient(135deg, #5bf4de, #0fc9b4); box-shadow: 0 0 15px rgba(91,244,222,0.25);"
      >
        <span class="material-symbols-outlined text-lg sm:text-xl">file_download</span>
        <span class="hidden sm:inline">{{ t('report.excelExport') }}</span>
      </button>
    </div>

    <!-- Loading Spinner -->
    <div v-if="isLoading" class="flex justify-center py-16">
      <div class="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    </div>

    <!-- Glass Panel Table Container -->
    <section
      v-else
      class="mx-0 sm:mx-2 rounded-2xl overflow-hidden relative backdrop-blur-2xl border border-white/5"
      style="background: rgba(255,255,255,0.02); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);"
    >
      <!-- Top gradient line -->
      <div class="absolute top-0 left-0 w-full h-0.5" style="background: linear-gradient(to right, transparent, rgba(91,244,222,0.4), transparent)"></div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse font-label">
          <thead class="bg-white/[0.03]">
            <tr>
              <th
                v-for="header in activeHeaders"
                :key="header"
                class="px-3 sm:px-7 py-3 sm:py-4 text-[10px] sm:text-[11px] font-bold text-primary tracking-wider uppercase whitespace-nowrap"
              >{{ header }}</th>
            </tr>
          </thead>
          <tbody>
            <!-- Empty state -->
            <tr v-if="activeTableData.length === 0">
              <td :colspan="activeColSpan" class="text-center py-16 text-white/40">
                <span class="material-symbols-outlined text-5xl block mb-3 opacity-30">database</span>
                <div class="text-base font-semibold mb-1">{{ t('report.noData', '目前尚無任何數據') }}</div>
                <div class="text-xs opacity-60">{{ t('report.noDataDesc', '該時間區間內沒有找到相關資料') }}</div>
              </td>
            </tr>
            <!-- Data rows -->
            <tr
              v-for="row in activeTableData"
              :key="row.date"
              @click="onRowClick(row.date)"
              class="cursor-pointer border-b border-white/[0.04] transition-colors duration-200 hover:bg-primary/[0.04]"
            >
              <td class="px-3 sm:px-7 py-2.5 sm:py-3.5 font-medium text-on-surface whitespace-nowrap text-xs sm:text-sm">{{ row.date }}</td>
              <td
                v-for="field in activeFields"
                :key="field"
                class="px-3 sm:px-7 py-2.5 sm:py-3.5 font-medium text-xs sm:text-[15px] text-on-surface/80 whitespace-nowrap"
              >{{ row[field] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ═══════ Detail Modal ═══════ -->
    <div
      v-show="showDetailModal"
      class="fixed inset-0 z-[200] flex items-center justify-center p-4"
    >
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="showDetailModal = false"></div>
      <!-- Panel -->
      <div class="relative z-10 w-full max-w-3xl bg-surface-container-high border border-white/10 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col font-body">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-white/10">
          <h5 class="text-lg font-bold text-primary flex items-center gap-2 m-0">
            <span class="material-symbols-outlined">calendar_today</span>
            {{ clickDate }} 當日數據詳情
          </h5>
          <button
            class="text-white/60 hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
            @click="showDetailModal = false"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-6">
          <div class="rounded-lg overflow-y-auto max-h-[50vh] relative" style="box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25), 0 2px 4px -2px rgba(0,0,0,0.1);">
            <table class="w-full border-collapse table-fixed">
              <thead>
                <tr>
                  <th
                    v-for="h in activeDetailHeaders"
                    :key="h"
                    class="sticky top-0 z-10 px-4 py-3 text-center text-white font-semibold border-b-2 border-primary/40"
                    style="background-color: #2c3e50;"
                  >{{ h }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="detailData.length === 0">
                  <td :colspan="activeDetailHeaders.length" class="text-center py-8 text-on-surface-variant">
                    <span class="material-symbols-outlined text-3xl block mb-2 opacity-40">schedule</span>
                    <div class="font-semibold">目前尚無當日數據</div>
                    <div class="text-sm opacity-60 mt-1">選擇的日期沒有詳細的時間數據記錄。</div>
                  </td>
                </tr>
                <tr
                  v-else
                  v-for="(item, idx) in detailData"
                  :key="item.time"
                  class="transition-colors duration-200 hover:!bg-blue-500/15 hover:text-white"
                  :class="idx % 2 === 0 ? 'bg-black/[0.15]' : 'bg-black/[0.05]'"
                >
                  <td class="px-4 py-2.5 text-center font-medium bg-black/20 text-primary/80">{{ item.time }}</td>
                  <td
                    v-for="field in activeDetailFields"
                    :key="field"
                    class="px-4 py-2.5 text-center text-on-surface/80"
                  >{{ item[field] || '0' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <!-- Footer -->
        <div class="p-4 border-t border-white/10 flex justify-end">
          <button
            class="px-5 py-2 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 transition-colors text-sm border border-white/10 cursor-pointer"
            @click="showDetailModal = false"
          >
            {{ t('common.close') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════ Date Range / Excel Export Modal ═══════ -->
    <div
      v-show="showDateRangeModal"
      class="fixed inset-0 z-[200] flex items-center justify-center p-4"
    >
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm" @click="showDateRangeModal = false"></div>
      <!-- Panel -->
      <div class="relative z-10 w-full max-w-md bg-surface-container-high border border-white/10 rounded-2xl shadow-2xl font-body">
        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-white/10">
          <h5 class="text-lg font-bold text-primary flex items-center gap-2 m-0">
            <span class="material-symbols-outlined">date_range</span>
            {{ t('report.selectDateRange') }}
          </h5>
          <button
            class="text-white/60 hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
            @click="showDateRangeModal = false"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <!-- Body -->
        <div class="p-6 space-y-5">
          <div>
            <label class="block text-sm text-white/60 mb-2">{{ t('report.startDate') }}</label>
            <input
              type="date"
              v-model="startDate"
              class="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-primary/40 transition-colors"
            />
          </div>
          <div>
            <label class="block text-sm text-white/60 mb-2">{{ t('report.endDate') }}</label>
            <input
              type="date"
              v-model="endDate"
              class="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-primary/40 transition-colors"
            />
          </div>
          <div>
            <h4 class="text-sm font-bold text-white/80 mb-3">{{ t('report.reportFormat') }}</h4>
            <div class="space-y-2">
              <!-- Format: Paged Excel -->
              <div
                class="flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all"
                :class="formatOption === 'xlsx'
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-white/[0.03] border-white/10 hover:border-white/20'"
                @click="formatOption = 'xlsx'"
              >
                <input type="radio" name="format" value="xlsx" v-model="formatOption" class="accent-primary" />
                <span class="material-symbols-outlined text-primary">table_view</span>
                <div>
                  <div class="text-sm font-medium text-white">{{ t('report.pagedExcel') }}</div>
                  <div class="text-xs text-white/50">{{ t('report.pagedExcelDesc') }}</div>
                </div>
              </div>
              <!-- Format: Single Sheet -->
              <div
                class="flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all"
                :class="formatOption === 'csv'
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-white/[0.03] border-white/10 hover:border-white/20'"
                @click="formatOption = 'csv'"
              >
                <input type="radio" name="format" value="csv" v-model="formatOption" class="accent-primary" />
                <span class="material-symbols-outlined text-primary">grid_on</span>
                <div>
                  <div class="text-sm font-medium text-white">{{ t('report.singleExcel') }}</div>
                  <div class="text-xs text-white/50">{{ t('report.singleExcelDesc') }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- Footer -->
        <div class="p-4 border-t border-white/10 flex justify-end gap-3">
          <button
            class="px-5 py-2.5 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 transition-colors text-sm border border-white/10 cursor-pointer"
            @click="showDateRangeModal = false"
          >
            {{ t('report.cancel') }}
          </button>
          <button
            class="px-5 py-2.5 rounded-lg text-sm font-bold transition-all border-none cursor-pointer"
            style="background: linear-gradient(135deg, #5bf4de, #0fc9b4); color: #00594f;"
            @click="generateReport"
          >
            {{ t('report.generate') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Hide scrollbar for category buttons */
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

/* Border width utility that Tailwind v4 may not auto-generate */
.border-3 { border-width: 3px; }

/* Responsive: hide Excel text on mobile */
@media (max-width: 639px) {
  .excel-export-text { display: none; }
}

/* Table row hover: smooth transition */
table tbody tr {
  transition: background-color 0.2s ease;
}

/* Detail modal table scrollbar */
.overflow-y-auto::-webkit-scrollbar { width: 6px; }
.overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
.overflow-y-auto::-webkit-scrollbar-thumb { background: rgba(91,244,222,0.2); border-radius: 3px; }
.overflow-y-auto::-webkit-scrollbar-thumb:hover { background: rgba(91,244,222,0.4); }

/* Date input styling for dark theme */
input[type="date"] {
  color-scheme: dark;
}
</style>
