<script setup>
import { computed } from 'vue'
const props = defineProps({ category: String, blocks: Array, assets: Array })
const equipment = computed(() => props.assets.filter(a => props.category === 'building' ? a.type !== 'CCTV' : props.category === 'water' ? a.type === 'Water' : props.category === 'energy' ? a.category === 'energy' : a.type === 'CCTV'))
</script>
<template><div class="table-scroll"><table><thead><tr><th>Asset</th><th>Location</th><th>System</th><th>Status</th></tr></thead><tbody><tr v-for="asset in equipment" :key="asset.id"><td>{{ asset.name }}<small class="asset-id">{{ asset.id }}</small></td><td>{{ blocks.find(b => b.id === asset.blockId)?.name }}</td><td>{{ asset.systemName || asset.type }}</td><td><span :class="asset.status === 'Normal' ? 'good-text' : 'warning-text'">{{ asset.status }}</span></td></tr></tbody></table><p v-if="!equipment.length" class="no-assets">No sample equipment in this block.</p></div><p v-if="category === 'security'" class="security-note">Camera status only. CCTV streams can be connected in a later phase.</p></template>
