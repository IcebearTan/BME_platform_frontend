<script setup>
// 今日面板（Phase 1 手动版）：头部统计 + 当前/下一项 + 今日时间线（固定日程与
// 任务块明确区分、冲突标红）+ 待处理三区（待安排/已逾期/今日截止，不混入时间线）。
// 「说一句帮我安排」是 Phase 2 语音入口位，本期以「新建」下拉替代。
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Clock, WarningFilled, CircleCheck, Calendar } from '@element-plus/icons-vue'
import { DewCard, DewTag, DewButton, DewSkeleton } from '@bme/dew-ui'
import { scheduleService } from '../../services/scheduleService'
import ScheduleQuickInput from './ScheduleQuickInput.vue'

const props = defineProps({
  refreshKey: { type: Number, default: 0 }
})
const emit = defineEmits([
  'create-task', 'edit-task', 'create-event', 'edit-event',
  'create-block', 'edit-block'
])

const loading = ref(true)
const agenda = ref(null)
const unscheduled = ref([])
const overdue = ref([])
const todayDue = ref([])
const newMenuOpen = ref(false)

const today = new Date()
const todayLabel = `${today.getMonth() + 1} 月 ${today.getDate()} 日`
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const todayWeek = `周${WEEKDAYS[today.getDay()]}`
const dateStr = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function hm(datetimeStr) {
  return datetimeStr ? datetimeStr.slice(11, 16) : ''
}

