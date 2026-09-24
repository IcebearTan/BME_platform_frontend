<script setup>
// 运行概览：更新时间/时区 → 需处理异常 → 四指标 → 三服务卡。
// 页面可见时 30s 轮询；子域 unavailable 显示「暂不可用」而非 0（口径见后端
// admin_queries.build_overview）。意图/排程卡为请求驱动观测（最近完成时刻）。
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { DewCard, DewTag } from '@bme/dew-ui'
import { scheduleAdminService, SERVICE_STATE_META } from '../scheduleAdminService'

const router = useRouter()
const overview = ref(null)
const loading = ref(true)

async function fetchOverview() {
  try {
    overview.value = await scheduleAdminService.fetchOverview()
  } catch (err) {
    ElMessage.error(err.message || '概览加载失败')
  } finally {
    loading.value = false
  }
}

let pollTimer = null
onMounted(() => {
  fetchOverview()
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible') fetchOverview()
  }, 30000)
})
onUnmounted(() => clearInterval(pollTimer))

const unavailable = (key) => overview.value?.source_status?.[key] === 'unavailable'
const cell = (key, value, suffix) => (
  unavailable(key) ? { text: '暂不可用', muted: true } : { text: value ?? 0, suffix })
const metrics = computed(() => {
  const m = overview.value?.metrics || {}
  const backlog = m.reminder_backlog || {}
  const manual = m.manual_review || {}
  return [
    { key: 'capture_users_today', label: '今日 AI 录入用户',
      ...cell('capture_users', m.capture_users_today, ' 人') },
    { key: 'backlog', label: '到期未生成通知',
      ...cell('reminder_backlog', backlog.total ?? 0, ' 条'),
      detail: unavailable('reminder_backlog') ? null
        : `待处理 ${backlog.pending ?? 0} · 可自动重试 ${backlog.retryable ?? 0} · 重试耗尽 ${backlog.exhausted ?? 0}` },
    { key: 'manual', label: '需人工排查',
      ...cell('manual_review', manual.total ?? 0, ' 项'),
      detail: unavailable('manual_review') ? null
        : `重试耗尽提醒 ${manual.exhausted_reminders ?? 0} · 停滞录入 ${manual.stalled_captures ?? 0}` },
    { key: 'status_dist', label: '今日请求状态分布', muted: unavailable('capture_status'),
      text: unavailable('capture_status') ? '暂不可用'
        : Object.entries(m.capture_status_today || {}).map(([k, v]) => `${statusLabel(k)} ${v}`).join(' · ') || '今日无录入' },
  ]
})

function statusLabel(status) {
  return ({ pending: '排队', processing: '处理中', done: '完成', failed: '失败',
            clarify_needed: '待补充' })[status] || status
}

const services = computed(() => {
  const s = overview.value?.services || {}
  return [
    { key: 'reminder_scan', label: '提醒扫描', ...s.reminder_scan,
      observed: '周期扫描心跳' },
    { key: 'intent', label: 'AI 理解', ...s.intent,
      observed: s.intent?.last_finished_at ? `最近完成 ${s.intent.last_finished_at}` : '尚无完成记录' },
    { key: 'planner', label: '自动排程', ...s.planner,
      observed: s.planner?.last_applied_at ? `最近应用 ${s.planner.last_applied_at}` : '尚无应用记录' },
  ]
})

const risks = computed(() => overview.value?.risks || [])

const RISK_LINKS = {
  schedule_scan_stale: { tab: 'records', type: 'reminder', bucket: 'overdue' },
  schedule_reminder_exhausted: { tab: 'records', type: 'reminder', bucket: 'exhausted' },
  schedule_capture_stalled: { tab: 'records', type: 'capture', bucket: 'stalled' },
}

function goRisk(risk) {
  const link = RISK_LINKS[risk.rule]
  if (link) router.push({ path: '/operations/schedule', query: link })
}
</script>

