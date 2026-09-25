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

    <!-- A. 待办摘要（按处理语义分组，不按表名分组；点击跳对应处理页） -->
    <div class="section">
      <div class="section-title">待我处理</div>
      <div class="todo-grid">
        <div v-for="g in todoGroups" :key="g.key" class="todo-card" :class="{ zero: !g.count }" @click="go(g.to)">
          <div class="todo-top">
            <span class="todo-label">{{ g.label }}</span>
            <span class="todo-count" :class="{ warn: g.count > 0 }">{{ g.count }}</span>
          </div>
          <div class="todo-foot">
            <span class="muted">{{ g.detail }}</span>
            <span class="todo-link">{{ g.count > 0 ? '去处理' : '查看' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- B. 进行中营期（进工作区处理各自待办） -->
    <div class="section">
      <div class="section-title">进行中的营期</div>
      <div v-if="!summary" class="muted pad">工作台摘要加载中…</div>
      <div v-else-if="!(summary.running_camps || []).length" class="muted pad">当前没有进行中的营期</div>
      <div v-else class="camp-grid">
        <div v-for="c in summary.running_camps || []" :key="c.id" class="camp-card" @click="go(`/camps/${c.id}/overview`)">
          <div class="camp-head">
            <span class="camp-name">{{ c.name }}</span>
            <el-tag size="small" effect="plain">{{ c.category === 'project' ? '项目营' : '培训营' }}</el-tag>
          </div>
          <div class="camp-meta muted">{{ c.cycle_name || '未挂周期' }} · {{ c.start_date }} ~ {{ c.end_date }} · {{ c.member_count }} 人</div>
          <div class="camp-todos">
            <el-tag v-if="c.pending_join" size="small" type="danger">待审申请 {{ c.pending_join }}</el-tag>
            <el-tag v-if="c.pending_leave" size="small" type="warning">待审请假 {{ c.pending_leave }}</el-tag>
            <el-tag v-if="c.unmatched" size="small" type="info">未归属 {{ c.unmatched }}</el-tag>
            <span v-if="!c.pending_join && !c.pending_leave && !c.unmatched" class="muted">无待办</span>
          </div>
        </div>
      </div>
    </div>

    <!-- C. 风险与配置缺失（规则型，D-10：只做可明确判断的规则） -->
    <div class="section" v-if="summary?.risks?.length">
      <div class="section-title">风险提示</div>
      <div class="risk-list">
        <div v-for="(r, i) in summary.risks" :key="i" class="risk-row" @click="goRisk(r)">
          <el-tag size="small" type="warning" effect="plain">{{ RISK_LABELS[r.rule] || r.rule }}</el-tag>
          <span class="risk-detail">{{ r.detail }}</span>
        </div>
      </div>
    </div>

    <!-- D. 最近操作（审计摘要，降级保留） -->
    <div class="section">
      <div class="section-title">最近操作</div>
      <div class="activity-list">
        <div v-if="!activities.length" class="muted pad">暂无操作记录</div>
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
const activities = ref([])

const RISK_LABELS = {
  opening_without_members: '即将开营',
  attendance_not_configured: '考勤未配置',
  no_physical_seats: '座位资源缺失',
  stale_delivery_reviews: '交付逾期未审',
  students_unmatched: '学员未归属',
}

const userName = computed(() => store.state.user?.name || '管理员')
const todayText = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })

// 待办分组：按处理语义（设计方案 §6.2A），跳各自处理页
const todoGroups = computed(() => {
  const p = summary.value?.pending || {}
  return [
    { key: 'camp_join', label: '人员准入', count: p.camp_join || 0, to: '/camps', detail: '营期加入申请' },
    { key: 'camp_leave', label: '日常审批', count: p.camp_leave || 0, to: '/camps', detail: '营期请假审批' },
    { key: 'project', label: '项目流程', count: (p.project_application || 0) + (p.project_delivery || 0),
      to: '/camps', detail: `申报 ${p.project_application || 0} · 交付 ${p.project_delivery || 0}` },
    { key: 'quota', label: '平台治理', count: p.quota_request || 0, to: '/api-platform/quota-requests', detail: 'API 配额申请' },
    { key: 'tickets', label: '用户支持', count: p.feedback_ticket || 0, to: '/operations/feedback-tickets', detail: '反馈工单' },
  ]
})

function go(path) {
  router.push(path)
}

function goRisk(r) {
  if (r.camp_id) router.push(`/camps/${r.camp_id}/overview`)
}

onMounted(async () => {
  // 各区独立降级：单域失败不拖垮整页（R-03）
  api.get('/admin/overview').then((r) => { overview.value = r.data?.data || null }).catch(() => {})
  api.get('/admin/workbench/summary').then((r) => { summary.value = r.data?.data || null }).catch(() => {})
  api.get('/auth/audit_records', { params: { page: 1, per_page: 6 } })
    .then((r) => { activities.value = r.data?.data?.logs || r.data?.logs || [] }).catch(() => {})
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
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: rgba(230, 162, 60, 0.07);
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
