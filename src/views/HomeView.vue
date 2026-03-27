<script setup>
import { useI18n } from 'vue-i18n'
import { useAppStore } from '../stores/app'
const { t, locale } = useI18n()
const app = useAppStore()

function toggleLocale() {
  locale.value = locale.value === 'zh-TW' ? 'en' : 'zh-TW'
  localStorage.setItem('locale', locale.value)
}

import waterBgImg from '../assets/water-bg.png'
const waterBgUrl = waterBgImg

const cards = [
  { to: '/scada', icon: 'dashboard', titleKey: 'home.scadaPanel', subKey: 'home.controlInterface', color: 'primary', accent: 'rgba(87,241,219,0.5)', glow: 'rgba(87,241,219,0.2)', module: '01' },
  { to: '/data-trend', icon: 'query_stats', titleKey: 'home.dataTrend', subKey: 'home.telemetryAnalysis', color: 'secondary', accent: 'rgba(93,230,255,0.5)', glow: 'rgba(93,230,255,0.2)', module: '02' },
  { to: '/alert-history', icon: 'warning', titleKey: 'home.alertHistory', subKey: 'home.criticalEvents', color: 'error', accent: 'rgba(255,180,171,0.5)', glow: 'rgba(255,180,171,0.2)', module: '03' },
  { to: '/report', icon: 'analytics', titleKey: 'home.report', subKey: 'home.complianceDocs', color: 'tertiary', accent: 'rgba(197,219,255,0.5)', glow: 'rgba(197,219,255,0.2)', module: '04' },
  { to: '/', icon: 'terminal', titleKey: 'home.systemSop', subKey: 'home.operationalManuals', color: 'primary', accent: 'rgba(87,241,219,0.5)', glow: 'rgba(87,241,219,0.2)', module: '05', external: true },
]
</script>

