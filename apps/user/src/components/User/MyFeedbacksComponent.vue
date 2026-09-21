<template>
  <div class="uc-feedbacks">
    <DewCard
      size="lg"
      divided
      class="feedbacks-card"
      v-loading="loading"
      element-loading-background="transparent"
    >
      <template #header>
        <div class="fb-header">
          <span class="fb-title">我的反馈记录</span>
          <span class="fb-subtitle">状态与回复来自处理端实时同步</span>
        </div>
      </template>

      <!-- 反馈表格（DewUI 没有表格组件，保留 el-table，用 --el-table-* 变量映射到 DewUI token 做亮/暗适配） -->
      <div class="fb-table-wrap" v-if="feedbackList.length > 0">
        <el-table
          :data="feedbackList"
          style="width: 100%;"
          stripe
          :cell-style="{ 'vertical-align': 'top', 'padding': '12px 8px' }"
        >
          <el-table-column label="标题" width="120">
            <template #default="scope">
              <div class="cell-content title-cell">{{ scope.row.title }}</div>
            </template>
          </el-table-column>

          <el-table-column label="类型" width="90" align="center">
            <template #default="scope">
              <span class="muted">{{ CATEGORY_LABELS[scope.row.category] || scope.row.category }}</span>
            </template>
          </el-table-column>

          <el-table-column label="问题描述" min-width="200">
            <template #default="scope">
              <div class="cell-content content-cell">{{ scope.row.description || '—' }}</div>
            </template>
          </el-table-column>

          <el-table-column label="提交时间" width="140">
            <template #default="scope">
              <div class="cell-content time-cell">{{ scope.row.created_at }}</div>
            </template>
          </el-table-column>

          <el-table-column label="状态" width="100" align="center">
            <template #default="scope">
              <DewTag :type="STATUS_META[scope.row.status]?.tag || 'default'" size="sm" round>
                {{ STATUS_META[scope.row.status]?.label || scope.row.status }}
              </DewTag>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="110" align="center">
            <template #default="scope">
              <div class="action-buttons">
                <DewButton size="sm" type="ghost" @click="viewDetail(scope.row)">详情</DewButton>
                <DewButton v-if="scope.row.status === 'new'" size="sm" type="danger"
                  @click="confirmWithdraw(scope.row)">撤回</DewButton>
                <DewButton v-else-if="['resolved', 'closed'].includes(scope.row.status)" size="sm"
                  @click="confirmReopen(scope.row)">重新打开</DewButton>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!loading" class="empty-state">
        <el-icon class="empty-icon"><Document /></el-icon>
        <span class="empty-text">暂无反馈记录</span>
        <DewButton :active="true" @click="$router.push('/')">去首页提交反馈</DewButton>
      </div>
    </DewCard>

    <!-- 详情对话框：公开回复时间线 + 附件 + 回复框 -->
    <DewDialog v-model="detailVisible" title="反馈详情" :width="640">
      <div v-if="current" class="feedback-detail">
        <div class="detail-head">
          <span class="detail-title">{{ current.title }}</span>
          <DewTag :type="STATUS_META[current.status]?.tag || 'default'" size="sm" round>
            {{ STATUS_META[current.status]?.label || current.status }}
          </DewTag>
        </div>
        <div class="detail-item">
          <label>问题描述：</label>
          <p class="content">{{ current.description || '—' }}</p>
        </div>
        <div class="detail-item" v-if="current.attachments?.length">
          <label>相关图片：</label>
          <div class="images-grid">
            <el-image
              v-for="(a, index) in current.attachments"
              :key="a.id"
              :src="attachmentUrl(a)"
              style="width: 80px; height: 80px; border-radius: 8px"
              fit="cover"
              :preview-src-list="current.attachments.map(attachmentUrl)"
              :initial-index="index"
              :preview-teleported="true"
            />
          </div>
        </div>

        <!-- 公开回复时间线（内部备注不出现在用户接口） -->
        <div class="detail-item column" v-if="current.messages?.length">
          <label>处理沟通：</label>
          <div class="msg-timeline">
            <div v-for="m in current.messages" :key="m.id" class="msg-row" :class="{ staff: m.is_staff_reply }">
              <div class="msg-meta">
                <b>{{ m.is_staff_reply ? '处理人员' : '我' }}</b>
                <span class="muted">{{ formatDateTime(m.created_at) }}</span>
              </div>
              <p class="msg-body">{{ m.body }}</p>
            </div>
          </div>
        </div>

        <!-- 回复框：waiting_user / 处理中可补充 -->
        <div v-if="canReply" class="reply-box">
          <DewInput v-model="replyBody" type="textarea" :rows="2"
            :placeholder="current.status === 'waiting_user' ? '处理人员请你补充信息，回复后将自动继续处理' : '补充说明（可选）'" />
          <DewButton :active="true" :disabled="replySubmitting || !replyBody.trim()" @click="submitReply">
            {{ replySubmitting ? '发送中…' : '回复' }}
          </DewButton>
        </div>
        <el-alert v-else-if="current.status === 'closed' && current.resolution_code === 'withdrawn'"
          type="info" :closable="false" title="该反馈已由你撤回（记录保留）；如问题仍在，可重新打开" />
      </div>
    </DewDialog>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Document } from '@element-plus/icons-vue'
