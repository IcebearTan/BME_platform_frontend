<script setup>
// 日历面板（W1 · BMEMate 工作台）：FullCalendar 多视图替代旧 WeekGrid。
// 周视图默认；日/月/列表切换；按可见范围拉 agenda（42 天窗口，端点换算见
// composable）；点空档预填新建（时间视图带时刻、月视图默认 9:00 起一小时）；
// 点对象走既有编辑弹窗。拖拽/缩放属 W2，本期 editable=false。
import { ref, computed, watch } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import zhCnLocale from '@fullcalendar/core/locales/zh-cn'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { useScheduleCalendar, fmtDate, fmtMinute, exclusiveEndToInclusive } from '../../composables/useScheduleCalendar'

const props = defineProps({
  refreshKey: { type: Number, default: 0 },
  initialView: { type: String, default: 'timeGridWeek' }
})
const emit = defineEmits(['create-event', 'edit-event', 'create-block', 'edit-block'])

const cal = useScheduleCalendar()
const calendarRef = ref(null)
const viewTitle = ref('')
const activeView = ref(props.initialView)

const VIEWS = [
  { value: 'timeGridDay', label: '日' },
  { value: 'timeGridWeek', label: '周' },
  { value: 'dayGridMonth', label: '月' },
  { value: 'listWeek', label: '列表' }
]

// events 并入 options（vue3 包装组件的正规用法：深 watch options 重建）
const calendarOptions = computed(() => ({
  plugins: [timeGridPlugin, dayGridPlugin, listPlugin, interactionPlugin],
  initialView: props.initialView,
  locale: zhCnLocale,
  headerToolbar: false,
  height: '100%',
  firstDay: 1,
  nowIndicator: true,
  editable: false,
  selectable: false,
  allDaySlot: true,
  slotDuration: '00:30:00',
  slotLabelInterval: '01:00',
  scrollTime: '08:00:00',
  dayMaxEventRows: 4,
  events: cal.fcEvents.value,
  dayPopoverFormat: { month: 'long', day: 'numeric', weekday: 'short' },
  datesSet(info) {
    viewTitle.value = info.view.title
    // FC 的 end 为排他边界 → agenda 闭区间换算；同一范围不重复拉
    cal.load(fmtDate(info.start), exclusiveEndToInclusive(info.end))
  },
  dateClick(info) {
    // 时间视图带具体时刻；月/全天格无时刻 → 预填当日 09:00–10:00
    if (info.view.type.startsWith('timeGrid')) {
      const start = fmtMinute(info.date)
      const end = fmtMinute(new Date(info.date.getTime() + 60 * 60 * 1000))
      emit('create-event', { prefill: { start_at: start, end_at: end } })
    } else {
      const day = fmtDate(info.date)
      emit('create-event', { prefill: { start_at: `${day} 09:00`, end_at: `${day} 10:00` } })
    }
  },
  eventClick(info) {
    const raw = cal.byKey.value.get(info.event.id)
    if (!raw) return
    if (info.event.id.startsWith('event:')) emit('edit-event', raw)
    else emit('edit-block', raw)
  }
}))

function api() { return calendarRef.value?.getApi() }
function prev() { api()?.prev() }
function next() { api()?.next() }
function today() { api()?.today() }
function switchView(v) {
  activeView.value = v
  api()?.changeView(v)
}

// 外部数据落定（录入/编辑保存/撤销）→ 强制重拉当前范围
watch(() => props.refreshKey, () => cal.refresh())
</script>

<template>
  <div class="sw-panel sw-cal-wrap">
    <div class="sw-cal-toolbar">
      <button class="sw-cal-btn" @click="today">今天</button>
      <button class="sw-cal-btn" aria-label="上一页" @click="prev"><el-icon><ArrowLeft /></el-icon></button>
      <button class="sw-cal-btn" aria-label="下一页" @click="next"><el-icon><ArrowRight /></el-icon></button>
      <span class="sw-cal-title">{{ viewTitle }}</span>
      <div class="sw-cal-views">
        <button v-for="v in VIEWS" :key="v.value" class="sw-cal-view"
          :class="{ 'is-active': activeView === v.value }" @click="switchView(v.value)">
          {{ v.label }}
        </button>
      </div>
    </div>

    <div class="sw-cal-legend">
      <span><i class="sw-legend-dot" style="background: var(--sw-event-bg);"></i>固定日程</span>
      <span><i class="sw-legend-dot" style="background: var(--sw-block-bg); border: 1px solid var(--sw-block-border);"></i>任务执行块</span>
      <span v-if="cal.error.value" style="color: var(--sw-danger);">· {{ cal.error.value }}</span>
    </div>

    <div v-if="cal.error.value && !cal.agenda.value" class="sw-error">
      日历加载失败：{{ cal.error.value }}
      <button class="sw-cal-btn" style="margin-left: 10px;" @click="cal.refresh()">重试</button>
    </div>
    <div v-else class="sw-cal-canvas">
      <FullCalendar ref="calendarRef" :options="calendarOptions" />
    </div>
  </div>
</template>
