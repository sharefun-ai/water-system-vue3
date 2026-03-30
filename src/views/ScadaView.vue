<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import screenImg from '../assets/engineering-diagram.png'

const { t } = useI18n()

// ─── Reactive State ───
const allData = ref([])
const checkData = ref([])
const lastUpdated = ref('-')
const hoveredItem = ref(null)
const demoMode = ref(false)
const FORCE_DEMO = true

// Bottom sheet state
const bottomSheetOpen = ref(false)
const bottomSheetTranslateY = computed(() =>
  bottomSheetOpen.value ? '0px' : 'calc(100% - 48px)'
)
let touchStartY = 0
let touchCurrentY = 0

let isSwiping = false

const toggleBottomSheet = () => {
  if (isSwiping) return // Prevent click after swipe
  bottomSheetOpen.value = !bottomSheetOpen.value
}
const onSheetTouchStart = (e) => {
  touchStartY = e.touches[0].clientY
  touchCurrentY = touchStartY
  isSwiping = false
}
const onSheetTouchMove = (e) => {
  touchCurrentY = e.touches[0].clientY
}
const onSheetTouchEnd = () => {
  const delta = touchCurrentY - touchStartY
  if (Math.abs(delta) > 40) {
    isSwiping = true
    bottomSheetOpen.value = delta < 0 // swipe up = open, swipe down = close
  }
  // Reset after a tick so click handler can check isSwiping
  setTimeout(() => { isSwiping = false }, 50)
}

// ─── Indicator Positions (% based) ───
const indicatorPositions = {
  124: { top: '61.5%', left: '28.0%' },
  125: { top: '71.4%', left: '82.8%' },
  126: { top: '38.4%', left: '82.8%' },
  127: { top: '31.2%', left: '82.8%' },
  128: { top: '45.4%', left: '82.8%' },
  129: { top: '17.7%', left: '82.8%' },
  130: { top: '61.7%', left: '82.8%' },
  131: { top: '31.6%', left: '46.3%' },
  132: { top: '24.2%', left: '16.3%' },
  133: { top: '24.2%', left: '2.3%' },
  134: { top: '81%', left: '82.8%' },
  135: { top: '53%', left: '82.8%' },
  136: { top: '6.7%', left: '82.8%' },
  137: { top: '7.9%', left: '2.3%' },
  120: { top: '75.1%', left: '39.2%' },
  121: { top: '78.2%', left: '39.2%' },
  122: { top: '84.1%', left: '39.2%' },
  123: { top: '86.9%', left: '39.2%' },
  157: { top: '81.4%', left: '39.2%' },
  138: { top: '40.3%', left: '17.2%' },
  139: { top: '44%', left: '17.2%' },
  140: { top: '47.2%', left: '17.2%' },
  158: { top: '50.5%', left: '17.2%' },
  143: { top: '78%', left: '47.9%' },
  144: { top: '86.4%', left: '47.9%' },
  145: { top: '35.2%', left: '23.9%' },
  146: { top: '50.8%', left: '23.9%' },
  147: { top: '41.4%', left: '42.7%' },
  148: { top: '51%', left: '42.7%' },
  149: { top: '42.1%', left: '54.1%' },
}

// ─── Value Display Positions (% based) ───
const valueDisplayPositions = {
  101: { top: '65%', left: '61.5%' },
  102: { top: '78.5%', left: '91.5%' },
  103: { top: '58%', left: '92%' },
  104: { top: '14%', left: '93.5%' },
  106: { top: '69%', left: '49%' },
  109: { top: '7%', left: '32%' },
  107: { top: '69%', left: '15%' },
  110: { top: '77%', left: '15%' },
  108: { top: '7%', left: '16%' },
  111: { top: '15%', left: '16%' },
  112: { top: '15%', left: '49%' },
  113: { top: '15%', left: '67%' },
  114: { top: '90%', left: '25%' },
  115: { top: '52%', left: '5%' },
}

// ─── Computed Data Categories ───
const ptData = computed(() =>
  allData.value.filter(
    (item) =>
      item.name.startsWith('PT') &&
      parseInt(item.element_no) >= 101 &&
      parseInt(item.element_no) <= 105
  )
)
const inUltrasonicFlowData = computed(() =>
  allData.value.filter((item) => item.name.includes('入水超音波流量'))
)
const outUltrasonicFlowData = computed(() =>
  allData.value.filter((item) => item.name.includes('產水超音波流量'))
)
const otherData = computed(() =>
  allData.value.filter(
    (item) =>
      item.name === '導電度計' ||
      item.name === '產水濁度' ||
      item.name === '原水液位' ||
      item.name === '產水液位'
  )
)

