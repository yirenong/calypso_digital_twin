import { createRouter, createWebHistory } from 'vue-router'
import DashboardPage from './pages/DashboardPage.vue'
import BuildingPage from './pages/BuildingPage.vue'
import EnergyPage from './pages/EnergyPage.vue'
import WaterPage from './pages/WaterPage.vue'
import SecurityPage from './pages/SecurityPage.vue'
import SensorsPage from './pages/SensorsPage.vue'
import ThresholdPage from './pages/ThresholdPage.vue'
import NotFoundPage from './pages/NotFoundPage.vue'
import LoginPage from './pages/LoginPage.vue'
import { isAuthenticated, getCurrentAccount } from './auth'
import PowerPlusPage from './pages/PowerPlusPage.vue'

import { navigation, powerPlusNavigation } from './navigation'
export { navigation } from './navigation'

const pages = { dashboard: DashboardPage, building: BuildingPage, energy: EnergyPage, water: WaterPage, security: SecurityPage }
export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', component: LoginPage, meta: { title: 'Sign in', public: true } },
    { path: '/', redirect: '/dashboard' },
    { path: '/powerplus/operational', redirect: '/building-operations' },
    { path: '/powerplus/adaptive-ac', redirect: '/adaptive-ac' },
    { path: '/powerplus/open-bms', redirect: '/building-management' },
    { path: '/dashboard/widgets', redirect: '/dashboard' },
    ...powerPlusNavigation.map(item => ({ path: item.path, component: PowerPlusPage, meta: { section: item.id, title: item.label, account: 'PowerPlus-Admin' } })),
    ...navigation.map(item => ({ path: item.path, component: pages[item.id], meta: { section: item.id, title: item.label } })),
    ...navigation.filter(item => ['energy', 'water'].includes(item.id)).map(item => ({ path: item.path + '/sensors', component: SensorsPage, meta: { section: item.id, title: item.label + ' sensors' } })),
    ...navigation.map(item => ({ path: item.path + '/thresholds', component: ThresholdPage, meta: { section: item.id, title: item.label + ' thresholds' } })),
    { path: '/dashboard/digital-twin', component: DashboardPage, meta: { section: 'dashboard', title: 'Dashboard' } },
    { path: '/:pathMatch(.*)*', component: NotFoundPage, meta: { title: 'Page not found' } },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(to => {
  if (!to.meta.public && !isAuthenticated()) return { path: '/login', query: { redirect: to.fullPath } }
  if (to.meta.account && to.meta.account !== getCurrentAccount()) return '/dashboard'
  if (to.path === '/login' && isAuthenticated()) return '/dashboard'
})
