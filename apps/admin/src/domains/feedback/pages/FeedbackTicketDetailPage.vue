<template>
  <div class="ticket-detail-page selectable">
    <div class="page-header"><div class="page-title">工单 #{{ ticketId }}</div><div class="header-actions"><DewButton :loading="loading" @click="fetchDetail">刷新</DewButton><DewButton type="ghost" @click="goBack">返回列表</DewButton></div></div>
    <el-alert v-if="error" :title="error" type="error" :closable="false"><DewButton size="sm" @click="fetchDetail">重新加载</DewButton></el-alert>
    <DewSkeleton v-if="loading && !ticket" variant="rect" width="100%" :height="300" />
    <div v-if="ticket" class="ticket-detail-grid">
      <main class="ticket-detail-main">
        <DewCard variant="flat" no-hover>
          <template #header><div class="ticket-card-heading"><h1>{{ ticket.title }}</h1><el-tag :type="STATUS_META[ticket.status]?.tag || 'info'">{{ STATUS_META[ticket.status]?.label || ticket.status }}</el-tag></div></template>
          <div class="ticket-meta"><span>提交人：{{ ticket.reporter_name || '#' + ticket.reporter_user_id }}</span><span>类型：{{ CATEGORY_LABELS[ticket.category] || ticket.category }}</span><span>影响级别：{{ SEVERITY_LABELS[ticket.severity] || ticket.severity }}</span><span>{{ formatTime(ticket.created_at) }}</span></div>
          <p class="ticket-description">{{ ticket.description || '未提供问题描述' }}</p>
          <el-alert v-if="ticket.resolution_summary" :title="(RESOLUTION_LABELS[ticket.resolution_code] || '处理结果') + '：' + ticket.resolution_summary" type="success" :closable="false" />
        </DewCard>
        <DewCard v-if="ticket.page_context?.url || ticket.attachments?.length" variant="flat" no-hover>
          <template #header><strong>问题现场</strong></template>
          <dl v-if="ticket.page_context?.url" class="ticket-context">
            <dt>所在页面</dt><dd><a :href="safeSourceUrl" target="_blank" rel="noopener noreferrer">{{ ticket.page_context.url }}</a></dd>
            <dt>页面环境</dt><dd>{{ ticket.page_context.viewport_width }} × {{ ticket.page_context.viewport_height }} · {{ ticket.page_context.theme === 'dark' ? '深色' : '浅色' }} · 版本 {{ ticket.page_context.app_version || '未记录' }}</dd>
            <dt>浏览器</dt><dd>{{ ticket.page_context.user_agent || '未记录' }}</dd>
          </dl>
          <div class="ticket-attachments">
            <button v-for="attachment in ticket.attachments" :key="attachment.id" type="button" @click="preview(attachment)" class="ticket-attachment" :class="{ snapshot: attachment.kind === 'snapshot' }">
              <DewImage :src="attachmentUrl(attachment)" :alt="attachment.kind === 'snapshot' ? '页面快照' : attachment.original_name" width="100%" :height="attachment.kind === 'snapshot' ? 220 : 110" fit="contain" :lazy="false" />
              <span>{{ attachment.kind === 'snapshot' ? '页面快照' : '补充图片' }} · 点击放大</span>
            </button>
          </div>
        </DewCard>
        <DewCard no-hover>
          <template #header><strong>沟通与处理记录</strong></template>
          <ol v-if="timeline.length" class="ticket-timeline">
            <li v-for="entry in timeline" :key="entry.key" :class="{ note: entry.visibility === 'internal', event: entry.kind === 'event' }">
              <div class="ticket-timeline-heading"><strong>{{ entry.title }}</strong><el-tag v-if="entry.visibility === 'internal'" size="small" type="warning">内部</el-tag><span>{{ entry.author_name || '系统' }} · {{ formatTime(entry.created_at) }}</span></div>
              <p v-if="entry.body">{{ entry.body }}</p>
            </li>
          </ol>
          <p v-else class="ticket-detail-hint">暂无处理记录</p>
          <section class="ticket-reply">
            <h2>添加回复</h2>
            <el-radio-group v-model="replyVisibility" :disabled="busy" size="small"><el-radio-button value="public">公开回复</el-radio-button><el-radio-button value="internal">内部备注</el-radio-button></el-radio-group>
            <p class="ticket-detail-hint">{{ replyVisibility === 'public' ? '用户可见，发送后会通知提交人。' : '仅管理端可见，不会通知提交人。' }}</p>
            <el-input v-model="replyBody" :disabled="busy" type="textarea" :rows="3" maxlength="5000" placeholder="公开回复对用户可见；内部备注仅管理端可见" />
            <DewButton :loading="busy" :disabled="!replyBody.trim() || planDirty" @click="sendReply">发送</DewButton>
          </section>
        </DewCard>
      </main>
      <aside class="ticket-action-panel">
        <DewCard no-hover>
          <template #header><strong>下一步处理</strong></template>
          <p class="ticket-detail-hint">{{ STATUS_META[ticket.status]?.hint }}</p>
          <el-alert v-if="planDirty && ticket.status !== 'new'" title="处理安排有修改，请先保存安排再推进或回复。" type="info" :closable="false" />
          <div class="ticket-action-buttons">
            <DewButton v-if="ticket.status === 'new'" :active="true" :loading="busy" @click="savePlan">受理</DewButton>
            <DewButton v-for="to in nextStatuses" :key="to" :active="to === primaryAction" :disabled="busy || loading || planDirty" :type="to === 'rejected' ? 'ghost' : 'glass'" @click="chooseAction(to)">{{ ACTIONS[to] || to }}</DewButton>
          </div>
        </DewCard>
        <DewCard no-hover>
          <template #header><strong>处理安排</strong></template>
          <el-form label-position="top" :disabled="busy || !canTriage">
            <el-form-item label="反馈类型"><el-select v-model="plan.category"><el-option v-for="(label, key) in CATEGORY_LABELS" :key="key" :value="key" :label="label" /></el-select></el-form-item>
            <el-form-item label="优先级"><el-select v-model="plan.priority"><el-option v-for="(label, key) in PRIORITY_LABELS" :key="key" :value="key" :label="label" /></el-select></el-form-item>
            <el-form-item label="处理人"><el-select v-model="plan.assignee_user_id" clearable filterable placeholder="待分派"><el-option v-for="staff in staffOptions" :key="staff.id" :label="staff.username" :value="staff.id" /></el-select></el-form-item>
          </el-form>
          <p v-if="staffError" class="ticket-detail-hint">处理人列表加载失败。<button type="button" class="ticket-link-button" @click="fetchStaff">重试</button></p>
          <DewButton v-if="canTriage && ticket.status !== 'new'" :loading="busy" @click="savePlan">保存安排</DewButton>
          <p class="ticket-detail-hint">{{ canTriage ? '更改后需保存；保存安排不会额外推进处理状态。' : '已完成工单只读，重新打开后可调整。' }}</p>
        </DewCard>
      </aside>
    </div>

    <el-dialog v-model="action.visible" :title="ACTIONS[action.to] || '处理工单'" width="min(500px, calc(100vw - 24px))" :close-on-click-modal="false" :before-close="closeAction">
      <el-form label-position="top" :disabled="busy">
        <el-form-item v-if="action.to === 'resolved'" label="解决方式" required><el-select v-model="action.code"><el-option v-for="code in resolutionCodes" :key="code" :value="code" :label="RESOLUTION_LABELS[code]" /></el-select></el-form-item>
        <el-form-item v-if="['resolved', 'rejected', 'waiting_user'].includes(action.to)" :label="action.to === 'waiting_user' ? '需要用户补充什么' : '处理说明'" required><el-input v-model="action.summary" type="textarea" :rows="4" maxlength="5000" placeholder="写明用户可见的说明，便于继续跟进" /></el-form-item>
        <p v-else>确定执行「{{ ACTIONS[action.to] }}」吗？操作会记录在处理时间线中。</p>
        <p v-if="action.to === 'waiting_user'" class="ticket-detail-hint">说明会作为公开回复发送，用户补充后自动继续处理。</p>
      </el-form>
      <template #footer><DewButton :disabled="busy" @click="action.visible = false">取消</DewButton><DewButton :active="true" :loading="busy" :disabled="requiresSummary && !action.summary.trim()" @click="submitAction">确认</DewButton></template>
    </el-dialog>
    <el-dialog v-model="previewVisible" title="附件预览" width="min(1100px, calc(100vw - 24px))"><DewImage :src="previewUrl" alt="工单附件预览" width="100%" height="65vh" fit="contain" :lazy="false" /></el-dialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { DewButton, DewCard, DewImage, DewSkeleton } from '@bme/dew-ui'