<template>
  <!-- Water Background -->
  <div class="realistic-water-bg" :style="{ backgroundImage: `url(${waterBgUrl})` }"></div>
  <div class="realistic-water-bg-caustic" :style="{ backgroundImage: `url(${waterBgUrl})` }"></div>
  <div class="god-rays"></div>

  <!-- HUD Grid -->
  <div class="hud-grid"></div>

  <!-- HUD Corner Labels -->
  <div class="fixed top-4 left-4 font-label text-[8px] text-primary/20 tracking-widest z-30">
    COORD: 25.0330° N, 121.5654° E
  </div>
  <div class="fixed top-4 right-4 font-label text-[8px] text-primary/20 tracking-widest z-30">
    LPS_V4.2.0_SECURE
  </div>

  <!-- Top Bar (replaces default header on home) -->
  <header class="fixed top-0 left-0 w-full z-40 flex justify-between items-center px-6 md:px-12 py-6 md:py-8 bg-transparent">
    <div class="flex flex-col">
      <span class="text-xs font-bold tracking-[0.4em] text-secondary font-label uppercase">Monitor &amp; Surveillance</span>
      <span class="text-sm font-black tracking-widest text-primary mt-1 flex items-center gap-3">
        LIQUID PRECISION SYSTEMS
      </span>
    </div>
    <div class="flex items-center gap-3">
      <!-- Language toggle -->
      <button
        @click="toggleLocale"
        class="glass-card-tech px-3 py-1.5 rounded-full font-label text-[10px] tracking-widest text-primary/60 hover:text-primary transition-all cursor-pointer border-none"
      >
        {{ locale === 'zh-TW' ? 'EN' : '中文' }}
      </button>
      <!-- Hamburger: mobile only -->
      <button
        class="md:hidden glass-card-tech p-4 rounded-full flex items-center justify-center hover:bg-surface-container-high active:scale-95 group relative cursor-pointer border-none"
        @click="app.toggleMenu"
      >
        <span class="material-symbols-outlined text-primary group-hover:text-secondary" style="font-variation-settings: 'FILL' 0">menu</span>
      </button>
    </div>
  </header>

  <!-- Main Content -->
  <main class="relative z-10 h-screen flex flex-col items-center justify-center px-8 -mt-14">
    <!-- Hero -->
    <div class="text-center mb-16 max-w-4xl">
      <!-- Industrial Intelligence label -->
      <div class="inline-flex items-center gap-4 mb-8">
        <div class="h-px w-16 bg-gradient-to-r from-transparent to-outline-variant"></div>
        <span class="font-label text-[10px] tracking-[0.6em] text-primary/40 uppercase">Industrial Intelligence</span>
        <div class="h-px w-16 bg-gradient-to-l from-transparent to-outline-variant"></div>
      </div>

      <!-- Title -->
      <div class="refracted-title">
        <h1 class="font-headline font-black text-5xl md:text-9xl tracking-tighter text-on-surface mb-2 flex flex-col items-center">
          <span>{{ t('home.title') }}</span>
          <span class="text-xl md:text-3xl font-light tracking-[0.2em] md:tracking-[0.3em] text-on-surface/60 mt-4 md:mt-6 font-label">
            {{ t('home.subtitle') }}
          </span>
        </h1>
      </div>

      <!-- Divider with fluid icon -->
      <div class="flex items-center justify-center gap-8 mt-16">
        <div class="h-px w-32 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
        <div class="relative">
          <span class="material-symbols-outlined text-primary text-lg animate-pulse" style="font-variation-settings: 'FILL' 1">fluid_med</span>
          <div class="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
        </div>
        <div class="h-px w-32 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
      </div>

      <!-- Tagline -->
      <p class="mt-8 font-label text-xs tracking-[0.4em] text-secondary uppercase opacity-70">
        {{ t('home.tagline') }}
      </p>
    </div>

    <!-- Navigation Cards: desktop only -->
    <div class="hidden md:grid md:grid-cols-5 gap-4 w-full max-w-[1400px] px-4">
      <router-link
        v-for="card in cards"
        :key="card.module"
        :to="card.to"
        class="glass-card-tech group relative overflow-hidden p-8 rounded-lg cursor-pointer hover:-translate-y-2 block no-underline"
        :style="{ '--card-accent': card.accent, '--card-glow': card.glow }"
      >
        <div class="absolute top-0 right-0 p-2 font-label text-[8px] uppercase" :class="`text-${card.color}/20`">
          Module_{{ card.module }}
        </div>
        <div class="mb-8">
          <span
            class="material-symbols-outlined text-5xl transition-transform duration-700 group-hover:scale-110"
            :class="`text-${card.color}`"
            style="font-variation-settings: 'FILL' 0"
          >{{ card.icon }}</span>
        </div>
        <h3
          class="font-headline font-bold text-lg text-on-surface transition-colors tracking-tight"
          :class="`group-hover:text-${card.color}`"
        >{{ t(card.titleKey) }}</h3>
        <p class="text-[10px] text-on-surface-variant mt-2 leading-relaxed font-label uppercase tracking-widest opacity-60">
          {{ t(card.subKey) }}
        </p>
      </router-link>
    </div>
  </main>

  <!-- Wave Background -->
  <div class="wave-layer overflow-hidden">
    <svg class="wave-svg opacity-10" preserveAspectRatio="none" style="animation-duration: 35s" viewBox="0 24 150 28">
      <defs><path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"></path></defs>
      <use fill="#00cbe6" x="48" href="#gentle-wave" y="0"></use>
    </svg>
    <svg class="wave-svg opacity-20" preserveAspectRatio="none" style="animation-duration: 25s; animation-direction: reverse" viewBox="0 24 150 28">
      <use fill="#57f1db" x="48" href="#gentle-wave" y="3"></use>
    </svg>
    <div class="absolute bottom-0 left-0 w-full h-20 backdrop-blur-md bg-gradient-to-t from-[#050a15] via-[#050a15]/80 to-transparent z-20"></div>
    <svg class="wave-svg opacity-30 z-10" preserveAspectRatio="none" style="animation-duration: 15s" viewBox="0 24 150 28">
      <use fill="#0e131f" x="48" href="#gentle-wave" y="7"></use>
    </svg>
  </div>

  <!-- Footer Stats -->
  <footer class="fixed bottom-0 left-0 w-full z-40 flex flex-col md:flex-row justify-between items-start md:items-end px-6 md:px-12 py-6 md:py-10 bg-transparent gap-3 md:gap-0">
    <div class="flex gap-8 md:gap-20">
      <div class="flex flex-col">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-label text-[9px] tracking-widest text-on-surface-variant uppercase">Flow Rate</span>
          <span class="w-1 h-1 rounded-full bg-primary"></span>
        </div>
        <span class="font-headline font-black text-3xl text-primary tabular-nums">482.5
          <span class="text-xs font-light ml-1 opacity-50">m³/h</span>
        </span>
      </div>
      <div class="flex flex-col border-l border-outline-variant/20 pl-4 md:pl-10">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-label text-[9px] tracking-widest text-on-surface-variant uppercase">pH Level</span>
          <span class="w-1 h-1 rounded-full bg-secondary"></span>
        </div>
        <span class="font-headline font-black text-3xl text-secondary tabular-nums">7.42
          <span class="text-xs font-light ml-1 opacity-50">pH</span>
        </span>
      </div>
      <div class="flex flex-col border-l border-outline-variant/20 pl-4 md:pl-10">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-label text-[9px] tracking-widest text-on-surface-variant uppercase">Turbidity</span>
          <span class="w-1 h-1 rounded-full bg-on-surface"></span>
        </div>
        <span class="font-headline font-black text-3xl text-on-surface tabular-nums">1.08
          <span class="text-xs font-light ml-1 opacity-50">NTU</span>
        </span>
      </div>
    </div>
    <div class="flex flex-col items-end">
      <div class="flex gap-4 mb-4">
        <div class="glass-card-tech px-3 py-1 rounded-full flex items-center gap-2">
          <div class="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(87,241,219,1)]"></div>
          <span class="font-label text-[9px] tracking-widest text-primary uppercase">{{ t('common.statusNominal') }}</span>
        </div>
      </div>
      <p class="font-label text-[9px] font-medium tracking-[0.2em] uppercase text-on-surface/30">
        © 2024 LIQUID PRECISION SYSTEMS · DEEP WATER OPS
      </p>
    </div>
  </footer>
