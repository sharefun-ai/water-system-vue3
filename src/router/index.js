import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
    meta: { icon: 'home', navKey: 'nav.home' },
  },
  {
    path: '/scada',
    name: 'SCADA',
    component: () => import('../views/ScadaView.vue'),
    meta: { icon: 'dashboard', navKey: 'nav.scada', badge: 'CONTROL INTERFACE' },
  },
  {
    path: '/data-trend',
    name: 'DataTrend',
    component: () => import('../views/DataTrendView.vue'),
    meta: { icon: 'show_chart', navKey: 'nav.dataTrend', badge: 'DATA TREND' },
  },
  {
    path: '/alert-history',
    name: 'AlertHistory',
    component: () => import('../views/AlertHistoryView.vue'),
    meta: { icon: 'notifications_active', navKey: 'nav.alertHistory', badge: 'ALERT HISTORY' },
  },
  {
    path: '/report',
    name: 'Report',
    component: () => import('../views/ReportView.vue'),
    meta: { icon: 'description', navKey: 'nav.report', badge: 'REPORT' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