async function fetchAll() {
  loading.value = true
  try {
    const day = dateStr(today)
    const [ag, uns, ovd, due] = await Promise.allSettled([
      scheduleService.fetchAgenda(day, day),
      scheduleService.fetchTasks({ bucket: 'unscheduled', perPage: 10 }),
      scheduleService.fetchTasks({ bucket: 'overdue', perPage: 10 }),
      scheduleService.fetchTasks({ bucket: 'today_due', perPage: 10 })
    ])
    if (ag.status === 'fulfilled') agenda.value = ag.value
    unscheduled.value = uns.status === 'fulfilled' ? (uns.value.items || []) : []
    overdue.value = ovd.status === 'fulfilled' ? (ovd.value.items || []) : []
    todayDue.value = due.status === 'fulfilled' ? (due.value.items || []) : []
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)
watch(() => props.refreshKey, fetchAll)

// 时间线：事件 + 执行块合并排序；冲突项标红（后端只检测不阻断的口径）
const timeline = computed(() => {
  if (!agenda.value) return []
  const conflictKeys = new Set()
  for (const c of agenda.value.conflicts || []) {
    conflictKeys.add(`${c.a.type}:${c.a.id}`)
    conflictKeys.add(`${c.b.type}:${c.b.id}`)
  }
  const items = [
    ...(agenda.value.events || []).map((e) => ({
      key: `event:${e.id}`, type: 'event', id: e.id, raw: e,
      title: e.title, start: e.start_at, end: e.end_at,
      meta: e.location || '', locked: true, conflict: conflictKeys.has(`event:${e.id}`)
    })),
    ...(agenda.value.blocks || []).filter((b) => b.status !== 'cancelled').map((b) => ({
      key: `block:${b.id}`, type: 'block', id: b.id, raw: b, taskId: b.task_id,
      title: b.task_title || '任务时间', start: b.start_at, end: b.end_at,
      meta: '', locked: b.locked, conflict: conflictKeys.has(`block:${b.id}`)
    }))
  ]
  return items.sort((a, b) => (a.start || '').localeCompare(b.start || ''))
})

// 「当前/下一项」随时间推进：30 秒心跳刷新 now 锚点
const nowStr = ref('')
let nowTimer = null
const refreshNow = () => {
  const n = new Date()
  const p = (x) => String(x).padStart(2, '0')
  nowStr.value = `${dateStr(n)} ${p(n.getHours())}:${p(n.getMinutes())}`
}
refreshNow()
onMounted(() => { nowTimer = setInterval(refreshNow, 30000) })
onUnmounted(() => clearInterval(nowTimer))
const current = computed(() => timeline.value.find((it) => it.start.slice(0, 10) === dateStr(today)
  && it.start.slice(11, 16) <= nowStr.value.slice(11, 16) && it.end.slice(11, 16) > nowStr.value.slice(11, 16)
  && it.start <= it.end))
const next = computed(() => timeline.value.find((it) => it.start > nowStr.value))

const dayStats = computed(() => agenda.value?.day_stats || {})

async function completeTask(task) {
  try {
    await scheduleService.taskAction(task.id, 'complete')
    ElMessage.success(`「${task.title}」已完成`)
    fetchAll()
  } catch (err) {
    ElMessage.error(err.message || '操作失败')
  }
}

async function postpone(block) {
  // 推迟 30 分钟（未来时间块直接顺延；无冲突校验由保存响应提示）
  const start = new Date(block.start_at.replace(' ', 'T'))
  const end = new Date(block.end_at.replace(' ', 'T'))
  const pad = (n) => String(n).padStart(2, '0')
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  start.setMinutes(start.getMinutes() + 30)
  end.setMinutes(end.getMinutes() + 30)
  try {
    await scheduleService.updateBlock(block.id, {
      start_at: fmt(start), end_at: fmt(end), expected_version: block.version
    })
    ElMessage.success('已顺延 30 分钟')
    fetchAll()
  } catch (err) {
    ElMessage.error(err.message || '操作失败')
  }
}
</script>

<template>
  <div class="today-panel">
    <!-- 头部：日期 + 统计 + 新建入口 -->
    <div class="today-header">
      <div class="today-title-block">
        <div class="today-title">{{ todayLabel }}<span class="today-week">{{ todayWeek }}</span></div>
        <div class="today-stats">
          <span class="stat"><el-icon><Clock /></el-icon>今日可安排 {{ Math.round((dayStats.available_minutes || 0) / 60 * 10) / 10 }} 小时</span>
          <span v-if="dayStats.conflict_count" class="stat stat-warn">
            <el-icon><WarningFilled /></el-icon>{{ dayStats.conflict_count }} 处冲突
          </span>
        </div>
      </div>
      <div class="new-entry">
        <DewButton type="glass" @click="newMenuOpen = !newMenuOpen">
          <el-icon><Plus /></el-icon>新建
        </DewButton>
        <div v-if="newMenuOpen" class="new-menu" @click="newMenuOpen = false">
          <button class="new-menu-item" @click="emit('create-task')">
            <span class="nm-label">任务</span>
            <span class="nm-desc">要做完的事，只有截止；时间可让 AI 安排</span>
          </button>
          <button class="new-menu-item" @click="emit('create-event')">
            <span class="nm-label">日程</span>
            <span class="nm-desc">固定占用一段时间（会议/实验），默认不让 AI 挪</span>
          </button>
          <button class="new-menu-item" @click="emit('create-block', {})">
            <span class="nm-label">时间块</span>
            <span class="nm-desc">任务落到日历上的执行时段，可拆成多段</span>
          </button>
        </div>
      </div>
    </div>
    <div v-if="newMenuOpen" class="new-menu-mask" @click="newMenuOpen = false"></div>

    <!-- 说一句，帮我安排（Phase 2 文字意图；语音入口位预留）。
         W1 起结果卡/澄清卡统一进 AI 助手抽屉（提交后自动展开），
         页面只保留快捷输入入口——单处渲染避免双挂载。 -->
    <ScheduleQuickInput />

    <DewSkeleton v-if="loading" variant="text" :lines="6" />
    <template v-else>
      <!-- 当前与下一项 -->
      <div v-if="current || next" class="now-strip">
        <template v-if="current">
          <div class="now-item now-current">
            <span class="now-label">进行中</span>
            <span class="now-title">{{ current.title }}</span>
            <span class="now-time">{{ hm(current.start) }} - {{ hm(current.end) }}</span>
            <template v-if="current.type === 'block'">
              <DewButton size="sm" type="ghost" @click="completeTask({ id: current.taskId, title: current.title })">完成</DewButton>
              <DewButton size="sm" type="ghost" @click="postpone(current.raw)">推迟</DewButton>
            </template>
          </div>
        </template>
        <div v-if="next" class="now-item">
          <span class="now-label">下一项</span>
          <span class="now-title">{{ next.title }}</span>
          <span class="now-time">{{ hm(next.start) }}</span>
          <DewTag v-if="next.type === 'event'" type="primary" size="sm">固定</DewTag>
          <DewTag v-else type="success" size="sm">任务块</DewTag>
        </div>
      </div>

      <div class="today-columns">
        <!-- 今日时间线 -->
        <DewCard size="lg" divided class="timeline-card">
          <template #header>
            <div class="card-head"><el-icon><Calendar /></el-icon>今日时间线</div>
          </template>
          <div v-if="timeline.length === 0" class="empty-state">今天还没有安排</div>
          <ul v-else class="timeline-list">
            <li v-for="it in timeline" :key="it.key" class="timeline-item"
              :class="{ 'is-conflict': it.conflict }" @click="it.type === 'event' ? emit('edit-event', it.raw) : emit('edit-block', it.raw)">
              <span class="tl-time">{{ hm(it.start) }}-{{ hm(it.end) }}</span>
              <span class="tl-title">{{ it.title }}</span>
              <DewTag :type="it.type === 'event' ? 'primary' : 'success'" size="sm">
                {{ it.type === 'event' ? '固定' : '任务块' }}
              </DewTag>
              <DewTag v-if="it.type === 'block' && it.locked" type="neutral" size="sm">已锁定</DewTag>
              <DewTag v-if="it.conflict" type="danger" size="sm">冲突</DewTag>
            </li>
          </ul>
        </DewCard>

        <!-- 待处理：不混入时间线 -->
        <div class="pending-column">
          <DewCard size="lg" divided class="pending-card">
            <template #header>
              <div class="card-head card-head-warn">
                <el-icon><WarningFilled /></el-icon>已逾期<span v-if="overdue.length" class="head-count">{{ overdue.length }}</span>
              </div>
            </template>
            <div v-if="overdue.length === 0" class="empty-state empty-slim">没有逾期任务</div>
            <ul v-else class="pending-list">
              <li v-for="t in overdue" :key="t.id" class="pending-item">
                <span class="p-title">{{ t.title }}</span>
                <span class="p-due">{{ (t.due_at || t.due_date || '').slice(5, 16) }}</span>
                <DewButton size="sm" type="ghost" @click.stop="emit('create-block', { taskId: t.id })">安排</DewButton>
                <DewButton size="sm" type="ghost" @click.stop="completeTask(t)"><el-icon><CircleCheck /></el-icon></DewButton>
              </li>
            </ul>
          </DewCard>

          <DewCard size="lg" divided class="pending-card">
            <template #header>
              <div class="card-head">今日截止<span v-if="todayDue.length" class="head-count">{{ todayDue.length }}</span></div>
            </template>
            <div v-if="todayDue.length === 0" class="empty-state empty-slim">今日没有截止</div>
            <ul v-else class="pending-list">
              <li v-for="t in todayDue" :key="t.id" class="pending-item">
                <span class="p-title">{{ t.title }}</span>
                <span class="p-due">{{ (t.due_at || t.due_date || '').slice(11, 16) || '当日' }}</span>
                <DewButton size="sm" type="ghost" @click.stop="emit('create-block', { taskId: t.id })">安排</DewButton>
                <DewButton size="sm" type="ghost" @click.stop="completeTask(t)"><el-icon><CircleCheck /></el-icon></DewButton>
              </li>
            </ul>
          </DewCard>

          <DewCard size="lg" divided class="pending-card">
            <template #header>
              <div class="card-head">待安排<span v-if="unscheduled.length" class="head-count">{{ unscheduled.length }}</span></div>
            </template>
            <div v-if="unscheduled.length === 0" class="empty-state empty-slim">没有待安排任务</div>
            <ul v-else class="pending-list">
              <li v-for="t in unscheduled" :key="t.id" class="pending-item" @click="emit('edit-task', t)">
                <span class="p-title">{{ t.title }}</span>
                <DewTag v-if="t.due_at || t.due_date" type="warning" size="sm">
                  {{ (t.due_at || t.due_date).slice(5, 16) }}
                </DewTag>
                <DewButton size="sm" type="ghost" @click.stop="emit('create-block', { taskId: t.id })">安排时间</DewButton>
              </li>
            </ul>
          </DewCard>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.today-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.today-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.today-title {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--dew-text-heading);
}

