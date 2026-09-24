<script setup>
// 周历网格（Phase 1 无拖拽）：7 列 × 时刻行，日程/执行块按时间定位。点击块片
// 打开对应编辑弹窗（改时间 + 锁定开关），点空格预填该时段打开时间块弹窗。
// 颜色区分类别（固定=primary 调/任务块=success 调/冲突=红边+文字标签），不只靠颜色。
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ArrowLeft, ArrowRight, Plus } from '@element-plus/icons-vue'
import { DewButton, DewSkeleton, DewTag } from '@bme/dew-ui'
import { scheduleService } from '../../services/scheduleService'

const props = defineProps({ refreshKey: { type: Number, default: 0 } })
const emit = defineEmits(['create-event', 'edit-event', 'create-block', 'edit-block'])

const HOUR_START = 6       // 网格从 06:00 起（覆盖 profile 默认 09:00-22:00 之外的生活时间）
const HOUR_END = 24
const TOTAL_MINUTES = (HOUR_END - HOUR_START) * 60
const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

const loading = ref(true)
const agenda = ref(null)
const weekOffset = ref(0)

const pad = (n) => String(n).padStart(2, '0')
const dateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const weekDays = computed(() => {
  const base = new Date()
  const day = base.getDay() === 0 ? 7 : base.getDay()      // 周一为一周之始
  const monday = new Date(base)
  monday.setDate(base.getDate() - (day - 1) + weekOffset.value * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
})
const weekTitle = computed(() =>
  `${dateStr(weekDays.value[0]).slice(5).replace('-', '/')} - ${dateStr(weekDays.value[6]).slice(5).replace('-', '/')}`)
const todayKey = dateStr(new Date())

const hourLabels = computed(() =>
  Array.from({ length: (HOUR_END - HOUR_START) / 2 }, (_, i) => `${pad(HOUR_START + i * 2)}:00`))

async function fetchWeek() {
  loading.value = true
  try {
    const from = dateStr(weekDays.value[0])
    const to = dateStr(weekDays.value[6])
    agenda.value = await scheduleService.fetchAgenda(from, to)
  } catch {
    agenda.value = null
  } finally {
    loading.value = false
  }
}

onMounted(fetchWeek)
watch(() => props.refreshKey, fetchWeek)
watch(weekOffset, fetchWeek)

const conflictKeys = computed(() => {
  const keys = new Set()
  for (const c of agenda.value?.conflicts || []) {
    keys.add(`${c.a.type}:${c.a.id}`)
    keys.add(`${c.b.type}:${c.b.id}`)
  }
  return keys
})

function minutesOfDay(datetimeStr) {
  return Number(datetimeStr.slice(11, 13)) * 60 + Number(datetimeStr.slice(14, 16))
}

// 单个事项在某天的定位（跨天事项逐日裁剪展示）
function spanOf(item, dayKey) {
  const startDay = item.start.slice(0, 10)
  const endDay = item.end.slice(0, 10)
  if (endDay < dayKey || startDay > dayKey) return null
  const from = startDay === dayKey ? minutesOfDay(item.start) : HOUR_START * 60
  const to = endDay === dayKey ? Math.max(minutesOfDay(item.end), from + 15) : HOUR_END * 60
  const top = ((Math.max(from, HOUR_START * 60) - HOUR_START * 60) / TOTAL_MINUTES) * 100
  const height = ((Math.min(to, HOUR_END * 60) - Math.max(from, HOUR_START * 60)) / TOTAL_MINUTES) * 100
  return { top: `${top}%`, height: `${Math.max(height, 1.6)}%` }
}

const dayColumns = computed(() => weekDays.value.map((d) => {
  const key = dateStr(d)
  const events = (agenda.value?.events || []).filter((e) => e.start_at.slice(0, 10) <= key && e.end_at.slice(0, 10) >= key)
  return {
    key,
    label: WEEKDAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1],
    dayOfMonth: d.getDate(),
    isToday: key === todayKey,
    allDayEvents: events.filter((e) => e.all_day),
    positioned: [
      ...events.filter((e) => !e.all_day).map((e) => ({
        key: `event:${e.id}`, type: 'event', raw: e,
        title: e.title, start: e.start_at, end: e.end_at,
        conflict: conflictKeys.value.has(`event:${e.id}`)
      })),
      ...(agenda.value?.blocks || []).filter((b) => b.status !== 'cancelled'
        && b.start_at.slice(0, 10) <= key && b.end_at.slice(0, 10) >= key).map((b) => ({
        key: `block:${b.id}`, type: 'block', raw: b,
        title: b.task_title || '任务时间', start: b.start_at, end: b.end_at,
        locked: b.locked, conflict: conflictKeys.value.has(`block:${b.id}`)
      }))
    ].map((it) => ({ ...it, span: spanOf(it, key) })).filter((it) => it.span)
  }
}))

