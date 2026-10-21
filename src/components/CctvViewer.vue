<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import CctvDemoFallback from './CctvDemoFallback.vue'
const props = defineProps({ cameras: Array, assets: Array, blockId: String })
const views = computed(() => props.cameras.filter(c => props.blockId === 'all' || c.blockId === props.blockId).map(c => ({ ...c, status: props.assets.find(a => a.id === c.id)?.status === 'Offline' ? 'Offline' : c.status })))
const selectedId = ref(''), video = ref(null), viewer = ref(null), playing = ref(false), failed = ref(false), elapsed = ref(0), fullscreenError = ref('')
const selected = computed(() => views.value.find(c => c.id === selectedId.value))
watch(views, list => { if (!list.some(c => c.id === selectedId.value)) selectedId.value = list.find(c => c.status === 'Online')?.id || list[0]?.id || '' }, { immediate: true })
watch(selectedId, () => { failed.value = false; playing.value = false; elapsed.value = 0; fullscreenError.value = '' })
const fallback = computed(() => failed.value && selected.value?.demo && selected.value.status === 'Online')
const source = computed(() => { const path = selected.value?.source; return path?.startsWith('/') ? import.meta.env.BASE_URL + path.replace(/^\/+/, '') : path })
let loadTimer
function loaded() { clearTimeout(loadTimer) }
function playbackError(event) {
  if (event?.target?.dataset.cameraId && event.target.dataset.cameraId !== selected.value?.id) return
  failed.value = true; playing.value = !!selected.value?.demo
}
watch(selected, () => {
  clearTimeout(loadTimer)
  if (selected.value?.status === 'Online' && selected.value?.demo) loadTimer = setTimeout(() => { if (!video.value || video.value.readyState < 2) playbackError() }, 8000)
}, {immediate:true})
onBeforeUnmount(() => clearTimeout(loadTimer))
const timestamp = computed(() => new Date(Date.parse('2026-10-12T02:30:00Z') + elapsed.value * 1000).toISOString().replace('T', ' ').slice(0, 19))
async function togglePlayback() {
  if (fallback.value) { playing.value = !playing.value; return }
  if (!video.value) return
  if (video.value.paused) { try { await video.value.play() } catch { playing.value = false } }
  else video.value.pause()
}
async function fullscreen() {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await viewer.value.requestFullscreen() }
  catch { fullscreenError.value = 'Fullscreen is unavailable in this browser.' }
}
</script>
<template>
  <div class="cctv-layout">
    <div class="cctv-main">
      <div ref="viewer" class="cctv-screen">
        <video v-if="selected?.status === 'Online' && selected.source && !failed" :key="selected.id" ref="video" :src="source" :data-camera-id="selected.id" muted autoplay loop playsinline preload="auto" :aria-label="`Sample footage: ${selected.name}`" @play="playing = true" @pause="playing = false" @timeupdate="elapsed = $event.target.currentTime" @canplay="loaded" @error="playbackError"></video>
        <CctvDemoFallback v-else-if="fallback" :key="selected.id" :scene="selected.source?.includes('parking') ? 'parking' : 'lobby'" :playing="playing" :name="selected.name" @time="elapsed = $event"/><div v-else class="cctv-unavailable"><i aria-hidden="true" class="fa-solid fa-video-slash"></i><strong>{{ failed ? 'Sample clip unavailable' : selected ? 'Camera offline' : 'No camera views' }}</strong><p>{{ failed ? 'Check the local media file or select another camera.' : selected ? 'No signal from this sample camera.' : 'There are no camera previews for the selected block.' }}</p></div>
        <div v-if="selected" class="cctv-overlay"><span class="cctv-demo">SIMULATED FOOTAGE</span><span>{{ selected.id.toUpperCase() }}</span></div>
        <div v-if="selected" class="cctv-caption"><div><strong>{{ selected.name }}</strong><span>{{ selected.location }}</span></div><time>{{ timestamp }} UTC</time></div>
      </div>
      <div class="cctv-controls"><div><span class="status-dot" :class="{ 'offline-dot': selected?.status !== 'Online' || (failed && !fallback) }"></span><span>{{ failed && !fallback ? 'Playback error' : selected?.status === 'Online' ? playing ? 'Sample playing' : 'Sample paused' : 'Offline' }}</span><span class="cctv-quality">{{ selected?.status === 'Online' ? '960 × 540 · Silent loop' : 'No signal' }}</span></div><div><button :disabled="selected?.status !== 'Online' || (failed && !fallback)" :aria-label="playing ? 'Pause sample footage' : 'Play sample footage'" @click="togglePlayback"><i aria-hidden="true" :class="playing ? 'fa-solid fa-pause' : 'fa-solid fa-play'"></i> {{ playing ? 'Pause' : 'Play' }}</button><button aria-label="Fullscreen CCTV viewer" @click="fullscreen"><i aria-hidden="true" class="fa-solid fa-expand"></i></button></div></div>
      <p v-if="fullscreenError" class="notice" role="status">{{ fullscreenError }}</p>
      <p class="cctv-disclaimer">Simulated surveillance scenes for preview. These previews are not live camera feeds.</p>
    </div>
    <aside class="camera-list" aria-label="Sample cameras"><div class="camera-list-heading"><strong>Camera views</strong><span>{{ views.length }} sample views</span></div><button v-for="camera in views" :key="camera.id" class="camera-choice" :class="{ selected: selectedId === camera.id }" :aria-pressed="selectedId === camera.id" :aria-label="`View ${camera.name} camera`" @click="selectedId = camera.id"><span class="camera-thumbnail" :class="{ parking: camera.name === 'Car park', offline: camera.status === 'Offline' }"><i aria-hidden="true" :class="camera.status === 'Online' ? 'fa-solid fa-video' : 'fa-solid fa-video-slash'"></i></span><span class="camera-info"><strong>{{ camera.name }}</strong><small>{{ camera.location }}</small><span :class="camera.status === 'Online' ? 'good-text' : 'warning-text'">{{ camera.status }} </span></span></button><p v-if="!views.length" class="no-assets">No sample cameras in this block.</p></aside>
  </div>
</template>
