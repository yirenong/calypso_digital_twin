<script setup>
import PowerPlusPage from '../pages/PowerPlusPage.vue'
defineProps({ widget: Object })
</script>
<template>
  <div class="operations-widget" :class="{ 'operations-kpi': widget.type === 'source-kpi' }">
    <PowerPlusPage :view="widget.sourceView" :card="widget.id" embedded />
  </div>
</template>
<style scoped>
.operations-widget{height:100%;overflow:auto;padding-top:20px;min-width:0}
.operations-widget :deep(.pp-columns),.operations-widget :deep(.tenant-charts){grid-template-columns:1fr}
.operations-kpi :deep(.pp-metrics),.operations-kpi :deep(.ac-readings),.operations-kpi :deep(.tenant-kpis){display:block;margin:0}
.operations-kpi :deep(.pp-metrics article),.operations-kpi :deep(.ac-control-panel),.operations-kpi :deep(.ac-readings article),.operations-kpi :deep(.pp-panel),.operations-kpi :deep(.tenant-kpis article){border:0;padding:0;background:none;margin:0}
.operations-kpi :deep(.pp-metrics strong){font-size:25px}
</style>
