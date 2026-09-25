<script setup>
// 左侧课程目录（方案 §4.2）：头部课程进度 + 任意深度章节树。
// 课时切换后自动把当前项滚进可视区（nearest，不打扰用户自己的滚动位置）。
import { nextTick, ref, watch } from 'vue'
import { DewProgress } from '@bme/dew-ui'
import CourseCatalogNode from './CourseCatalogNode.vue'

const props = defineProps({
  chapters: { type: Array, required: true },
  currentLessonId: { type: Number, default: null },
  completed: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  collapsed: { type: Boolean, default: false }
})
const emit = defineEmits(['select'])

const listEl = ref(null)

watch(() => props.currentLessonId, async (id) => {
  if (id == null) return
  await nextTick()
  listEl.value?.querySelector(`[data-lesson-id="${id}"]`)
    ?.scrollIntoView({ block: 'nearest' })
})
</script>

<template>
  <aside class="catalog" :class="{ 'is-collapsed': collapsed }">
    <div class="catalog-inner">
      <div class="catalog-header">
        <div class="catalog-caption">
          <span class="catalog-title">课程目录</span>
          <span class="catalog-count">已完成 {{ completed }}/{{ total }}</span>
        </div>
        <DewProgress :percentage="total ? Math.round((completed / total) * 100) : 0" size="sm" />
        <!-- 「仅看未完成」筛选预留位（本期不实现） -->
      </div>
      <div class="catalog-body" ref="listEl">
        <CourseCatalogNode
          v-for="(node, i) in chapters"
          :key="node.id"
          :node="node"
          :index="i"
          :current-lesson-id="currentLessonId"
          @select="emit('select', $event)"
        />
      </div>
    </div>
  </aside>
</template>

<style scoped>
.catalog {
  width: 296px;
  flex-shrink: 0;
  overflow: hidden;
  background: var(--dew-card-flat-bg);
  border-right: 1px solid var(--dew-card-flat-border);
  transition: width 0.28s ease, border-color 0.28s ease;
}

.catalog.is-collapsed {
  width: 0;
  border-right-color: transparent;
}

/* 内层定宽：收起动画期间内容不换行重排 */
.catalog-inner {
  width: 296px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.catalog-header {
  padding: 20px 16px 14px;
  border-bottom: 1px solid var(--dew-card-flat-divider);
}

.catalog-caption {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}

.catalog-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--dew-text-heading);
}

.catalog-count {
  font-size: 12px;
  color: var(--dew-text-muted);
  font-variant-numeric: tabular-nums;
}

.catalog-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 10px 24px;
}

.catalog-body::-webkit-scrollbar { width: 6px; }
.catalog-body::-webkit-scrollbar-track { background: transparent; }
.catalog-body::-webkit-scrollbar-thumb {
  background: var(--dew-progress-track-bg);
  border-radius: 3px;
}
</style>
