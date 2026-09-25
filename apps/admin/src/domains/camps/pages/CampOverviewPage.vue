<template>
  <div class="camp-overview">
    <!-- 门禁重定向落点：带原因说明（可刷新存活、可 e2e 断言） -->
    <el-alert v-if="blockedName" type="warning" :closable="false" class="ov-alert"
      :title="`已离开「${blockedLabel}」`" :description="blockedText">
      <el-button v-if="canManage" size="small" type="primary" link @click="goSettings">前往营期设置调整能力开关</el-button>
    </el-alert>

    <template v-if="ov">
      <div class="ov-grid">
        <!-- 阶段与下一步 -->
        <DewCard no-hover class="ov-card">
          <template #header><div class="ov-card-title">当前阶段</div></template>
          <div class="ov-stage">
            <el-tag :type="statusType(ov.stage)" size="large">{{ ov.stage_label }}</el-tag>
            <span class="ov-dates">{{ ov.start_date }} ~ {{ ov.end_date }}</span>
          </div>
          <div v-if="ov.available_transitions?.length" class="ov-next">
            可执行动作：{{ ov.available_transitions.map(transitionLabel).join(' / ') }}
            <span class="ov-hint">（在设置与生命周期中执行）</span>
          </div>
        </DewCard>

        <!-- 成员构成 -->
        <DewCard no-hover class="ov-card">
          <template #header><div class="ov-card-title">成员构成</div></template>
          <div class="ov-stats">
            <div class="ov-stat"><span class="n">{{ ov.counts.student }}</span><span class="l">学员</span></div>
            <div class="ov-stat"><span class="n">{{ ov.counts.mentor }}</span><span class="l">导生</span></div>
            <div class="ov-stat" v-if="ov.counts.member"><span class="n">{{ ov.counts.member }}</span><span class="l">成员</span></div>
            <div class="ov-stat" v-if="ov.counts.unmatched"><span class="n warn">{{ ov.counts.unmatched }}</span><span class="l">未归属</span></div>
          </div>
          <el-button size="small" text type="primary" @click="go('camp.people.members')">进入成员名单</el-button>
        </DewCard>

        <!-- 待办 -->
        <DewCard no-hover class="ov-card">
          <template #header><div class="ov-card-title">待处理</div></template>
          <div v-if="!todoRows.length" class="ov-hint">暂无待处理事项</div>
          <div v-for="t in todoRows" :key="t.key" class="ov-todo" @click="goTodo(t)">
            <span class="ov-todo-label">{{ t.label }}</span>
            <span class="n warn">{{ t.count }}</span>
          </div>
        </DewCard>

        <!-- 类型摘要 -->
        <DewCard no-hover class="ov-card">
          <template #header><div class="ov-card-title">{{ isProject ? '项目营摘要' : '培训营摘要' }}</div></template>
          <template v-if="isProject && ov.project_summary">
            <div class="ov-kv"><span>待审申报</span><b>{{ ov.project_summary.pending_applications }}</b></div>
            <div class="ov-kv"><span>项目数</span><b>{{ ov.project_summary.project_count }}</b></div>
            <div class="ov-kv"><span>待审交付</span><b>{{ ov.project_summary.pending_reviews }}</b></div>
            <div class="ov-kv"><span>待核验成果</span><b>{{ ov.project_summary.outcomes_submitted }}</b></div>
            <div class="ov-kv"><span>结营档案</span><b>{{ ov.project_summary.archived ? '已冻结' : '未生成' }}</b></div>
          </template>
          <template v-else-if="ov.learning_summary?.ms_stats">
            <div class="ov-kv"><span>未发布名片的导生</span><b>{{ ov.learning_summary.ms_stats.mentors_without_profile }}</b></div>
            <div class="ov-kv"><span>未提交志愿的学员</span><b>{{ ov.learning_summary.ms_stats.students_without_preference }}</b></div>
            <div class="ov-kv"><span>志愿截止</span><b>{{ ov.learning_summary.ms_stats.preference_deadline?.slice(0, 16).replace('T', ' ') || '—' }}</b></div>
          </template>
          <div v-else class="ov-hint">{{ isProject ? '暂无项目数据' : '选导生未启用或已归档' }}</div>
        </DewCard>
      </div>

      <!-- 能力开关 -->
      <DewCard no-hover class="ov-card">
        <template #header><div class="ov-card-title">启用能力</div></template>
        <div class="ov-caps">
          <el-tag v-for="(on, key) in ov.capabilities || {}" :key="key" size="small"
            :type="on ? 'success' : 'info'" effect="plain">
            {{ capLabel(key) }}{{ on ? '' : '（关）' }}
          </el-tag>
          <span v-if="!ov.capabilities" class="ov-hint">未配置（按类型默认）</span>
        </div>
      </DewCard>

      <!-- 最近事件 -->
      <DewCard v-if="ov.recent_events?.length" no-hover class="ov-card">
        <template #header><div class="ov-card-title">最近营期事件</div></template>
        <el-table :data="ov.recent_events" size="small" max-height="260">
          <el-table-column label="时间" width="150">
            <template #default="{ row }">{{ (row.occurred_at || '').slice(0, 16).replace('T', ' ') }}</template>
          </el-table-column>
          <el-table-column label="动作" width="100">
            <template #default="{ row }">{{ actionLabel(row.action) }}</template>
          </el-table-column>
          <el-table-column label="来源" width="100">
            <template #default="{ row }">{{ { leader_pick: '负责人勾选', admin_adjust: '管理员', apply: '申报', approve: '过审' }[row.source] || row.source || '—' }}</template>
          </el-table-column>
        </el-table>
      </DewCard>
    </template>

    <div v-else class="ov-hint" style="padding: 24px 0;" v-loading="loading">
      概览数据加载中…
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DewCard } from '@bme/dew-ui'
import api from '../../../api'
import { useCampContext } from '../context/campContext'
import { statusType } from '../shared/statusText'
import { findNavItem, blockedReason } from '../workspace/workspaceNav'

