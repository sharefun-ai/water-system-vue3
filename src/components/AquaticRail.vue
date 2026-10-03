<script setup>
import { useRoute } from 'vue-router'
import TwinIcon from '../digital-twin/TwinIcon.vue'
import { aquaticNavigation as navigation } from './navigation.js'
const route = useRoute()
</script>

<template>
  <aside class="twin-rail aquatic-rail" aria-label="模組導覽">
    <router-link v-for="item in navigation" :key="item.to" :to="item.to" :aria-label="item.name" :title="item.name" :aria-current="route.path === item.to ? 'page' : undefined" :class="{ 'is-current': route.path === item.to }"><TwinIcon :name="item.icon" /></router-link>
    <span class="rail-version">3.11.2</span>
  </aside>
</template>
