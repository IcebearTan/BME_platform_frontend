<script setup>
// 运行记录：提醒 / AI 录入两类元数据列表。筛选条件全部保留在 URL query
//（唯一真相源，WorkItemsPage 范式：setFilter + watch fullPath + requestSerial
// 防过期响应）；详情用 el-drawer（元数据复核，无任何私人内容——服务端白名单
// 已排除，前端不渲染未下发字段）。NULL 一律显示「未采集/未知」。
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { DewCard, DewTag } from '@bme/dew-ui'
import {
  scheduleAdminService, ERROR_CODE_LABELS, REMINDER_STATUS_META,
  CAPTURE_STATUS_META, REASON_LABELS,
} from '../scheduleAdminService'

const route = useRoute()
const router = useRouter()

const TYPE_META = {
  reminder: { label: '提醒记录', buckets: [
    { value: '', label: '全部' }, { value: 'overdue', label: '到期未投' }, { value: 'exhausted', label: '重试耗尽' }] },
  capture: { label: 'AI 录入', buckets: [
    { value: '', label: '全部' }, { value: 'stalled', label: '处理停滞' }] },
}

// ── 筛选：URL query 唯一真相源 ──
const filters = computed(() => {
  const type = route.query.type === 'capture' ? 'capture' : 'reminder'
  return {
    type,
    bucket: typeof route.query.bucket === 'string' ? route.query.bucket : '',
    status: typeof route.query.status === 'string' ? route.query.status : '',
    id: typeof route.query.id === 'string' && /^\d+$/.test(route.query.id) ? route.query.id : '',
    page: Math.max(1, parseInt(route.query.page, 10) || 1),
    from: typeof route.query.from === 'string' ? route.query.from : '',
    to: typeof route.query.to === 'string' ? route.query.to : '',
  }
})

function setFilter(key, value) {
  const query = { ...route.query, [key]: value || undefined }
  if (key !== 'page') query.page = undefined
  if (key === 'type') { query.bucket = undefined; query.status = undefined }
  router.replace({ path: route.path, query })
}

const setFilterQuiet = (key, value) => setFilter(key, value)
const idInput = ref('')
watch(() => filters.value.id, (v) => { idInput.value = v }, { immediate: true })
function applyId() { setFilter('id', idInput.value.trim()) }

// ── 取数（requestSerial 防过期响应覆盖） ──
const rows = ref([])
const total = ref(0)
const pageSize = 20
const loading = ref(false)
const loadState = ref('loading')      // loading | ready | error
let requestSerial = 0

watch(() => route.fullPath, fetchRows, { immediate: true })

async function fetchRows() {
  const serial = ++requestSerial
  loading.value = true
  loadState.value = 'loading'
  const f = filters.value
  const params = { page: f.page, page_size: pageSize }
  if (f.bucket) params.bucket = f.bucket
  if (f.status) params.status = f.status
  if (f.id) params.id = f.id
  if (f.from) params.from = f.from
  if (f.to) params.to = f.to
  try {
    const service = f.type === 'capture' ? scheduleAdminService.fetchCaptures : scheduleAdminService.fetchReminders
    const data = await service(params)
    if (serial !== requestSerial) return
    rows.value = data.items || []
    total.value = data.total || 0
    loadState.value = 'ready'
  } catch (err) {
    if (serial !== requestSerial) return
    rows.value = []
    total.value = 0
    loadState.value = 'error'
    ElMessage.error(err.message || '记录加载失败')
  } finally {
    if (serial === requestSerial) loading.value = false
  }
}

const pages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
function turnPage(delta) {
  setFilter('page', String(filters.value.page + delta))
}

// ── 详情抽屉 ──
const drawerVisible = ref(false)
const detail = ref(null)
const detailLoading = ref(false)

