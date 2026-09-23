<template>
  <div class="workbench">
    <!-- 欢迎横幅（沿用：今日概览数字走 /admin/overview） -->
    <div class="welcome-banner">
      <div class="welcome-left">
        <h2 class="welcome-title">欢迎回来，{{ userName }}</h2>
        <div class="welcome-sub">{{ todayText }}<template v-if="overview"> · 今日新增 {{ overview.user_new_today }} 人 · 今日打卡 {{ overview.checkin_today }} 人</template></div>
      </div>
      <div class="quick-create">
        <el-button size="small" @click="go('/camps')">新建营期</el-button>
        <el-button size="small" @click="go('/content/courses/new')">新建课程</el-button>
        <el-button size="small" @click="go('/editor')">发布文章</el-button>
        <el-button size="small" @click="go('/operations/notifications')">发送通知</el-button>
      </div>
    </div>

    <div class="section">
      <div class="section-title">需平台介入</div>
      <div v-if="summary?.section_status?.risks === 'unavailable' || summaryState === 'error'" class="muted pad">介入事项暂不可用</div>
      <div v-else-if="!summary" class="muted pad">介入事项加载中…</div>
      <div v-else-if="!interventionRisks.length" class="muted pad">暂无需要平台介入的事项</div>
      <div v-else class="risk-list">
        <button v-for="(risk, i) in interventionRisks" :key="i" type="button" class="risk-row" @click="goRisk(risk)">
          <el-tag size="small" type="danger" effect="plain">{{ RISK_LABELS[risk.rule] || risk.rule }}</el-tag>
          <span class="risk-detail">{{ risk.detail }}</span>
        </button>
      </div>
    </div>

    <!-- A. 平台队列：尚无逐项指派语义，不称为「我的待办」 -->
    <div class="section">
      <div class="section-title">平台待办</div>
      <div v-if="summary?.as_of" class="muted">数据更新于 {{ summary.as_of.slice(0, 16).replace('T', ' ') }}</div>
      <div v-if="summaryState === 'error'" class="muted pad">待办数据暂不可用 <el-button size="small" link @click="loadSummary">重试</el-button></div>
      <div v-else-if="summaryState === 'loading'" class="muted pad">待办数据加载中…</div>
      <div class="todo-grid">
        <button v-for="g in todoGroups" :key="g.key" type="button" class="todo-card"
          :disabled="!g.count" :aria-expanded="g.to ? undefined : selectedGroup === g.key"
          :class="{ zero: g.count === 0, unavailable: g.count === null }" @click="openGroup(g)">
          <div class="todo-top">
            <span class="todo-label">{{ g.label }}</span>
            <span class="todo-count" :class="{ warn: g.count > 0 }">{{ g.count === null ? '—' : g.count }}</span>
          </div>
          <div class="todo-foot">
            <span class="muted">{{ g.count === null ? '数据暂不可用' : g.detail }}</span>
            <span class="todo-link">{{ g.count > 0 ? (g.to ? '去处理' : '选择营期') : '' }}</span>
          </div>
        </button>
      </div>
      <div v-if="selectedGroup && selectedItems.length" class="todo-details">
        <div class="muted">选择营期和事项</div>
        <button v-for="item in selectedItems" :key="item.key" type="button" class="todo-detail"
          @click="go(item.to)">
          <span>{{ item.campName }} · {{ item.label }}</span><b>{{ item.count }}</b>
        </button>
      </div>
      <div v-else-if="selectedGroup" class="muted pad">待办明细暂不可用，请稍后重试</div>
    </div>

    <!-- B. 进行中营期（进工作区处理各自待办） -->
    <div class="section">
      <div class="section-title">进行中的营期</div>
      <div v-if="summary?.section_status?.running_camps === 'unavailable' || summaryState === 'error'" class="muted pad">营期数据暂不可用</div>
      <div v-else-if="!summary" class="muted pad">工作台摘要加载中…</div>
      <div v-else-if="!(summary.running_camps || []).length" class="muted pad">当前没有进行中的营期</div>
      <div v-else class="camp-grid">
        <div v-for="c in summary.running_camps || []" :key="c.id" class="camp-card" @click="go(`/camps/${c.id}/overview`)">
          <div class="camp-head">
            <span class="camp-name">{{ c.name }}</span>
            <el-tag size="small" effect="plain">{{ c.category === 'project' ? '项目营' : '培训营' }}</el-tag>
          </div>
          <div class="camp-meta muted">{{ c.cycle_name || '未挂周期' }} · {{ c.start_date }} ~ {{ c.end_date }} · {{ c.member_count ?? '—' }} 人</div>
          <div class="camp-todos">
            <el-tag v-if="c.pending_join > 0" size="small" type="danger">待审申请 {{ c.pending_join }}</el-tag>
            <el-tag v-if="c.pending_leave > 0" size="small" type="warning">待审请假 {{ c.pending_leave }}</el-tag>
            <el-tag v-if="c.pending_project_application > 0" size="small" type="danger">待审申报 {{ c.pending_project_application }}</el-tag>
            <el-tag v-if="c.pending_project_delivery > 0" size="small" type="warning">待审交付 {{ c.pending_project_delivery }}</el-tag>
            <el-tag v-if="c.unmatched > 0" size="small" type="info">未归属 {{ c.unmatched }}</el-tag>
            <span v-if="[c.pending_join, c.pending_leave, c.pending_project_application,
              c.pending_project_delivery, c.unmatched].some((n) => n === null)" class="muted">部分数据暂不可用</span>
            <span v-else-if="!c.pending_join && !c.pending_leave && !c.pending_project_application
              && !c.pending_project_delivery && !c.unmatched" class="muted">无待办</span>
          </div>
        </div>
      </div>
    </div>

    <!-- C. 风险与配置缺失（规则型，D-10：只做可明确判断的规则） -->
    <div class="section" v-if="otherRisks.length || summary?.section_status?.risks === 'unavailable'">
      <div class="section-title">风险提示</div>
      <div v-if="summary?.section_status?.risks === 'unavailable'" class="muted pad">风险数据暂不可用</div>
      <div class="risk-list">
        <button v-for="(r, i) in otherRisks" :key="i" type="button" class="risk-row" @click="goRisk(r)">
          <el-tag size="small" type="warning" effect="plain">{{ RISK_LABELS[r.rule] || r.rule }}</el-tag>
          <span class="risk-detail">{{ r.detail }}</span>
        </button>
      </div>
    </div>

    <!-- D. 最近操作（审计摘要，降级保留） -->
    <div class="section">
      <div class="section-title">最近操作</div>
      <div class="activity-list">
        <div v-if="activityState === 'error'" class="muted pad">操作记录暂不可用</div>
        <div v-else-if="activityState === 'loading'" class="muted pad">操作记录加载中…</div>
        <div v-else-if="!activities.length" class="muted pad">暂无操作记录</div>
        <div v-for="a in activities" :key="a.id" class="activity-row">
          <span class="dot" :class="a.success ? 'ok' : 'bad'"></span>
          <span class="act-user">{{ a.username || a.user_id }}</span>
          <span class="act-op">{{ a.operation }}</span>
          <span class="muted">{{ a.time_ago || a.created_at }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import api from '../../api'

const router = useRouter()
const store = useStore()

const overview = ref(null)
const summary = ref(null)
const summaryState = ref('loading')
const selectedGroup = ref(null)
const activities = ref([])
const activityState = ref('loading')

const RISK_LABELS = {
  opening_without_members: '即将开营',
  attendance_not_configured: '考勤未配置',
  no_physical_seats: '座位资源缺失',
  stale_delivery_reviews: '交付逾期未审',
  students_unmatched: '学员未归属',
  owner_missing: '负责人缺失',
}

const interventionRules = new Set(['owner_missing', 'stale_delivery_reviews'])
const interventionRisks = computed(() => (summary.value?.risks || [])
  .filter((risk) => interventionRules.has(risk.rule)))
const otherRisks = computed(() => (summary.value?.risks || [])
  .filter((risk) => !interventionRules.has(risk.rule)))

const userName = computed(() => store.state.user?.User_Name || '管理员')
const todayText = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })

