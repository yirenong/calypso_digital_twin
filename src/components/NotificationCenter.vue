<script setup>
import { inject, ref, computed } from 'vue'
import { navigation } from '../navigation'
const store = inject('notifications'), open = ref(false)
const unread = computed(() => store.unread.value)
const path = system => (navigation.find(n => n.id === system)?.path || '/dashboard') + '/thresholds'
const time = value => new Date(value).toLocaleString('en-SG')
</script>
<template>
  <div class="notification-center" @keydown.esc="open = false"><button class="icon-button notification-bell" aria-label="Notifications" :aria-expanded="open" aria-controls="notification-list" @click="open = !open"><i class="fa-regular fa-bell" aria-hidden="true"></i><span v-if="unread" class="notification-count">{{ unread > 99 ? '99+' : unread }}</span></button>
    <div v-if="open" class="notification-overlay" @click="open = false"></div>
    <section v-if="open" id="notification-list" class="notification-panel" aria-label="Notification history"><div class="card-heading"><h2>Notifications</h2><button class="icon-button" aria-label="Close notifications" @click="open = false"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div><div class="notification-actions"><button @click="store.markRead()">Mark all read</button><button @click="store.clearHistory">Clear history</button></div><p v-if="!store.events.value.length" class="range-availability">No notifications yet. Enable a threshold or send a test alert.</p><ul><li v-for="event in store.events.value" :key="event.id" :class="{ unread: !event.read }"><p>{{ event.message }}</p><small>{{ time(event.time) }}{{ event.test ? ' · Test' : '' }}</small><div><RouterLink :to="path(event.system)" @click="store.markRead(event.id); open = false">View thresholds</RouterLink><button v-if="!event.read" @click="store.markRead(event.id)">Mark read</button></div></li></ul><p class="range-availability">Local history · latest 100 notifications</p></section>
    <div v-if="store.toast.value" class="notification-toast" role="status"><i class="fa-solid fa-bell" aria-hidden="true"></i><div><strong>{{ store.toast.value.test ? 'Test notification' : 'Threshold alert' }}</strong><p>{{ store.toast.value.message }}</p><RouterLink :to="path(store.toast.value.system)" @click="store.toast.value = null">View thresholds</RouterLink></div><button class="icon-button" aria-label="Dismiss notification" @click="store.toast.value = null"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div>
  </div>
</template>
