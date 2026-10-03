import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/portal' },
  {
    path: '/portal',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
    meta: { icon: 'home', navKey: 'nav.home' },
  },
  {
    path: '/scada',
    name: 'SCADA',
    component: () => import('../views/DigitalTwinView.vue'),
    meta: { standalone: true },
  },
  {
    path: '/scada-classic',
    name: 'ClassicSCADA',
    component: () => import('../views/ScadaView.vue'),
    meta: { icon: 'dashboard', navKey: 'nav.scada', badge: 'CONTROL INTERFACE' },
  },
  {
    path: '/data-trend',
    name: 'DataTrend',
    component: () => import('../views/DataTrendView.vue'),
    meta: { ocean: true, icon: 'show_chart', navKey: 'nav.dataTrend', badge: 'DATA TREND' },
  },
  {
    path: '/alert-history',
    name: 'AlertHistory',
    component: () => import('../views/AlertHistoryView.vue'),
    meta: { ocean: true, icon: 'notifications_active', navKey: 'nav.alertHistory', badge: 'ALERT HISTORY' },
  },
  {
    path: '/report',
    name: 'Report',
    component: () => import('../views/ReportView.vue'),
    meta: { ocean: true, icon: 'description', navKey: 'nav.report', badge: 'REPORT' },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
