<script setup>
// 录入结果卡：多事项分区（已安排 / 已创建待安排 / 待补充 / 失败）+ 待补充追问
// （有选项出 chips，时间类字段一律配日期时间选择器，不再要求手输格式化时间）
// + 撤销本次录入 + manual 模式的排程方案确认卡（「下一步」）。
// 已安排项可「修改」打开任务编辑弹窗（事件走撤销重说）。
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { RefreshLeft, Close } from '@element-plus/icons-vue'
import { DewCard, DewTag, DewButton } from '@bme/dew-ui'
import { useScheduleCapture } from '../../composables/useScheduleCapture'
import { scheduleService } from '../../services/scheduleService'
import SchedulePlanCard from './SchedulePlanCard.vue'

const emit = defineEmits(['edit-task', 'settled'])

const { capture, phase, phaseDetail, settleTick, resolve, revertCapture, dismiss } = useScheduleCapture()

const result = computed(() => capture.value?.result || null)
const items = computed(() => result.value?.items || [])
const scheduled = computed(() => items.value.filter((i) => i.status === 'scheduled' || i.status === 'created'))
const clarifying = computed(() => items.value.filter((i) => i.status === 'needs_clarification'))
const failed = computed(() => items.value.filter((i) => i.status === 'failed'))
const hasPlan = computed(() => (result.value?.plan_ids || []).length > 0)

const visible = computed(() =>
  ['done', 'clarify_needed', 'failed', 'timeout', 'reverted'].includes(phase.value) && capture.value)

// 追问答案本地态：{itemIndex: {field: value}}
const answers = reactive({})
const UNSET = '__unset__'
const TIME_FIELDS = ['start_at', 'end_at', 'due_at']
const UNSET_FIELDS = ['start_at', 'due_at', 'due_date']

const isDatetimeField = (field) => TIME_FIELDS.includes(field)
const isDateField = (field) => field === 'due_date'
const canUnset = (field) => UNSET_FIELDS.includes(field)
const unsetLabel = (field) => (field === 'due_date' || field === 'due_at'
  ? '不设定截止' : '没有固定时间，记为待办')

// 选择器禁选今天之前的日期（过去时间由后端追问「明天同一时间」处理）
const disablePastDays = (d) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d.getTime() < today.getTime()
}

function setAnswer(item, ambiguity, value) {
  if (!value) return
  answers[item.index] = { ...(answers[item.index] || {}), [ambiguity.field]: value }
}

// 选择器展示值：哨兵值不进选择器（避免解析告警）
const pickerValue = (item, field) => {
  const v = answers[item.index]?.[field]
  return v && v !== UNSET ? v : undefined
}

function choose(item, ambiguity, option) {
  answers[item.index] = { ...(answers[item.index] || {}), [ambiguity.field]: option.value }
}

async function submitAnswers() {
  const payload = {}
  for (const item of clarifying.value) {
    const filled = answers[item.index]
    if (!filled || !Object.keys(filled).length) continue
    payload[String(item.index)] = filled
  }
  if (!Object.keys(payload).length) {
    ElMessage.warning('请先选择或填写补充信息')
    return
  }
  try {
    await resolve(payload)
    emit('settled')
  } catch { /* composable 已置 phaseDetail */ }
}

async function undo() {
  await revertCapture()
  emit('settled')
}

async function retry() {
  // 失败重试：同一句话换新 request_id 重新提交
  const text = capture.value?.text
  if (!text) return
  const { submit } = useScheduleCapture()
  await submit(text, { reuseRequestId: false })
}

async function editTask(item) {
  const taskId = item.result?.task_id
  if (!taskId) return
  try {
    const data = await scheduleService.fetchTask(taskId)
    emit('edit-task', data.task)
  } catch (err) {
    ElMessage.error(err.message || '任务已不可用')
  }
}

// manual 模式：录入产生的 proposed 排程方案 → 确认卡（应用后全局刷新）
const proposalHidden = ref(false)
watch(() => capture.value?.id, () => { proposalHidden.value = false })
const proposalPlan = computed(() => {
  const p = result.value?.proposal
  if (!p?.plan_id || proposalHidden.value) return null
  if (!['done', 'clarify_needed'].includes(phase.value)) return null
  return { id: p.plan_id, mode: 'proposed', reason: p.reason, blocks: p.blocks || [], unscheduled: p.unscheduled || [] }
})

