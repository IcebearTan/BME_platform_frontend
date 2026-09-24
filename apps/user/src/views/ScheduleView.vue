<script setup>
// 我的日程（AI 日程模块 Phase 1 · 2026-09-24）：今日/周历/待安排/设置四页签，
// ?tab= 单页范式（URL 即状态，铃铛/深链可直达页签；日报页签 Phase 3 上线）。
// 三个编辑弹窗在本容器编排，保存后统一 bump refreshKey 驱动各面板重拉。
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { Expand } from '@element-plus/icons-vue'
import MenuComponent from '../components/MenuComponent.vue'
import PageFooterComponent from '../components/PageFooterComponent.vue'
import MobileMenuComponent from '../components/MobileMenuComponent.vue'
import ScheduleTodayPanel from '../components/schedule/ScheduleTodayPanel.vue'
import ScheduleWeekGrid from '../components/schedule/ScheduleWeekGrid.vue'
import ScheduleBacklogPanel from '../components/schedule/ScheduleBacklogPanel.vue'
import ScheduleSettingsPanel from '../components/schedule/ScheduleSettingsPanel.vue'
import ScheduleTaskDialog from '../components/schedule/ScheduleTaskDialog.vue'
import ScheduleEventDialog from '../components/schedule/ScheduleEventDialog.vue'
import ScheduleBlockDialog from '../components/schedule/ScheduleBlockDialog.vue'
import SchedulePlanCard from '../components/schedule/SchedulePlanCard.vue'

const route = useRoute()
const router = useRouter()
const store = useStore()
const isDarkMode = computed(() => store.getters.isDarkMode)

// --- 响应式 Header 逻辑（对齐 ResourceCenter 外壳） ---
const isMobile = ref(window.innerWidth <= 768)
const isMobileMenuOpen = ref(false)
const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) isMobileMenuOpen.value = false
}
const toggleMobileMenu = () => { isMobileMenuOpen.value = !isMobileMenuOpen.value }
window.addEventListener('resize', checkScreenSize)

// ── 页签：URL 即状态 ──
const TABS = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '周历' },
  { value: 'backlog', label: '待安排' },
  { value: 'settings', label: '设置' }
]
const VALID_TABS = TABS.map((t) => t.value)
const normalizeTab = (tab) => (VALID_TABS.includes(tab) ? tab : 'today')
const activeTab = ref(normalizeTab(route.query.tab))
watch(activeTab, (tab) => {
  if (route.query.tab !== tab) {
    router.replace({ query: { ...route.query, tab: tab === 'today' ? undefined : tab } })
  }
})
watch(() => route.query.tab, (tab) => {
  const next = normalizeTab(tab)
  if (next !== activeTab.value) activeTab.value = next
})

// ── 弹窗编排 + 数据刷新 ──
const refreshKey = ref(0)
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
</script>

<template>
  <div :class="['schedule-page', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <el-container>
      <el-header class="header-container">
        <div v-if="!isMobile" class="desktop-menu-container">
          <MenuComponent />
        </div>
        <div v-else class="mobile-header">
          <div class="mobile-logo">
            <img style="width: 40px; height: auto;" src="../assets/Logo_NewYear.png" @click="$router.push('/')"
              alt="Logo" />
          </div>
          <el-icon class="hamburger-icon" @click="toggleMobileMenu">
            <Expand />
          </el-icon>
        </div>
      </el-header>

      <MobileMenuComponent v-if="isMobile && isMobileMenuOpen" @close="toggleMobileMenu" />

      <el-main class="page-main">
        <div class="schedule-content">
          <div class="schedule-header">
            <div>
              <h1 class="page-title">我的日程</h1>
              <p class="page-subtitle">任务、日程与提醒的个人闭环</p>
            </div>
          </div>

          <div class="tab-bar">
            <button v-for="t in TABS" :key="t.value" class="tab-item"
              :class="{ 'is-active': activeTab === t.value }" @click="activeTab = t.value">
              {{ t.label }}
            </button>
          </div>

          <ScheduleTodayPanel v-show="activeTab === 'today'" :refresh-key="refreshKey"
            @create-task="openCreateTask" @edit-task="openEditTask"
            @create-event="openCreateEvent" @edit-event="openEditEvent"
            @create-block="openCreateBlock" @edit-block="openEditBlock" />
          <SchedulePlanCard v-if="pendingProposal" :plan="pendingProposal"
            @applied="onProposalSettled(true)" @dismissed="onProposalSettled(false)" />
          <ScheduleWeekGrid v-show="activeTab === 'week'" :refresh-key="refreshKey"
            @create-event="openCreateEvent" @edit-event="openEditEvent"
            @create-block="openCreateBlock" @edit-block="openEditBlock" />
          <ScheduleBacklogPanel v-show="activeTab === 'backlog'" :refresh-key="refreshKey"
            @edit-task="openEditTask" @create-block="openCreateBlock" />
          <ScheduleSettingsPanel v-show="activeTab === 'settings'" />
        </div>
      </el-main>
      <el-footer class="page-footer">
        <PageFooterComponent />
      </el-footer>
    </el-container>

    <ScheduleTaskDialog v-model="taskDialog.visible" :task="taskDialog.task" @saved="onTaskSaved" />
    <ScheduleEventDialog v-model="eventDialog.visible" :event="eventDialog.event" :prefill="eventDialog.prefill"
      @saved="onSaved" />
    <ScheduleBlockDialog v-model="blockDialog.visible" :block="blockDialog.block" :initial-task-id="blockDialog.taskId"
      :prefill="blockDialog.prefill" @saved="onSaved" />
  </div>
</template>

<style scoped>
/* 根容器：亮/暗双极光底（对齐 HomeView / ResourceCenter 规范） */
.schedule-page {
  min-height: 100vh;
  background-attachment: fixed;
  transition: background 0.4s ease;
}

.theme-light.schedule-page {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(96, 165, 250, 0.26), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(244, 114, 182, 0.24), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(52, 211, 153, 0.22), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(251, 191, 36, 0.20), transparent 55%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(34, 211, 238, 0.10), transparent 70%),
    linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdf4 100%);
}

.theme-dark.schedule-page {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(59, 130, 246, 0.18), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(236, 72, 153, 0.15), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(16, 185, 129, 0.14), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(245, 158, 11, 0.12), transparent 55%),
    linear-gradient(160deg, #16161a 0%, #0f0f12 100%);
}

.header-container {
  display: flex;
  justify-content: center;
  align-items: center;
  border-bottom: solid 1px var(--dew-card-divider);
  padding: 0;
  height: 60px;
  position: relative;
}

.mobile-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
}

.hamburger-icon {
  font-size: 22px;
  cursor: pointer;
}

.page-main {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 24px 16px 48px;
}

.schedule-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.schedule-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--dew-text-heading);
  margin: 0;
}

.page-subtitle {
  font-size: var(--text-sm);
  color: var(--dew-text-muted);
  margin: 4px 0 0;
}

.tab-bar {
  display: inline-flex;
  align-self: flex-start;
  border-radius: var(--radius-full, 999px);
  background: var(--dew-card-bg);
  border: 1px solid var(--dew-card-divider);
  padding: 3px;
  backdrop-filter: blur(12px);
}

.tab-item {
  border: none;
  background: none;
  padding: 7px 18px;
  font-size: var(--text-sm);
  color: var(--dew-text-muted);
  border-radius: var(--radius-full, 999px);
  cursor: pointer;
  transition: color 0.2s ease;
}

.tab-item.is-active {
  background: var(--color-primary);
  color: #fff;
}

.page-footer {
  padding: 0;
}
</style>