// 今日时间指示线
const nowTop = ref(null)
let nowTimer = null
const refreshNowLine = () => {
  const n = new Date()
  const m = n.getHours() * 60 + n.getMinutes()
  nowTop.value = (m - HOUR_START * 60) / TOTAL_MINUTES * 100
}
refreshNowLine()

onMounted(() => { nowTimer = setInterval(refreshNowLine, 60000) })
onUnmounted(() => clearInterval(nowTimer))

function onCellClick(day, evt) {
  if (evt.target.closest('.week-item')) return
  const start = `${day.key} 09:00`
  const end = `${day.key} 10:00`
  emit('create-block', { prefill: { start_at: start, end_at: end } })
}
</script>

<template>
  <div class="week-panel">
    <div class="week-header">
      <div class="week-title">{{ weekTitle }}<span v-if="weekOffset !== 0" class="week-offset-hint">（{{ weekOffset > 0 ? '下' : '上' }} {{ Math.abs(weekOffset) }} 周）</span></div>
      <div class="week-nav">
        <DewButton size="sm" type="ghost" @click="weekOffset -= 1"><el-icon><ArrowLeft /></el-icon></DewButton>
        <DewButton size="sm" type="ghost" @click="weekOffset = 0">本周</DewButton>
        <DewButton size="sm" type="ghost" @click="weekOffset += 1"><el-icon><ArrowRight /></el-icon></DewButton>
      </div>
    </div>

    <DewSkeleton v-if="loading" variant="rect" :height="420" />
    <div v-else class="week-grid-wrap">
      <div class="week-grid">
        <div class="week-corner"></div>
        <div v-for="day in dayColumns" :key="day.key" class="week-day-head" :class="{ 'is-today': day.isToday }">
          <span class="day-name">{{ day.label }}</span>
          <span class="day-num">{{ day.dayOfMonth }}</span>
          <button class="day-add" title="新建日程" @click.stop="emit('create-event', { prefill: { start_at: `${day.key} 09:00`, end_at: `${day.key} 10:00` } })">
            <el-icon><Plus /></el-icon>
          </button>
        </div>

        <div class="week-time-axis">
          <div v-for="h in hourLabels" :key="h" class="axis-label">{{ h }}</div>
        </div>
        <div v-for="day in dayColumns" :key="day.key" class="week-day-col" :class="{ 'is-today': day.isToday }"
          @click="onCellClick(day, $event)">
          <div v-for="e in day.allDayEvents" :key="'allday' + e.id" class="allday-banner">
            {{ e.title }}
          </div>
          <div class="day-body">
            <div v-if="day.isToday && nowTop !== null && nowTop >= 0 && nowTop <= 100"
              class="now-line" :style="{ top: nowTop + '%' }"></div>
            <div v-for="it in day.positioned" :key="it.key" class="week-item"
              :class="[it.type === 'event' ? 'is-event' : 'is-block', { 'is-conflict': it.conflict }]"
              :style="it.span"
              @click.stop="it.type === 'event' ? emit('edit-event', it.raw) : emit('edit-block', it.raw)">
              <span class="item-title">{{ it.title }}</span>
              <DewTag v-if="it.conflict" type="danger" size="sm">冲突</DewTag>
              <DewTag v-else-if="it.type === 'block' && it.locked" type="neutral" size="sm">锁</DewTag>
            </div>
          </div>
        </div>
      </div>
      <p class="week-hint">点击空白处安排任务时间；点击色块调整时间或锁定</p>
    </div>
  </div>
