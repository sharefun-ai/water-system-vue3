<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import SideNav from './components/SideNav.vue'

const route = useRoute()
const isHome = computed(() => route.path === '/')
</script>

<template>
  <AppHeader v-if="!isHome" />
  <SideNav />
  <main :class="isHome ? '' : 'pt-14 min-h-screen'">
    <router-view :key="route.fullPath" />
  </main>
</template>
