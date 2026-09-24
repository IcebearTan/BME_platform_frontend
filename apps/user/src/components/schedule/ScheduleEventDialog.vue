<script setup>
// 固定日程新建/编辑弹窗。保存后若返回 conflicts（只标红不阻断的口径），
// 这里以 warning 提示「已保存但与 X 冲突」，列表/周历同步标红。
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { DewDialog, DewInput, DewSelect, DewSwitch, DewButton } from '@bme/dew-ui'
import { scheduleService } from '../../services/scheduleService'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** null=新建；对象=编辑。prefill（周历点空格）可带 start_at/end_at */
  event: { type: Object, default: null },
  prefill: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'saved'])

const REMINDER_OPTIONS = [
  { label: '跟随默认', value: null },
  { label: '到点提醒', value: 0 },
  { label: '提前 5 分钟', value: 5 },
  { label: '提前 15 分钟', value: 15 },
  { label: '提前 30 分钟', value: 30 },
  { label: '提前 1 小时', value: 60 },
  { label: '提前 2 小时', value: 120 }
]

const form = reactive({
  title: '', description: '', location: '',
  start_at: null, end_at: null,
  all_day: false, reminder_minutes: null
})
const submitting = ref(false)

watch(() => props.modelValue, (open) => {
  if (!open) return
  const e = props.event
  form.title = e?.title || ''
  form.description = e?.description || ''
  form.location = e?.location || ''
  form.start_at = e?.start_at || props.prefill?.start_at || null
  form.end_at = e?.end_at || props.prefill?.end_at || null
  form.all_day = e?.all_day || false
  form.reminder_minutes = e?.reminder_minutes ?? null
})

function close() {
  emit('update:modelValue', false)
}

async function submit() {
  if (!form.title.trim()) {
    ElMessage.warning('请填写日程标题')
    return
  }
  if (!form.start_at || !form.end_at) {
    ElMessage.warning('请选择起止时间')
    return
  }
  if (form.end_at <= form.start_at) {
    ElMessage.warning('结束时间必须晚于开始时间')
    return
  }
  const payload = {
    title: form.title.trim(),
    description: form.description || null,
    location: form.location || null,
    start_at: form.start_at,
    end_at: form.end_at,
    all_day: form.all_day,
    reminder_minutes: form.reminder_minutes
  }
  submitting.value = true
  try {
    const data = props.event
      ? await scheduleService.updateEvent(props.event.id, { ...payload, expected_version: props.event.version })
      : await scheduleService.createEvent(payload)
    const conflicts = data?.conflicts || []
    if (conflicts.length > 0) {
      const other = conflicts[0].a.id === props.event?.id || (props.event === null && conflicts[0].a.type === 'event')
        ? conflicts[0].b : conflicts[0].a
      ElMessage.warning(`已保存，但与「${other.title}」时间冲突`)
    } else {
      ElMessage.success(props.event ? '日程已更新' : '日程已创建')
    }
    emit('saved', data.event)
    close()
  } catch (err) {
    ElMessage.error(err.message || '保存失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <DewDialog :model-value="modelValue" :title="event ? '编辑日程' : '新建日程'" :width="480"
    @update:model-value="close">
    <div class="form-grid">
      <label class="field-label">标题</label>
      <DewInput v-model="form.title" placeholder="如：组会、实验" clearable />

      <label class="field-label">时间</label>
      <div class="deadline-row">
        <el-date-picker v-model="form.start_at" type="datetime" format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DD HH:mm" placeholder="开始" :clearable="false" />
        <span class="range-sep">至</span>
        <el-date-picker v-model="form.end_at" type="datetime" format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DD HH:mm" placeholder="结束" :clearable="false" />
      </div>

      <label class="field-label">全天</label>
      <DewSwitch v-model="form.all_day" />

      <label class="field-label">地点</label>
      <DewInput v-model="form.location" placeholder="可选" clearable />

      <label class="field-label">备注</label>
      <DewInput v-model="form.description" type="textarea" :rows="2" placeholder="可选" />

      <label class="field-label">提醒</label>
      <DewSelect v-model="form.reminder_minutes" :options="REMINDER_OPTIONS" />
    </div>
    <template #footer>
      <div class="dialog-footer">
        <DewButton type="ghost" size="md" @click="close">取消</DewButton>
        <DewButton type="glass" size="md" :loading="submitting" @click="submit">
          {{ event ? '保存' : '创建' }}
        </DewButton>
      </div>
    </template>
  </DewDialog>
</template>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 14px 12px;
  align-items: center;
}

.field-label {
  font-size: var(--text-sm);
  color: var(--color-text-secondary, var(--dew-text));
  text-align: right;
}

.deadline-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.range-sep {
  font-size: var(--text-sm);
  color: var(--dew-muted, var(--color-text-secondary));
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 8px;
}
</style>
