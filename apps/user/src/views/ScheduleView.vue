<script setup>
// 我的日程工作台（W1 · BMEMate 风格，2026-10-02 重构）：
// 100vh 三段骨架（侧栏/顶栏/内容独立滚动），替代平台大导航外壳——页脚不占
// 日历高度，其他业务页布局不变。tab=today/calendar/tasks/settings（?tab=
// 单页范式保留）；旧链接兼容：tab=week → tab=calendar&view=week、
// tab=backlog → tab=tasks&filter=unscheduled（计划 §4.2）。
// 三个编辑弹窗与方案卡在本容器编排；AI 助手抽屉统一承载录入结果/澄清卡，
// 提交后自动展开（今日页保留快捷输入入口）。
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import '../styles/schedule-workspace.css'
import ScheduleWorkspaceSidebar from '../components/schedule/ScheduleWorkspaceSidebar.vue'
import ScheduleWorkspaceHeader from '../components/schedule/ScheduleWorkspaceHeader.vue'
import ScheduleTodayPanel from '../components/schedule/ScheduleTodayPanel.vue'
import ScheduleCalendarPanel from '../components/schedule/ScheduleCalendarPanel.vue'
import ScheduleBacklogPanel from '../components/schedule/ScheduleBacklogPanel.vue'
import ScheduleSettingsPanel from '../components/schedule/ScheduleSettingsPanel.vue'
import ScheduleAssistantPanel from '../components/schedule/ScheduleAssistantPanel.vue'
import ScheduleTaskDialog from '../components/schedule/ScheduleTaskDialog.vue'
import ScheduleEventDialog from '../components/schedule/ScheduleEventDialog.vue'
import ScheduleBlockDialog from '../components/schedule/ScheduleBlockDialog.vue'
import SchedulePlanCard from '../components/schedule/SchedulePlanCard.vue'
import { useScheduleCapture } from '../composables/useScheduleCapture'

const route = useRoute()
const router = useRouter()
const store = useStore()
const isDarkMode = computed(() => store.getters.isDarkMode)

// ── 页签：URL 即状态；旧 tab 入口兼容（replace 到新口径，历史链接不碎） ──
const TABS = [
  { value: 'today', label: '今日' },
  { value: 'calendar', label: '日历' },
  { value: 'tasks', label: '任务' },
  { value: 'settings', label: '设置' }
]
const VALID_TABS = TABS.map((t) => t.value)
const LEGACY_TAB_MAP = {
  week: { tab: 'calendar', extra: { view: 'week' } },
  backlog: { tab: 'tasks', extra: { filter: 'unscheduled' } }
}
const VIEW_MAP = { day: 'timeGridDay', week: 'timeGridWeek', month: 'dayGridMonth', list: 'listWeek' }

const normalizeTab = (tab) => (VALID_TABS.includes(tab) ? tab : 'today')
const activeTab = ref(normalizeTab(route.query.tab))

// 首次进入带旧 tab：replace 成新口径（保留其余 query）
if (LEGACY_TAB_MAP[route.query.tab]) {
  const mapped = LEGACY_TAB_MAP[route.query.tab]
  const next = { ...route.query, ...mapped.extra }
  if (mapped.tab === 'today') delete next.tab
  else next.tab = mapped.tab
  router.replace({ query: next })
  activeTab.value = mapped.tab
}

watch(activeTab, (tab) => {
  if (route.query.tab !== tab) {
    const next = { ...route.query }
    if (tab === 'today') delete next.tab
    else next.tab = tab
    router.replace({ query: next })
  }
})
watch(() => route.query.tab, (tab) => {
  const next = normalizeTab(tab)
  if (next !== activeTab.value) activeTab.value = next
})

const calendarInitialView = computed(() => VIEW_MAP[route.query.view] || 'timeGridWeek')
const tasksInitialBucket = computed(() => route.query.filter || 'unscheduled')

const TAB_TITLES = { today: '今日', calendar: '日历', tasks: '任务', settings: '设置' }

