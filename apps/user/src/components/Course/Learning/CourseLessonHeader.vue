<script setup>
// 课时标题区（方案 §4.3）：正文纸张的页头——课时标题 / 所属章节 / 类型 / 时长 / 完成态。
// 不再单独做厚重卡片，与正文连续。
import { DewTag } from '@bme/dew-ui'

defineProps({
  lesson: { type: Object, required: true },
  chapterTitle: { type: String, default: '' },
  isCompleted: { type: Boolean, default: false }
})

const TYPE_LABEL = {
  video: '视频',
  text: '图文',
  link: '外链',
  quiz: '测验',
  homework: '作业'
}
</script>

<template>
  <header class="lesson-header">
    <div class="lesson-eyebrow">
      <span v-if="chapterTitle" class="lesson-chapter">{{ chapterTitle }}</span>
      <span class="lesson-meta-item">{{ TYPE_LABEL[lesson.type] || '图文' }}</span>
      <span v-if="lesson.duration" class="lesson-meta-item">{{ lesson.duration }} 分钟</span>
      <DewTag v-if="isCompleted" type="success" size="sm">已完成</DewTag>
    </div>
    <h1 class="lesson-title">{{ lesson.title }}</h1>
  </header>
</template>

<style scoped>
.lesson-header {
  padding: 36px 48px 24px;
  border-bottom: 1px solid var(--dew-card-flat-divider);
}

.lesson-eyebrow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--dew-text-muted);
}

.lesson-chapter {
  color: var(--color-primary);
  font-weight: 500;
}

.lesson-meta-item::before {
  content: '·';
  margin-right: 10px;
  color: var(--dew-text-faint);
}
.lesson-meta-item:first-child::before { display: none; }

.lesson-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.35;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--dew-text-heading);
  overflow-wrap: break-word;
}
</style>
