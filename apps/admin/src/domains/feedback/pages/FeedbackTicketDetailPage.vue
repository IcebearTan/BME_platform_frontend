<template>
  <div class="ticket-detail-page">
    <div class="page-header">
      <div class="page-title">工单 #{{ ticketId }}</div>
      <div class="header-actions">
        <el-button @click="goBack">返回列表</el-button>
      </div>
    </div>

    <div v-if="t" class="detail-body">
      <!-- 工单主体 -->
      <DewCard no-hover class="main-card">
        <template #header>
          <div class="card-head">
            <span class="t-title">{{ t.title }}</span>
            <el-tag :type="STATUS_META[t.status]?.tag || 'info'" size="small">{{ STATUS_META[t.status]?.label || t.status }}</el-tag>
          </div>
        </template>
        <div class="t-meta">
          <span>提交人：{{ t.reporter_name || '#' + t.reporter_user_id }}</span>
          <span>类型：{{ CATEGORY_LABELS[t.category] || t.category }}</span>
          <span>影响级别：{{ SEVERITY_LABELS[t.severity] || t.severity }}</span>
          <span>提交于 {{ formatTime(t.created_at) }}</span>
        </div>
        <p class="t-desc">{{ t.description || '（无描述）' }}</p>
        <div v-if="t.attachments?.length" class="t-attachments">
          <el-image v-for="a in t.attachments" :key="a.id" :src="attachmentUrl(a)"
            style="width: 96px; height: 96px; border-radius: 8px" fit="cover"
            :preview-src-list="t.attachments.map(attachmentUrl)" :preview-teleported="true" />
        </div>
        <el-alert v-if="t.resolution_summary" type="success" :closable="false" class="t-resolution"
          :title="`${RESOLUTION_LABELS[t.resolution_code] || t.resolution_code || '处理结果'}：${t.resolution_summary}`" />
      </DewCard>

      <!-- 处理操作（受理/分派/回复/状态迁移） -->
      <DewCard no-hover class="side-card">
        <template #header><div class="card-head">处理操作</div></template>

        <!-- 受理与分派 -->
        <div class="op-section">
          <div class="op-title">优先级与处理人</div>
          <div class="op-row">
            <el-select :model-value="t.priority" size="small" style="width: 110px;" @change="setPriority">
              <el-option v-for="(label, p) in PRIORITY_LABELS" :key="p" :label="label" :value="p" />
            </el-select>
            <el-select :model-value="t.assignee_user_id" size="small" clearable filterable
              placeholder="分派处理人" style="flex: 1;" @change="assign">
              <el-option v-for="u in staffOptions" :key="u.id" :label="u.username" :value="u.id" />
            </el-select>
            <el-button size="small" type="primary" plain @click="triage" :loading="opSubmitting">
              {{ t.status === 'new' ? '受理' : '保存' }}
            </el-button>
          </div>
        </div>

        <!-- 回复 -->
        <div class="op-section">
          <div class="op-title">回复</div>
          <el-input v-model="replyBody" type="textarea" :rows="3"
            placeholder="公开回复对用户可见并通知对方；内部备注仅管理端可见" />
          <div class="op-row">
            <el-radio-group v-model="replyVisibility" size="small">
              <el-radio-button value="public">公开回复</el-radio-button>
              <el-radio-button value="internal">内部备注</el-radio-button>
            </el-radio-group>
            <el-button size="small" type="primary" :disabled="!replyBody.trim()"
              :loading="opSubmitting" @click="sendReply">发送</el-button>
          </div>
        </div>

        <!-- 状态迁移（状态机后端校验；当前状态的合法去向动态渲染） -->
        <div class="op-section">
          <div class="op-title">状态迁移</div>
          <div class="op-row wrap">
            <el-button v-for="to in nextStatuses" :key="to" size="small"
              :type="ACTION_META[to]?.tag || 'default'" plain @click="doTransition(to)">
              {{ ACTION_META[to]?.label || to }}
            </el-button>
            <span v-if="!nextStatuses.length" class="hint">当前状态无可执行迁移</span>
          </div>
        </div>
      </DewCard>

      <!-- 沟通时间线（公开 + 内部）与状态轨迹 -->
      <DewCard no-hover class="main-card">
        <template #header><div class="card-head">沟通与轨迹</div></template>
        <div class="timeline">
          <div v-for="m in t.messages" :key="`m${m.id}`" class="tl-row"
            :class="{ internal: m.visibility === 'internal' }">
            <div class="tl-meta">
              <b>{{ m.author_name || '#' + m.author_user_id }}</b>
              <el-tag v-if="m.visibility === 'internal'" size="small" type="warning" effect="plain">内部</el-tag>
              <span class="hint">{{ formatTime(m.created_at) }}</span>
            </div>
            <p class="tl-body">{{ m.body }}</p>
          </div>
          <div v-for="e in t.events" :key="`e${e.id}`" class="tl-row event">
            <div class="tl-meta">
              <b>{{ EVENT_LABELS[e.event_type] || e.event_type }}</b>
              <span v-if="e.from_status || e.to_status" class="hint">
                {{ STATUS_META[e.from_status]?.label || e.from_status || '—' }} →
                {{ STATUS_META[e.to_status]?.label || e.to_status || '—' }}
              </span>
              <span class="hint">{{ e.actor_name || '#' + e.actor_user_id }} · {{ formatTime(e.created_at) }}</span>
            </div>
          </div>
        </div>
      </DewCard>
    </div>

    <div v-else class="hint" style="padding: 40px 0;" v-loading="loading">工单加载中…</div>

    <!-- 标记解决弹窗：解决方式 + 用户可见说明 -->
    <el-dialog v-model="resolveDlg.visible" title="标记解决" width="440px">
      <el-form label-width="80px">
        <el-form-item label="解决方式" required>
          <el-select v-model="resolveDlg.code" style="width: 100%;">
            <el-option v-for="[code, label] in RESOLUTION_OPTIONS" :key="code" :label="label" :value="code" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理说明">
          <el-input v-model="resolveDlg.summary" type="textarea" :rows="2"
            placeholder="对用户可见（可选），如：已修复并于今日上线" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resolveDlg.visible = false">取消</el-button>
        <el-button type="primary" :loading="resolveDlg.submitting" @click="submitResolve">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DewCard } from '@bme/dew-ui'
