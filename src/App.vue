<script setup>
import { ref, computed, provide, watch, onBeforeUnmount, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { signOut } from './auth'
import NotificationCenter from './components/NotificationCenter.vue'
import { navigation } from './navigation'
const route = useRoute()
const router = useRouter()
function logout() { signOut(); router.push('/login') }
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
      <div class="sidebar-bottom"><div class="site-icon"><i aria-hidden="true" class="fa-solid fa-building"></i></div><div><strong>Calypso Campus</strong><small>{{ projectData.locations.length }} locations</small></div><span class="status-dot"></span></div>
    </aside>
    <div class="workspace">
      <header class="topbar"><button class="icon-button mobile-menu" aria-label="Toggle navigation" @click="menu = !menu"><i aria-hidden="true" class="fa-solid fa-bars"></i></button><div class="breadcrumb">Calypso <span>/</span> <strong>{{ title }}</strong></div><div class="header-tools"><span class="demo"><span class="status-dot"></span> Demo data</span><button class="icon-button" :aria-label="dark ? 'Switch to light theme' : 'Switch to dark theme'" @click="dark = !dark"><i aria-hidden="true" :class="`fa-solid fa-${dark ? 'sun' : 'moon'}`"></i></button><NotificationCenter/><span class="avatar" title="Local workspace">CL</span></div></header>
      <button class="icon-button logout-button" aria-label="Sign out" title="Sign out" @click="logout"><i aria-hidden="true" class="fa-solid fa-arrow-right-from-bracket"></i></button>
      <RouterView/>
    </div>
  </div>
</template>

<style scoped>
.logout-button { position: fixed; bottom: 20px; left: 202px; z-index: 31; color: #aab8cb; }
@media (min-width: 761px) and (max-width: 1150px) { .logout-button { left: 178px; } }
@media (max-width: 760px) { .logout-button { position: absolute; top: 72px; right: 16px; bottom: auto; left: auto; z-index: 10; } }
</style>
