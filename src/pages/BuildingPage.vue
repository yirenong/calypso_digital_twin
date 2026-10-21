<script setup>
import WorkspacePage from '../components/WorkspacePage.vue'
import PowerPlusPage from './PowerPlusPage.vue'
import { getCurrentAccount } from '../auth.js'
</script>
<template><WorkspacePage page="building"><template #extra><PowerPlusPage v-if="getCurrentAccount() === 'PowerPlus-Admin'" view="open" embedded /></template></WorkspacePage></template>
