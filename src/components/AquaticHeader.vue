<script setup>
import { CLOUD_SIMULATION } from '../data/dataSource.js'
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import TwinIcon from '../digital-twin/TwinIcon.vue'
import { aquaticNavigation as navigation } from './navigation.js'

defineProps({ status: { type: String, default: '水系統監測' }, tone: { type: String, default: 'neutral' }, time: String, sourceSettings: Boolean })
defineEmits(['source-settings'])
const route = useRoute()
const menuOpen = ref(false)
watch(() => route.path, () => { menuOpen.value = false })
function dismiss(event) {
  if (event.key === 'Escape' || (event.type === 'pointerdown' && !event.target.closest('.aquatic-header'))) menuOpen.value = false
}
onMounted(() => { document.addEventListener('keydown', dismiss); document.addEventListener('pointerdown', dismiss) })
onBeforeUnmount(() => { document.removeEventListener('keydown', dismiss); document.removeEventListener('pointerdown', dismiss) })
</script>

<template>
  <header class="twin-header aquatic-header">
    <router-link to="/portal" class="twin-brand" aria-label="AQUATIC 品牌首頁">
      <span class="brand-mark"><TwinIcon name="drop" :size="23" /></span>
      <span><strong>AQUATIC<span class="brand-dot">.</span></strong><small>PROCESS INTELLIGENCE</small></span>
    </router-link>
    <nav class="header-nav" aria-label="主導覽">
      <router-link v-for="item in navigation.slice(0, 5)" :key="item.to" :to="item.to" :class="{ 'is-current': route.path === item.to }" :aria-current="route.path === item.to ? 'page' : undefined">{{ item.name }}</router-link>
    </nav>
    <div class="header-status">
      <span class="status-pill" :class="[`is-${tone}`, { 'is-disconnected': tone === 'warning' }]" role="status"><i /><span class="status-label">{{ CLOUD_SIMULATION ? '雲端模擬數據 · ' + status : status }}</span></span>
      <span v-if="time" class="header-clock" title="系統時間">{{ time }}</span>
      <button v-if="sourceSettings" class="icon-button" aria-label="數據來源設定" @click="$emit('source-settings')"><TwinIcon name="settings" /></button>
      <button class="icon-button mobile-menu" aria-label="行動版模組導覽" aria-controls="aquatic-mobile-navigation" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen"><TwinIcon :name="menuOpen ? 'close' : 'layers'" /></button>
    </div>
    <nav v-if="menuOpen" id="aquatic-mobile-navigation" class="mobile-nav-popover" aria-label="行動版模組選單">
      <router-link v-for="item in navigation" :key="item.to" :to="item.to" :class="{ 'is-current': route.path === item.to }" :aria-current="route.path === item.to ? 'page' : undefined" @click="menuOpen = false"><TwinIcon :name="item.icon" :size="18" />{{ item.name }}</router-link>
    </nav>
  </header>
</template>
