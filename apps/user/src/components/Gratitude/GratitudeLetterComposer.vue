<template>
  <DewCard variant="default" size="lg" :no-hover="true">
    <!-- 已寄出：安静的成功态 -->
    <div v-if="state === 'sent'" class="sent-block">
      <el-icon :size="18" class="sent-icon"><Check /></el-icon>
      <span class="sent-text">{{ sentMessage }}</span>
    </div>

    <!-- 现场写信态 -->
    <template v-else>
      <div class="composer-label">感谢信 · 写给 {{ recipient.username }}</div>
      <el-input
        v-model="content"
        type="textarea"
        :rows="3"
        maxlength="500"
        show-word-limit
        resize="none"
        class="composer-input"
        placeholder="写下这位导生帮过你的瞬间——一句具体的感谢，比一百句客套都珍贵"
      />
      <div class="composer-foot">
        <span class="composer-hint">会送进 TA 的消息中心，长久保留</span>
        <DewButton size="sm" :loading="sending" :disabled="!canSend" @click="submit">寄出感谢</DewButton>
      </div>
    </template>
  </DewCard>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import { DewButton, DewCard } from '@bme/dew-ui'
import { gratitudeService } from '../../services/gratitudeService'

const props = defineProps({
  /** 收件导生 { user_id, username } */
  recipient: { type: Object, required: true },
  /** 营期 id（展示上下文，可空） */
  campSessionId: { type: [Number, String], default: null },
})

// composing = 现场写信；sent = 已寄出/已写过（后端频控命中也算落袋）
const state = ref('composing')
const sentMessage = ref('感谢信已寄出，TA 会在消息中心看到')

const content = ref('')
const sending = ref(false)

const canSend = computed(() => content.value.trim().length > 0 && !sending.value)

async function submit() {
  if (!canSend.value) return
  sending.value = true
  try {
    const r = await gratitudeService.send({
      recipient_id: props.recipient.user_id,
      camp_session_id: props.campSessionId ?? undefined,
      content: content.value.trim(),
    })
    if (r.code === 200) {
      state.value = 'sent'
    } else if (isDuplicateMsg(r.message)) {
      toDuplicateState()
    } else {
      ElMessage.error(r.message || '发送失败，请稍后再试')
    }
  } catch (e) {
    const msg = e?.response?.data?.message || ''
    if (isDuplicateMsg(msg)) {
      toDuplicateState()
    } else {
      ElMessage.error(msg || '发送失败，请稍后再试')
    }
  } finally {
    sending.value = false
  }
}

// 后端频控（每对 sender/recipient/session 一封）命中 → 转为已写过态，不再打扰
function isDuplicateMsg(msg) {
  return /已经|重复|写过|duplicate|exists/i.test(msg || '')
}

function toDuplicateState() {
  sentMessage.value = '这一期你已经给 TA 写过感谢信啦'
  state.value = 'sent'
}
</script>

<style scoped>
.composer-label {
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--dew-text-faint);
  margin-bottom: 10px;
}
.composer-input {
  margin-bottom: 12px;
}
.composer-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.composer-hint {
  font-size: 12.5px;
  color: var(--dew-text-faint);
}

/* 已寄出态：一行安静的确认 */
.sent-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
}
.sent-icon {
  color: var(--color-success);
  flex-shrink: 0;
}
.sent-text {
  font-size: 13.5px;
  color: var(--dew-text-muted);
}
</style>