function onProposalApplied() {
  proposalHidden.value = true
  settleTick.value += 1          // 应用产生新时间块：今日/周历/待安排全部重拉
}

const statusTag = (item) => ({
  scheduled: { type: 'success', label: '已安排' },
  created: { type: 'primary', label: '已创建' },
  needs_clarification: { type: 'warning', label: '待补充' },
  failed: { type: 'danger', label: '失败' }
}[item.status] || { type: 'neutral', label: item.status })
</script>

<template>
  <DewCard v-if="visible" size="lg" divided class="capture-card">
    <template #header>
      <div class="card-head">
        <span>录入结果</span>
        <span v-if="phase === 'reverted'" class="head-note">{{ phaseDetail }}</span>
        <span v-else-if="phase === 'timeout'" class="head-note">仍在处理，可稍后回来查看</span>
        <button class="head-close" title="关闭" @click="dismiss"><el-icon><Close /></el-icon></button>
      </div>
    </template>

    <!-- 处理中文案 -->
    <div v-if="phase === 'timeout'" class="empty-slim">理解服务响应较慢，本次结果可能稍后生成。</div>

    <!-- 已安排 / 已创建 -->
    <ul v-if="scheduled.length" class="item-list">
      <li v-for="it in scheduled" :key="it.index" class="item-row">
        <DewTag :type="statusTag(it).type" size="sm">{{ statusTag(it).label }}</DewTag>
        <span class="item-title">{{ it.title }}</span>
        <span class="item-message">{{ it.result?.message }}</span>
        <DewButton v-if="it.result?.task_id && it.status !== 'reverted'" size="sm" type="ghost"
          @click="editTask(it)">修改</DewButton>
      </li>
    </ul>

    <!-- 待补充：追问 chips + 时间选择器 -->
    <div v-if="clarifying.length && phase !== 'reverted'" class="clarify-block">
      <div v-for="it in clarifying" :key="it.index" class="clarify-item">
        <div class="clarify-title">{{ it.title }}</div>
        <div v-for="a in it.ambiguities" :key="a.field" class="clarify-question">
          <span class="q-text">{{ a.question }}</span>
          <div v-if="a.options && a.options.length" class="q-options">
            <button v-for="opt in a.options" :key="opt.value" class="q-chip"
              :class="{ 'is-picked': answers[it.index]?.[a.field] === opt.value }"
              @click="choose(it, a, opt)">{{ opt.label }}</button>
          </div>
          <div v-if="isDatetimeField(a.field) || isDateField(a.field) || !(a.options && a.options.length)"
            class="q-fill">
            <el-date-picker v-if="isDatetimeField(a.field)" class="q-picker" type="datetime"
              :model-value="pickerValue(it, a.field)"
              @update:model-value="(v) => setAnswer(it, a, v)"
              format="YYYY-MM-DD HH:mm" value-format="YYYY-MM-DD HH:mm"
              placeholder="选择时间" :clearable="false" :disabled-date="disablePastDays" />
            <el-date-picker v-else-if="isDateField(a.field)" class="q-picker q-picker-date" type="date"
              :model-value="pickerValue(it, a.field)"
              @update:model-value="(v) => setAnswer(it, a, v)"
              value-format="YYYY-MM-DD" placeholder="选择日期" :clearable="false"
              :disabled-date="disablePastDays" />
            <input v-else class="q-input" type="text" placeholder="输入补充内容"
              :value="pickerValue(it, a.field)"
              @input="setAnswer(it, a, $event.target.value)" />
            <button v-if="canUnset(a.field)" class="q-chip q-chip-ghost"
              :class="{ 'is-picked': answers[it.index]?.[a.field] === UNSET }"
              @click="setAnswer(it, a, UNSET)">{{ unsetLabel(a.field) }}</button>
          </div>
        </div>
      </div>
      <DewButton type="glass" size="md" @click="submitAnswers">提交补充</DewButton>
    </div>

    <!-- 失败项 -->
    <ul v-if="failed.length" class="item-list">
      <li v-for="it in failed" :key="it.index" class="item-row">
        <DewTag type="danger" size="sm">失败</DewTag>
        <span class="item-title">{{ it.title || it.evidence }}</span>
        <span class="item-message">{{ it.result?.message || '未能创建，请手动添加' }}</span>
      </li>
    </ul>

    <!-- 无法归类的片段 -->
    <div v-if="result?.unparsed?.length" class="unparsed">
      未能理解：{{ result.unparsed.join('；') }}（改期/完成类操作暂不支持语音式录入，请在列表中操作）
    </div>

    <!-- 整卡失败态（LLM 层） -->
    <div v-if="phase === 'failed' && !items.length" class="failed-row">
      <span class="item-message">{{ capture.error || phaseDetail || '处理失败' }}</span>
      <DewButton size="sm" type="ghost" @click="retry"><el-icon><RefreshLeft /></el-icon>重试</DewButton>
    </div>

    <!-- 完成但一个事项都没有 -->
    <div v-else-if="phase === 'done' && !items.length && !result?.unparsed?.length" class="empty-slim">
      本次没有识别出新事项，可换个说法再试或手动新建
    </div>

    <template #footer>
      <div class="footer-row" v-if="hasPlan && phase !== 'reverted'">
        <span class="footer-hint">新任务在「待安排」、日程在「今日/周历」页签查看；已锁定的安排不受影响</span>
        <DewButton size="sm" type="ghost" @click="undo"><el-icon><RefreshLeft /></el-icon>撤销本次录入</DewButton>
      </div>
    </template>
  </DewCard>

  <!-- manual 模式：建议的执行安排（录入的「下一步」） -->
  <SchedulePlanCard v-if="proposalPlan" :plan="proposalPlan"
    @applied="onProposalApplied" @dismissed="proposalHidden = true" />