// ─── Demo Data Definitions ───
const demoValueElements = [
  { element_no: '101', name: 'PT1', baseVal: 7.0, range: 1.5 },
  { element_no: '102', name: 'PT2', baseVal: 4.7, range: 1.2 },
  { element_no: '103', name: 'PT3', baseVal: 7.0, range: 1.0 },
  { element_no: '104', name: 'PT4', baseVal: 5.7, range: 1.5 },
  { element_no: '106', name: '入水電磁式流量(瞬間)', baseVal: 109, range: 30 },
  { element_no: '107', name: '入水超音波流量(瞬間)', baseVal: 43.5, range: 15 },
  { element_no: '108', name: '產水超音波流量(瞬間)', baseVal: 159, range: 40 },
  { element_no: '109', name: '入水電磁式流量(累計)', baseVal: 17543, range: 5 },
  { element_no: '110', name: '入水超音波流量(累計)', baseVal: 17559, range: 5 },
  { element_no: '111', name: '產水超音波流量(累計)', baseVal: 17490, range: 5 },
  { element_no: '112', name: '導電度計', baseVal: 1706, range: 200 },
  { element_no: '113', name: '產水濁度', baseVal: 3.0, range: 2.0 },
  { element_no: '114', name: '原水液位', baseVal: 0.9, range: 0.8 },
  { element_no: '115', name: '產水液位', baseVal: 4.0, range: 2.0 },
]
const demoSwitchElements = [
  120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134,
  135, 136, 137, 138, 139, 140, 143, 144, 145, 146, 147, 148, 149, 157, 158,
]
const demoSwitchNames = {
  120: '原水液位HH',
  121: '原水液位H',
  122: '原水液位L',
  123: '原水液位LL',
  157: '原水液位M',
  124: 'SV1-1',
  125: 'SV1',
  126: 'SV2',
  127: 'SV3',
  128: 'SV4',
  129: 'SV5',
  130: 'SV6',
  131: 'SV7',
  132: 'SV8',
  133: 'SV9',
  134: 'SV10',
  135: 'SV11',
  136: 'SV12',
  137: 'SV13',
  138: 'UF產水槽HH',
  139: 'UF產水槽H',
  140: 'UF產水槽L',
  158: 'UF產水槽M',
  143: '過濾泵A',
  144: '過濾泵B',
  145: '逆洗泵A',
  146: '逆洗泵B',
  147: 'NaOCI加藥機A',
  148: 'NaOCI加藥機B',
  149: '藥液循環泵',
}

// ─── Demo Data Generator ───
const generateDemoData = () => {
  const now = new Date()
  const ts = {
    year: now.getFullYear().toString(),
    month: (now.getMonth() + 1).toString().padStart(2, '0'),
    day: now.getDate().toString().padStart(2, '0'),
    hour: now.getHours().toString().padStart(2, '0'),
    min: now.getMinutes().toString().padStart(2, '0'),
  }

  allData.value = demoValueElements.map((el) => {
    const prev = allData.value.find((d) => d.element_no === el.element_no)
    let val
    if (prev) {
      const delta = (Math.random() - 0.5) * el.range * 0.15
      val = parseFloat(prev.value) + delta
      val = Math.max(
        el.baseVal - el.range * 0.5,
        Math.min(el.baseVal + el.range * 0.5, val)
      )
    } else {
      val = el.baseVal + (Math.random() - 0.5) * el.range * 0.3
    }
    if (el.name.includes('累計')) val = Math.round(val)
    return { element_no: el.element_no, name: el.name, value: val.toString(), ...ts }
  })

  checkData.value = demoSwitchElements.map((no) => {
    const prev = checkData.value.find((d) => parseInt(d.element_no) === no)
    let val = prev ? prev.value : Math.random() > 0.4 ? '1' : '0'
    if (Math.random() < 0.08) val = val === '1' ? '0' : '1'
    return {
      element_no: no.toString(),
      name: demoSwitchNames[no] || `SW${no}`,
      value: val,
    }
  })

  lastUpdated.value = `${now.toLocaleDateString()} ${now.toLocaleTimeString()} [DEMO]`
}

// ─── Fetch / Demo ───
let dataInterval = null

const fetchData = async () => {
  if (FORCE_DEMO) {
    demoMode.value = true
    generateDemoData()
    nextTick(updateDisplayScale)
    return
  }
  try {
    const response = await fetch('/backend/data_third.php')
    const data = await response.json()
    if (data) {
      if (data.latest_data) allData.value = data.latest_data
      if (data.check_data) checkData.value = data.check_data
      const now = new Date()
      lastUpdated.value = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
      demoMode.value = false
    }
  } catch {
    demoMode.value = true
    generateDemoData()
  }
  nextTick(updateDisplayScale)
}

// ─── Position Helpers ───
const getIndicatorPosition = (elementNo) => {
  return indicatorPositions[elementNo] || { top: '5%', left: '5%' }
}
const getValueDisplayPosition = (elementNo) => {
  return valueDisplayPositions[elementNo] || { top: '5%', left: '5%' }
}
const getNameplatePosition = (elementNo) => {
  const no = parseInt(elementNo)
  if ([124, 125, 126, 127, 128, 129, 130, 134, 135, 136].includes(no)) {
    return { left: '20px', top: '0%' }
  }
  if ([132, 133, 137, 131].includes(no)) {
    return { left: '36px', top: '10px' }
  }
  if ([143, 144, 145, 146, 149].includes(no)) {
    return { left: '-50%', top: '26px', transform: 'translateX(0)' }
  }
  if ([147, 148].includes(no)) {
    return { left: '-33px', top: '26px', transform: 'translateX(0)' }
  }
  return { left: '15px', top: '0%' }
}

