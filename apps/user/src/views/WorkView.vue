<script setup>
// 内部工作台主页（feature/work-collab M2）。
// IA（设计方案 §6.1）：我的待办（先展示需要本人行动的事，未读与待办分开计数）
// / 小组工作（话题+任务列表+筛选）。工作资料（M4）/工作记录（M5）随后续版本加入 tab。
// 待办摘要 30s 轮询（活动页可见时），与铃铛未读互不替代。
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import MenuComponent from '../components/MenuComponent.vue'
import PageFooterComponent from '../components/PageFooterComponent.vue'
import MobileMenuComponent from '../components/MobileMenuComponent.vue'
import { DewCard, DewTag, DewSkeleton, DewButton, DewButtonBar } from '@bme/dew-ui'
import { Expand, Briefcase, Folder, Clock, ChatLineSquare, Bell } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useWorkAccess } from '../composables/useWorkAccess'
import { useWorkData } from '../composables/useWorkData'
import { workService } from '../services/workService'
import WorkGroupBoard from '../components/Work/WorkGroupBoard.vue'
import WorkFilesIndex from '../components/Work/WorkFilesIndex.vue'
import WorkRecordsIndex from '../components/Work/WorkRecordsIndex.vue'

const store = useStore()
const router = useRouter()
const route = useRoute()
const isDarkMode = computed(() => store.getters.isDarkMode)

const isMobile = ref(window.innerWidth <= 768)
const isMobileMenuOpen = ref(false)
const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) isMobileMenuOpen.value = false
}
const toggleMobileMenu = () => { isMobileMenuOpen.value = !isMobileMenuOpen.value }
onMounted(() => window.addEventListener('resize', checkScreenSize))
onUnmounted(() => window.removeEventListener('resize', checkScreenSize))

// ── 资格探测（三段式：loading → 内容/空态 → 失败重试） ──
const { me, hasAccess, isGovernance, detecting, detectFailed, detect } = useWorkAccess()
const { todoCounts, refreshSummary, startSummaryPolling, stopSummaryPolling } = useWorkData()
const loadFailed = computed(() => detectFailed.value)
// 探测通过后统一走「数据装载 + 轮询启动」路径（幂等）：重试成功不再漏待办/摘要
const load = async () => {
  await detect(true)
  if (hasAccess.value) {
    await Promise.allSettled([refreshSummary(), loadTodos()])
    startSummaryPolling()
  }
}
const loading = computed(() => detecting.value && !me.value && !loadFailed.value)

// ── Tab（URL 即状态，DewButtonBar 范式，CampView/NotificationInbox 同款） ──
// 徽标口径 = 摘要条五桶之和（待回复/待接手/待验收/即将到期/已逾期）
const todoBadgeTotal = computed(() =>
  (todoCounts.value.pending_responses || 0)
  + (todoCounts.value.pending_transfers || 0)
  + (todoCounts.value.to_review || 0)
  + (todoCounts.value.due_soon || 0)
  + (todoCounts.value.overdue || 0))
const tabItems = computed(() => [
  { value: 'todo', label: '我的待办', icon: Bell, badge: todoBadgeTotal.value || undefined },
  { value: 'group', label: '小组工作', icon: ChatLineSquare },
  { value: 'files', label: '工作资料', icon: Folder },
  { value: 'records', label: '工作记录', icon: Clock },
])
const TAB_VALUES = ['todo', 'group', 'files', 'records']
const activeTab = ref(TAB_VALUES.includes(route.query.tab) ? route.query.tab : 'todo')
watch(() => route.query.tab, (t) => {
  if (TAB_VALUES.includes(t)) activeTab.value = t
})
watch(activeTab, (t) => {
  if (route.query.tab !== t) router.replace({ query: { ...route.query, tab: t } })
})

const todoChips = computed(() => [
  { label: '待回复', value: todoCounts.value.pending_responses || 0 },
  { label: '待接手', value: todoCounts.value.pending_transfers || 0 },
  { label: '待验收', value: todoCounts.value.to_review || 0 },
  { label: '即将到期', value: todoCounts.value.due_soon || 0 },
  { label: '已逾期', value: todoCounts.value.overdue || 0 },
])

// ── 待办四桶（§6.1：待接手/待回复/待验收/到期；M3 全量点亮） ──
const todos = ref({ pending_responses: [], pending_transfers: [], to_review: [], due: [] })
const todosLoading = ref(false)
const todosFailed = ref(false)       // 失败与空态分开：干部不错过转交接手/待验收
async function loadTodos() {
  todosLoading.value = true
  todosFailed.value = false
  try {
    const res = await workService.fetchTodos()
    todos.value = {
      pending_responses: res.data?.pending_responses || [],
      pending_transfers: res.data?.pending_transfers || [],
      to_review: res.data?.to_review || [],
      due: res.data?.due || [],
    }
  } catch {
    todosFailed.value = true
  } finally {
    todosLoading.value = false
  }
}

