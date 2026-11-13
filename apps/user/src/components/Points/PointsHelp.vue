<script setup>
import { QuestionFilled } from '@element-plus/icons-vue'
defineProps({ text: { type: String, required: true }, label: { type: String, default: '积分说明' } })
</script>
<template>
  <el-tooltip :content="text" placement="top" :show-after="150" trigger="hover" :hide-after="0">
    <button type="button" class="points-help" :aria-label="label"><el-icon><QuestionFilled /></el-icon></button>
  </el-tooltip>
</template>
<style scoped>
.points-help { display: inline-flex; align-items: center; border: 0; padding: 4px; background: transparent; color: var(--dew-text-muted); cursor: help; vertical-align: middle; }
.points-help:hover, .points-help:focus-visible { color: var(--color-primary); }
</style>