<template>
  <div class="overview-panel">
    <div v-if="overview" class="meta-row">
      <span class="meta-text">更新于 {{ overview.as_of }}（时区 {{ overview.timezone }}）</span>
      <el-button size="small" text :icon="Refresh" @click="fetchOverview">刷新</el-button>
    </div>

    <!-- 需处理异常 -->
    <DewCard v-if="risks.length" size="md" divided>
      <template #header><span class="card-head warn">需处理异常</span></template>
      <div v-for="r in risks" :key="r.rule" class="risk-row" @click="goRisk(r)">
        <el-tag type="danger" size="small">{{ r.count }}</el-tag>
        <span class="risk-detail">{{ r.detail }}</span>
        <span class="risk-link">查看记录</span>
      </div>
    </DewCard>

    <!-- 四指标 -->
    <div class="metric-grid">
      <DewCard v-for="m in metrics" :key="m.key" size="md">
        <div class="metric-label">{{ m.label }}</div>
        <div class="metric-value" :class="{ 'is-muted': m.muted }">
          {{ m.text }}<span v-if="m.suffix" class="metric-suffix">{{ m.suffix }}</span>
        </div>
        <div v-if="m.detail" class="metric-detail">{{ m.detail }}</div>
      </DewCard>
    </div>

    <!-- 三服务卡 -->
    <DewCard size="md" divided>
      <template #header><span class="card-head">服务运行状态</span></template>
      <el-table v-loading="loading && !overview" :data="services" size="small"
        max-height="calc(100vh - 560px)">
        <el-table-column prop="label" label="服务" width="120" />
        <el-table-column label="配置启用" width="100">
          <template #default="{ row }">
            <DewTag :type="row.enabled ? 'success' : 'info'" size="sm">
              {{ row.enabled ? '已启用' : '已关闭' }}
            </DewTag>
          </template>
        </el-table-column>
        <el-table-column label="运行状态" width="120">
          <template #default="{ row }">
            <DewTag :type="(SERVICE_STATE_META[row.state] || {}).tag || 'info'" size="sm">
              {{ (SERVICE_STATE_META[row.state] || {}).label || row.state || '未知' }}
            </DewTag>
          </template>
        </el-table-column>
        <el-table-column label="最近观测">
          <template #default="{ row }">
            <span v-if="row.key === 'reminder_scan'">
              {{ row.last_success_at ? `最近成功 ${row.last_success_at}` : '尚无成功心跳' }}
              <template v-if="row.detail">（{{ row.detail }}）</template>
              <template v-else-if="row.cause">（{{ { recent_failure: '最近一轮失败', run_timeout: '运行超时', heartbeat_stale: '心跳过期' }[row.cause] || row.cause }}）</template>
            </span>
            <span v-else>{{ row.observed }}</span>
          </template>
        </el-table-column>
      </el-table>
    </DewCard>
  </div>
</template>

<style scoped>
.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.meta-text {
  font-size: var(--text-sm, 13px);
  color: var(--text-secondary, var(--text-primary));
}

.card-head {
  font-size: 13px;
  font-weight: 600;
}

.card-head.warn {
  color: var(--color-danger, #dc2626);
}

.risk-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  cursor: pointer;
}

.risk-row + .risk-row {
  border-top: 1px solid var(--border-light, rgba(0, 0, 0, 0.06));
}

.risk-detail {
  flex: 1;
  font-size: 13px;
}

.risk-link {
  font-size: 12px;
  color: var(--primary-color);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.metric-label {
  font-size: 12px;
  color: var(--text-secondary, var(--text-primary));
}

.metric-value {
  font-size: 22px;
  font-weight: 600;
  margin: 6px 0 2px;
  font-variant-numeric: tabular-nums;
}

.metric-value.is-muted {
  font-size: 14px;
  color: var(--text-secondary, var(--text-primary));
}

.metric-suffix {
  font-size: 12px;
  font-weight: 400;
  margin-left: 2px;
}

.metric-detail {
  font-size: 12px;
  color: var(--text-faint, var(--text-secondary));
}
</style>