</template>

<style scoped>
.week-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.week-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.week-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--dew-text-heading);
}

.week-offset-hint {
  font-size: var(--text-sm);
  font-weight: 400;
  color: var(--dew-text-muted);
  margin-left: 6px;
}

.week-nav {
  display: flex;
  gap: 6px;
}

.week-grid-wrap {
  border-radius: var(--radius-md);
  background: var(--dew-dialog-bg);
  border: 1px solid var(--dew-card-divider);
  overflow-x: auto;
}

.week-grid {
  display: grid;
  grid-template-columns: 48px repeat(7, minmax(96px, 1fr));
  min-width: 760px;
}

.week-corner {
  border-bottom: 1px solid var(--dew-card-divider);
}

.week-day-head {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 4px;
  border-bottom: 1px solid var(--dew-card-divider);
  border-left: 1px solid var(--dew-card-divider);
  font-size: var(--text-sm);
  color: var(--dew-text);
}

.week-day-head.is-today {
  color: var(--color-primary);
  font-weight: 600;
}

.day-num {
  font-size: var(--text-base);
}

.day-add {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--dew-text-faint);
  display: inline-flex;
  padding: 2px;
  border-radius: 6px;
}

.day-add:hover {
  color: var(--color-primary);
  background: var(--color-primary-subtle, rgba(59, 130, 246, 0.1));
}

.week-time-axis {
  position: relative;
}

.axis-label {
  height: 160px;   /* 2 小时 × 80px/小时（网格总高 18h×80px=1440px） */
  font-size: var(--text-xs);
  color: var(--dew-text-faint);
  text-align: right;
  padding-right: 6px;
  transform: translateY(-6px);
}

.week-day-col {
  position: relative;
  border-left: 1px solid var(--dew-card-divider);
  min-height: 1440px;
  padding: 0 2px;
  cursor: copy;
}

.week-day-col.is-today {
  background: var(--color-primary-subtle, rgba(59, 130, 246, 0.05));
}

.allday-banner {
  margin: 4px 2px 0;
  padding: 3px 8px;
  border-radius: 8px;
  font-size: var(--text-xs);
  background: var(--color-primary-light, rgba(59, 130, 246, 0.16));
  color: var(--dew-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.day-body {
  position: relative;
  height: 1440px;
}

.day-body::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0 79px,
    var(--dew-card-divider) 79px 80px);
  pointer-events: none;
}

.now-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  border-top: 2px solid var(--color-danger);
  z-index: 5;
  pointer-events: none;
}

.week-item {
  position: absolute;
  left: 3px;
  right: 3px;
  border-radius: 8px;
  padding: 3px 6px;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  gap: 4px;
  z-index: 2;
  font-size: var(--text-xs);
}

.week-item.is-event {
  background: var(--color-primary-light, rgba(59, 130, 246, 0.18));
  color: var(--dew-text);
}

.week-item.is-block {
  background: var(--color-success-light, rgba(16, 185, 129, 0.18));
  color: var(--dew-text);
}

.week-item.is-conflict {
  border: 1.5px solid var(--color-danger);
}

.item-title {
  flex: 1;
  line-height: 1.35;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.week-hint {
  font-size: var(--text-xs);
  color: var(--dew-text-faint);
}
</style>