const campNames = computed(() => Object.fromEntries((summary.value?.pending_camps || [])
  .map((camp) => [camp.id, camp.name])))
const countOf = (key) => summary.value?.pending?.[key] ?? null

// 管理员可看平台队列；没有明确指派关系时不冒称「待我处理」。
const todoGroups = computed(() => {
  const projectCounts = [countOf('project_application'), countOf('project_delivery')]
  return [
    { key: 'camp_join', label: '人员准入', count: countOf('camp_join'), detail: '营期加入申请' },
    { key: 'camp_leave', label: '日常审批', count: countOf('camp_leave'), detail: '营期请假审批' },
    { key: 'project', label: '项目流程', count: projectCounts.includes(null) ? null : projectCounts[0] + projectCounts[1],
      detail: `申报 ${projectCounts[0] ?? '—'} · 交付 ${projectCounts[1] ?? '—'}` },
    { key: 'quota', label: '平台治理', count: countOf('quota_request'), to: '/api-platform/quota-requests', detail: 'API 配额申请' },
    { key: 'tickets', label: '用户支持', count: countOf('feedback_ticket'), to: '/operations/feedback-tickets', detail: '反馈工单' },
  ]
})

const selectedItems = computed(() => {
  if (!selectedGroup.value) return []
  const keys = selectedGroup.value === 'project'
    ? ['project_application', 'project_delivery'] : [selectedGroup.value]
  const targets = {
    camp_join: ['people/applications', '加入申请'],
    camp_leave: ['operations/leaves?status=pending', '请假审批'],
    project_application: ['project/applications', '项目申报'],
    project_delivery: ['project/deliveries', '交付审核'],
  }
  return keys.flatMap((key) => Object.entries(summary.value?.pending_by_camp?.[key] || {})
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({
      key: `${key}:${id}`, count, campName: campNames.value[id] || `营期 #${id}`,
      label: targets[key][1], to: `/camps/${id}/${targets[key][0]}`,
    })))
})