const route = useRoute()
const router = useRouter()
const ctx = useCampContext()
const { campId, loading, isProject, canManage } = ctx

const ov = ref(null)

const TRANSITION_LABELS = {
  publish: '发布', retract: '撤回发布', open_enrollment: '开放报名',
  open: '开营', close: '结营归档',
}
const transitionLabel = (a) => TRANSITION_LABELS[a] || a
const actionLabel = (a) => ({
  select: '加入', deselect: '移出', exit: '退出', remove: '移除',
  adjust: '调剂', leader_change: '换负责人', unit_status: '状态变更',
}[a] || a)
const CAP_LABELS = {
  attendance: '考勤', leave: '请假', seat: '座位',
  mentor_level_gate: '导生等级门槛', leader_level_gate: '负责人等级门槛',
}
const capLabel = (k) => CAP_LABELS[k] || k

const blockedName = computed(() => (route.query.blocked || null))
const blockedLabel = computed(() => findNavItem(blockedName.value)?.label || blockedName.value || '')
const blockedText = computed(() => (blockedName.value ? blockedReason(blockedName.value, ctx) : ''))

const todoRows = computed(() => {
  if (!ov.value) return []
  const p = ov.value.pending || {}
  const rows = []
  if (p.join) rows.push({ key: 'join', label: '待审加入申请', count: p.join, to: 'camp.people.applications' })
  if (p.leave) rows.push({ key: 'leave', label: '待审批请假', count: p.leave, to: 'camp.ops.leaves' })
  if (p.delivery) rows.push({ key: 'delivery', label: '待审交付材料', count: p.delivery, to: 'camp.project.deliveries' })
  return rows
})

async function fetchOverview() {
  try {
    const res = await api.get(`/camp/sessions/${campId.value}/admin-overview`)
    ov.value = res.data?.overview || null
  } catch { /* 概览失败不阻塞工作区其余叶子 */ }
}

onMounted(fetchOverview)

function go(name) {
  router.push({ name })
}

function goTodo(t) {
  router.push({ name: t.to })
}

function goSettings() {
  router.push({ name: 'camp.settings' })
}
</script>

<style scoped>
.camp-overview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ov-alert {
  margin-bottom: 4px;
}

.ov-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.ov-card :deep(.dew-card__header) {
  padding: 14px 18px 0;
}

.ov-card-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
}

.ov-stage {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
}

.ov-dates {
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.ov-next {
  padding: 0 18px 14px;
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.ov-stats {
  display: flex;
  gap: 20px;
  padding: 14px 18px;
  flex-wrap: wrap;
}

.ov-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.ov-stat .n {
  font-size: var(--text-2xl);
  font-weight: 800;
}

.ov-stat .n.warn {
  color: var(--warning-color, #e6a23c);
}

.ov-stat .l {
  font-size: 12px;
  color: var(--text-secondary);
}

.ov-todo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.ov-todo:hover {
  background: rgba(var(--primary-color-rgb), 0.06);
}

.ov-todo .n {
  font-weight: 700;
}

.ov-todo .n.warn {
  color: var(--warning-color, #e6a23c);
}

.ov-kv {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 18px;
  font-size: var(--text-sm);
}

.ov-kv span {
  color: var(--text-secondary);
}

.ov-caps {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 14px 18px;
}

.ov-hint {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  padding: 12px 18px;
}
</style>
