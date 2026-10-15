<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
defineProps({accent:{type:String,default:'#72d6e8'},showNavigation:{type:Boolean,default:false}})
const url = `${import.meta.env.BASE_URL}visualiser/index.html`
const viewer = ref(null), stage = ref(null), unityFrame = ref(null), fullscreenError = ref('')
let observer, visible = false
function updateActivity() {
  unityFrame.value?.contentWindow?.postMessage({channel:'calypso-viewer-activity',active:visible && !document.hidden}, window.location.origin)
}
onMounted(() => {
  observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; updateActivity() })
  observer.observe(viewer.value)
  document.addEventListener('visibilitychange', updateActivity)
})
onBeforeUnmount(() => { observer?.disconnect(); document.removeEventListener('visibilitychange', updateActivity) })
function sendCommand(type, data) {
  if (!unityFrame.value?.contentWindow) return false
  const command = { type, data }
  unityFrame.value.contentWindow.postMessage(JSON.stringify(command), new URL(url, window.location.href).origin)
  return true
}
defineExpose({ sendCommand })
async function fullscreen() {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await viewer.value.requestFullscreen() }
  catch { fullscreenError.value = 'Fullscreen is unavailable in this browser.' }
}
</script>
<template>
  <div ref="viewer" class="twin-viewer">
    <div class="section-toolbar twin-toolbar"><div><p class="viewer-eyebrow">CONNECTED BUILDING</p><h2>Digital Twin</h2></div><div class="actions"><slot name="actions"/><button aria-label="Fullscreen digital twin" @click="fullscreen"><i aria-hidden="true" class="fa-solid fa-expand"></i> Fullscreen</button><a :href="url" target="_blank" rel="noopener noreferrer"><i aria-hidden="true" class="fa-solid fa-arrow-up-right-from-square"></i> Open in new tab</a></div></div>
    <p v-if="fullscreenError" role="status">{{ fullscreenError }}</p>
    <div ref="stage" class="twin-stage" :style="{'--twin-accent':accent}"><iframe id="unityFrame" ref="unityFrame" :src="url" @load="updateActivity" title="Calypso digital twin" sandbox="allow-scripts allow-same-origin allow-pointer-lock" loading="eager" allow="fullscreen" allowfullscreen></iframe><div v-if="showNavigation" class="twin-screen-navigation"><slot name="screens"/></div><div class="twin-overlays" :class="{'has-navigation':showNavigation}"><div id="twin-dock-left" class="twin-dock side-dock left-dock"></div><div id="twin-dock-right" class="twin-dock side-dock right-dock"></div><div id="twin-dock-bottom" class="twin-dock bottom-dock"></div><slot/></div></div>
  </div>
</template>
<style scoped>
.twin-viewer{display:flex;flex-direction:column;gap:12px;min-width:0}.twin-toolbar{margin:0;flex-wrap:wrap}.viewer-eyebrow{margin:0 0 4px;font-size:9px;letter-spacing:2px;color:#65bdd4}.actions{flex-wrap:wrap}.actions a{display:inline-flex;gap:8px;align-items:center;padding:10px 14px;border:1px solid var(--line);border-radius:6px;color:inherit;text-decoration:none;font-size:11px}.twin-stage{position:relative;height:max(850px,calc(100dvh - 280px));min-width:0;background:#0b1622;border:1px solid var(--line);border-radius:12px;overflow:hidden}iframe{display:block;width:100%;height:100%;border:0;border-radius:12px}.twin-overlays{position:absolute;inset:12px;overflow:auto;scrollbar-width:thin;pointer-events:none}.twin-viewer:fullscreen{padding:14px;background:var(--bg,#0b111a);color:var(--text,#fff)}.twin-viewer:fullscreen .twin-stage{flex:1;height:auto;min-height:0}
</style>
<style scoped>
.twin-screen-navigation{position:absolute;top:12px;left:12px;right:12px;z-index:6;pointer-events:auto}
.twin-overlays.has-navigation{top:84px}
.twin-overlays{overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:minmax(0,1fr) auto;gap:12px}
.twin-dock{display:flex;gap:10px;min-width:0;min-height:0;pointer-events:none;scrollbar-width:thin}
.side-dock{flex-direction:column;overflow:auto;align-items:flex-start;width:max-content;max-width:100%;justify-self:start;pointer-events:auto}
.right-dock{align-items:flex-end;justify-self:end}
.side-dock :deep(.twin-overlay-panel){width:var(--panel-width);max-width:none}
.bottom-dock{grid-column:1/-1;overflow:auto;align-items:flex-end;max-height:40vh}
</style>
