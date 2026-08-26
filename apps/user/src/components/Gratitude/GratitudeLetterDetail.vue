<template>
  <DewCard variant="flat" size="lg" class="letter-detail">
    <!-- 空态：尚未选择信件 -->
    <div v-if="!letter" class="letter-empty">
      <svg style="width: 40px; height: 40px; margin-bottom: 10px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
      <span style="font-size: 14px;">在左侧选择一封感谢信展开阅读</span>
    </div>

    <template v-else>
    <!-- 寄信人 -->
    <div class="letter-head">
      <el-avatar :size="44" :src="letter.sender?.avatar || undefined">
        {{ (letter.sender?.username || '?').charAt(0) }}
      </el-avatar>
      <div class="letter-head-info">
        <router-link :to="`/profile/${letter.sender?.user_id}`" class="letter-sender">
          {{ letter.sender?.username }}
        </router-link>
        <div class="letter-meta">
          <DewTag v-if="letter.camp_session_name" size="sm" round>{{ letter.camp_session_name }}</DewTag>
          <span class="letter-time">{{ formatRelativeTime(letter.created_at) }}</span>
        </div>
      </div>
    </div>

    <!-- 信件正文 -->
    <p class="letter-body">{{ letter.content }}</p>

    <div class="letter-foot">一封来自学员的感谢信</div>
    </template>
  </DewCard>
</template>

<script setup>
import { computed, watch } from 'vue'
import { DewCard, DewTag } from '@bme/dew-ui'
import { formatRelativeTime } from '../../composables/useNotifications'
import { useGratitude } from '../../composables/useGratitude'

const props = defineProps({
  /** 当前展示的信件 */
  letter: { type: Object, default: null },
})

const { markLetterRead } = useGratitude()

// 打开即已读（乐观更新；后端连带把关联通知标为已读）
watch(() => props.letter, (l) => {
  if (l && !l.is_read) markLetterRead(l.id)
}, { immediate: true })
</script>

<style scoped>
.letter-detail {
  height: 100%;
  min-height: 320px;
}

.letter-empty {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--dew-text-faint);
}

.letter-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.letter-head-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.letter-sender {
  font-size: 15px;
  font-weight: 600;
  color: var(--dew-text-heading);
  text-decoration: none;
}
.letter-sender:hover {
  color: var(--color-primary);
}
.letter-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.letter-time {
  font-size: 12px;
  color: var(--dew-text-faint);
}

.letter-body {
  margin: 18px 0 0;
  padding: 14px 16px;
  border-left: 2px solid color-mix(in srgb, var(--color-success) 55%, transparent);
  font-size: 14px;
  line-height: 1.8;
  color: var(--dew-text);
  white-space: pre-wrap;
  word-break: break-word;
  background: color-mix(in srgb, var(--color-success) 5%, transparent);
  border-radius: 0 var(--radius-md, 12px) var(--radius-md, 12px) 0;
}

.letter-foot {
  margin-top: 16px;
  padding-top: 10px;
  border-top: 1px solid var(--dew-card-divider);
  font-size: 12px;
  color: var(--dew-text-faint);
}
</style>