</template>

<style scoped>
/* Water Background */
.realistic-water-bg {
  position: fixed;
  inset: 0;
  background-size: cover;
  background-position: center;
  z-index: -2;
  animation: waterBreathing 12s ease-in-out infinite alternate;
}
.realistic-water-bg-caustic {
  content: "";
  position: fixed;
  inset: 0;
  background-size: 150%;
  background-position: 0% 0%;
  mix-blend-mode: screen;
  opacity: 0.25;
  animation: causticDrift 25s ease-in-out infinite alternate;
  pointer-events: none;
  z-index: -2;
}
@keyframes waterBreathing {
  0% { transform: scale(1); }
  100% { transform: scale(1.05); }
}
@keyframes causticDrift {
  0% { background-position: 0% 0%; }
  100% { background-position: 100% 100%; }
}
.god-rays {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 40%, rgba(255,255,255,0.02) 100%);
  mix-blend-mode: overlay;
  animation: rayShimmer 15s ease-in-out infinite alternate;
  pointer-events: none;
  z-index: -1;
}
@keyframes rayShimmer {
  0% { opacity: 0.3; transform: translateX(-2%); }
  100% { opacity: 0.6; transform: translateX(2%); }
}

/* HUD Grid */
.hud-grid {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(87, 241, 219, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(87, 241, 219, 0.03) 1px, transparent 1px);
  background-size: 100px 100px;
  pointer-events: none;
  z-index: -1;
}

/* Refracted Title */
.refracted-title {
  position: relative;
  filter: drop-shadow(0 0 10px rgba(87, 241, 219, 0.3));
  animation: submerge 8s ease-in-out infinite;
}
.refracted-title span:first-child {
  text-shadow:
    -2px 0 2px rgba(255, 0, 0, 0.4),
    2px 0 2px rgba(0, 255, 255, 0.4),
    0 0 15px rgba(255, 255, 255, 0.1);
  letter-spacing: -0.02em;
}
@keyframes submerge {
  0%, 100% { transform: translateY(0) skewX(0); filter: blur(0px); }
  50% { transform: translateY(4px) skewX(0.5deg); filter: blur(0.5px); }
}

/* Glass Card Tech */
.glass-card-tech {
  background: rgba(14, 19, 31, 0.4);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(133, 148, 144, 0.15);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.glass-card-tech:hover {
  background: rgba(14, 19, 31, 0.6);
  border-color: var(--card-accent);
  box-shadow: 0 0 30px -5px var(--card-glow);
}

/* Wave Layer */
.wave-layer {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 150px;
  pointer-events: none;
  z-index: 30;
}
.wave-svg {
  position: absolute;
  bottom: 0;
  width: 200%;
  height: 100%;
  animation: waveFlow 20s linear infinite;
}
@keyframes waveFlow {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
</style>
