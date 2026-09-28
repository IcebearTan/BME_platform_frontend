<script setup>
// 任务/话题命令栏（M3）：按详情 allowed_actions 渲染按钮，后端每次仍重新授权（§13）。
// 参数化命令走统一字段对话框（表驱动定义）；简单命令仅确认。expected_version
// 由父组件传入（操作前详情版本），冲突 409 时提示刷新。
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DewDialog } from '@bme/dew-ui'
import { workService } from '../../services/workService'

const props = defineProps({
  itemId: { type: Number, required: true },
  version: { type: Number, required: true },
  allowed: { type: Array, default: () => [] },
  files: { type: Array, default: () => [] },     // 事项附件（提交时绑定固定版本）
})
const emit = defineEmits(['done'])

// 仅展示动作命令（reply 由输入器、edit/invite 由头部按钮承接）
const VISIBLE = ['publish', 'promote', 'start', 'block', 'unblock', 'submit', 'complete',
                 'review_accept', 'review_return', 'close', 'reopen', 'reschedule',
                 'reassign', 'cancel', 'transfer']
const shown = computed(() => props.allowed.filter(a => VISIBLE.includes(a)))

// 命令定义表：label/风格/确认文案/参数字段（与后端命令白名单同源，§13）
const COMMAND_DEFS = {
  publish: { label: '发布', type: 'primary', plain: true,
             confirm: '确认发布？发布后本工作区可见（受限范围仍仅参与人）' },
  close: { label: '关闭话题', title: '关闭话题（停止普通回复）', fields: [
    { key: 'reason', label: '结论摘要', type: 'text' },
  ] },
  reopen: { label: '重新打开', title: '重新打开已关闭的话题', fields: [
    { key: 'reason', label: '重新打开原因', type: 'text' },
  ] },
  promote: { label: '转为任务', type: 'primary', plain: true, title: '话题转任务（保留原讨论与附件）', fields: [
    { key: 'assignee_id', label: '负责人', type: 'candidates', required: true },
    { key: 'due_at', label: '截止时间', type: 'date', required: true },
    { key: 'priority', label: '优先级', type: 'static', options: PRIORITY_OPTIONS, default: 'normal' },
    { key: 'accept_criteria', label: '验收标准', type: 'textarea' },
    { key: 'reviewer_id', label: '验收人', type: 'candidates' },
  ] },
  start: { label: '开始任务' },
  block: { label: '标记受阻', title: '标记受阻（记录原因与跟进时间）', fields: [
    { key: 'blocker_reason', label: '受阻原因', type: 'textarea', required: true },
    { key: 'follow_up_at', label: '跟进时间', type: 'datetime' },
  ] },
  unblock: { label: '解除受阻', confirm: '确认阻碍已解除，恢复进行中？' },
  submit: { label: '提交结果', title: '提交交付（进入待验收）', fields: [
    { key: 'result_note', label: '结果说明', type: 'textarea' },
    { key: 'file_version_ids', label: '交付文件', type: 'files' },
  ] },
  complete: { label: '完成任务', title: '完成任务（无验收人路径）', fields: [
    { key: 'completion_note', label: '完成说明', type: 'textarea', required: true },
  ] },
  review_accept: { label: '验收通过', type: 'success', plain: true,
                   confirm: '确认通过？验收将绑定当前提交版本（后续新版本须重新提交）', fields: [
    { key: 'note', label: '验收意见', type: 'textarea' },
  ] },
  review_return: { label: '退回修改', type: 'warning', plain: true, title: '退回修改', fields: [
    { key: 'decision_note', label: '退回原因', type: 'textarea', required: true },
  ] },
  reschedule: { label: '改期', title: '调整截止时间（记录原值与原因）', fields: [
    { key: 'due_at', label: '新截止时间', type: 'date', required: true },
    { key: 'reason', label: '改期原因', type: 'text', required: true },
  ] },
  reassign: { label: '改派负责人', title: '改派负责人（组内直派；跨组新负责人请用转交确认）', fields: [
    { key: 'assignee_id', label: '新负责人', type: 'candidates', required: true },
    { key: 'reason', label: '分派原因', type: 'text', required: true },
  ] },
  cancel: { label: '取消任务', type: 'danger', plain: true, title: '取消任务', fields: [
    { key: 'reason', label: '取消原因', type: 'text', required: true },
  ] },
  reopen: { label: '重新打开', title: '重新打开已完成任务', fields: [
    { key: 'reason', label: '重新打开原因', type: 'text', required: true },
  ] },
  transfer: { label: '转交负责人', title: '转交负责人（对方确认后生效）', transfer: true, fields: [
    { key: 'to_user_id', label: '转交给', type: 'candidates', required: true },
    { key: 'reason', label: '转交原因', type: 'text' },
    { key: 'expires_at', label: '确认期限', type: 'datetime' },
  ] },
}

const PRIORITY_STATIC = [
  { value: 'normal', label: '普通' }, { value: 'high', label: '高' }, { value: 'urgent', label: '紧急' },
]

function PRIORITY_OPTIONS() { return PRIORITY_STATIC }

// ── 字段对话框（表驱动） ──
const dialogVisible = ref(false)
const activeCommand = ref(null)
const formValues = reactive({})
const candidates = ref([])
const candidatesLoading = ref(false)
const running = ref(false)