// 转交决策按「转交 id + 动作」分键：多张卡互不齐转
const deciding = reactive({})
async function decideTransfer(transferId, action) {
  const key = `${transferId}:${action}`
  if (deciding[key]) return
  deciding[key] = true
  try {
    const res = await workService.decideTransfer(transferId, action)
    ElMessage.success(res.message || '已处理')
    await Promise.allSettled([loadTodos(), refreshSummary()])
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  } finally {
    delete deciding[key]
  }
}

onMounted(load)
onUnmounted(stopSummaryPolling)

const goOrganization = () => router.push('/organization')
// 治理提示分流：管理端登录仅超管放行（isStaff 只认 super_admin），治理授权人员走超管代办
const isSuperAdmin = computed(() => store.getters.role === 'super_admin')
</script>

<template>
  <div :class="['work-view-container', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <el-container class="common-layout">
      <el-header class="header-container">
        <div v-if="!isMobile" class="desktop-menu-container">
          <MenuComponent />
        </div>
        <div v-else class="mobile-header">
          <div class="mobile-logo">
            <img style="width: 40px; height: auto;" src="../assets/Logo_NewYear.png" @click="router.push('/')" />
          </div>
          <el-icon class="hamburger-icon" @click="toggleMobileMenu">
            <Expand />
          </el-icon>
        </div>
      </el-header>

      <MobileMenuComponent v-if="isMobile && isMobileMenuOpen" @close="toggleMobileMenu" />

      <el-main class="main-content">
        <div class="content-wrapper">
          <!-- 骨架（L1：形制对齐真实内容，防 CLS） -->
          <template v-if="loading">
            <DewSkeleton variant="rect" :height="28" :width="220" class="sk-block" />
            <DewSkeleton variant="text" :lines="2" class="sk-block" />
            <div class="ws-grid">
              <DewCard v-for="i in 2" :key="i" size="md">
                <DewSkeleton variant="text" :lines="3" />
              </DewCard>
            </div>
          </template>

          <!-- 失败态：可见 + 可重试 -->
          <DewCard v-else-if="loadFailed" size="md" class="state-card">
            <p class="state-text">工作台信息加载失败，请稍后重试</p>
            <DewButton size="sm" @click="load">重试</DewButton>
          </DewCard>

          <!-- 无资格空态：面向学员的友好说明（入口卡本就不可见，多为直达 URL） -->
          <DewCard v-else-if="!hasAccess" size="md" class="state-card">
            <div class="empty-icon"><el-icon><Briefcase /></el-icon></div>
            <h3 class="state-title">内部工作台</h3>
            <p class="state-text">
              这里是社团工作人员的内部协作区（话题讨论、任务跟进与工作留痕），
              面向已开通权限的干事与组内工作人员。如你认为自己需要访问，请联系平台负责人开通。
            </p>
            <DewButton size="sm" @click="goOrganization">查看社团组织架构</DewButton>
          </DewCard>

          <!-- 工作台主体 -->
          <template v-else>
            <div class="page-header">
              <div class="page-title-row">
                <span class="title-accent"></span>
                <h1 class="page-title">内部工作台</h1>
                <DewTag v-if="isGovernance" type="info" size="sm" round>治理</DewTag>
              </div>
              <p class="sub-title">
                组内协作、任务跟进与工作留痕；未读消息与待办分开计数，先看需要你行动的事
              </p>
            </div>

            <!-- 待办摘要条 -->
            <div class="todo-strip">
              <div v-for="c in todoChips" :key="c.label" class="todo-chip"
                   :class="{ 'todo-chip--hot': c.value > 0 }" @click="activeTab = 'todo'">
                <span class="todo-num">{{ c.value }}</span>
                <span class="todo-label">{{ c.label }}</span>
              </div>
            </div>

            <!-- Tab 切换（DewButtonBar：icon/badge/滑动指示器原生支持） -->
            <div class="work-tabs">
              <DewButtonBar v-model="activeTab" :items="tabItems" />
            </div>

            <!-- 我的待办（四桶：先看需要你行动的事，§6.1） -->
            <div v-if="activeTab === 'todo'">
              <DewSkeleton v-if="todosLoading && !todos.pending_responses.length
                                 && !todos.pending_transfers.length" variant="text" :lines="3" />
              <DewCard v-else-if="todosFailed" size="md">
                <p class="state-text">待办加载失败，转交接手与待验收可能被错过，请重试</p>
                <DewButton size="sm" :loading="todosLoading" @click="loadTodos">重试</DewButton>
              </DewCard>
              <DewCard v-else-if="!todos.pending_responses.length && !todos.pending_transfers.length
                                   && !todos.to_review.length && !todos.due.length" size="md">
                <p class="state-text">当前没有等待你行动的事项；待回复、待接手、待验收与到期任务会出现在这里</p>
              </DewCard>
              <template v-else>
                <!-- 待接手：转交确认 -->
                <div v-if="todos.pending_transfers.length" class="bucket-title">待接手</div>
                <DewCard v-for="t in todos.pending_transfers" :key="t.transfer_id" size="md" class="todo-card">
                  <div class="todo-row">
                    <div class="todo-main" @click="router.push(`/work/items/${t.item_id}`)">
                      <div class="todo-title">{{ t.item_title }}</div>
                      <div class="todo-meta">
                        <span>转交给你的任务，确认后你成为负责人</span>
                        <span class="todo-due">确认期限 {{ t.expires_at }}</span>
                      </div>
                    </div>
                    <DewButton size="sm" type="danger"
                               :loading="!!deciding[`${t.transfer_id}:reject`]"
                               @click="decideTransfer(t.transfer_id, 'reject')">拒绝</DewButton>
                    <DewButton size="sm" active
                               :loading="!!deciding[`${t.transfer_id}:accept`]"
                               @click="decideTransfer(t.transfer_id, 'accept')">接手</DewButton>
                  </div>
                </DewCard>
                <!-- 待回复 -->
                <div v-if="todos.pending_responses.length" class="bucket-title">待回复</div>
                <DewCard v-for="t in todos.pending_responses" :key="t.request_id" size="md" interactive
                         class="todo-card" @click="router.push(`/work/items/${t.item_id}`)">
                  <div class="todo-row">
                    <div class="todo-main">
                      <div class="todo-title">{{ t.item_title }}</div>
                      <div class="todo-meta">
                        <span>{{ t.requested_by }} 请求你回复</span>
                        <span v-if="t.due_at" class="todo-due">建议时限 {{ t.due_at }}</span>
                        <span>{{ t.created_at }}</span>
                      </div>
                    </div>
                    <DewButton size="sm">去回复</DewButton>
                  </div>
                </DewCard>
                <!-- 待验收 -->
                <div v-if="todos.to_review.length" class="bucket-title">待验收</div>
                <DewCard v-for="t in todos.to_review" :key="t.item_id" size="md" interactive
                         class="todo-card" @click="router.push(`/work/items/${t.item_id}`)">
                  <div class="todo-row">
                    <div class="todo-main">
                      <div class="todo-title">{{ t.item_title }}</div>
                      <div class="todo-meta"><span>提交待你验收</span></div>
                    </div>
                    <DewButton size="sm">去验收</DewButton>
                  </div>
                </DewCard>
                <!-- 到期（含逾期标记） -->
                <div v-if="todos.due.length" class="bucket-title">到期任务</div>
                <DewCard v-for="t in todos.due" :key="t.item_id" size="md" interactive
                         class="todo-card" @click="router.push(`/work/items/${t.item_id}`)">
                  <div class="todo-row">
                    <div class="todo-main">
                      <div class="todo-title">{{ t.item_title }}</div>
                      <div class="todo-meta">
                        <span :class="{ 'todo-due--hot': t.overdue }">
                          截止 {{ t.due_at }}{{ t.overdue ? '（已逾期）' : '' }}
                        </span>
                      </div>
                    </div>
                    <DewButton size="sm">去处理</DewButton>
                  </div>
                </DewCard>
              </template>
            </div>

            <!-- 小组工作 -->
            <WorkGroupBoard v-else-if="activeTab === 'group'" />
            <!-- 工作资料：附件索引（M4） -->
            <WorkFilesIndex v-else-if="activeTab === 'files'" />
            <!-- 工作记录：历史检索（M5） -->
            <WorkRecordsIndex v-else-if="activeTab === 'records'" />

            <DewCard v-if="isGovernance" size="md" class="hint-card">
              <div class="ws-row">
                <div class="ws-icon"><el-icon><ChatLineSquare /></el-icon></div>
                <p class="state-text">
                  {{ isSuperAdmin
                    ? '你持有协作治理身份：授权开通与撤销在管理端「组织架构 → 协作授权」进行'
                    : '你持有协作治理身份：授权开通与撤销由超级管理员在管理端操作，如需调整请联系超管' }}
                </p>
              </div>
            </DewCard>
          </template>
        </div>
      </el-main>

      <el-footer class="page-footer">
        <PageFooterComponent />
      </el-footer>
    </el-container>
  </div>