.today-week {
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--dew-text-muted);
  margin-left: 8px;
}

.today-stats {
  display: flex;
  gap: 14px;
  margin-top: 4px;
}

.stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-sm);
  color: var(--dew-text-muted);
}

.stat-warn {
  color: var(--color-danger);
}

.new-entry {
  position: relative;
}

.new-menu {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 30;
  display: flex;
  flex-direction: column;
  min-width: 110px;
  border-radius: var(--radius-md);
  background: var(--dew-dialog-bg);
  box-shadow: var(--shadow-lg, 0 12px 32px rgba(0, 0, 0, 0.16));
  overflow: hidden;
}

.new-menu-mask {
  position: fixed;
  inset: 0;
  z-index: 20;
}

.new-menu-item {
  padding: 9px 16px;
  border: none;
  background: none;
  text-align: left;
  font-size: var(--text-sm);
  color: var(--dew-text);
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
}

.nm-desc {
  font-size: var(--text-xs, 12px);
  color: var(--dew-text-muted);
  font-weight: 400;
}

.new-menu-item:hover {
  background: var(--color-primary-subtle, rgba(59, 130, 246, 0.08));
}

.now-strip {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.now-item {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: var(--dew-dialog-bg);
}

.now-current {
  border-left: 3px solid var(--color-primary);
}

.now-label {
  font-size: var(--text-xs);
  color: var(--dew-text-muted);
}

.now-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--dew-text-heading);
}

.now-time {
  font-size: var(--text-sm);
  color: var(--dew-text-muted);
  font-variant-numeric: tabular-nums;
}

.today-columns {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
  align-items: start;
}

@media (max-width: 900px) {
  .today-columns {
    grid-template-columns: 1fr;
  }
}

.card-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--dew-text-heading);
}

.card-head-warn {
  color: var(--color-danger);
}

.head-count {
  font-size: var(--text-xs);
  color: var(--dew-text-muted);
}

.timeline-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.timeline-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--dew-card-divider, rgba(0, 0, 0, 0.06));
  cursor: pointer;
}

.timeline-item:last-child {
  border-bottom: none;
}

.timeline-item.is-conflict {
  border-left: 2px solid var(--color-danger);
  padding-left: 8px;
}

.tl-time {
  font-size: var(--text-xs);
  color: var(--dew-text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.tl-title {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--dew-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pending-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.pending-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--dew-card-divider, rgba(0, 0, 0, 0.06));
}

.pending-item:last-child {
  border-bottom: none;
}

.p-title {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--dew-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.p-due {
  font-size: var(--text-xs);
  color: var(--color-danger);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.empty-state {
  padding: 36px 0;
  text-align: center;
  font-size: var(--text-sm);
  color: var(--dew-text-muted);
}

.empty-slim {
  padding: 14px 0;
}
</style>
