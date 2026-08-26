<template>
  <DewCard variant="flat" size="lg" class="notice-detail-pane">
    <!-- 空态：尚未选择通知 -->
    <div v-if="!notice" class="pane-empty">
      <svg style="width: 40px; height: 40px; margin-bottom: 10px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
      <span style="font-size: 14px;">在左侧选择一封通知查看</span>
    </div>

    <!-- 详情 -->
    <div v-else class="pane-body">
      <div class="detail-row--title">
        <span class="detail-value-title">{{ notice.title }}</span>
        <DewTag v-if="notice.is_important" type="danger" size="sm" :round="true">重要</DewTag>
      </div>
      <p class="detail-content">{{ notice.content }}</p>
      <div class="detail-meta">
        <span class="detail-cat">{{ categoryLabel }}</span>
        <span class="detail-time">{{ formatRelativeTime(notice.created_at) }}</span>
      </div>
    </div>
  </DewCard>
</template>

<script setup>
import { computed } from 'vue'
import { DewCard, DewTag } from '@bme/dew-ui'
import { formatRelativeTime } from '../../composables/useNotifications'

const props = defineProps({
  /** 当前选中的通知（null = 空态） */
  notice: { type: Object, default: null },
})

const categoryLabel = computed(() => {
  if (props.notice?.category === 'camp') return '营期通知'
  if (props.notice?.category === 'gratitude') return '感谢信'
  return '系统通知'
})
</script>

<style scoped>
.notice-detail-pane {
  height: 100%;
  min-height: 320px;
}

.pane-empty {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--dew-text-faint);
}

.pane-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.detail-row--title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.detail-value-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--dew-text-heading);
}
.detail-content {
  font-size: 14px;
  line-height: 1.7;
  color: var(--dew-text);
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}
.detail-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--dew-card-divider);
}
.detail-cat {
  font-size: 12px;
  color: var(--dew-text-muted);
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(156, 163, 175, 0.12);
}
.detail-time {
  font-size: 12px;
  color: var(--dew-text-faint);
}
</style>
