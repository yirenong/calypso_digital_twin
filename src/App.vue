<script setup>
import { ref, computed, provide, watch, onBeforeUnmount, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { signOut } from './auth'
import NotificationCenter from './components/NotificationCenter.vue'
import DashboardPage from './pages/DashboardPage.vue'
import { navigation } from './navigation'
const route = useRoute()
const router = useRouter()
const isDashboard = computed(() => ['/dashboard', '/dashboard/digital-twin'].includes(route.path))
const dashboardLoaded = ref(false)
watch(isDashboard, active => { if (active) dashboardLoaded.value = true }, { immediate: true })
watch(() => route.meta.public, isPublic => { if (isPublic) dashboardLoaded.value = false })
const logoutDialog = ref(null)
function requestLogout() { logoutDialog.value.showModal() }
function cancelLogout() { logoutDialog.value.close() }
function logout() { cancelLogout(); signOut(); router.push('/login') }
const { projectData } = inject('dataApi')
const dark = ref(true), block = ref('all'), menu = ref(false)
provide('workspace-theme', dark)
provide('workspace-block', block)
const title = computed(() => route.meta.title || 'Calypso')
watch(() => route.path, () => { menu.value = false })
function keydown(event) { if (event.key === 'Escape') menu.value = false }
window.addEventListener('keydown', keydown)
onBeforeUnmount(() => window.removeEventListener('keydown', keydown))
</script>
<template>
  <RouterView v-if="route.meta.public" />
  <div v-else class="shell" :class="{ light: !dark }">
    <div v-if="menu" class="scrim" @click="menu = false"></div>
    <aside class="sidebar" :class="{ open: menu }">
      <div class="brand"><img src="/brand.png" alt="Calypso"></div>
      <p class="nav-label">WORKSPACE</p>
      <nav aria-label="Main navigation"><RouterLink v-for="item in navigation" :key="item.id" :class="{ active: route.meta.section === item.id }" :aria-current="route.meta.section === item.id ? 'page' : undefined" :to="item.path"><i aria-hidden="true" :class="`fa-solid fa-${item.icon}`"></i><span>{{ item.label }}</span><i aria-hidden="true" v-if="route.meta.section === item.id" class="fa-solid fa-angle-right nav-arrow"></i></RouterLink></nav>
      <div class="sidebar-bottom"><div class="site-icon"><i aria-hidden="true" class="fa-solid fa-building"></i></div><div><strong>Calypso Building</strong><small>{{ projectData.locations.length }} locations</small></div><span class="status-dot"></span></div>
    </aside>
    <div class="workspace">
      <header class="topbar"><button class="icon-button mobile-menu" aria-label="Toggle navigation" @click="menu = !menu"><i aria-hidden="true" class="fa-solid fa-bars"></i></button><div class="breadcrumb">Calypso <span>/</span> <strong>{{ title }}</strong></div><div class="header-tools"><span class="demo"><span class="status-dot"></span> Demo data</span><button class="icon-button" :aria-label="dark ? 'Switch to light theme' : 'Switch to dark theme'" @click="dark = !dark"><i aria-hidden="true" :class="`fa-solid fa-${dark ? 'sun' : 'moon'}`"></i></button><NotificationCenter/><span class="avatar" title="Local workspace">CL</span></div></header>
      <button class="icon-button logout-button" aria-label="Sign out" title="Sign out" @click="requestLogout"><i aria-hidden="true" class="fa-solid fa-arrow-right-from-bracket"></i></button>
      <div v-if="dashboardLoaded" v-show="isDashboard"><DashboardPage /></div>
      <RouterView v-if="!isDashboard"/>
    </div>
    <dialog ref="logoutDialog" class="logout-dialog" aria-labelledby="logout-title" aria-describedby="logout-description">
      <div class="logout-symbol"><i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i></div>
      <h2 id="logout-title">Sign out of Calypso?</h2>
      <p id="logout-description">You’ll need to sign in again to access your workspace.</p>
      <div class="logout-actions">
        <button type="button" autofocus @click="cancelLogout">Cancel</button>
        <button type="button" class="primary" @click="logout">Sign out</button>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.logout-dialog { width: min(420px, calc(100vw - 32px)); padding: 28px; color: var(--text); background: var(--card); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 24px 80px #0005; }
.logout-dialog::backdrop { background: #050c17aa; backdrop-filter: blur(4px); }
.logout-symbol { display: grid; place-items: center; width: 44px; height: 44px; margin-bottom: 20px; border-radius: 12px; background: var(--soft); color: #64bed0; font-size: 18px; }
.logout-dialog h2 { margin: 0; font-size: 21px; }
.logout-dialog p { margin: 12px 0 26px; color: var(--muted); font-size: 13px; line-height: 1.7; }
.logout-actions { display: flex; justify-content: flex-end; gap: 10px; }
.logout-actions button { min-width: 88px; }
.logout-button { position: fixed; bottom: 20px; left: 202px; z-index: 31; color: #aab8cb; }
@media (min-width: 761px) and (max-width: 1150px) { .logout-button { left: 178px; } }
@media (max-width: 760px) { .logout-button { position: absolute; top: 72px; right: 16px; bottom: auto; left: auto; z-index: 10; } }
</style>