async function loadCandidates() {
  if (candidates.value.length || candidatesLoading.value) return
  candidatesLoading.value = true
  try {
    const res = await workService.fetchCandidates()
    candidates.value = res.data?.candidates || []
  } catch { candidates.value = [] }
  finally { candidatesLoading.value = false }
}

async function onClick(command) {
  const def = COMMAND_DEFS[command]
  if (def.fields?.length) {
    activeCommand.value = command
    Object.keys(formValues).forEach(k => delete formValues[k])
    for (const f of def.fields) {
      if (f.type === 'files') formValues[f.key] = []
      else formValues[f.key] = f.default ?? (f.type === 'candidates' || f.type === 'static' ? (f.default ?? '') : null)
    }
    if (def.fields.some(f => f.type === 'candidates')) await loadCandidates()
    dialogVisible.value = true
    return
  }
  try {
    if (def.confirm) await ElMessageBox.confirm(def.confirm, def.label,
        { confirmButtonText: '确认', cancelButtonText: '取消' })
  } catch { return }
  await run(command, {})
}

const canSubmitDialog = computed(() => {
  const def = COMMAND_DEFS[activeCommand.value]
  if (!def) return false
  return def.fields.every(f => !f.required
    || (formValues[f.key] !== null && formValues[f.key] !== '' && formValues[f.key] !== undefined))
})

const fileOptions = computed(() => (props.files || [])
  .filter(f => f.status === 'active' && f.current_version)
  .map(f => ({ value: f.current_version.id,
               label: `${f.display_name}（v${f.current_version.version_no}）` })))

async function run(command, values) {
  if (running.value) return
  running.value = true
  try {
    let res
    if (COMMAND_DEFS[command]?.transfer) {
      res = await workService.createTransfer(props.itemId, values)
    } else {
      res = await workService.runCommand(props.itemId, {
        command, expected_version: props.version, ...values,
      })
    }
    ElMessage.success(res.message || '已执行')
    dialogVisible.value = false
    emit('done')
  } catch (e) {
    const msg = e.response?.data?.message || '操作失败'
    ElMessage.error(msg.includes('他人更新') ? '内容已被他人更新，正在刷新' : msg)
    if (msg.includes('他人更新')) emit('done')
  } finally {
    running.value = false
  }
}

function submitDialog() {
  if (!canSubmitDialog.value) return
  const values = {}
  for (const f of COMMAND_DEFS[activeCommand.value].fields) {
    const v = formValues[f.key]
    if (Array.isArray(v) ? v.length : (v !== null && v !== '' && v !== undefined)) {
      values[f.key] = v
    }
  }
  run(activeCommand.value, values)
}

watch(dialogVisible, (v) => { if (!v) activeCommand.value = null })
</script>

<template>
  <div v-if="shown.length" class="command-bar">
    <el-button v-for="c in shown" :key="c" size="small"
               :type="COMMAND_DEFS[c]?.type || 'default'"
               :plain="COMMAND_DEFS[c]?.plain ?? true"
               @click="onClick(c)">
      {{ COMMAND_DEFS[c]?.label || c }}
    </el-button>
  </div>

  <DewDialog v-model="dialogVisible" :title="COMMAND_DEFS[activeCommand]?.title || '操作'"
             :width="460">
    <el-form label-width="92px">
      <el-form-item v-for="f in (COMMAND_DEFS[activeCommand]?.fields || [])" :key="f.key"
                    :label="f.label" :required="f.required">
        <el-select v-if="f.type === 'candidates'" v-model="formValues[f.key]" filterable
                   :loading="candidatesLoading" placeholder="搜索并选择（仅显示有资格者）"
                   style="width: 100%;">
          <el-option v-for="c in candidates" :key="c.user_id" :label="c.username" :value="c.user_id" />
        </el-select>
        <el-select v-else-if="f.type === 'static'" v-model="formValues[f.key]" style="width: 160px;">
          <el-option v-for="o in f.options()" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
        <el-date-picker v-else-if="f.type === 'date'" v-model="formValues[f.key]" type="date"
                        placeholder="截止当天 23:59" value-format="YYYY-MM-DD" style="width: 200px;" />
        <el-date-picker v-else-if="f.type === 'datetime'" v-model="formValues[f.key]" type="datetime"
                        placeholder="可选" value-format="YYYY-MM-DDTHH:mm" style="width: 220px;" />
        <template v-else-if="f.type === 'files'">
          <el-select v-model="formValues[f.key]" multiple style="width: 100%;"
                     placeholder="选择随交付固定的文件版本（可选）">
            <el-option v-for="o in fileOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
          <div v-if="!fileOptions.length" class="files-empty-hint">
            该事项还没有可用附件；上传后在提交时可绑定固定版本
          </div>
        </template>
        <el-input v-else-if="f.type === 'textarea'" v-model="formValues[f.key]" type="textarea"
                  :rows="3" maxlength="2000" />
        <el-input v-else v-model="formValues[f.key]" maxlength="200" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="running" :disabled="!canSubmitDialog" @click="submitDialog">
        确认执行
      </el-button>
    </template>
  </DewDialog>
</template>

<style scoped>
.command-bar { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.files-empty-hint { width: 100%; font-size: 12px; color: var(--el-text-color-secondary); line-height: 1.6; }
</style>
