<template>
  <div class="project-record-filters" role="search" aria-label="成果与记录筛选">
    <label>关键词<DewInput v-model="draft.q" :placeholder="placeholder" clearable @enter="submit" /></label>
    <div class="prf-options">
      <label>开始日期<input v-model="draft.from" type="date" :max="draft.to || undefined" aria-label="筛选开始日期"></label>
      <label>结束日期<input v-model="draft.to" type="date" :min="draft.from || undefined" aria-label="筛选结束日期"></label>
      <label v-if="kinds.length">记录类型<DewSelect v-model="draft.kind" :options="[{ value: '', label: '全部类型' }, ...kinds]" size="sm" /></label>
      <label>日期分类<DewSelect :model-value="groupBy" :options="[{ value: 'month', label: '按月分类' }, { value: 'day', label: '按日分类' }]" size="sm" @update:model-value="emit('update:groupBy', $event)" /></label>
      <div class="prf-actions"><DewButton size="sm" @click="submit">搜索</DewButton><DewButton size="sm" type="ghost" @click="clear">清空筛选</DewButton></div>
    </div>
    <p v-if="error" class="prf-error" role="alert">{{ error }}</p>
  </div>
</template>
<script setup>
import { reactive, ref, watch } from 'vue'
import { DewButton, DewInput, DewSelect } from '@bme/dew-ui'
const props = defineProps({ modelValue: { type: Object, required: true }, groupBy: { type: String, default: 'month' }, kinds: { type: Array, default: () => [] }, placeholder: { type: String, default: '搜索标题、内容、作者或附件名' } })
const emit = defineEmits(['search', 'update:groupBy'])
const draft = reactive({ q: '', from: '', to: '', kind: '' }), error = ref('')
watch(() => JSON.stringify([props.modelValue.q, props.modelValue.from, props.modelValue.to, props.modelValue.kind]), () => { Object.assign(draft, { q: '', from: '', to: '', kind: '' }, props.modelValue); error.value = '' }, { immediate: true })
function submit() {
  if (draft.from && draft.to && draft.from > draft.to) { error.value = '开始日期不能晚于结束日期'; return }
  if (draft.q.trim().length > 120) { error.value = '搜索内容最多120字'; return }
  error.value = ''; emit('search', { ...draft, q: draft.q.trim() })
}
function clear() { Object.assign(draft, { q: '', from: '', to: '', kind: '' }); submit() }
</script>
<style scoped>
.project-record-filters { padding: 16px; border: 1px solid var(--dew-card-flat-border); border-radius: var(--radius-lg); background: var(--dew-card-flat-bg-hover); margin-bottom: 20px; }
.project-record-filters label { display: flex; flex-direction: column; gap: 7px; min-width: 0; color: var(--dew-text-muted); font-size: 12px; }
.prf-options { display: flex; align-items: end; gap: 12px; flex-wrap: wrap; margin-top: 14px; }.prf-options label { flex: 1 1 140px; }.prf-options :deep(.dew-select) { width: 100%; }
.prf-options input { min-width: 0; width: 100%; box-sizing: border-box; font: inherit; color: var(--dew-text); background: var(--dew-card-flat-bg); border: 1px solid var(--pws-field-border); border-radius: var(--radius-md); padding: 9px 10px; }.prf-options input:focus-visible { outline: 2px solid var(--pws-accent-text, var(--color-primary)); outline-offset: 2px; }
.prf-actions { display: flex; gap: 8px; flex-wrap: wrap; }.prf-error { color: var(--pws-danger-text, var(--color-danger)); font-size: 13px; margin-bottom: 0; }
@media(max-width: 540px) { .project-record-filters { padding: 12px; }.prf-options { gap: 12px 8px; }.prf-options label { flex-basis: calc(50% - 8px); }.prf-actions { width: 100%; } }
</style>
