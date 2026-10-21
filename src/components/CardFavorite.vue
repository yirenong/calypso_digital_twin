<script setup>
import { ref } from 'vue'
import FavoriteButton from './FavoriteButton.vue'
import { favorites, toggleSharedFavorite } from '../favorites.js'
import { widgets } from '../dashboard.js'
const props = defineProps({ id: String })
const error = ref('')
function toggle() { try { toggleSharedFavorite(props.id); error.value = '' } catch { error.value = 'Could not save this favorite. Please retry.' } }
</script>
<template><FavoriteButton v-if="id" :title="widgets.find(widget => widget.id === id)?.title || id" :active="favorites.includes(id)" @toggle="toggle" /><span v-if="error" class="favorite-error" role="alert">{{ error }}</span></template>
<style scoped>.favorite-error{display:block;color:#e9a28e;font-size:10px;line-height:1.5}</style>
