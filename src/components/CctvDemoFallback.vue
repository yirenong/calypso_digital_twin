<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { drawDemoScene } from '../cctv-scene'
const props = defineProps({ scene: String, playing: Boolean, name: String })
const emit = defineEmits(['time'])
const canvas = ref(null)
let frame = 0, elapsed = 0, last = 0
function draw(now) {
  if (last && props.playing) elapsed += Math.min((now - last) / 1000, .1)
  last = now
  if (canvas.value) drawDemoScene(canvas.value, props.scene, elapsed)
  emit('time', elapsed % 8)
  frame = requestAnimationFrame(draw)
}
watch(() => props.scene, () => { elapsed = 0; last = 0 })
onMounted(() => { frame = requestAnimationFrame(draw) })
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>
<template><canvas ref="canvas" class="cctv-demo-fallback" width="960" height="540" role="img" :aria-label="`Simulated sample footage: ${name}`" :data-playing="playing"></canvas></template>