const isRectangularLight = (elementNo) =>
  parseInt(elementNo) >= 143 && parseInt(elementNo) <= 149

const isHoverLabel = (elementNo) =>
  [120, 121, 122, 123, 138, 139, 140, 141, 142, 157, 158].includes(
    parseInt(elementNo)
  )

// ─── Value Formatting ───
const getUnit = (name) => {
  if (name === '導電度計') return 'μs/cm'
  if (name === '產水濁度') return 'NTU'
  if (name === '原水液位') return 'CM'
  if (name === '產水液位') return 'CM'
  if (name.startsWith('PT')) return 'KG/cm²'
  if (name.includes('流量') && name.includes('瞬間')) return 'm³/HR'
  if (name.includes('流量') && name.includes('累計')) return 'm³'
  return ''
}

const isLargeValue = (name) => name.includes('流量') && name.includes('累計')

const formatValue = (value, name) => {
  try {
    const numValue =
      typeof value === 'string' ? parseFloat(value) : Number(value)
    if (isNaN(numValue)) return '0.0'
    if (name.includes('累計')) {
      return Math.round(numValue)
        .toString()
        .padStart(11, ' ')
    }
    return numValue.toFixed(1).padStart(5, ' ')
  } catch {
    return '0.0'
  }
}

const getValueClass = (value, name) => {
  const numValue = parseFloat(value)
  if (name.startsWith('PT') && numValue > 5) return 'warning'
  if (name === '產水濁度' && numValue > 1) return 'warning'
  if (name === '原水液位' && numValue < 0.5) return 'warning'
  if (name === '產水液位' && numValue < 0.5) return 'warning'
  if (name.includes('流量') && name.includes('瞬間') && numValue > 100)
    return 'warning'
  return ''
}

// ─── Highlight on hover ───
const highlightValue = (elementNo) => {
  hoveredItem.value = elementNo
}
const resetHighlight = () => {
  hoveredItem.value = null
}

// ─── Dynamic Scale for Responsive + Zoom ───
const diagramRef = ref(null)

const updateDisplayScale = () => {
  const w = window.innerWidth
  // Below 1292px — CSS handles it (display: none for value-display, smaller lights)
  if (w < 1292) {
    // Clear any leftover inline styles from previous desktop scaling
    if (diagramRef.value) {
      diagramRef.value.querySelectorAll('.value-display, .indicator-light').forEach((el) => {
        el.style.removeProperty('transform')
      })
      diagramRef.value.querySelectorAll('.indicator-nameplate').forEach((el) => {
        el.style.removeProperty('transform')
        el.style.removeProperty('transform-origin')
      })
    }
    return
  }

  const zoomLevel =
    Math.round((window.outerWidth / window.innerWidth) * 100) / 100
  const zoomScale = 1 / zoomLevel

  let midScale = 1
  if (w <= 1800) {
    midScale = 0.5 + ((w - 1292) / (1800 - 1292)) * 0.5
  }

  if (!diagramRef.value) return

  // Set CSS variable for media query fallback
  diagramRef.value.style.setProperty('--mid-scale', midScale.toFixed(3))

  const finalScale = midScale * zoomScale
  const displays = diagramRef.value.querySelectorAll('.value-display')
  const lights = diagramRef.value.querySelectorAll('.indicator-light')
  const nameplates = diagramRef.value.querySelectorAll('.indicator-nameplate')

  displays.forEach((el) => {
    el.style.setProperty(
      'transform',
      `translate(-50%, -50%) scale(${finalScale.toFixed(3)})`,
      'important'
    )
  })
  lights.forEach((el) => {
    el.style.setProperty(
      'transform',
      `translate(-50%, -50%) scale(${finalScale.toFixed(3)})`,
      'important'
    )
  })
  if (w <= 1800) {
    nameplates.forEach((el) => {
      el.style.setProperty(
        'transform',
        `scale(${midScale.toFixed(3)})`,
        'important'
      )
      el.style.transformOrigin = 'left center'
    })
  } else {
    nameplates.forEach((el) => {
      el.style.removeProperty('transform')
      el.style.removeProperty('transform-origin')
    })
  }
}

// ─── Lifecycle ───
onMounted(() => {
  fetchData()
  dataInterval = setInterval(fetchData, 3000)
  window.addEventListener('resize', updateDisplayScale)
  setTimeout(updateDisplayScale, 500)
})

onBeforeUnmount(() => {
  if (dataInterval) clearInterval(dataInterval)
  window.removeEventListener('resize', updateDisplayScale)
})
</script>

