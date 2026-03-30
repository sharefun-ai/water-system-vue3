<script setup>
import { useAppStore } from '../stores/app'
import { useRoute } from 'vue-router'

const app = useAppStore()
const route = useRoute()

const navLinks = [
  { to: '/', icon: 'home', key: 'nav.home' },
  { to: '/scada', icon: 'dashboard', key: 'nav.scada' },
  { to: '/data-trend', icon: 'show_chart', key: 'nav.dataTrend' },
  { to: '/alert-history', icon: 'notifications_active', key: 'nav.alertHistory' },
  { to: '/report', icon: 'description', key: 'nav.report' },
  { to: null, icon: 'menu_book', key: 'nav.documentation', external: true },
]
</script>

<template>
  <!-- Overlay -->
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-[#050a15]/40 z-[90] backdrop-blur-[2px] transition-opacity duration-500"
      :class="app.isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
      @click="app.closeMenu"
    />

    <!-- Panel -->
    <aside
      class="fixed inset-y-0 right-0 z-[100] flex flex-col w-80 bg-[#0e131f]/60 backdrop-blur-[40px] border-l border-[#859490]/10 shadow-[0_24px_48px_-12px_rgba(5,10,21,0.5)] transition-transform duration-500 ease-in-out"
      :class="app.isMenuOpen ? 'translate-x-0' : 'translate-x-full'"
    >
      <!-- Header -->
      <div class="p-5 pb-4 sm:p-8 sm:pb-6 shrink-0">
        <div class="flex items-center justify-between mb-4 sm:mb-6">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span class="material-symbols-outlined text-on-primary" style="font-variation-settings: 'FILL' 1">water_drop</span>
            </div>
            <div>
              <h2 class="text-xl font-black text-[#57f1db] tracking-tight">{{ $t('nav.systemAccess') }}</h2>
              <p class="text-[10px] font-label uppercase tracking-[0.2em] text-[#dde2f3]/50">{{ $t('nav.precisionControl') }}</p>
            </div>
          </div>
          <button class="text-[#dde2f3]/60 hover:text-[#57f1db] transition-colors active:scale-95 bg-transparent border-none cursor-pointer" @click="app.closeMenu">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="bg-surface-container-high/40 rounded-lg p-4 flex items-center gap-4 border border-outline-variant/20">
          <div class="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#57f1db]"></div>
          <span class="text-xs font-label uppercase tracking-widest text-on-surface">{{ $t('nav.systemOnline') }}</span>
        </div>
      </div>

      <!-- Nav Links -->
      <nav class="flex-grow flex flex-col px-2 overflow-y-auto">
        <template v-for="link in navLinks" :key="link.key">
          <router-link
            v-if="!link.external"
            :to="link.to"
            class="flex items-center gap-4 px-6 py-4 transition-all duration-300 no-underline"
            :class="route.path === link.to
              ? 'bg-[#57f1db]/10 text-[#57f1db] border-l-4 border-[#5de6ff]'
              : 'text-[#dde2f3]/70 hover:bg-[#ffffff]/5 hover:text-[#57f1db]'"
            @click="app.closeMenu"
          >
            <span class="material-symbols-outlined">{{ link.icon }}</span>
            <span class="text-sm font-medium tracking-wide font-headline">{{ $t(link.key) }}</span>
            <div v-if="route.path === link.to" class="ml-auto w-1.5 h-1.5 rounded-full bg-primary"></div>
          </router-link>
          <a
            v-else
            href="javascript:void(0)"
            class="flex items-center gap-4 text-[#dde2f3]/70 px-6 py-4 hover:bg-[#ffffff]/5 hover:text-[#57f1db] transition-all duration-300 no-underline"
            @click="app.closeMenu"
          >
            <span class="material-symbols-outlined">{{ link.icon }}</span>
            <span class="text-sm font-medium tracking-wide font-headline">{{ $t(link.key) }}</span>
          </a>
        </template>
      </nav>

      <!-- Footer -->
      <div class="p-5 sm:p-8 border-t border-outline-variant/10 shrink-0">
        <div class="flex justify-between items-end">
          <div class="space-y-1">
            <p class="text-[10px] font-label text-on-surface-variant uppercase tracking-widest">{{ $t('common.version') }}</p>
            <p class="text-xs font-bold text-on-surface tabular-nums">v4.82.0-LPS</p>
          </div>
          <button class="text-[#57f1db] hover:text-[#5de6ff] transition-colors bg-transparent border-none cursor-pointer">
            <span class="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>
    </aside>
  </Teleport>
</template>
