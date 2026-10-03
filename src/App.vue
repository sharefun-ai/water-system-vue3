<script setup>
import { computed, ref, provide, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import AquaticHeader from './components/AquaticHeader.vue'
import AquaticRail from './components/AquaticRail.vue'
import LiveOcean from './components/LiveOcean.vue'
import './components/aquatic-shell.css'

const route = useRoute()
const isHome = computed(() => route.path === '/portal')
const isTwin = computed(() => route.meta.standalone)
const isOcean = computed(() => !!route.meta.ocean)
const changingPage = ref(false)
const moduleStatus = ref({ label: '水系統監測', tone: 'neutral' })
const clock = ref(new Date().toLocaleTimeString('en-GB', { hour12: false }))
let timer
provide('setAquaticStatus', value => { moduleStatus.value = value })
watch(() => route.path, () => { moduleStatus.value = { label: '水系統監測', tone: 'neutral' } })
onMounted(() => { timer = setInterval(() => { clock.value = new Date().toLocaleTimeString('en-GB', { hour12: false }) }, 1000) })
onBeforeUnmount(() => clearInterval(timer))
function preparePage() { window.scrollTo(0, 0) }
</script>

<template>
  <div class="aquatic-root" :class="{ 'is-ocean': isOcean }">
  <LiveOcean :active="isOcean" />
  <template v-if="isHome || isTwin">
    <router-view :key="isTwin ? route.path : route.fullPath" />
  </template>
  <div v-else class="aquatic-app">
    <AquaticHeader :status="moduleStatus.label" :tone="moduleStatus.tone" :time="clock" />
    <div class="aquatic-module-shell">
      <AquaticRail />
      <main class="aquatic-module-content" :aria-busy="changingPage">
        <router-view v-slot="{ Component, route: pageRoute }">
          <Transition name="aquatic-route" mode="out-in" @before-leave="changingPage = true" @before-enter="preparePage" @after-enter="changingPage = false" @enter-cancelled="changingPage = false">
            <div class="aquatic-route-view" :key="pageRoute.path"><component :is="Component" /></div>
          </Transition>
        </router-view>
      </main>
    </div>
  </div>
  </div>
</template>
