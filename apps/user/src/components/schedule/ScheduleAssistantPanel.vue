<script setup>
// AI 日程助手抽屉（W1）：把快捷录入、澄清卡与结果卡统一收进右侧抽屉，
// 页面级快捷入口（今日页 QuickInput）保留——两处提交共用 useScheduleCapture
// 单例状态机，结果只在抽屉渲染一处，避免双挂载双 DOM。
// 仅承载已接通的新增事项能力；「帮我改期/生成日报」等指令待 W2/F2 接通
// 真实服务后再上（计划 §6.1：不放未接通的快捷指令）。
import { computed } from 'vue'
import { useScheduleCapture } from '../../composables/useScheduleCapture'
import ScheduleQuickInput from './ScheduleQuickInput.vue'
import ScheduleCaptureResultCard from './ScheduleCaptureResultCard.vue'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue', 'edit-task'])

const { capture, phase } = useScheduleCapture()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const PHASE_TEXT = {
  submitting: '提交中…', processing: '理解与排程中…',
  clarify_needed: '需要补充信息', done: '处理完成', failed: '处理失败',
  timeout: '等待结果超时', reverted: '已撤销', idle: ''
}
</script>

<template>
  <el-drawer v-model="open" title="AI 日程助手" direction="rtl" size="400px"
    class="sw-assistant-drawer" :append-to-body="true" :destroy-on-close="false">
    <div class="sw-assistant-body">
      <div class="sw-assistant-hint">
        说一句要做的事，助手帮你记录并安排时间。{{ phase !== 'idle' ? `当前：${PHASE_TEXT[phase] || phase}` : '' }}
      </div>
      <ScheduleQuickInput />
      <ScheduleCaptureResultCard @edit-task="(t) => emit('edit-task', t)" />
      <div v-if="!capture" class="sw-empty" style="padding: 18px 0;">
        还没有录入记录——试试「明早九点开会，晚上花半小时整理笔记」
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
.sw-assistant-hint {
  font-size: 13px;
  color: var(--sw-text-muted);
  line-height: 1.6;
}
</style>
