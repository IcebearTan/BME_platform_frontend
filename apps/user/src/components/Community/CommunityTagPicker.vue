<template>
  <div class="community-tag-picker">
    <DewPopover v-model="open" width="min(264px, calc(100vw - 24px))" :show-arrow="false" :offset="8">
      <template #trigger><DewButton class="picker-trigger" size="sm" :active="!!modelValue.length" :aria-expanded="open" aria-haspopup="listbox"><span class="picker-label">{{ label }}</span><el-icon class="picker-chevron" :class="{ 'is-open': open }"><ArrowDown /></el-icon></DewButton></template>
      <section class="tag-picker-menu" @keydown.esc.stop="open = false">
        <div class="tag-picker-search"><DewInput v-model="query" size="sm" :prefix-icon="Search" placeholder="搜索标签" clearable /></div>
        <div class="tag-picker-options" role="listbox" aria-label="选择社区标签" :aria-multiselectable="multiple">
          <button v-if="!multiple" type="button" class="tag-picker-option tag-picker-all" role="option" :aria-selected="!modelValue.length" @click="select(null)">
            <span class="tag-picker-symbol" aria-hidden="true"><el-icon><Grid /></el-icon></span>
            <span class="tag-picker-name">全部标签</span>
            <span v-if="!modelValue.length" class="tag-picker-check" aria-hidden="true"><el-icon><Check /></el-icon></span>
          </button>
          <button v-for="tag in filtered" :key="tag.id" type="button" class="tag-picker-option" role="option" :aria-selected="modelValue.includes(tag.id)" :title="tag.name" @click="select(tag.id)">
            <span class="tag-picker-symbol" aria-hidden="true">#</span>
            <span class="tag-picker-name">{{ tag.name }}</span>
            <span v-if="modelValue.includes(tag.id)" class="tag-picker-check" aria-hidden="true"><el-icon><Check /></el-icon></span>
          </button>
          <p v-if="!filtered.length" class="tag-picker-empty">没有找到相关标签<span>换个关键词试试</span></p>
        </div>
      </section>
    </DewPopover>
    <button v-if="!multiple && modelValue.length" type="button" class="picker-clear" aria-label="取消标签筛选" title="取消标签筛选" @click="$emit('update:modelValue', [])"><el-icon><Close /></el-icon></button>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ArrowDown, Check, Close, Grid, Search } from '@element-plus/icons-vue'
import { DewPopover, DewButton, DewInput } from '@bme/dew-ui'
const props = defineProps({ tags: { type: Array, default: () => [] }, modelValue: { type: Array, default: () => [] }, multiple: Boolean })
const emit = defineEmits(['update:modelValue'])
const open = ref(false), query = ref('')
const label = computed(() => props.multiple ? '搜索标签' : props.tags.find(t => props.modelValue.includes(t.id))?.name || '标签')
const filtered = computed(() => {
  const value = query.value.trim().replace(/^#/, '').toLocaleLowerCase()
  return props.tags.filter(t => t.name.toLocaleLowerCase().includes(value))
})
function select(id) {
  const ids = props.multiple ? (props.modelValue.includes(id) ? props.modelValue.filter(x => x !== id) : [...props.modelValue, id]) : (id ? [id] : [])
  emit('update:modelValue', ids)
  if (!props.multiple) open.value = false
}
watch(open, () => { query.value = '' })
</script>

<style scoped>
.community-tag-picker { display: inline-flex; align-items: center; gap: 3px; min-width: 0; }
.picker-trigger { height: 34px; }
.picker-trigger :deep(.dew-btn__content), .picker-trigger :deep(.dew-btn__measure) { font-size: 13px; font-weight: 500; letter-spacing: normal; }
.picker-trigger.dew-btn--lit :deep(.dew-btn__content), .picker-trigger.dew-btn--lit :deep(.dew-btn__measure) { font-weight: 600; }
.picker-label { display: block; max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.picker-chevron { color: var(--dew-text-muted); transition: transform .2s ease; }
.picker-chevron.is-open { transform: rotate(180deg); }
.picker-clear { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; padding: 0; border-radius: var(--radius-full); color: var(--dew-text-muted); border: 0; background: none; cursor: pointer; transition: background .15s ease, color .15s ease; }
.picker-clear:hover { color: var(--dew-text-heading); background: var(--dew-ghost-hover-bg); }
/* Only this business popover receives the compact surface treatment. */
:global(.dew-popover:has(> .tag-picker-menu)) { border-color: var(--dew-card-flat-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-xl), var(--dew-card-shadow); }
.tag-picker-menu { padding: 8px; color: var(--dew-text-heading); }
.tag-picker-search { padding: 3px 3px 10px; margin-bottom: 5px; border-bottom: 1px solid var(--dew-card-divider); }
.tag-picker-search :deep(.dew-input) { --dew-input-bg: var(--dew-ghost-hover-bg); --dew-input-bg-hover: var(--dew-ghost-hover-bg); --dew-input-bg-focus: var(--dew-ghost-hover-bg); --dew-input-border: transparent; --dew-input-border-focus: var(--dew-card-flat-border); --dew-input-shadow: none; --dew-input-shadow-focus: none; }
.tag-picker-search :deep(.dew-input--sm) { height: 36px; }
.tag-picker-search :deep(.dew-input__inner) { font-size: 12px; }
.tag-picker-options { display: flex; flex-direction: column; gap: 3px; max-height: min(300px, 50vh); overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: var(--dew-card-flat-border) transparent; }
.tag-picker-options::-webkit-scrollbar { width: 4px; }
.tag-picker-options::-webkit-scrollbar-track { background: transparent; }
.tag-picker-options::-webkit-scrollbar-thumb { background: var(--dew-card-flat-border); border-radius: var(--radius-full); }
.tag-picker-options::-webkit-scrollbar-button { display: none; }
.tag-picker-option { display: flex; flex: 0 0 auto; align-items: center; gap: 10px; min-height: 38px; box-sizing: border-box; border: 1px solid transparent; background: none; padding: 6px 9px; border-radius: 10px; text-align: left; font: inherit; font-size: 13px; line-height: 1.5; color: var(--dew-text); cursor: pointer; transition: background .15s ease, border-color .15s ease; }
.tag-picker-option:hover { background: var(--dew-ghost-hover-bg); }
.tag-picker-option[aria-selected="true"] { color: var(--dew-text-heading); font-weight: 600; background: color-mix(in srgb, var(--dew-text-heading) 7%, transparent); border-color: var(--dew-card-flat-border); }
.tag-picker-option:focus-visible, .picker-clear:focus-visible { outline: 2px solid var(--dew-text-muted); outline-offset: -2px; }
.tag-picker-symbol { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 24px; width: 24px; height: 24px; border-radius: 7px; background: var(--dew-ghost-hover-bg); color: var(--dew-text-muted); font-size: 15px; font-weight: 500; }
.tag-picker-symbol .el-icon { font-size: 13px; }
.tag-picker-all { margin-bottom: 4px; }
.tag-picker-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tag-picker-check { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 17px; width: 17px; height: 17px; border-radius: var(--radius-full); color: var(--dew-popover-bg); background: var(--dew-text-heading); font-size: 11px; }
.tag-picker-empty { padding: 22px 8px; margin: 0; text-align: center; font-size: 13px; color: var(--dew-text-muted); }
.tag-picker-empty span { display: block; margin-top: 5px; font-size: 12px; color: var(--dew-text-faint); }
@media (prefers-reduced-motion: reduce) { .picker-chevron, .picker-clear, .tag-picker-option { transition: none; } }
</style>
