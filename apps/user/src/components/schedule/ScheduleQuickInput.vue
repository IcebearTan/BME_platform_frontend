<script setup>
// 「说一句，帮我安排」快捷输入条（Phase 2 文字版；语音入口位预留）。
// 提交后状态由 useScheduleCapture 单例驱动，结果卡（ScheduleCaptureResultCard）
// 由父级紧随本组件渲染。
import { ref, computed } from 'vue'
import { Promotion } from '@element-plus/icons-vue'
import { DewButton } from '@bme/dew-ui'
import { useScheduleCapture } from '../../composables/useScheduleCapture'

const { phase, submit } = useScheduleCapture()

const text = ref('')
const busy = computed(() => phase.value === 'submitting' || phase.value === 'processing')

function send() {
  if (!text.value.trim() || busy.value) return
  submit(text.value)
  text.value = ''
}
</script>

<template>
  <div class="quick-input" :class="{ 'is-busy': busy }">
    <input v-model="text" class="qi-field" type="text" maxlength="2000"
      placeholder="说一句，帮我安排——如：明早九点开组会，晚上花半小时整理笔记"
      :disabled="busy" @keyup.enter="send" />
    <DewButton type="glass" size="md" :loading="busy" @click="send">
      <el-icon v-if="!busy"><Promotion /></el-icon>安排
    </DewButton>
  </div>
</template>

<style scoped>
.quick-input {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: var(--dew-card-bg);
  border: 1px solid var(--dew-card-divider);
  backdrop-filter: blur(12px);
}

.qi-field {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--text-base);
  color: var(--dew-text);
  font-family: inherit;
}

.qi-field::placeholder {
  color: var(--dew-text-faint);
}

.qi-field:disabled {
  opacity: 0.6;
}
</style>
