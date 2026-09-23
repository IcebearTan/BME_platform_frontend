<template>
  <div class="selectable work-items-page">
    <div class="page-header">
      <div>
        <div class="page-title">平台待办</div>
        <div class="muted">只读汇总，处理操作仍在各业务页面完成</div>
      </div>
      <div class="header-actions">
        <el-button :loading="loading" @click="fetchItems">刷新</el-button>
      </div>
    </div>

    <div class="scope-bar" aria-label="待办范围">
      <el-radio-group :model-value="filters.scope" @change="setFilter('scope', $event)">
        <el-radio-button label="all">全部</el-radio-button>
        <el-radio-button label="mine">我负责</el-radio-button>
        <el-radio-button label="unassigned">未分配</el-radio-button>
        <el-radio-button label="overdue">逾期</el-radio-button>
      </el-radio-group>
      <span v-if="filters.scope === 'overdue'" class="muted">待办时效规则尚未配置，暂不判定逾期</span>
    </div>

    <div class="filter-bar">
      <el-select :model-value="filters.type" clearable placeholder="全部类型" @change="setFilter('type', $event || '')">
        <el-option v-for="item in TYPE_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select :model-value="filters.camp_id" clearable filterable placeholder="全部营期" @change="setFilter('camp_id', $event || '')">
        <el-option v-for="camp in camps" :key="camp.id" :label="camp.name" :value="String(camp.id)" />
      </el-select>
      <span v-if="asOf" class="muted">更新于 {{ formatTime(asOf) }}</span>
    </div>

    <DewCard no-hover class="table-card">
      <div v-if="error" class="state-message">
        待办数据暂不可用
        <el-button type="primary" link @click="fetchItems">重试</el-button>
      </div>
      <template v-else>
        <el-table :data="items" v-loading="loading" row-key="key" class="items-table">
          <el-table-column label="事项" min-width="240">
            <template #default="{ row }">
              <div class="item-title">{{ row.title }}</div>
              <div class="muted">{{ TYPE_LABELS[row.type] || row.type }} · #{{ row.source_id }}</div>
            </template>
          </el-table-column>
          <el-table-column label="营期" min-width="140">
            <template #default="{ row }">{{ row.camp_name || '平台级' }}</template>
          </el-table-column>
          <el-table-column label="负责人" min-width="110">
            <template #default="{ row }">
              {{ row.responsible_name || (row.type === 'quota_request' ? '平台队列' : '未分配') }}
            </template>
          </el-table-column>
          <el-table-column label="进入队列" min-width="145">
            <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="90">
            <template #default="{ row }">
              <el-button type="primary" link @click="openItem(row)">去处理</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="!loading && !items.length" class="state-message">
          {{ filters.scope === 'overdue' ? '尚未配置待办时效规则' : '当前筛选下没有待处理事项' }}
        </div>
        <div class="pagination-wrapper">
          <el-pagination :current-page="filters.page" :page-size="20" :total="total"
            layout="total, prev, pager, next" @current-change="setFilter('page', $event)" />
        </div>
      </template>
    </DewCard>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DewCard } from '@bme/dew-ui'
import api from '../../api'

const route = useRoute()
const router = useRouter()
const TYPE_OPTIONS = [
  { value: 'camp_join', label: '营期加入申请' },
  { value: 'camp_leave', label: '营期请假' },
  { value: 'project_application', label: '项目申报' },
  { value: 'project_delivery', label: '交付审核' },
  { value: 'quota_request', label: 'API 配额申请' },
  { value: 'feedback_ticket', label: '反馈工单' },
]
const TYPE_LABELS = Object.fromEntries(TYPE_OPTIONS.map((item) => [item.value, item.label]))
const validScopes = new Set(['all', 'mine', 'unassigned', 'overdue'])
const filters = computed(() => ({
  scope: validScopes.has(route.query.scope) ? route.query.scope : 'all',
  type: TYPE_LABELS[route.query.type] ? route.query.type : '',
  camp_id: /^\d+$/.test(String(route.query.camp_id || '')) ? String(route.query.camp_id) : '',
  page: Math.max(1, Number.parseInt(route.query.page, 10) || 1),
}))
const items = ref([])
const total = ref(0)
const asOf = ref('')
const camps = ref([])
const loading = ref(false)
const error = ref(false)
let requestSerial = 0

function formatTime(value) {
  return value ? String(value).slice(0, 16).replace('T', ' ') : '—'
}

function setFilter(key, value) {
  const query = { ...route.query, [key]: value || undefined }
  if (key !== 'page') query.page = undefined
  router.replace({ path: route.path, query })
}

async function fetchItems() {
  const serial = ++requestSerial
  loading.value = true
  error.value = false
  try {
    const res = await api.get('/admin/workbench/items', { params: {
      scope: filters.value.scope,
      type: filters.value.type || undefined,
      camp_id: filters.value.camp_id || undefined,
      page: filters.value.page,
      page_size: 20,
    } })
    if (serial !== requestSerial) return
    if (res.data?.code !== 200 || !Array.isArray(res.data?.data?.items)) {
      throw new Error('待办接口返回无效数据')
    }
    items.value = res.data.data.items
    total.value = res.data.data.total || 0
    asOf.value = res.data?.data?.as_of || ''
    if (!items.value.length && total.value > 0 && filters.value.page > 1) {
      setFilter('page', Math.ceil(total.value / 20))
    }
  } catch {
    if (serial !== requestSerial) return
    items.value = []
    total.value = 0
    error.value = true
  } finally {
    if (serial === requestSerial) loading.value = false
  }
}

function openItem(item) {
  router.push({ path: item.target_route, query: item.target_query || {} })
}

watch(() => route.fullPath, fetchItems)
onMounted(() => {
  fetchItems()
  api.get('/admin/workbench/summary').then((res) => {
    camps.value = res.data?.data?.pending_camps || []
  }).catch(() => {})
})
</script>

<style scoped>
.work-items-page { display: flex; flex-direction: column; gap: 16px; }
.scope-bar, .filter-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.filter-bar :deep(.el-select) { width: 190px; }
.muted { color: var(--text-secondary); font-size: 12px; }
.item-title { font-weight: 600; color: var(--text-primary); }
.state-message { padding: 24px; text-align: center; color: var(--text-secondary); }
.table-card :deep(.dew-card__body) { padding: 0; }
</style>