function openGroup(group) {
  if (!group.count) return
  if (group.to) go(group.to)
  else selectedGroup.value = selectedGroup.value === group.key ? null : group.key
}

function go(path) {
  router.push(path)
}

function goRisk(r) {
  if (!r.camp_id) return
  const path = r.rule === 'owner_missing' ? 'people/staff'
    : r.rule === 'stale_delivery_reviews' ? 'project/deliveries' : 'overview'
  router.push(`/camps/${r.camp_id}/${path}`)
}

async function loadSummary() {
  summaryState.value = 'loading'
  try {
    const response = await api.get('/admin/workbench/summary')
    summary.value = response.data?.data || null
    summaryState.value = summary.value ? 'ready' : 'error'
  } catch {
    summary.value = null
    summaryState.value = 'error'
  }
}

onMounted(() => {
  loadSummary()
  api.get('/admin/overview').then((r) => { overview.value = r.data?.data || null }).catch(() => {})
  api.get('/auth/audit_records', { params: { page: 1, per_page: 6 } })
    .then((r) => {
      activities.value = r.data?.data?.logs || r.data?.logs || []
      activityState.value = 'ready'
    }).catch(() => { activityState.value = 'error' })
})
</script>

<style scoped>
.workbench {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.welcome-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.welcome-title {
  margin: 0;
  font-size: var(--text-2xl);
  font-weight: 800;
  color: var(--text-primary);
}

.welcome-sub {
  margin-top: 4px;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.quick-create {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.section-title {
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.todo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.todo-card {
  width: 100%;
  text-align: left;
  font: inherit;
  padding: 14px 16px;
  border-radius: var(--radius-lg, 14px);
  background: var(--dew-card-bg);
  border: 1px solid var(--dew-card-border);
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.todo-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.todo-card.zero {
  cursor: default;
}

.todo-card.zero:hover {
  transform: none;
  box-shadow: none;
}

.todo-card.unavailable { cursor: default; }
.todo-card:disabled { opacity: 1; }

.todo-details { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
.todo-detail { display: flex; justify-content: space-between; gap: 12px; width: 100%;
  border: 1px solid var(--dew-card-border); border-radius: var(--radius-md); padding: 10px 12px;
  background: var(--dew-card-bg); color: var(--text-primary); text-align: left; cursor: pointer; }
.todo-detail:hover { border-color: var(--primary-color); }

.todo-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.todo-label {
  font-weight: 600;
  color: var(--text-primary);
}

.todo-count {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-secondary);
}

.todo-count.warn {
  color: var(--warning-color, #e6a23c);
}

.todo-foot {
  margin-top: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.todo-link {
  color: var(--primary-color);
}

.camp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.camp-card {
  padding: 14px 16px;
  border-radius: var(--radius-lg, 14px);
  background: var(--dew-card-bg);
  border: 1px solid var(--dew-card-border);
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.camp-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.camp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.camp-name {
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.camp-meta {
  margin: 6px 0 8px;
  font-size: 12px;
}

.camp-todos {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.risk-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.risk-row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: rgba(230, 162, 60, 0.07);
  border: 1px solid var(--dew-card-border);
  color: var(--text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.risk-detail {
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.activity-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--text-sm);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
}

.dot.ok {
  background: var(--success-color, #67c23a);
}

.dot.bad {
  background: var(--error-color, #f56c6c);
}

.act-user {
  font-weight: 600;
}

.act-op {
  color: var(--text-secondary);
}

.muted {
  color: var(--text-secondary);
  font-size: 12px;
}

.pad {
  padding: 12px 0;
}
</style>
