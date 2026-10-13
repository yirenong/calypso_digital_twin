<script setup>
defineProps({ title: String, active: Boolean })
defineEmits(['toggle'])
</script>
<template><button class="favorite-button icon-button" :class="{ starred: active }" :aria-label="`${active ? 'Unfavorite' : 'Favorite'} ${title}`" :aria-pressed="active" :title="active ? 'Remove from favorites' : 'Favorite for quick access on your dashboard'" @click="$emit('toggle')"><i aria-hidden="true" :class="[active ? 'fa-solid' : 'fa-regular', 'fa-star']"></i></button></template>