import api, { API_URL } from '../../../api'

const route = useRoute()
const router = useRouter()

const ticketId = route.params.ticketId
const t = ref(null)
const loading = ref(false)
const opSubmitting = ref(false)
const replyBody = ref('')
const replyVisibility = ref('public')
const staffOptions = ref([])

const STATUS_META = {
  new: { label: '新提交', tag: 'danger' },
  reopened: { label: '重新打开', tag: 'danger' },
  triaged: { label: '已受理', tag: 'warning' },
  in_progress: { label: '处理中', tag: 'primary' },
  waiting_user: { label: '待用户补充', tag: 'warning' },
  resolved: { label: '已解决', tag: 'success' },
  closed: { label: '已关闭', tag: 'info' },
  rejected: { label: '未予受理', tag: 'info' },
}
const CATEGORY_LABELS = {
  bug: '问题故障', feature_request: '功能建议', content_issue: '内容问题',
  account_issue: '账号问题', other: '其他',
}
const SEVERITY_LABELS = { low: '轻微', normal: '一般', high: '较严重', critical: '严重' }
const PRIORITY_LABELS = { low: '低', medium: '中', high: '高', urgent: '紧急' }
const RESOLUTION_LABELS = {
  fixed: '已修复', wont_fix: '不予修复', duplicate: '重复工单',
  need_more_info: '信息不足', not_reproducible: '无法复现', by_design: '按设计运作',
  withdrawn: '提交人撤回', rejected: '未予受理',
}
const EVENT_LABELS = {
  created: '工单创建', triaged: '受理/调整', assigned: '分派',
  public_replied: '公开回复', internal_noted: '内部备注',
  status_changed: '状态迁移', withdrawn: '撤回', reopened: '重新打开',
}
// 状态机（与后端 VALID_TRANSITIONS 同步）：当前状态 → 可执行动作
const TRANSITIONS = {
  new: ['rejected'],
  triaged: ['in_progress', 'rejected'],
  in_progress: ['waiting_user', 'resolved', 'rejected'],
  waiting_user: ['resolved'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['in_progress', 'rejected'],
}
const ACTION_META = {
  in_progress: { label: '开始处理', tag: 'primary' },
  waiting_user: { label: '要求用户补充', tag: 'warning' },
  resolved: { label: '标记解决', tag: 'success' },
  closed: { label: '关闭工单', tag: 'info' },
  rejected: { label: '不予受理', tag: 'danger' },
  reopened: { label: '重新打开', tag: 'warning' },
}

const nextStatuses = computed(() => (t.value ? (TRANSITIONS[t.value.status] || []) : []))

async function fetchDetail() {
  loading.value = true
  try {
    const res = await api.get(`/admin/feedback-tickets/${ticketId}`)
    t.value = res.data?.ticket || null
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载工单失败')
  } finally {
    loading.value = false
  }
}

async function fetchStaff() {
  // 处理人候选：管理员名单（super_admin）——走用户搜索补一批
  try {
    const res = await api.get('/user/user_list')
    staffOptions.value = (Array.isArray(res.data) ? res.data : [])
      .filter((u) => u.role === 'super_admin')
      .map((u) => ({ id: u.User_Id, username: u.User_Name }))
  } catch { staffOptions.value = [] }
}

async function triage() {
  opSubmitting.value = true
  try {
    await api.patch(`/admin/feedback-tickets/${ticketId}/triage`, {
      priority: t.value.priority,
      assignee_user_id: t.value.assignee_user_id,
    })
    ElMessage.success(t.value.status === 'new' ? '已受理' : '已保存')
    fetchDetail()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  } finally {
    opSubmitting.value = false
  }
}

async function setPriority(p) {
  t.value.priority = p
}

async function assign(uid) {
  t.value.assignee_user_id = uid
}

async function sendReply() {
  if (!replyBody.value.trim()) return
  opSubmitting.value = true
  try {
    const res = await api.post(`/admin/feedback-tickets/${ticketId}/messages`, {
      body: replyBody.value.trim(), visibility: replyVisibility.value,
    })
    ElMessage.success(res.data?.message || '已发送')
    replyBody.value = ''
    fetchDetail()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '发送失败')
  } finally {
    opSubmitting.value = false
  }
}