<template>
  <div class="flex flex-1 overflow-hidden relative h-[calc(100vh-3.5rem)]">
    <!-- ===== Left: Engineering Diagram ===== -->
    <section class="w-full xl:w-[70%] h-full overflow-hidden relative">
      <!-- Subtle water background -->
      <div class="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <div
          class="w-full h-full bg-gradient-to-b from-primary/5 via-transparent to-background"
        ></div>
      </div>

      <div class="relative z-10 p-4">
        <!-- Section title -->
        <div class="flex justify-between items-end mb-3">
          <div>
            <h1 class="text-xl font-extrabold tracking-tighter text-on-surface">
              {{ t('scada.title') }}
            </h1>
            <p
              class="text-[10px] font-label text-primary uppercase tracking-widest mt-0.5"
            >
              {{ t('scada.subtitle') }}
            </p>
          </div>
          <div class="glass-panel px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span
              class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_6px_theme(colors.primary)]"
            ></span>
            <span
              class="text-[9px] font-label font-bold uppercase tracking-widest text-primary"
            >
              {{ t('scada.coreFeedActive') }}
            </span>
          </div>
        </div>

        <!-- Monitor frame -->
        <div
          class="relative rounded-2xl overflow-hidden shadow-[0_0_0_3px_theme(colors.surface-container),0_0_0_5px_theme(colors.surface-container-high),0_0_0_6px_rgba(91,244,222,0.15),0_8px_32px_rgba(0,0,0,0.5)] border border-outline-variant/30"
        >
          <!-- Monitor top bezel -->
          <div
            class="h-7 bg-gradient-to-b from-surface-container-high to-surface-container flex items-center px-4 gap-2 border-b border-outline-variant/20"
          >
            <div class="w-2 h-2 rounded-full bg-error/60"></div>
            <div class="w-2 h-2 rounded-full bg-amber-400/60"></div>
            <div class="w-2 h-2 rounded-full bg-primary/60"></div>
            <span
              class="ml-3 text-[9px] font-label text-on-surface-variant/30 uppercase tracking-widest"
              >SCADA_DISPLAY_01 — LIVE FEED</span
            >
            <div class="ml-auto flex items-center gap-2">
              <span
                class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_4px_theme(colors.primary)]"
              ></span>
              <span class="text-[8px] font-label text-primary/50">REC</span>
            </div>
          </div>

          <!-- Screen content (engineering diagram) -->
          <div ref="diagramRef" class="diagram-container" :style="{ backgroundImage: `url(${screenImg})` }">
            <!-- Indicator lights -->
            <div
              v-for="item in checkData"
              :key="item.element_no"
              class="indicator-light"
              :class="[
                item.value === '1' ? 'on' : 'off',
                isRectangularLight(item.element_no) ? 'rectangular' : '',
              ]"
              :style="getIndicatorPosition(item.element_no)"
            >
              <div v-if="isHoverLabel(item.element_no)" class="indicator-label">
                {{ item.name }}
              </div>
              <div
                v-if="!isHoverLabel(item.element_no)"
                class="indicator-nameplate"
                :style="getNameplatePosition(item.element_no)"
              >
                {{ item.name }}
              </div>
            </div>

            <!-- Value displays -->
            <div
              v-for="item in allData"
              :key="'value-' + item.element_no"
              class="value-display"
              :class="[
                getValueClass(item.value, item.name),
                isLargeValue(item.name) ? 'large-value' : '',
                hoveredItem === item.element_no ? 'highlight' : '',
              ]"
              :style="getValueDisplayPosition(item.element_no)"
            >
              <div class="display-name">{{ item.name }}</div>
              <div class="display-value">
                {{ formatValue(item.value, item.name) }}
                <span class="display-unit">{{ getUnit(item.name) }}</span>
              </div>
            </div>
          </div>

          <!-- Monitor bottom bezel -->
          <div
            class="h-5 bg-gradient-to-t from-surface-container-high to-surface-container flex items-center justify-center border-t border-outline-variant/20"
          >
            <div class="w-12 h-1 rounded-full bg-outline-variant/30"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== Right: Data Panel (desktop side panel) ===== -->
    <section
      class="hidden xl:flex xl:w-[30%] xl:h-full xl:relative xl:border-l xl:border-outline-variant/10 bg-surface-container/40 backdrop-blur-md overflow-y-auto custom-scrollbar flex-col p-5 gap-5"
    >
      <!-- Panel header -->
      <div
        class="flex items-center justify-between border-b border-outline-variant/10 pb-3"
      >
        <h2
          class="text-base font-bold uppercase tracking-[0.15em] text-on-surface-variant font-label"
        >
          {{ t('scada.realTimeMetrics') }}
        </h2>
        <span
          class="material-symbols-outlined text-base text-on-surface-variant/40 animate-spin"
          style="animation-duration: 3s"
          >sync</span
        >
      </div>

      <!-- PT Pressure Sensors -->
      <div class="space-y-3">
        <div
          class="flex items-center gap-2 text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest font-label"
        >
          <span class="material-symbols-outlined text-sm text-primary/60"
            >compress</span
          >
          {{ t('scada.pressureSensors') }}
        </div>
        <div class="grid gap-2">
          <div
            v-for="item in ptData"
            :key="item.element_no"
            class="glass-panel p-4 rounded-xl flex items-center justify-between hover:bg-surface-container-high/60 transition-all cursor-pointer group"
            @mouseover="highlightValue(item.element_no)"
            @mouseout="resetHighlight"
          >
            <div>
              <div
                class="text-sm text-on-surface-variant/60 font-label uppercase font-bold"
              >
                {{ item.name }}
              </div>
              <div class="text-xs text-on-surface-variant/40 font-label mt-1">
                {{ `${item.year}/${item.month}/${item.day} ${item.hour}:${item.min}` }}
              </div>
            </div>
            <div class="text-right">
              <div
                class="text-2xl font-black tabular-nums font-label"
                :class="
                  getValueClass(item.value, item.name) === 'warning'
                    ? 'text-error'
                    : 'text-primary'
                "
              >
                {{ formatValue(item.value, item.name) }}
              </div>
              <div class="text-xs font-label text-on-surface-variant/40">
                KG/cm²
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Inbound Ultrasonic Flow -->
      <div class="space-y-3">
        <div
          class="flex items-center gap-2 text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest font-label"
        >
          <span class="material-symbols-outlined text-sm text-secondary/60"
            >water_drop</span
          >
          {{ t('scada.inflowUltrasonic') }}
        </div>
        <div class="grid gap-2">
          <div
            v-for="item in inUltrasonicFlowData"
            :key="item.element_no"
            class="glass-panel p-4 rounded-xl flex items-center justify-between hover:bg-surface-container-high/60 transition-all cursor-pointer"
            :class="item.name.includes('累計') ? 'border-t border-secondary/10' : ''"
            @mouseover="highlightValue(item.element_no)"
            @mouseout="resetHighlight"
          >
            <div>
              <div
                class="text-sm text-on-surface-variant/60 font-label uppercase font-bold"
              >
                {{ item.name }}
              </div>
              <div class="text-xs text-on-surface-variant/40 font-label mt-1">
                {{ `${item.year}/${item.month}/${item.day} ${item.hour}:${item.min}` }}
              </div>
            </div>
            <div class="text-right">
              <div
                class="text-2xl font-black tabular-nums font-label"
                :class="
                  getValueClass(item.value, item.name) === 'warning'
                    ? 'text-error'
                    : 'text-secondary'
                "
              >
                {{ formatValue(item.value, item.name) }}
              </div>
              <div class="text-xs font-label text-on-surface-variant/40">
                {{ item.name.includes('累計') ? 'm³' : 'm³/HR' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Outbound Ultrasonic Flow -->
      <div class="space-y-3">
        <div
          class="flex items-center gap-2 text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest font-label"
        >
          <span class="material-symbols-outlined text-sm text-secondary/60"
            >water_drop</span
          >
          {{ t('scada.outflowUltrasonic') }}
        </div>
        <div class="grid gap-2">
          <div
            v-for="item in outUltrasonicFlowData"
            :key="item.element_no"
            class="glass-panel p-4 rounded-xl flex items-center justify-between hover:bg-surface-container-high/60 transition-all cursor-pointer"
            :class="item.name.includes('累計') ? 'border-t border-secondary/10' : ''"
            @mouseover="highlightValue(item.element_no)"
            @mouseout="resetHighlight"
          >
            <div>
              <div
                class="text-sm text-on-surface-variant/60 font-label uppercase font-bold"
              >
                {{ item.name }}
              </div>
              <div class="text-xs text-on-surface-variant/40 font-label mt-1">
                {{ `${item.year}/${item.month}/${item.day} ${item.hour}:${item.min}` }}
              </div>
            </div>
            <div class="text-right">
              <div
                class="text-2xl font-black tabular-nums font-label"
                :class="
                  getValueClass(item.value, item.name) === 'warning'
                    ? 'text-error'
                    : 'text-secondary'
                "
              >
                {{ formatValue(item.value, item.name) }}
              </div>
              <div class="text-xs font-label text-on-surface-variant/40">
                {{ item.name.includes('累計') ? 'm³' : 'm³/HR' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Other Data (Conductivity, Turbidity, Levels) -->
      <div class="space-y-3">
        <div
          class="flex items-center gap-2 text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest font-label"
        >
          <span class="material-symbols-outlined text-sm text-tertiary/60"
            >science</span
          >
          {{ t('scada.waterQuality') }}
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div
            v-for="item in otherData"
            :key="item.element_no"
            class="glass-panel p-4 rounded-xl hover:bg-surface-container-high/60 transition-all cursor-pointer"
            @mouseover="highlightValue(item.element_no)"
            @mouseout="resetHighlight"
          >
            <div
              class="text-sm text-on-surface-variant/60 font-label uppercase font-bold"
            >
              {{ item.name }}
            </div>
            <div
              class="text-2xl font-black mt-1.5 tabular-nums font-label"
              :class="
                getValueClass(item.value, item.name) === 'warning'
                  ? 'text-error'
                  : 'text-on-surface'
              "
            >
              {{ formatValue(item.value, item.name) }}
              <span class="text-xs font-normal text-on-surface-variant/40">{{
                getUnit(item.name)
              }}</span>
            </div>
            <div class="text-xs text-on-surface-variant/40 font-label mt-1.5">
              {{ `${item.year}/${item.month}/${item.day} ${item.hour}:${item.min}` }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== Mobile Bottom Sheet ===== -->
    <div
      class="xl:hidden fixed bottom-0 left-0 right-0 z-[80] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
      :style="{ transform: `translateY(${bottomSheetTranslateY})` }"
    >
      <!-- Drag handle / peek bar -->
      <div
        class="flex flex-col items-center pt-2 pb-3 cursor-grab active:cursor-grabbing bg-surface-container/95 backdrop-blur-xl rounded-t-2xl border-t border-x border-primary/15 shadow-[0_-8px_30px_rgba(0,0,0,0.4)]"
        @click="toggleBottomSheet"
        @touchstart="onSheetTouchStart"
        @touchmove="onSheetTouchMove"
        @touchend="onSheetTouchEnd"
      >
        <div class="w-10 h-1 rounded-full bg-on-surface-variant/30 mb-2"></div>
        <div class="flex items-center justify-between w-full px-5">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-sm"
              >analytics</span
            >
            <span
              class="text-xs font-label font-bold uppercase tracking-widest text-on-surface-variant"
              >{{ t('scada.realTimeMetrics') }}</span
            >
          </div>
          <span
            class="material-symbols-outlined text-on-surface-variant/50 text-lg transition-transform duration-300"
            :class="bottomSheetOpen ? 'rotate-180' : ''"
            >expand_less</span
          >
        </div>
      </div>

      <!-- Sheet content -->
      <div
        class="bg-surface-container/95 backdrop-blur-xl overflow-y-auto custom-scrollbar px-5 pb-8"
        style="max-height: 60vh"
      >
        <div class="flex flex-col gap-5 pt-3">
          <!-- PT Pressure -->
          <div class="space-y-3">
            <div
              class="flex items-center gap-2 text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest font-label"
            >
              <span class="material-symbols-outlined text-sm text-primary/60"
                >compress</span
              >
              {{ t('scada.pressureSensors') }}
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div
                v-for="item in ptData"
                :key="'m-' + item.element_no"
                class="glass-panel p-3 rounded-xl"
              >
                <div
                  class="text-xs text-on-surface-variant/50 font-label uppercase font-bold"
                >
                  {{ item.name }}
                </div>
                <div
                  class="text-xl font-black tabular-nums font-label mt-1"
                  :class="
                    getValueClass(item.value, item.name) === 'warning'
                      ? 'text-error'
                      : 'text-primary'
                  "
                >
                  {{ formatValue(item.value, item.name) }}
                  <span class="text-[10px] font-normal text-on-surface-variant/40"
                    >KG/cm²</span
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Flow Rates -->
          <div class="space-y-3">
            <div
              class="flex items-center gap-2 text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest font-label"
            >
              <span class="material-symbols-outlined text-sm text-secondary/60"
                >water_drop</span
              >
              {{ t('scada.inflowUltrasonic') }} / {{ t('scada.outflowUltrasonic') }}
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div
                v-for="item in inUltrasonicFlowData"
                :key="'mf-' + item.element_no"
                class="glass-panel p-3 rounded-xl"
              >
                <div
                  class="text-[10px] text-on-surface-variant/50 font-label uppercase font-bold"
                >
                  {{ item.name }}
                </div>
                <div
                  class="text-lg font-black tabular-nums font-label mt-1 text-secondary"
                >
                  {{ formatValue(item.value, item.name) }}
                  <span class="text-[9px] font-normal text-on-surface-variant/40">{{
                    item.name.includes('累計') ? 'm³' : 'm³/HR'
                  }}</span>
                </div>
              </div>
              <div
                v-for="item in outUltrasonicFlowData"
                :key="'mo-' + item.element_no"
                class="glass-panel p-3 rounded-xl"
              >
                <div
                  class="text-[10px] text-on-surface-variant/50 font-label uppercase font-bold"
                >
                  {{ item.name }}
                </div>
                <div
                  class="text-lg font-black tabular-nums font-label mt-1 text-secondary"
                >
                  {{ formatValue(item.value, item.name) }}
                  <span class="text-[9px] font-normal text-on-surface-variant/40">{{
                    item.name.includes('累計') ? 'm³' : 'm³/HR'
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Quality / Levels -->
          <div class="space-y-3">
            <div
              class="flex items-center gap-2 text-xs font-bold text-on-surface-variant/50 uppercase tracking-widest font-label"
            >
              <span class="material-symbols-outlined text-sm text-tertiary/60"
                >science</span
              >
              {{ t('scada.waterQuality') }}
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div
                v-for="item in otherData"
                :key="'mq-' + item.element_no"
                class="glass-panel p-3 rounded-xl"
              >
                <div
                  class="text-xs text-on-surface-variant/50 font-label uppercase font-bold"
                >
                  {{ item.name }}
                </div>
                <div
                  class="text-xl font-black mt-1 tabular-nums font-label"
                  :class="
                    getValueClass(item.value, item.name) === 'warning'
                      ? 'text-error'
                      : 'text-on-surface'
                  "
                >
                  {{ formatValue(item.value, item.name) }}
                  <span class="text-[10px] font-normal text-on-surface-variant/40">{{
                    getUnit(item.name)
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== Engineering Diagram Area ===== */
.diagram-container {
  position: relative;
  width: 100%;
  padding-bottom: 62%;
  background-color: #ffffff;
  background-repeat: no-repeat;
  background-size: contain;
  background-position: top left;
  overflow: hidden;
}

/* Water caustic light effect */
.diagram-container::before {
  content: '';
  position: absolute;
  inset: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(
      ellipse 40% 30% at 30% 40%,
      rgba(91, 244, 222, 0.12) 0%,
      transparent 70%
    ),
    radial-gradient(
      ellipse 35% 25% at 70% 60%,
      rgba(93, 230, 255, 0.1) 0%,
      transparent 70%
    ),
    radial-gradient(
      ellipse 30% 35% at 50% 30%,
      rgba(15, 201, 180, 0.08) 0%,
      transparent 60%
    );
  z-index: 0;
  pointer-events: none;
  animation: waterCaustic 6s ease-in-out infinite alternate;
}

/* Ripple wave overlay */
.diagram-container::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
      circle 300px at 25% 70%,
      rgba(91, 244, 222, 0.05) 0%,
      transparent 70%
    ),
    radial-gradient(
      circle 250px at 75% 30%,
      rgba(93, 230, 255, 0.04) 0%,
      transparent 70%
    );
  z-index: 0;
  pointer-events: none;
  animation: rippleFloat 10s ease-in-out infinite alternate-reverse;
}

@keyframes waterCaustic {
  0% {
    transform: translate(0%, 0%) rotate(0deg);
  }
  33% {
    transform: translate(-3%, 2%) rotate(1deg);
  }
  66% {
    transform: translate(2%, -1%) rotate(-0.5deg);
  }
  100% {
    transform: translate(-1%, 3%) rotate(0.5deg);
  }
}
@keyframes rippleFloat {
  0% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    opacity: 0.5;
  }
}

/* ===== Indicator Lights (LEDs) ===== */
.indicator-light {
  position: absolute;
  width: 16px !important;
  height: 16px !important;
  border-radius: 50%;
  z-index: 10;
  transform: translate(-50%, -50%);
  transition: background 0.3s ease, box-shadow 0.3s ease;
}
.indicator-light.rectangular {
  width: 24px !important;
  height: 16px !important;
  border-radius: 4px;
}
.indicator-light::before {
  content: '';
  position: absolute;
  top: 15%;
  left: 15%;
  width: 30%;
  height: 30%;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.6);
  filter: blur(1px);
}
.indicator-light.on {
  background: radial-gradient(circle at 30% 30%, #7fffd4, #5bf4de);
  box-shadow: 0 0 8px #5bf4de, 0 0 16px rgba(91, 244, 222, 0.5);
}
.indicator-light.off {
  background: radial-gradient(circle at 30% 30%, #4a5568, #2d3748);
  box-shadow: 0 0 4px rgba(45, 55, 72, 0.5);
}
.indicator-light.rectangular.on {
  background: linear-gradient(to bottom, #7fffd4, #5bf4de);
  box-shadow: 0 0 8px #5bf4de, 0 0 16px rgba(91, 244, 222, 0.5);
}
.indicator-light.rectangular.off {
  background: linear-gradient(to bottom, #4a5568, #2d3748);
  box-shadow: 0 0 4px rgba(45, 55, 72, 0.5);
}

/* Hover label for level indicators */
.indicator-label {
  position: absolute;
  font-size: 10px;
  font-family: 'Space Grotesk', monospace;
  white-space: nowrap;
  background: rgba(1, 14, 36, 0.9);
  color: #5bf4de;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid rgba(91, 244, 222, 0.2);
  transform: translate(-50%, 100%);
  bottom: -8px;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}
.indicator-light:hover .indicator-label {
  opacity: 1;
}

/* Always-visible nameplates */
.indicator-nameplate {
  position: absolute;
  font-size: 11px !important;
  font-family: 'Space Grotesk', monospace;
  white-space: nowrap;
  background: rgba(1, 14, 36, 0.75);
  color: #9eabc8;
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid rgba(91, 244, 222, 0.1);
  transform: translateY(-50%);
  z-index: 9;
  left: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* ===== Value Displays on Diagram ===== */
.value-display {
  position: absolute;
  background: rgba(1, 14, 36, 0.85);
  backdrop-filter: blur(12px);
  color: #dbe6ff;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(91, 244, 222, 0.15);
  border-left: 2px solid #5bf4de;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 20;
  transform: translate(-50%, -50%);
  font-size: 14px !important;
  font-weight: bold;
  min-width: 85px;
  text-align: center;
  transition: none;
}
.value-display.large-value {
  min-width: 150px;
}

.value-display .display-name {
  font-size: 12px !important;
  font-family: 'Space Grotesk', monospace;
  color: #9eabc8;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
  font-weight: 800;
}
.value-display .display-value {
  font-family: 'Space Grotesk', monospace;
  display: block;
  text-align: center;
  font-size: 20px !important;
  color: #5bf4de;
  text-shadow: 0 0 8px rgba(91, 244, 222, 0.5);
  margin-top: 2px;
  white-space: nowrap;
  font-weight: 900;
}
.value-display .display-unit {
  font-size: 12px !important;
  opacity: 0.6;
  margin-left: 3px;
  color: #9eabc8;
}

/* Warning / Success states */
.value-display.warning {
  border-left-color: #ff716c;
  background: rgba(220, 38, 38, 0.85);
}
.value-display.warning .display-name {
  color: rgba(255, 255, 255, 0.8);
}
.value-display.warning .display-value {
  color: #ffffff;
  text-shadow: 0 0 10px rgba(255, 113, 108, 0.8);
}
.value-display.warning .display-unit {
  color: rgba(255, 255, 255, 0.7);
}
.value-display.success {
  border-left-color: #4ade80;
  background: rgba(16, 80, 40, 0.25);
}
.value-display.success .display-value {
  color: #4ade80;
  text-shadow: 0 0 8px rgba(74, 222, 128, 0.5);
}

/* Pulse animations */
@keyframes pulseContinuous {
  0%,
  100% {
    box-shadow: 0 0 10px rgba(91, 244, 222, 0.4),
      0 0 20px rgba(91, 244, 222, 0.2);
    transform: translate(-50%, -50%) scale(1);
    border-color: rgba(91, 244, 222, 0.4);
  }
  50% {
    box-shadow: 0 0 30px rgba(91, 244, 222, 0.9),
      0 0 60px rgba(91, 244, 222, 0.5), 0 0 100px rgba(91, 244, 222, 0.2);
    transform: translate(-50%, -50%) scale(1.15);
    border-color: rgba(91, 244, 222, 0.9);
  }
}
@keyframes pulseContinuousWarning {
  0%,
  100% {
    box-shadow: 0 0 10px rgba(255, 113, 108, 0.4),
      0 0 20px rgba(255, 113, 108, 0.2);
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    box-shadow: 0 0 30px rgba(255, 113, 108, 0.9),
      0 0 60px rgba(255, 113, 108, 0.5), 0 0 100px rgba(255, 113, 108, 0.2);
    transform: translate(-50%, -50%) scale(1.15);
  }
}
@keyframes pulseContinuousSuccess {
  0%,
  100% {
    box-shadow: 0 0 10px rgba(74, 222, 128, 0.4),
      0 0 20px rgba(74, 222, 128, 0.2);
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    box-shadow: 0 0 30px rgba(74, 222, 128, 0.9),
      0 0 60px rgba(74, 222, 128, 0.5), 0 0 100px rgba(74, 222, 128, 0.2);
    transform: translate(-50%, -50%) scale(1.15);
  }
}
.value-display.highlight {
  animation: pulseContinuous 1s infinite ease-in-out;
  z-index: 30;
  background: rgba(1, 14, 36, 0.95) !important;
  border: 2px solid #5bf4de !important;
}
.value-display.warning.highlight {
  animation: pulseContinuousWarning 1s infinite ease-in-out;
  border: 2px solid #ff716c !important;
}
.value-display.success.highlight {
  animation: pulseContinuousSuccess 1s infinite ease-in-out;
  border: 2px solid #4ade80 !important;
}

/* Tabular nums */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}

/* ===== Responsive: Medium desktop (1292~1800px) — CSS variable fallback ===== */
@media (min-width: 1292px) and (max-width: 1800px) {
  .value-display {
    transform: translate(-50%, -50%) scale(var(--mid-scale, 0.7)) !important;
  }
  .indicator-nameplate {
    transform: scale(var(--mid-scale, 0.7));
    transform-origin: left center;
  }
}

/* ===== Responsive: Tablet (< 1292px) — HIDE value displays (match original HTML) ===== */
@media (max-width: 1291px) {
  .value-display {
    display: none !important;
  }
  .indicator-light {
    width: 12px !important;
    height: 12px !important;
  }
  .indicator-light.rectangular {
    width: 16px !important;
    height: 12px !important;
  }
  .indicator-nameplate {
    font-size: 9px !important;
    padding: 1px 4px;
  }
  .indicator-label {
    font-size: 8px;
  }
}

/* ===== Responsive: Phone (< 640px) — minimal indicators ===== */
@media (max-width: 639px) {
  .indicator-light {
    width: 8px !important;
    height: 8px !important;
  }
  .indicator-light.rectangular {
    width: 12px !important;
    height: 8px !important;
  }
  .indicator-nameplate {
    display: none !important;
  }
  .indicator-label {
    font-size: 7px;
    padding: 1px 3px;
  }
}
</style>
