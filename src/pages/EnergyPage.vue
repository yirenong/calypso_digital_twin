<script setup>
import WorkspacePage from '../components/WorkspacePage.vue'
import PowerPlusPage from './PowerPlusPage.vue'
import { getCurrentAccount } from '../auth.js'
</script>
<template><WorkspacePage page="energy"><template #extra><PowerPlusPage v-if="getCurrentAccount() === 'PowerPlus-Admin'" view="air" embedded /></template></WorkspacePage></template>