async function doTransition(to) {
  try {
    let body = { to }
    if (to === 'resolved') {
      resolveDlg.visible = true
      resolveDlg.code = 'fixed'
      resolveDlg.summary = ''
      return   // 解决走独立弹窗（submitResolve 提交）
    } else if (to === 'rejected') {
      const { value } = await ElMessageBox.prompt('不予受理原因（用户可见，必填）：', '不予受理', {
        confirmButtonText: '确定', cancelButtonText: '取消',
        inputValidator: (v) => !!(v && v.trim()) || '原因必填',
      })
      body.reason = value.trim()
    } else {
      const labels = { in_progress: '开始处理', waiting_user: '要求用户补充', closed: '关闭工单', reopened: '重新打开' }
      await ElMessageBox.confirm(`确定执行「${labels[to] || to}」吗？`, '状态迁移', { type: 'warning' })
    }
    const res = await api.post(`/admin/feedback-tickets/${ticketId}/transitions`, body)
    ElMessage.success(res.data?.message || '已迁移')
    fetchDetail()
  } catch (e) {
    if (e === 'cancel' || e === 'close') return
    ElMessage.error(e.response?.data?.message || '迁移失败')
  }
}

// 标记解决：解决方式（必选）+ 处理说明（用户可见）
const resolveDlg = reactive({ visible: false, code: 'fixed', summary: '', submitting: false })
const RESOLUTION_OPTIONS = [
  ['fixed', '已修复'], ['wont_fix', '不予修复'], ['duplicate', '重复工单'],
  ['need_more_info', '信息不足'], ['not_reproducible', '无法复现'], ['by_design', '按设计运作'],
]

async function submitResolve() {
  resolveDlg.submitting = true
  try {
    const res = await api.post(`/admin/feedback-tickets/${ticketId}/transitions`, {
      to: 'resolved',
      resolution_code: resolveDlg.code,
      resolution_summary: resolveDlg.summary.trim() || undefined,
    })
    ElMessage.success(res.data?.message || '已标记解决')
    resolveDlg.visible = false
    fetchDetail()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  } finally {
    resolveDlg.submitting = false
  }
}

const attachmentUrl = (a) => `${API_URL}${a.url}`
const formatTime = (s) => (s ? s.slice(0, 16).replace('T', ' ') : '')
const goBack = () => router.push({ name: 'operations.feedbackTickets' })

onMounted(() => {
  fetchDetail()
  fetchStaff()
})
</script>

<style scoped>
.ticket-detail-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: start;
}

.main-card :deep(.dew-card__header),
.side-card :deep(.dew-card__header) {
  padding: 14px 18px 0;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
}

.t-title {
  font-size: 16px;
}

.t-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 18px 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.t-desc {
  padding: 10px 18px 0;
  margin: 0;
  line-height: 1.7;
  color: var(--text-primary);
  white-space: pre-wrap;
}

.t-attachments {
  padding: 12px 18px 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.t-resolution {
  margin: 14px 18px 16px;
}

.side-card :deep(.dew-card__body) {
  padding: 14px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.op-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.op-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.op-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.op-row.wrap {
  flex-wrap: wrap;
}

.timeline {
  padding: 12px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tl-row {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--fill-color-light, var(--bg-tertiary));
}

.tl-row.internal {
  background: rgba(230, 162, 60, 0.1);
}

.tl-row.event {
  padding: 6px 12px;
}

.tl-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  margin-bottom: 4px;
}

.tl-body {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.hint {
  color: var(--text-secondary);
  font-size: 12px;
}

@media (max-width: 1024px) {
  .detail-body {
    grid-template-columns: 1fr;
  }
}
</style>
