<template>
  <div class="mentor-search">
    <div class="mentor-search__controls">
      <label class="mentor-search__field">
        <span>搜索导生</span>
        <DewInput v-model="query" size="sm" clearable :prefix-icon="Search"
          placeholder="输入导生姓名" :disabled="disabled"
          @enter="chooseSingle" @keydown.esc="query = ''" />
      </label>
      <label class="mentor-search__field mentor-search__selection">
        <span>按导生团队</span>
        <DewSelect :model-value="modelValue" :options="options" size="sm"
          :disabled="disabled" @update:model-value="choose" />
      </label>
      <DewButton v-if="modelValue !== null || query" size="sm" type="ghost"
        :disabled="disabled" @click="reset">重置筛选</DewButton>
    </div>
    <div v-if="normalizedQuery" class="mentor-search__results" aria-live="polite">
      <template v-if="matches.length">
        <p class="mentor-search__hint">找到 {{ matches.length }} 位导生，选择后查看对应团队</p>
        <div class="mentor-search__choices">
          <button v-for="option in matches" :key="option.value" type="button"
            class="mentor-search__choice" :disabled="disabled"
            :aria-pressed="option.value === modelValue" @click="choose(option.value)">
            <span>{{ option.label }}</span>
            <span v-if="duplicateLabels.has(option.label)" class="mentor-search__id">编号 {{ option.value }}</span>
          </button>
        </div>
      </template>
      <p v-else class="mentor-search__hint">没有找到匹配的导生，请检查姓名或尝试更短的关键词。当前列表筛选未改变。</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { Search } from '@element-plus/icons-vue';
import { DewInput, DewSelect, DewButton } from '@bme/dew-ui';

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  options: { type: Array, required: true },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);
const query = ref('');
const normalize = value => String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase();
const normalizedQuery = computed(() => normalize(query.value));
// 只搜索服务端提供的完整导生选项，团队数据仍由原接口按 mentor_id 筛选和分页。
const mentors = computed(() => props.options.filter(option => option.value !== null && option.value !== 'unassigned'));
const matches = computed(() => mentors.value.filter(option => normalize(option.label).includes(normalizedQuery.value)));
const duplicateLabels = computed(() => {
  const seen = new Set(), duplicates = new Set();
  for (const option of mentors.value) {
    if (seen.has(option.label)) duplicates.add(option.label);
    seen.add(option.label);
  }
  return duplicates;
});
function choose(value) {
  if (props.disabled) return;
  query.value = '';
  if (value !== props.modelValue) emit('update:modelValue', value);
}
function chooseSingle(event) {
  if (event?.isComposing || !normalizedQuery.value || matches.value.length !== 1) return;
  choose(matches.value[0].value);
}
function reset() {
  choose(null);
}
</script>

<style scoped>
.mentor-search { width: 100%; min-width: 0; }
.mentor-search__controls { display: flex; align-items: end; flex-wrap: wrap; gap: 12px; }
.mentor-search__field { display: flex; flex-direction: column; gap: 6px; width: 260px; max-width: 100%; min-width: 0; }
.mentor-search__field > span { font-size: 12px; color: var(--dew-text-muted); }
.mentor-search__selection { width: 240px; }
.mentor-search__results { margin-top: 10px; padding: 12px; border: 1px solid var(--dew-card-border); border-radius: var(--radius-md, 12px); background: var(--dew-popover-bg); }
.mentor-search__hint { margin: 0; font-size: 12px; line-height: 1.7; color: var(--dew-text-muted); }
.mentor-search__choices { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; max-height: 180px; overflow-y: auto; }
.mentor-search__choice { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--dew-card-border); border-radius: var(--radius-sm, 8px); padding: 8px 12px; font: inherit; font-size: 13px; color: var(--dew-text); background: var(--dew-card-bg); cursor: pointer; text-align: left; overflow-wrap: anywhere; }
.mentor-search__choice:hover, .mentor-search__choice[aria-pressed="true"] { background: var(--dew-ghost-hover-bg); border-color: var(--color-primary); }
.mentor-search__choice:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.mentor-search__id { color: var(--dew-text-muted); font-size: 11px; }
@media (max-width: 600px) {
  .mentor-search__field { width: 100%; }
  .mentor-search__controls { align-items: stretch; }
}
</style>
