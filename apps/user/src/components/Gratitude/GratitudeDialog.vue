<template>
  <DewDialog v-model="visible" title="写封感谢信" :width="520">
    <!-- 收件人 -->
    <div class="recipient-row">
      <el-avatar :size="40" :src="recipient.avatar || undefined">
        {{ (recipient.username || '?').charAt(0) }}
      </el-avatar>
      <div class="recipient-info">
        <div class="recipient-name">给 {{ recipient.username }}</div>
        <div class="recipient-hint">感谢信会送进 TA 的消息中心，长久保留</div>
      </div>
    </div>

    <el-input
      v-model="content"
      type="textarea"
      :rows="6"
      maxlength="500"
      show-word-limit
      resize="none"
      class="letter-input"
      placeholder="写下这位导生帮过你的瞬间——一句具体的感谢，比一百句客套都珍贵"
    />

    <template #footer>
      <DewButton type="ghost" :disabled="sending" @click="visible = false">取消</DewButton>
      <DewButton :loading="sending" :disabled="!canSend" @click="submit">寄出感谢</DewButton>
    </template>
  </DewDialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { DewButton, DewDialog } from '@bme/dew-ui'
import { gratitudeService } from '../../services/gratitudeService'

const props = defineProps({
  /** 显隐（v-model） */
  modelValue: { type: Boolean, default: false },
  /** 收件导生 { user_id, username, avatar? } */
  recipient: { type: Object, required: true },
  /** 营期 id（展示上下文，可空） */
  campSessionId: { type: [Number, String], default: null },
})

const emit = defineEmits(['update:modelValue', 'sent'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => { emit('update:modelValue', v) },
})

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
      ElMessage.success('感谢信已寄出')
      emit('sent')
      content.value = ''
      visible.value = false
    } else {
      ElMessage.error(r.message || '发送失败，请稍后再试')
    }
  } catch (e) {
    // 频控（重复感谢）等业务错误由后端 message 带回
    const msg = e?.response?.data?.message
    ElMessage.error(msg || '发送失败，请稍后再试')
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.recipient-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.recipient-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--dew-text-heading);
}
.recipient-hint {
  font-size: 12.5px;
  color: var(--dew-text-faint);
  margin-top: 2px;
}
.letter-input {
  margin-bottom: 4px;
}
</style>