import { DewCard, DewTag, DewButton, DewDialog, DewInput, DewMessageBox } from '@bme/dew-ui'
import api, { API_URL } from '../../api'

// 状态真相源在后端（旧实现前端写死「待处理」的缺陷修复）
const STATUS_META = {
  new: { label: '待处理', tag: 'warning' },
  triaged: { label: '已受理', tag: 'primary' },
  in_progress: { label: '处理中', tag: 'primary' },
  waiting_user: { label: '待你补充', tag: 'warning' },
  resolved: { label: '已解决', tag: 'success' },
  closed: { label: '已关闭', tag: 'default' },
  rejected: { label: '未予受理', tag: 'danger' },
  reopened: { label: '已重新打开', tag: 'warning' },
}
const CATEGORY_LABELS = {
  bug: '问题故障', feature_request: '功能建议', content_issue: '内容问题',
  account_issue: '账号问题', other: '其他',
}

const feedbackList = ref([])
const loading = ref(false)
const detailVisible = ref(false)
const current = ref(null)
const replyBody = ref('')
const replySubmitting = ref(false)

const canReply = computed(() => current.value && !['closed', 'rejected'].includes(current.value.status))

// 获取反馈记录列表（新工单端点：分页 + 真实状态）
const fetchFeedbacks = async () => {
  loading.value = true
  try {
    const response = await api({
      url: '/feedback-tickets/mine',
      method: 'get',
      params: { page: 1, page_size: 50 },
    })
    if (response.data.code === 200) {
      feedbackList.value = (response.data.tickets || []).map((t) => ({
        ...t,
        created_at: formatDateTime(t.created_at),
      }))
    } else {
      ElMessage.error(response.data.message || '获取反馈记录失败')
    }
  } catch {
    ElMessage.error('网络错误，无法获取反馈记录')
  } finally {
    loading.value = false
  }
}

// 详情：拉全量（含公开回复时间线与附件短签 URL）
const viewDetail = async (row) => {
  detailVisible.value = true
  current.value = null
  replyBody.value = ''
  try {
    const res = await api({ url: `/feedback-tickets/${row.id}`, method: 'get' })
    if (res.data.code === 200) {
      current.value = res.data.ticket
    } else {
      ElMessage.error(res.data.message || '加载详情失败')
    }
  } catch {
    ElMessage.error('网络错误，无法加载详情')
  }
}

const attachmentUrl = (a) => `${API_URL}${a.url}`

const submitReply = async () => {
  if (!replyBody.value.trim() || !current.value) return
  replySubmitting.value = true
  try {
    const res = await api({
      url: `/feedback-tickets/${current.value.id}/messages`,
      method: 'post',
      data: { body: replyBody.value.trim() },
    })
    if (res.data.code === 200) {
      ElMessage.success('已回复')
      replyBody.value = ''
      viewDetail(current.value)   // 重拉详情（waiting_user 回复后自动 in_progress）
      fetchFeedbacks()
    } else {
      ElMessage.error(res.data.message || '回复失败')
    }
  } catch {
    ElMessage.error('网络错误，回复失败')
  } finally {
    replySubmitting.value = false
  }
}