async function openDetail(row) {
  drawerVisible.value = true
  detailLoading.value = true
  detail.value = null
  try {
    const fetcher = filters.value.type === 'capture'
      ? scheduleAdminService.fetchCapture : scheduleAdminService.fetchReminder
    detail.value = await fetcher(row.id)
  } catch (err) {
    ElMessage.error(err.message || '详情加载失败')
    drawerVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

const DETAIL_FIELDS = {
  reminder: [
    ['id', '提醒 ID'], ['user_id', '用户 ID'], ['target_type', '目标类型'], ['target_id', '目标 ID'],
    ['target_version', '目标版本（物料化时）'], ['target_alive', '目标当前存在'],
    ['target_current_version', '目标当前版本'], ['kind', '提醒种类'], ['trigger_at', '触发时间'],
    ['status', '状态'], ['status_reason_code', '失效原因码'], ['notification_id', '生成通知 ID'],
    ['delivered_at', '投递时间'], ['attempts', '失败尝试次数'], ['next_retry_at', '下次重试时间'],
    ['last_error_code', '错误码'], ['created_at', '创建时间'], ['updated_at', '更新时间'],
  ],
  capture: [
    ['id', '录入 ID'], ['user_id', '用户 ID'], ['request_id', '幂等键'], ['input_type', '输入类型'],
    ['status', '状态'], ['error_code', '错误码'], ['created_at', '创建时间'],
    ['started_at', '开始处理'], ['finished_at', '完成处理'], ['elapsed_ms', '处理耗时(ms)'],
    ['created_count', '已创建事项'], ['clarify_count', '待补充事项'], ['failed_count', '失败事项'],
    ['items_total', '事项总数'], ['plan_ids', '关联方案 ID'], ['updated_at', '更新时间'],
  ],
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '未知'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (Array.isArray(value)) return value.join(', ') || '无'
  return String(value)
}
</script>

<template>
  <div class="records-panel">
    <div class="page-header">
      <div class="header-actions">
        <el-form :inline="true" class="form-inline" @submit.prevent>
          <el-form-item label="类型">
            <el-radio-group :model-value="filters.type" size="small"
              @update:model-value="(v) => setFilter('type', v)">
              <el-radio-button value="reminder">{{ TYPE_META.reminder.label }}</el-radio-button>
              <el-radio-button value="capture">{{ TYPE_META.capture.label }}</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="分组">
            <el-select :model-value="filters.bucket" size="small" style="width: 130px"
              @update:model-value="(v) => setFilterQuiet('bucket', v)">
              <el-option v-for="b in TYPE_META[filters.type].buckets" :key="b.value"
                :label="b.label" :value="b.value" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="filters.type === 'reminder'" label="状态">
            <el-select :model-value="filters.status" size="small" style="width: 120px"
              @update:model-value="(v) => setFilterQuiet('status', v)">
              <el-option label="全部" value="" />
              <el-option v-for="(meta, key) in REMINDER_STATUS_META" :key="key"
                :label="meta.label" :value="key" />
            </el-select>
          </el-form-item>
          <el-form-item v-else label="状态">
            <el-select :model-value="filters.status" size="small" style="width: 120px"
              @update:model-value="(v) => setFilterQuiet('status', v)">
              <el-option label="全部" value="" />
              <el-option v-for="(meta, key) in CAPTURE_STATUS_META" :key="key"
                :label="meta.label" :value="key" />
            </el-select>
          </el-form-item>
          <el-form-item label="编号">
            <el-input v-model="idInput" size="small" placeholder="精确 ID"
              style="width: 130px" @keyup.enter="applyId" />
          </el-form-item>
        </el-form>
      </div>
    </div>

    <DewCard no-hover class="table-card">
      <!-- 表体高度由 el-table max-height prop 内滚（视口锚定），卡片不定高裁切 -->
      <el-table v-if="filters.type === 'reminder'" v-loading="loading" :data="rows" size="small"
        row-class-name="clickable-row" max-height="calc(100vh - 320px)" @row-click="openDetail">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="user_id" label="用户" width="80" />
        <el-table-column prop="target_type" label="目标" width="90">
          <template #default="{ row }">{{ row.target_type }}#{{ row.target_id }}</template>
        </el-table-column>
        <el-table-column prop="kind" label="种类" width="70" />
        <el-table-column prop="trigger_at" label="触发时间" min-width="150" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <DewTag :type="(REMINDER_STATUS_META[row.status] || {}).tag || 'info'" size="sm">
              {{ (REMINDER_STATUS_META[row.status] || {}).label || row.status }}
            </DewTag>
          </template>
        </el-table-column>
        <el-table-column label="原因" width="110">
          <template #default="{ row }">
            <span class="cell-muted">{{ REASON_LABELS[row.status_reason_code] || row.status_reason_code || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="attempts" label="失败次数" width="90" align="center" />
        <el-table-column prop="delivered_at" label="投递时间" min-width="150" show-overflow-tooltip>
          <template #default="{ row }"><span class="cell-muted">{{ row.delivered_at || '—' }}</span></template>
        </el-table-column>
      </el-table>

      <el-table v-else v-loading="loading" :data="rows" size="small"
        row-class-name="clickable-row" max-height="calc(100vh - 320px)" @row-click="openDetail">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="user_id" label="用户" width="80" />
        <el-table-column prop="input_type" label="输入" width="70" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <DewTag :type="(CAPTURE_STATUS_META[row.status] || {}).tag || 'info'" size="sm">
              {{ (CAPTURE_STATUS_META[row.status] || {}).label || row.status }}
            </DewTag>
          </template>
        </el-table-column>
        <el-table-column label="错误" width="150">
          <template #default="{ row }">
            <span class="cell-muted">{{ ERROR_CODE_LABELS[row.error_code] || row.error_code || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建" min-width="150" show-overflow-tooltip />
        <el-table-column label="耗时" width="90" align="center">
          <template #default="{ row }">
            <span class="cell-muted">{{ row.elapsed_ms == null ? '未采集' : row.elapsed_ms }}</span>
          </template>
        </el-table-column>
        <el-table-column label="事项(建/补/败)" width="110" align="center">
          <template #default="{ row }">
            <span class="cell-muted">{{ row.created_count ?? '—' }}/{{ row.clarify_count ?? '—' }}/{{ row.failed_count ?? '—' }}</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination layout="total, prev, pager, next" :total="total" :page-size="pageSize"
          :current-page="filters.page" @current-change="(p) => setFilter('page', String(p))" />
      </div>
    </DewCard>

    <el-drawer v-model="drawerVisible" title="元数据详情" size="420px" direction="rtl" destroy-on-close>
      <div v-loading="detailLoading" class="drawer-body">
        <template v-if="detail">
          <div v-for="[key, label] in DETAIL_FIELDS[filters.type]" :key="key" class="detail-row">
            <span class="detail-label">{{ label }}</span>
            <span class="detail-value">{{ displayValue(detail[key]) }}</span>
          </div>
          <p class="detail-note">以上为脱敏元数据。为保护用户隐私，原文、标题、结构化内容与原始错误不做展示。</p>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.table-card :deep(.dew-card__body) { padding: 0; }
.table-card :deep(.clickable-row) { cursor: pointer; }

.cell-muted {
  color: var(--text-secondary, var(--text-primary));
  font-variant-numeric: tabular-nums;
}

.drawer-body {
  padding: 0 4px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
  border-bottom: 1px solid var(--border-light, rgba(0, 0, 0, 0.06));
  font-size: 13px;
}

.detail-label {
  color: var(--text-secondary, var(--text-primary));
  white-space: nowrap;
}

.detail-value {
  text-align: right;
  font-variant-numeric: tabular-nums;
  word-break: break-all;
}

.detail-note {
  margin-top: 14px;
  font-size: 12px;
  color: var(--text-faint, var(--text-secondary));
  line-height: 1.6;
}
</style>
