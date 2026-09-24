<script setup>
// 执行块新建/编辑弹窗：给任务手动安排一段执行时间（Phase 1 全手动即默认锁定；
// Phase 2 自动排程生成的块默认不锁）。任务下拉来自本人 open 任务。
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { DewDialog, DewSelect, DewSwitch, DewButton } from '@bme/dew-ui'
import { scheduleService } from '../../services/scheduleService'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** null=新建；对象=编辑（task_id 不可改） */
  block: { type: Object, default: null },
  /** 从任务行打开时预选的任务 id；周历点空格时可带 start_at/end_at 预填 */
  initialTaskId: { type: Number, default: null },
  prefill: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'saved'])

const form = reactive({ task_id: null, start_at: null, end_at: null, locked: true })
const submitting = ref(false)
const taskOptions = ref([])
const taskLoading = ref(false)

const editing = computed(() => !!props.block)

async function loadTasks() {
  taskLoading.value = true
  try {
    const data = await scheduleService.fetchTasks({ bucket: 'all', perPage: 50 })
    taskOptions.value = (data.items || [])
      .filter((t) => t.status === 'open')
      .map((t) => ({
        label: t.due_at ? `${t.title}（截止 ${t.due_at.slice(5, 16)}）` :
          t.due_date ? `${t.title}（${t.due_date} 截止）` : t.title,
        value: t.id
      }))
  } catch {
    taskOptions.value = []
  } finally {
    taskLoading.value = false
  }
}

watch(() => props.modelValue, (open) => {
  if (!open) return
  loadTasks()
  const b = props.block
  form.task_id = b?.task_id ?? props.initialTaskId ?? null
  form.start_at = b?.start_at || props.prefill?.start_at || null
  form.end_at = b?.end_at || props.prefill?.end_at || null
  form.locked = b?.locked ?? true
})

function close() {
  emit('update:modelValue', false)
}

async function submit() {
  if (!form.task_id) {
    ElMessage.warning('请选择任务')
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
  submitting.value = true
  try {
    const payload = {
      task_id: form.task_id,
      start_at: form.start_at,
      end_at: form.end_at,
      locked: form.locked
    }
    const data = editing.value
      ? await scheduleService.updateBlock(props.block.id, {
          start_at: form.start_at, end_at: form.end_at, locked: form.locked,
          expected_version: props.block.version
        })
      : await scheduleService.createBlock(payload)
    const conflicts = data?.conflicts || []
    if (conflicts.length > 0) {
      ElMessage.warning(`已保存，但与「${conflicts[0].b.title}」时间冲突`)
    } else {
      ElMessage.success(editing.value ? '时间块已更新' : '已安排执行时间')
    }
    emit('saved', data.block)
    close()
  } catch (err) {
    ElMessage.error(err.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

async function removeBlock() {
  if (!props.block) return
  submitting.value = true
  try {
    await scheduleService.deleteBlock(props.block.id)
    ElMessage.success('时间块已删除')
    emit('saved', null)
    close()
  } catch (err) {
    ElMessage.error(err.message || '删除失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <DewDialog :model-value="modelValue" :title="editing ? '调整时间块' : '安排执行时间'" :width="480"
    @update:model-value="close">
    <div class="form-grid">
      <label class="field-label">任务</label>
      <DewSelect v-model="form.task_id" :options="taskOptions" :disabled="editing"
        placeholder="选择要安排的任务" filterable />

      <label class="field-label">时间</label>
      <div class="deadline-row">
        <el-date-picker v-model="form.start_at" type="datetime" format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DD HH:mm" placeholder="开始" :clearable="false" />
        <span class="range-sep">至</span>
        <el-date-picker v-model="form.end_at" type="datetime" format="YYYY-MM-DD HH:mm"
          value-format="YYYY-MM-DD HH:mm" placeholder="结束" :clearable="false" />
      </div>

      <label class="field-label">锁定</label>
      <div class="lock-row">
        <DewSwitch v-model="form.locked" />
        <span class="field-hint">锁定后不会被自动调整（智能排程上线后生效）</span>
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <DewButton v-if="editing" type="ghost" size="md" :loading="submitting" @click="removeBlock">
          删除
        </DewButton>
        <span class="footer-spacer"></span>
        <DewButton type="ghost" size="md" @click="close">取消</DewButton>
        <DewButton type="glass" size="md" :loading="submitting" @click="submit">
          {{ editing ? '保存' : '安排' }}
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

.lock-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.field-hint {
  font-size: var(--text-xs);
  color: var(--dew-muted, var(--color-text-secondary));
}

.dialog-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 8px;
}

.footer-spacer {
  flex: 1;
}
</style>
