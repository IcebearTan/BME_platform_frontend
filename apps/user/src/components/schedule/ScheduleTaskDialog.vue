<script setup>
// 任务新建/编辑弹窗。截止三档单选（无/到日期/到时刻）联动控件，编辑必带
// expected_version（409 由 service 透传 message，这里 toast + 关闭由父级重拉）。
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { DewDialog, DewInput, DewSelect, DewButton } from '@bme/dew-ui'
import { scheduleService } from '../../services/scheduleService'
import { useScheduleProfile } from '../../composables/useScheduleProfile'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** null=新建；对象=编辑（含 version） */
  task: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'saved'])

const { profile, load } = useScheduleProfile()

const REMINDER_OPTIONS = [
  { label: '跟随默认', value: null },
  { label: '到点提醒', value: 0 },
  { label: '提前 5 分钟', value: 5 },
  { label: '提前 15 分钟', value: 15 },
  { label: '提前 30 分钟', value: 30 },
  { label: '提前 1 小时', value: 60 },
  { label: '提前 2 小时', value: 120 }
]
const PRIORITY_OPTIONS = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' }
]

const form = reactive({
  title: '', description: '', precision: 'none',
  due_at: null, due_date: null,
  estimated_minutes: null, priority: 'medium', reminder_minutes: null
})
const submitting = ref(false)

watch(() => props.modelValue, (open) => {
  if (!open) return
  load()
  const t = props.task
  form.title = t?.title || ''
  form.description = t?.description || ''
  form.precision = t?.deadline_precision || 'none'
  form.due_at = t?.due_at || null
  form.due_date = t?.due_date || null
  form.estimated_minutes = t?.estimated_minutes ?? null
  form.priority = t?.priority || 'medium'
  form.reminder_minutes = t?.reminder_minutes ?? null
})

function close() {
  emit('update:modelValue', false)
}

async function submit() {
  if (!form.title.trim()) {
    ElMessage.warning('请填写任务标题')
    return
  }
  if (form.precision === 'datetime' && !form.due_at) {
    ElMessage.warning('请选择截止时间')
    return
  }
  if (form.precision === 'date' && !form.due_date) {
    ElMessage.warning('请选择截止日期')
    return
  }
  const payload = {
    title: form.title.trim(),
    description: form.description || null,
    deadline_precision: form.precision,
    due_at: form.precision === 'datetime' ? form.due_at : null,
    due_date: form.precision === 'date' ? form.due_date : null,
    estimated_minutes: form.estimated_minutes ?? null,
    priority: form.priority,
    reminder_minutes: form.reminder_minutes
  }
  submitting.value = true
  try {
    const data = props.task
      ? await scheduleService.updateTask(props.task.id, { ...payload, expected_version: props.task.version })
      : await scheduleService.createTask(payload)
    ElMessage.success(props.task ? '任务已更新' : (data?.reminder_created ? '任务已创建，将按时提醒' : '任务已创建'))
    emit('saved', data.task, data.plan)
    close()
  } catch (err) {
    ElMessage.error(err.message || '保存失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <DewDialog :model-value="modelValue" :title="task ? '编辑任务' : '新建任务'" :width="480"
    @update:model-value="close">
    <div class="form-grid">
      <label class="field-label">标题</label>
      <DewInput v-model="form.title" placeholder="要做什么" clearable />

      <label class="field-label">备注</label>
      <DewInput v-model="form.description" type="textarea" :rows="2" placeholder="补充说明（可选）" />

      <label class="field-label">截止</label>
      <div class="deadline-row">
        <el-radio-group v-model="form.precision" size="small">
          <el-radio-button value="none">不设</el-radio-button>
          <el-radio-button value="date">到日期</el-radio-button>
          <el-radio-button value="datetime">到时刻</el-radio-button>
        </el-radio-group>
        <el-date-picker v-if="form.precision === 'datetime'" v-model="form.due_at" type="datetime"
          format="YYYY-MM-DD HH:mm" value-format="YYYY-MM-DD HH:mm" placeholder="截止时间" :clearable="false" />
        <el-date-picker v-else-if="form.precision === 'date'" v-model="form.due_date" type="date"
          format="YYYY-MM-DD" value-format="YYYY-MM-DD" placeholder="截止日期" :clearable="false" />
      </div>

      <label class="field-label">估时（分钟）</label>
      <el-input-number v-model="form.estimated_minutes" :min="1" :max="1440" :step="15" placeholder="如 60" />

      <label class="field-label">优先级</label>
      <DewSelect v-model="form.priority" :options="PRIORITY_OPTIONS" />

      <label class="field-label">提醒</label>
      <DewSelect v-model="form.reminder_minutes" :options="REMINDER_OPTIONS" />
      <span v-if="form.reminder_minutes === null && profile" class="field-hint">
        当前默认：提前 {{ profile.default_reminder_minutes }} 分钟
      </span>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <DewButton type="ghost" size="md" @click="close">取消</DewButton>
        <DewButton type="glass" size="md" :loading="submitting" @click="submit">
          {{ task ? '保存' : '创建' }}
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

.field-hint {
  grid-column: 2;
  font-size: var(--text-xs);
  color: var(--dew-muted, var(--color-text-secondary));
}

.deadline-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 8px;
}
</style>
