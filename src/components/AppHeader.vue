<script setup>
import { useAppStore } from '../stores/app'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const app = useAppStore()
const { locale } = useI18n()
const route = useRoute()

function toggleLocale() {
  locale.value = locale.value === 'zh-TW' ? 'en' : 'zh-TW'
  localStorage.setItem('locale', locale.value)
}
</script>

<template>
  <header class="fixed top-0 z-50 w-full flex justify-between items-center px-4 md:px-6 h-14 backdrop-blur-xl bg-[#061934]/80 border-b border-outline-variant/10">
    <div class="flex items-center gap-3">
      <router-link to="/" class="flex items-center gap-2 no-underline">
        <span class="material-symbols-outlined text-primary text-xl" style="font-variation-settings: 'FILL' 1">water_drop</span>
        <span class="text-sm font-black tracking-wider text-primary font-label">AQUATIC_SCADA</span>
      </router-link>
      <template v-if="route.meta.badge">
        <span class="text-on-surface-variant/30">/</span>
        <span class="text-[10px] font-label tracking-widest text-on-surface-variant/50 border border-outline-variant/20 px-2 py-0.5 rounded">
          {{ route.meta.badge }}
        </span>
      </template>
    </div>

    <div class="flex items-center gap-3">
      <!-- Language toggle -->
      <button
        @click="toggleLocale"
        class="text-[10px] font-label text-on-surface-variant/50 border border-outline-variant/20 px-2 py-0.5 rounded hover:border-primary/30 hover:text-primary transition-all cursor-pointer bg-transparent"
      >
        {{ locale === 'zh-TW' ? 'EN' : '中' }}
      </button>

      <!-- Live indicator -->
      <div class="flex items-center gap-2 bg-surface-container-high/60 px-3 py-1.5 rounded-lg border border-outline-variant/20">
        <div class="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_6px_#5bf4de]"></div>
        <span class="text-[10px] font-label text-primary font-bold tracking-wider">{{ $t('common.live') }}</span>
        <span class="hidden sm:inline text-[9px] font-label text-on-surface-variant/50">{{ app.currentTimestamp }}</span>
      </div>

      <!-- Hamburger -->
      <button
        @click="app.toggleMenu"
        class="w-10 h-10 rounded-lg bg-surface-container-high/60 border border-outline-variant/20 flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-all active:scale-95 cursor-pointer"
      >
        <span class="material-symbols-outlined text-on-surface text-xl">menu</span>
      </button>
    </div>
  </header>
</template>