// ── 弹窗编排 + 数据刷新 ──
const refreshKey = ref(0)
const { capture, phase: capturePhase, settleTick: captureSettleTick } = useScheduleCapture()
watch(captureSettleTick, () => { refreshKey.value += 1 })
const taskDialog = ref({ visible: false, task: null })
const eventDialog = ref({ visible: false, event: null, prefill: null })
const blockDialog = ref({ visible: false, block: null, taskId: null, prefill: null })

function openCreateTask() { taskDialog.value = { visible: true, task: null } }
function openEditTask(task) { taskDialog.value = { visible: true, task } }
function openCreateEvent(payload = {}) {
  eventDialog.value = { visible: true, event: null, prefill: payload.prefill || null }
}
function openEditEvent(event) { eventDialog.value = { visible: true, event, prefill: null } }
function openCreateBlock(payload = {}) {
  blockDialog.value = { visible: true, block: null, taskId: payload.taskId || null, prefill: payload.prefill || null }
}
function openEditBlock(block) { blockDialog.value = { visible: true, block, taskId: null, prefill: null } }
function onSaved() { refreshKey.value += 1 }

// manual 模式：新建任务产生的 proposed 方案 → 确认卡
const pendingProposal = ref(null)
function onTaskSaved(task, plan) {
  refreshKey.value += 1
  if (plan && plan.mode === 'proposed') pendingProposal.value = plan
}
function onProposalSettled(applied) {
  pendingProposal.value = null
  if (applied) refreshKey.value += 1
}

// ── AI 助手抽屉：录入一旦活动即自动展开，结果只在这一处渲染 ──
const assistantOpen = ref(false)
const ACTIVE_PHASES = ['submitting', 'processing', 'clarify_needed', 'done', 'failed', 'timeout', 'reverted']
watch(capturePhase, (p) => {
  if (capture.value && ACTIVE_PHASES.includes(p)) assistantOpen.value = true
})
const assistantLive = computed(() =>
  ['submitting', 'processing', 'clarify_needed'].includes(capturePhase.value) || !!capture.value)
</script>

<template>
  <div :class="['sw-workspace', isDarkMode ? 'theme-dark' : 'theme-light']">
    <ScheduleWorkspaceSidebar :active="activeTab" :items="TABS" @select="(t) => activeTab = t" />

    <div class="sw-body">
      <ScheduleWorkspaceHeader :title="TAB_TITLES[activeTab] || '我的日程'" :assistant-live="assistantLive"
        @open-assistant="assistantOpen = true" @back="router.push('/')" />

      <div class="sw-content">
        <div class="sw-content-inner">
          <ScheduleTodayPanel v-show="activeTab === 'today'" :refresh-key="refreshKey"
            @create-task="openCreateTask" @edit-task="openEditTask"
            @create-event="openCreateEvent" @edit-event="openEditEvent"
            @create-block="openCreateBlock" @edit-block="openEditBlock" />
          <ScheduleCalendarPanel v-show="activeTab === 'calendar'" :refresh-key="refreshKey"
            :initial-view="calendarInitialView"
            @create-event="openCreateEvent" @edit-event="openEditEvent"
            @create-block="openCreateBlock" @edit-block="openEditBlock" />
          <SchedulePlanCard v-if="pendingProposal" :plan="pendingProposal"
            @applied="onProposalSettled(true)" @dismissed="onProposalSettled(false)" />
          <ScheduleBacklogPanel v-show="activeTab === 'tasks'" :refresh-key="refreshKey"
            :initial-bucket="tasksInitialBucket"
            @edit-task="openEditTask" @create-block="openCreateBlock" />
          <ScheduleSettingsPanel v-show="activeTab === 'settings'" />
        </div>
      </div>
    </div>

    <ScheduleAssistantPanel v-model="assistantOpen" @edit-task="openEditTask" />

    <ScheduleTaskDialog v-model="taskDialog.visible" :task="taskDialog.task" @saved="onTaskSaved" />
    <ScheduleEventDialog v-model="eventDialog.visible" :event="eventDialog.event" :prefill="eventDialog.prefill"
      @saved="onSaved" />
    <ScheduleBlockDialog v-model="blockDialog.visible" :block="blockDialog.block" :initial-task-id="blockDialog.taskId"
      :prefill="blockDialog.prefill" @saved="onSaved" />
  </div>
</template>
