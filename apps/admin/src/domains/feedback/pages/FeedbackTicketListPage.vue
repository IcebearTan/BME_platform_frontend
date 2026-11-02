<template>
  <div class="ticket-list-page selectable">
    <div class="page-header">
      <div><div class="page-title">用户反馈工单</div><p class="ticket-hint">先受理分派，再推进处理；待用户补充与已完成工单单独查看。</p></div>
      <DewButton :loading="loading" @click="refresh">刷新</DewButton>
    </div>
    <nav class="ticket-queues" aria-label="工单处理队列">
      <button v-for="queue in QUEUES" :key="queue.value" type="button" :aria-pressed="query.queue === queue.value"
        :class="{ selected: query.queue === queue.value }" @click="chooseQueue(queue.value)">
        <span>{{ queue.label }}</span><b>{{ queueCount(queue) }}</b>
      </button>
    </nav>
    <p v-if="statsError" class="ticket-hint">队列统计暂不可用，列表仍可正常查询。</p>
    <DewCard no-hover>
      <el-form :inline="true" class="form-inline ticket-filters" @submit.prevent="applyFilters">
        <el-form-item label="关键词"><el-input v-model="query.q" clearable placeholder="标题/描述关键词" @keyup.enter="applyFilters" @clear="applyFilters" /></el-form-item>
        <el-form-item label="状态"><el-select v-model="query.status" clearable placeholder="全部状态" @change="chooseStatus">
          <el-option v-for="(meta, key) in STATUS_META" :key="key" :value="key" :label="meta.label" />
        </el-select></el-form-item>
        <el-form-item label="类型"><el-select v-model="query.category" clearable placeholder="全部类型" @change="applyFilters">
          <el-option v-for="(label, key) in CATEGORY_LABELS" :key="key" :value="key" :label="label" />
        </el-select></el-form-item>
        <el-form-item label="优先级"><el-select v-model="query.priority" clearable placeholder="全部优先级" @change="applyFilters">
          <el-option v-for="(label, key) in PRIORITY_LABELS" :key="key" :value="key" :label="label" />
        </el-select></el-form-item>
        <el-form-item label="处理人"><el-select v-model="query.assignee" placeholder="全部处理人" @change="applyFilters">
          <el-option label="全部处理人" value="" /><el-option label="只看我的" value="mine" /><el-option label="尚未分派" value="unassigned" />
        </el-select></el-form-item>
        <el-form-item><DewButton @click="applyFilters">查询</DewButton><DewButton type="ghost" @click="resetFilters">重置</DewButton></el-form-item>
      </el-form>
    </DewCard>
    <el-alert v-if="error" :title="error" type="error" :closable="false"><DewButton size="sm" @click="fetchRows">重试</DewButton></el-alert>
    <DewCard no-hover class="table-card">
      <div class="ticket-table-scroll">
        <el-table :data="rows" v-loading="loading" @row-click="goDetail" row-key="id" row-class-name="clickable-row"
          :empty-text="error ? '工单加载失败，请重试' : '当前筛选下没有工单'">
          <el-table-column label="#" prop="id" width="70" />
          <el-table-column label="问题" min-width="250">
            <template #default="{ row }"><div class="ticket-title">{{ row.title }}</div>
              <span class="ticket-hint">{{ CATEGORY_LABELS[row.category] || row.category }}<span v-if="row.attachment_count"> · {{ row.attachment_count }} 个附件</span><span v-if="row.message_count"> · {{ row.message_count }} 条沟通</span></span>
            </template>
          </el-table-column>
          <el-table-column label="提交人" prop="reporter_name" width="110" />
          <el-table-column label="优先级" width="90"><template #default="{ row }"><el-tag :type="PRIORITY_TYPES[row.priority] || 'info'" effect="plain">{{ PRIORITY_LABELS[row.priority] || row.priority }}</el-tag></template></el-table-column>
          <el-table-column label="处理进度" width="120"><template #default="{ row }"><el-tag :type="STATUS_META[row.status]?.tag || 'info'">{{ STATUS_META[row.status]?.label || row.status }}</el-tag></template></el-table-column>
          <el-table-column label="处理人" width="120"><template #default="{ row }"><span :class="{ 'ticket-unassigned': !row.assignee_user_id }">{{ row.assignee_name || '待分派' }}</span></template></el-table-column>
          <el-table-column label="最近更新" width="155"><template #default="{ row }">{{ formatTime(row.updated_at || row.created_at) }}</template></el-table-column>
          <el-table-column label="操作" width="90" fixed="right"><template #default="{ row }"><el-button link type="primary" @click.stop="goDetail(row)">{{ ['resolved', 'closed', 'rejected'].includes(row.status) ? '查看' : '处理' }}</el-button></template></el-table-column>
        </el-table>
      </div>
      <div class="pagination-wrapper"><el-pagination :current-page="page" :page-size="15" :total="total" layout="total, prev, pager, next" @current-change="changePage" /></div>
    </DewCard>
  </div>
