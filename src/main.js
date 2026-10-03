import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VueApexCharts from 'vue3-apexcharts'
import router from './router'
import i18n from './i18n'
import App from './App.vue'
import './style.css'

const legacyRoutes = new Set(['/portal','/scada','/scada-classic','/data-trend','/alert-history','/report'])
const legacyPath = window.location.pathname.replace(/\/$/, '')
if (!window.location.hash && legacyRoutes.has(legacyPath)) window.history.replaceState(null, '', '/#' + legacyPath + window.location.search)

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(VueApexCharts)
app.mount('#app')
