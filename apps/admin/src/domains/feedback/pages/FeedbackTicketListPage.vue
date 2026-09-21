<template>
  <div class="ticket-list-page">
    <div class="page-header">
      <div class="page-title">用户反馈工单</div>
      <div class="header-actions">
        <el-form :inline="true" class="form-inline" @submit.prevent>
          <el-form-item>
            <el-input v-model="query.q" clearable placeholder="标题/描述关键词" style="width: 180px;"
              @keyup.enter="applyFilters" @clear="applyFilters" />
          </el-form-item>
          <el-form-item>
            <el-select v-model="query.status" clearable placeholder="全部状态" style="width: 130px;" @change="applyFilters">
              <el-option v-for="(m, s) in STATUS_META" :key="s" :label="m.label" :value="s" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="query.category" clearable placeholder="全部类型" style="width: 120px;" @change="applyFilters">
              <el-option v-for="(label, c) in CATEGORY_LABELS" :key="c" :label="label" :value="c" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-select v-model="query.priority" clearable placeholder="全部优先级" style="width: 120px;" @change="applyFilters">
              <el-option v-for="(label, p) in PRIORITY_LABELS" :key="p" :label="label" :value="p" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button @click="applyFilters">查询</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <DewCard no-hover class="table-card">
      <el-table :data="rows" v-loading="loading" @row-click="goDetail"
        row-class-name="clickable-row" row-key="id" highlight-current-row>
        <el-table-column label="#" prop="id" width="64" />
        <el-table-column label="标题" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.title }}</span>
            <el-tag v-if="row.attachment_count" size="small" type="info" effect="plain" style="margin-left: 6px;">图</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交人" prop="reporter_name" width="100" />
        <el-table-column label="类型" width="90" align="center">
          <template #default="{ row }">{{ CATEGORY_LABELS[row.category] || row.category }}</template>
        </el-table-column>
        <el-table-column label="优先级" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="PRIORITY_META[row.priority]?.tag || 'info'" size="small" effect="plain">
              {{ PRIORITY_LABELS[row.priority] || row.priority }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="STATUS_META[row.status]?.tag || 'info'" size="small">
              {{ STATUS_META[row.status]?.label || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="处理人" width="100">
          <template #default="{ row }">{{ row.assignee_name || '—' }}</template>
        </el-table-column>
        <el-table-column label="提交时间" width="150">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click.stop="goDetail(row)">处理</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total"
          layout="total, prev, pager, next" @current-change="fetch" />
      </div>
    </DewCard>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DewCard } from '@bme/dew-ui'
import api from '../../../api'

const route = useRoute()
const router = useRouter()

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
const PRIORITY_LABELS = { low: '低', medium: '中', high: '高', urgent: '紧急' }
const PRIORITY_META = {
  low: { tag: 'info' }, medium: { tag: 'primary' },
  high: { tag: 'warning' }, urgent: { tag: 'danger' },
}

const rows = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = 15
const total = ref(0)
// ?status= 深链预置（工作台待办跳转）
const query = reactive({
  q: route.query.q || '',
  status: route.query.status || '',
  category: route.query.category || '',
  priority: '',
})

async function fetch() {
  loading.value = true
  try {
    const res = await api.get('/admin/feedback-tickets', { params: {
      page: page.value, page_size: pageSize,
      q: query.q.trim() || undefined,
      status: query.status || undefined,
      category: query.category || undefined,
      priority: query.priority || undefined,
    } })
    rows.value = res.data?.tickets || []
    total.value = res.data?.total ?? 0
  } catch (e) {
    rows.value = []
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  page.value = 1
  fetch()
}

function goDetail(row) {
  router.push({ name: 'operations.feedbackTicketDetail', params: { ticketId: row.id } })
}

const formatTime = (s) => (s ? s.slice(0, 16).replace('T', ' ') : '')

onMounted(fetch)
</script>

<style scoped>
.ticket-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table-card :deep(.dew-card__body) {
  padding: 0;
}

.table-card :deep(.clickable-row) {
  cursor: pointer;
}
</style>