</template>

<style scoped>
.capture-card {
  overflow: visible;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--dew-text-heading);
}

.head-note {
  font-size: var(--text-xs);
  font-weight: 400;
  color: var(--dew-text-muted);
}

.head-close {
  margin-left: auto;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--dew-text-faint);
  display: inline-flex;
  padding: 2px;
}

.head-close:hover {
  color: var(--dew-text);
}

.item-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--dew-card-divider);
  flex-wrap: wrap;
}

.item-row:last-child {
  border-bottom: none;
}

.item-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--dew-text);
}

.item-message {
  flex: 1;
  font-size: var(--text-xs);
  color: var(--dew-text-muted);
  min-width: 140px;
}

.clarify-block {
  margin-top: 8px;
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--color-primary-subtle, rgba(59, 130, 246, 0.07));
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.clarify-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--dew-text);
}

.clarify-question {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.q-text {
  font-size: var(--text-sm);
  color: var(--dew-text);
}

.q-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.q-chip {
  border: 1px solid var(--dew-card-divider);
  background: var(--dew-dialog-bg);
  color: var(--dew-text);
  border-radius: var(--radius-full, 999px);
  padding: 5px 14px;
  font-size: var(--text-sm);
  cursor: pointer;
}

.q-chip.is-picked {
  border-color: var(--color-primary);
  color: var(--color-primary);
  font-weight: 600;
}

.q-chip-ghost {
  border-style: dashed;
  color: var(--dew-text-muted);
}

.q-fill {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.q-picker {
  max-width: 224px;
}

.q-picker-date {
  max-width: 176px;
}

.q-input {
  border: 1px solid var(--dew-card-divider);
  background: var(--dew-dialog-bg);
  color: var(--dew-text);
  border-radius: var(--radius-md);
  padding: 6px 12px;
  font-size: var(--text-sm);
  outline: none;
  max-width: 320px;
}

.unparsed {
  margin-top: 8px;
  font-size: var(--text-xs);
  color: var(--dew-text-faint);
  line-height: 1.6;
}

.failed-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}

.footer-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.footer-hint {
  font-size: var(--text-xs);
  color: var(--dew-text-faint);
  margin-right: auto;
}

.empty-slim {
  padding: 10px 0;
  font-size: var(--text-sm);
  color: var(--dew-text-muted);
}
</style>