// 撤回（仅未受理）：状态迁移非物理删，记录保留可追溯
const confirmWithdraw = async (row) => {
  try {
    await DewMessageBox.confirm(
      `确定撤回「${row.title}」吗？撤回后处理端不再跟进（记录保留，可重新打开）。`, '撤回反馈', {
        confirmText: '撤回',
        cancelText: '取消',
      })
  } catch {
    return
  }
  try {
    const res = await api({ url: `/feedback-tickets/${row.id}/withdraw`, method: 'post' })
    if (res.data.code === 200) {
      ElMessage.success('已撤回')
      fetchFeedbacks()
    } else {
      ElMessage.error(res.data.message || '撤回失败')
    }
  } catch {
    ElMessage.error('网络错误，撤回失败')
  }
}

// 重新打开（已解决/已关闭后问题仍存在）
const confirmReopen = async (row) => {
  try {
    await DewMessageBox.confirm(
      `重新打开「${row.title}」？该反馈将回到处理队列。`, '重新打开', {
        confirmText: '重新打开',
        cancelText: '取消',
      })
  } catch {
    return
  }
  try {
    const res = await api({ url: `/feedback-tickets/${row.id}/reopen`, method: 'post', data: {} })
    if (res.data.code === 200) {
      ElMessage.success('已重新打开')
      fetchFeedbacks()
    } else {
      ElMessage.error(res.data.message || '操作失败')
    }
  } catch {
    ElMessage.error('网络错误，操作失败')
  }
}

const formatDateTime = (s) => {
  if (!s) return '-'
  const date = new Date(s.includes('T') ? `${s}+08:00` : s.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return s
  return date.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

onMounted(() => {
  fetchFeedbacks()
})
</script>

<style scoped>
.uc-feedbacks {
  width: 100%;
  min-width: 0;
}

.feedbacks-card {
  width: 100%;
}

/* 头部：标题 + 副标题 */
.fb-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fb-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--dew-text-heading);
}

.fb-subtitle {
  font-size: 13px;
  color: var(--dew-text-muted);
}

/* el-table 变量映射到 DewUI token：让表格在玻璃卡上 + 亮/暗都正确 */
.fb-table-wrap {
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: var(--dew-card-inset-bg);
  --el-table-header-text-color: var(--dew-text-heading);
  --el-table-text-color: var(--dew-text);
  --el-table-border-color: var(--dew-card-divider);
  --el-table-border: 1px solid var(--dew-card-divider);
  --el-table-row-hover-bg-color: var(--dew-ghost-hover-bg);
  --el-fill-color-light: var(--dew-card-inset-bg);
  --el-fill-color-blank: transparent;
}

.fb-table-wrap :deep(.el-table) {
  background: transparent;
}

.fb-table-wrap :deep(.el-table th.el-table__cell) {
  background: var(--dew-card-inset-bg) !important;
  font-weight: 600;
}

.fb-table-wrap :deep(.el-table .el-table__cell) {
  border-bottom-color: var(--dew-card-divider);
}

/* 单元格文本 */
.cell-content {
  line-height: 1.4;
  font-size: 13px;
  word-wrap: break-word;
  word-break: break-word;
  white-space: pre-wrap;
}

.title-cell {
  font-weight: 600;
  color: var(--dew-text-heading);
  max-width: 110px;
}

.content-cell {
  color: var(--dew-text);
  max-height: 60px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
}

.time-cell {
  font-size: 12px;
  color: var(--dew-text-faint);
  max-width: 130px;
}

.muted {
  color: var(--dew-text-faint);
  font-size: 12px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 56px 0;
  color: var(--dew-text-faint);
}

.empty-icon {
  font-size: 40px;
  color: var(--dew-text-faint);
}

.empty-text {
  font-size: 14px;
}

/* 详情对话框内容 */
.feedback-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.detail-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--dew-text-heading);
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.detail-item.column {
  flex-direction: column;
}

.detail-item label {
  font-weight: 600;
  color: var(--dew-text-heading);
  min-width: 80px;
  flex-shrink: 0;
}

.detail-item span,
.detail-item .content {
  color: var(--dew-text);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.images-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 公开回复时间线 */
.msg-timeline {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.msg-row {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--dew-card-inset-bg);
}

.msg-row.staff {
  background: rgba(var(--dew-primary-rgb, 99, 102, 241), 0.08);
}

.msg-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 4px;
}

.msg-meta b {
  color: var(--dew-text-heading);
}

.msg-body {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--dew-text);
  white-space: pre-wrap;
  word-break: break-word;
}

/* 回复框 */
.reply-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.reply-box :deep(.dew-input) {
  width: 100%;
}

@media (max-width: 768px) {
  .fb-title {
    font-size: 16px;
  }
}
</style>