import { assetUrl } from '../../../api'
import { feedbackService, feedbackError } from '../service'
import { STATUS_META, CATEGORY_LABELS, SEVERITY_LABELS, PRIORITY_LABELS, RESOLUTION_LABELS, ACTIONS, TRANSITIONS, formatTime, ticketTimeline } from '../presentation'

const route = useRoute()
const router = useRouter()
const ticketId = computed(() => route.params.ticketId)
const ticket = ref(null)
const loading = ref(false)
const error = ref('')
const busy = ref(false)
const replyBody = ref('')
const replyVisibility = ref('public')
const staffOptions = ref([])
const staffError = ref(false)
const plan = reactive({ priority: 'medium', category: 'bug', assignee_user_id: null })
const action = reactive({ visible: false, to: '', code: 'fixed', summary: '' })
const previewVisible = ref(false)
const previewUrl = ref('')
const resolutionCodes = ['fixed', 'wont_fix', 'duplicate', 'need_more_info', 'not_reproducible', 'by_design']
const requiresSummary = computed(() => ['resolved', 'rejected', 'waiting_user'].includes(action.to))
const canTriage = computed(() => ticket.value && (ticket.value.can_triage ?? !['resolved', 'closed', 'rejected'].includes(ticket.value.status)))
const planDirty = computed(() => ticket.value && (plan.priority !== ticket.value.priority || plan.category !== ticket.value.category || (plan.assignee_user_id || null) !== (ticket.value.assignee_user_id || null)))
const nextStatuses = computed(() => {
  const allowed = ticket.value ? ticket.value.allowed_transitions || TRANSITIONS[ticket.value.status] || [] : []
  return Object.keys(ACTIONS).filter(to => allowed.includes(to))
})
const primaryAction = computed(() => ({ triaged: 'in_progress', reopened: 'in_progress', in_progress: 'resolved', waiting_user: 'in_progress', resolved: 'closed', closed: 'reopened', rejected: 'reopened' }[ticket.value?.status]))
const timeline = computed(() => ticket.value ? ticketTimeline(ticket.value) : [])
const safeSourceUrl = computed(() => { const url = ticket.value?.page_context?.url || ''; return /^https?:\/\//i.test(url) ? url : undefined })
const attachmentUrl = attachment => /^https?:\/\//i.test(attachment.url) ? attachment.url : assetUrl(attachment.url)
const preview = attachment => { previewUrl.value = attachmentUrl(attachment); previewVisible.value = true }
let sequence = 0
let navigation = 0
let staffSequence = 0

async function fetchDetail() {
  const request = ++sequence
  const id = ticketId.value
  loading.value = true
  error.value = ''
  try {
    const result = await feedbackService.detail(id)
    if (request !== sequence || ticketId.value !== id) return
    if (!result.ticket) throw new Error('工单不存在或无权访问')
    ticket.value = result.ticket
    Object.assign(plan, { priority: result.ticket.priority, category: result.ticket.category, assignee_user_id: result.ticket.assignee_user_id })
  } catch (failure) { if (request === sequence) error.value = feedbackError(failure) }
  finally { if (request === sequence) loading.value = false }
}
async function fetchStaff() {
  const request = ++staffSequence
  try {
    const result = await feedbackService.staff()
    if (request === staffSequence) { staffOptions.value = result.staff || []; staffError.value = false }
  } catch { if (request === staffSequence) staffError.value = true }
}
async function runOperation(operation, success) {
  if (busy.value || loading.value || !ticket.value) return
  const currentNavigation = navigation
  const id = ticketId.value
  const status = ticket.value.status
  busy.value = true
  try {
    const result = await operation(id, status)
    if (currentNavigation !== navigation) return
    success?.()
    ElMessage.success(result.message || '操作已完成')
    await fetchDetail()
  } catch (failure) {
    if (currentNavigation !== navigation) return
    ElMessage.error(feedbackError(failure))
    if (failure.response?.status === 409) await fetchDetail()
  } finally { if (currentNavigation === navigation) busy.value = false }
}
function savePlan() {
  return runOperation((id, status) => feedbackService.triage(id, { ...plan, assignee_user_id: plan.assignee_user_id || null, expected_status: status }))
}
function sendReply() {
  if (!replyBody.value.trim()) return
  return runOperation((id, status) => feedbackService.message(id, { body: replyBody.value.trim(), visibility: replyVisibility.value, expected_status: status }), () => { replyBody.value = '' })
}
function chooseAction(to) {
  action.to = to; action.code = 'fixed'; action.summary = ''; action.visible = true
}
function closeAction(done) { if (!busy.value) done() }
function submitAction() {
  if (requiresSummary.value && !action.summary.trim()) return
  return runOperation((id, status) => feedbackService.transition(id, {
    to: action.to, expected_status: status,
    ...(action.to === 'resolved' ? { resolution_code: action.code, resolution_summary: action.summary.trim() } : {}),
    ...(['waiting_user', 'rejected'].includes(action.to) ? { reason: action.summary.trim() } : {}),
  }), () => { action.visible = false })
}
const goBack = () => router.push({ name: 'operations.feedbackTickets', query: { ...route.query } })
watch(ticketId, () => {
  navigation += 1; ticket.value = null; busy.value = false; replyBody.value = ''; replyVisibility.value = 'public'; action.visible = false; previewVisible.value = false
  fetchDetail()
}, { immediate: true })
fetchStaff()
onBeforeUnmount(() => { navigation += 1; sequence += 1; staffSequence += 1 })
</script>

<style scoped>
.ticket-detail-page { display: flex; flex-direction: column; gap: var(--spacing-md); min-width: 0; }
.ticket-detail-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: var(--spacing-md); align-items: start; }
.ticket-detail-main, .ticket-action-panel { display: flex; flex-direction: column; gap: var(--spacing-md); min-width: 0; }
.ticket-action-panel { position: sticky; top: 80px; }
.ticket-card-heading { display: flex; gap: var(--spacing-sm); align-items: center; justify-content: space-between; }
.ticket-card-heading h1 { font-size: var(--text-xl); line-height: 1.4; margin: 0; overflow-wrap: anywhere; }
.ticket-meta { display: flex; flex-wrap: wrap; gap: var(--spacing-sm) var(--spacing-md); color: var(--text-secondary); font-size: var(--text-sm); }
.ticket-description { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.8; color: var(--text-primary); }
.ticket-context { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: var(--spacing-sm); margin: 0 0 var(--spacing-md); font-size: var(--text-sm); }
.ticket-context dt, .ticket-detail-hint { color: var(--text-secondary); }
.ticket-context dd { margin: 0; overflow-wrap: anywhere; }
.ticket-context a, .ticket-link-button { color: var(--primary-color); }
.ticket-link-button { border: 0; background: transparent; cursor: pointer; }
.ticket-attachments { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); }
.ticket-attachment { padding: var(--spacing-sm); border: 1px solid var(--border-light); border-radius: var(--radius-md); background: var(--surface-solid); color: var(--text-secondary); width: 160px; cursor: zoom-in; font: inherit; font-size: var(--text-sm); }
.ticket-attachment.snapshot { width: 100%; }
.ticket-timeline { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: var(--spacing-sm); }
.ticket-timeline li { border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: var(--spacing-md); }
.ticket-timeline li.note { background: var(--color-warning-light); }
.ticket-timeline li.event { background: var(--bg-secondary); }
.ticket-timeline-heading { display: flex; align-items: center; flex-wrap: wrap; gap: var(--spacing-sm); font-size: var(--text-sm); }
.ticket-timeline-heading span, .ticket-detail-hint { font-size: var(--text-sm); line-height: 1.6; }
.ticket-timeline p { white-space: pre-wrap; overflow-wrap: anywhere; margin: var(--spacing-sm) 0 0; line-height: 1.7; }
.ticket-reply { display: flex; flex-direction: column; align-items: flex-start; gap: var(--spacing-sm); border-top: 1px solid var(--border-light); margin-top: var(--spacing-lg); padding-top: var(--spacing-md); }
.ticket-reply h2 { font-size: var(--text-base); margin: 0; }
.ticket-reply p { margin: 0; }
.ticket-action-buttons { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); }
.ticket-action-panel :deep(.el-select) { width: 100%; }
@media (max-width: 1024px) { .ticket-detail-grid { grid-template-columns: minmax(0, 1fr); } .ticket-action-panel { position: static; grid-row: 1; } }
@media (max-width: 600px) { .ticket-context { grid-template-columns: 1fr; } .ticket-card-heading { flex-wrap: wrap; } }
</style>