</template>

<script setup>
import { onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DewButton, DewCard } from '@bme/dew-ui'
import { feedbackService, feedbackError } from '../service'
import { STATUS_META, CATEGORY_LABELS, PRIORITY_LABELS, PRIORITY_TYPES, QUEUES, formatTime } from '../presentation'

const route = useRoute()
const router = useRouter()
const query = reactive({ q: '', status: '', category: '', priority: '', assignee: '', queue: '' })
const page = ref(1)
const rows = ref([])
const loading = ref(false)
const error = ref('')
const total = ref(0)
const counts = ref(null)
const statsError = ref(false)
let sequence = 0
let statsSequence = 0
const queueCount = queue => counts.value ? queue.statuses.reduce((sum, status) => sum + (counts.value[status] || 0), 0) : '—'

async function fetchRows() {
  const request = ++sequence
  loading.value = true
  error.value = ''
  try {
    const result = await feedbackService.list({ ...Object.fromEntries(Object.entries(query).filter(([, value]) => value)), page: page.value, page_size: 15 })
    if (request !== sequence) return
    rows.value = result.tickets || []
    total.value = result.total ?? 0
  } catch (failure) {
    if (request === sequence) { error.value = feedbackError(failure); rows.value = []; total.value = 0 }
  } finally { if (request === sequence) loading.value = false }
}
async function fetchStats() {
  const request = ++statsSequence
  try {
    const result = await feedbackService.stats()
    if (request === statsSequence) { counts.value = result.data?.by_status || null; statsError.value = !counts.value }
  } catch { if (request === statsSequence) statsError.value = true }
}
function syncUrl() {
  const next = Object.fromEntries(Object.entries(query).filter(([, value]) => value))
  if (page.value > 1) next.page = String(page.value)
  if (JSON.stringify(next) === JSON.stringify(route.query)) fetchRows()
  else router.replace({ query: next })
}
function applyFilters() { page.value = 1; syncUrl() }
function chooseQueue(value) { query.queue = value; query.status = ''; applyFilters() }
function chooseStatus() { query.queue = ''; applyFilters() }
function resetFilters() { Object.keys(query).forEach(key => { query[key] = '' }); applyFilters() }
function changePage(value) { page.value = value; syncUrl() }
function refresh() { fetchRows(); fetchStats() }
function goDetail(row) { router.push({ name: 'operations.feedbackTicketDetail', params: { ticketId: row.id }, query: { ...route.query } }) }
watch(() => route.query, value => {
  Object.keys(query).forEach(key => { query[key] = typeof value[key] === 'string' ? value[key] : '' })
  page.value = Math.max(1, Number(value.page) || 1)
  fetchRows()
}, { immediate: true })
fetchStats()
onBeforeUnmount(() => { sequence += 1; statsSequence += 1 })
</script>

<style scoped>
.ticket-list-page { display: flex; flex-direction: column; gap: var(--spacing-md); min-width: 0; }
.ticket-hint { color: var(--text-secondary); font-size: var(--text-sm); margin: var(--spacing-xs) 0 0; line-height: 1.5; }
.ticket-queues { display: flex; flex-wrap: wrap; gap: var(--spacing-sm); }
.ticket-queues button { display: flex; align-items: center; gap: var(--spacing-md); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: var(--spacing-sm) var(--spacing-md); color: var(--text-primary); background: var(--surface-solid); cursor: pointer; font: inherit; }
.ticket-queues button.selected { border-color: var(--primary-color); background: var(--dew-ghost-hover-bg); }
.ticket-queues button:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
.ticket-filters { gap: var(--spacing-sm); flex-wrap: wrap; }
.ticket-filters :deep(.el-select) { width: 140px; }
.table-card :deep(.dew-card__body) { padding: 0; }
.ticket-table-scroll { min-width: 0; overflow-x: auto; }
.table-card :deep(.clickable-row) { cursor: pointer; }
.ticket-title { font-weight: 600; overflow-wrap: anywhere; }
.ticket-unassigned { color: var(--warning-color); }
@media (max-width: 768px) { .ticket-queues button { flex: 1 1 100px; justify-content: space-between; } .ticket-filters :deep(.el-form-item) { width: 100%; } .ticket-filters :deep(.el-form-item__content), .ticket-filters :deep(.el-select) { min-width: 0; width: 100%; } }
</style>