</template>

<style scoped>
/* 极光背景对齐 HomeView/ServiceHallView 规范单源（亮色四角 + 中心 cyan 五层、暗色含 amber 克制近黑） */
.work-view-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-attachment: fixed;
  transition: background 0.4s ease, color 0.3s ease;
}

.theme-light.work-view-container {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(96, 165, 250, 0.26), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(244, 114, 182, 0.24), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(52, 211, 153, 0.22), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(251, 191, 36, 0.20), transparent 55%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(34, 211, 238, 0.10), transparent 70%),
    linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdf4 100%);
  color: #303133;
}

.theme-dark.work-view-container {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(59, 130, 246, 0.18), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(236, 72, 153, 0.15), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(16, 185, 129, 0.14), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(245, 158, 11, 0.12), transparent 55%),
    linear-gradient(160deg, #16161a 0%, #0f0f12 100%);
  color: #E5EAF3;
}

.header-container { padding: 0; height: auto; z-index: 100; position: fixed; width: 100%; top: 0; left: 0; }
.main-content { flex: 1; padding: 100px 20px 40px; display: flex; justify-content: center; overflow-x: hidden; }
.page-footer { padding: 0; height: auto; }

.content-wrapper { width: 100%; max-width: 960px; animation: workFadeInUp 0.6s ease-out; }
@keyframes workFadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }

.sk-block { margin-bottom: 16px; }

/* 页头定式对齐 OrganizationView 标杆（28px 标题 / 4x26 r2 强调条 / 15px 副题） */
.page-header { margin-bottom: 20px; }
.page-title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.title-accent {
  display: inline-block;
  width: 4px; height: 26px; border-radius: 2px;
  background: linear-gradient(180deg, #3b82f6, #8b5cf6);
}
.page-title { font-size: 28px; font-weight: 700; margin: 0; color: var(--dew-text-heading); }
.sub-title { font-size: 15px; margin: 0; color: var(--dew-text-muted); }

.todo-strip { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
.todo-chip {
  display: flex; align-items: baseline; gap: 6px;
  padding: 10px 16px; border-radius: 12px; cursor: pointer;
  background: var(--dew-card-bg, rgba(255, 255, 255, 0.6));
  border: 1px solid var(--dew-card-border, rgba(255, 255, 255, 0.5));
  transition: transform 0.25s var(--dew-bounce), background 0.25s ease;
}
.todo-chip:hover {
  transform: translateY(-1px);
  background: var(--dew-card-bg-hover, rgba(255, 255, 255, 0.85));
}
.todo-num { font-size: 20px; font-weight: 700; font-variant-numeric: tabular-nums; }
.todo-chip--hot .todo-num { color: var(--el-color-danger, #f56c6c); }
.todo-label { font-size: 12.5px; color: var(--dew-text-muted); }

/* Tab 条容器：DewButtonBar 自适应宽，超窄屏（375px）横向滚动兜底（同消息中心 inbox-tabs 范式） */
.work-tabs {
  margin-bottom: 16px;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
}
.work-tabs::-webkit-scrollbar { display: none; }

.todo-card { margin-bottom: 10px; }
.todo-row { display: flex; align-items: center; gap: 12px; }
.todo-main { flex: 1; min-width: 0; }
.todo-title { font-size: 14.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.todo-meta { display: flex; gap: 10px; margin-top: 4px; font-size: 12px; color: var(--dew-text-muted); flex-wrap: wrap; }
.todo-due { color: var(--el-color-warning, #e6a23c); }
.todo-due--hot { color: var(--el-color-danger, #f56c6c); font-weight: 600; }
.bucket-title {
  font-size: 13px; font-weight: 600; color: var(--dew-text-muted);
  margin: 6px 0 8px;
}

.hint-card { margin-top: 16px; }
.ws-row { display: flex; align-items: center; gap: 12px; }
.ws-icon {
  width: 40px; height: 40px; border-radius: 12px; flex: none;
  display: flex; align-items: center; justify-content: center; font-size: 20px;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  color: var(--color-primary);
}

.state-card { max-width: 560px; margin: 40px auto 0; text-align: center; }
.empty-icon {
  width: 48px; height: 48px; margin: 0 auto 12px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center; font-size: 24px;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  color: var(--color-primary);
}
.state-title { margin: 0 0 8px; font-size: 17px; font-weight: 600; }
.state-text { margin: 0 0 12px; font-size: 13px; line-height: 1.7; color: var(--dew-text-muted); text-align: left; }

@media (max-width: 768px) {
  .main-content { padding: 84px 14px 32px; }
  .todo-strip { gap: 8px; }
  .todo-chip { padding: 8px 12px; }
  .hamburger-icon { font-size: 22px; cursor: pointer; color: var(--el-text-color-primary); }
  .mobile-header { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 8px 14px; }
  .mobile-logo img { cursor: pointer; }
}
</style>
