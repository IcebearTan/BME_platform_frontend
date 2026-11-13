<template>
  <div :class="['project-domain', 'camp-view', 'dew-page-background', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <div class="project-menu-space" />
    <MenuComponent />
    <div class="camp-wrap">
      <ProjectWorkspaceShell v-if="isWorkspace && context.project" standalone
        :sid="binding?.camp_id || null" :session="session" :perspective="perspective"
        :project-context="projectContext" @back="back" @binding-change="changeBinding"
        @perspective-change="changePerspective" @project-changed="refresh" />
      <template v-else-if="isWorkspace">
        <div v-if="loading" class="project-loading" role="status" aria-label="正在加载项目工作区"><DewSkeleton variant="rect" width="100%" height="220" /></div>
        <DewCard v-else variant="flat" no-hover class="project-load-error" role="alert">
          <h1>项目暂时无法打开</h1><p>{{ error || '该项目当前不可访问。' }}</p>
          <div class="pd-actions"><DewButton @click="load">重试</DewButton><DewButton type="ghost" @click="router.push('/my-projects')">我的项目</DewButton></div>
        </DewCard>
      </template>
      <main v-else class="project-directory">
        <header class="pd-head">
          <div><h1>我的项目</h1><p>查看负责或参与的项目，持续推进研发与团队协作。</p></div>
          <div class="pd-actions"><DewButton type="ghost" @click="router.push('/camp')">营期中心</DewButton><DewButton :disabled="loading || !!error" @click="createDialog = true"><el-icon><Plus /></el-icon>创建项目</DewButton></div>
        </header>
        <div v-if="loading" class="project-loading" role="status" aria-label="正在加载项目列表"><DewSkeleton variant="rect" width="100%" height="220" /></div>
        <DewCard v-else-if="error" variant="flat" no-hover role="alert"><p>{{ error }}</p><DewButton @click="load">重试</DewButton></DewCard>
        <template v-else>
          <ProjectImport v-if="isAdmin" :projects="projects" @changed="load" />
          <div class="pd-directory-tools">
            <p class="pd-count">共 <strong>{{ projects.length }}</strong> 个项目<span v-if="leadingCount"> · 我负责 {{ leadingCount }} 个</span></p>
            <div class="pd-filters"><DewInput v-model="keyword" placeholder="搜索项目名称、编号或负责人" clearable :prefix-icon="Search" /><DewSelect v-model="statusFilter" :options="statusOptions" aria-label="筛选项目状态" /></div>
          </div>
          <DewCard v-if="!projects.length" variant="flat" no-hover class="pd-empty">
            <el-icon class="pd-empty-icon"><FolderOpened /></el-icon><h2>还没有参与的项目</h2><p>创建项目后即可设置正式启动日、安排研发节点并邀请团队成员。</p><DewButton @click="createDialog = true">创建第一个项目</DewButton>
          </DewCard>
          <DewCard v-else-if="!filteredProjects.length" variant="flat" no-hover class="pd-empty"><h2>没有匹配的项目</h2><p>试试其他名称、编号，或清除筛选条件。</p><DewButton type="ghost" @click="clearFilters">清除筛选</DewButton></DewCard>
          <div v-else class="pd-projects">
            <DewCard v-for="project in filteredProjects" :key="project.id" no-hover class="pd-project-card">
              <div class="pd-card-top"><span class="pd-code">{{ project.code }}</span><DewTag size="sm">{{ statusText[project.status] || project.status }}</DewTag></div>
              <h2>{{ project.title }}</h2><p class="pd-goal">{{ project.goal || '项目目标待补充' }}</p>
              <div class="pd-card-meta"><span><el-icon><User /></el-icon>{{ roleText[project.my_role] || '项目成员' }}</span><span>{{ project.member_count }} 人</span><span v-if="project.owner_name">负责人 {{ project.owner_name }}</span></div>
              <div class="pd-plan-summary">
                <p><el-icon><Calendar /></el-icon><span>{{ project.zero_date ? 'D0 · '+project.zero_date : '正式启动日待确认' }}</span></p>
                <div v-if="project.research_summary?.total" class="pd-progress"><div><span>研发节点</span><span>{{ project.research_summary.done }} / {{ project.research_summary.total }} 已完成</span></div><DewProgress :percentage="project.research_summary.rate ?? 0" size="sm" /></div>
                <p v-else class="pd-muted"><el-icon><DocumentChecked /></el-icon><span>尚未建立研发节点计划</span></p>
              </div>
              <div class="pd-card-footer"><DewButton size="sm" @click="openProject(project)">进入项目<el-icon><ArrowRight /></el-icon></DewButton></div>
            </DewCard>
          </div>
        </template>
      </main>
    </div>
    <DewDialog v-model="createDialog" title="创建项目" width="580px">
      <div class="pd-form"><label>项目名称<DewInput v-model="form.title" placeholder="项目名称" /></label><label>项目目标<DewInput v-model="form.goal" type="textarea" :rows="3" /></label><label>项目背景<DewInput v-model="form.background" type="textarea" :rows="3" /></label><label v-if="isAdmin">负责人用户ID<DewInput v-model="form.owner_user_id" type="number" /></label></div>
      <template #footer><DewButton type="ghost" :disabled="busy" @click="createDialog = false">取消</DewButton><DewButton :loading="busy" :disabled="!form.title.trim()" @click="create">创建</DewButton></template>
    </DewDialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { DewCard, DewButton, DewInput, DewDialog, DewSelect, DewSkeleton, DewTag, DewProgress } from '@bme/dew-ui'
import { ArrowRight, Calendar, DocumentChecked, FolderOpened, Plus, Search, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import MenuComponent from '../../components/MenuComponent.vue'
import ProjectWorkspaceShell from '../../components/Camp/ProjectWorkspaceShell.vue'
import { campService } from '../../services/campService'
import { projectService, createRequestKey } from './service'
import ProjectImport from './ProjectImport.vue'

const route = useRoute(), router = useRouter(), store = useStore()
const isWorkspace = computed(() => route.params.projectId !== undefined)
const isDarkMode = computed(() => store.getters.isDarkMode)
const isAdmin = computed(() => store.state.user?.role === 'super_admin')
const projects = ref([]), context = ref({}), session = ref({}), loading = ref(true), error = ref('')
const keyword = ref(''), statusFilter = ref('all'), busy = ref(false), createDialog = ref(false)
const form = reactive({ title: '', goal: '', background: '', owner_user_id: '' }), createKey = ref(createRequestKey())
const binding = computed(() => context.value.binding || null)
const canUseTeacherPerspective = computed(() => !!binding.value?.can_manage && session.value.available_perspectives?.includes('teacher'))
const campView = computed(() => !!binding.value && ((canUseTeacherPerspective.value && route.query.view === 'camp') || !context.value.project?.my_role))
const perspective = computed(() => {
  if (campView.value && canUseTeacherPerspective.value) return 'teacher'
  return session.value.available_perspectives?.find(value => value !== 'teacher') || 'student'
})
const projectContext = computed(() => ({ ...context.value, campView: campView.value, loading: loading.value, error: error.value }))
const statusText = { active: '进行中', paused: '已暂停', completed: '已完成', terminated: '已终止', archived: '已归档' }
const roleText = { leader: '我负责', member: '我参与', admin: '项目管理' }
const statusOptions = [{ value: 'all', label: '全部状态' }, ...Object.entries(statusText).map(([value, label]) => ({ value, label }))]
const leadingCount = computed(() => projects.value.filter(project => project.my_role === 'leader').length)
const filteredProjects = computed(() => {
  const search = keyword.value.trim().toLocaleLowerCase()
  return projects.value.filter(project => (statusFilter.value === 'all' || project.status === statusFilter.value)
    && (!search || [project.title, project.code, project.owner_name].some(value => String(value || '').toLocaleLowerCase().includes(search))))
})
const aliases = { assessment: 'delivery', 'camp-members': 'members', 'camp-meetings': 'meetings', 'camp-outcomes': 'outcomes' }
const longTabs = new Set(['overview', 'calendar', 'records', 'team', 'camps', 'history', 'publish', 'settings'])
const campTabs = new Set([...longTabs, 'delivery', 'members', 'meetings', 'outcomes', 'activities', 'weekly', 'points', 'announcements', 'leave', 'attendance'])
let sequence = 0

function id(value, message, optional = false) {
  if ((value === undefined || value === null || value === '') && optional) return null
  if (Array.isArray(value) || !/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) throw Error(message)
  return Number(value)
}
function fallbackSession(data) {
  const current = data.binding
  if (!current) return { category: 'project', status: 'running', policy: { capabilities: {} }, available_perspectives: [], my_permissions: [] }
  return {
    id: current.camp_id, name: current.camp_name, category: 'project', status: 'archived',
    start_date: '', end_date: '', is_member: false, policy: { capabilities: {} }, my_permissions: [],
    available_perspectives: current.can_manage ? ['teacher'] : ['student'],
  }
}
async function load(options = {}) {
  const silent = options?.silent === true, seq = ++sequence
  const rawProject = route.params.projectId, rawBinding = route.query.binding, view = route.query.view === 'camp' ? 'camp' : undefined
  if (!silent) loading.value = true
  error.value = ''
  if (String(context.value.project?.id || '') !== String(rawProject || '')) { context.value = {}; session.value = {} }
  try {
    const pid = rawProject === undefined ? null : id(rawProject, '项目编号无效')
    const bid = id(rawBinding, '营期关联参数无效', true)
    if (!(await projectService.status()).enabled) throw Error('独立项目功能尚未开放')
    if (seq !== sequence) return
    if (!pid) {
      const data = await projectService.list()
      if (seq === sequence) projects.value = data.projects || []
      return
    }
    const data = await projectService.context(pid, bid, view)
    if (seq !== sequence) return
    const [campResult, sessionsResult] = await Promise.allSettled([
      data.project?.my_role ? projectService.camps(pid) : Promise.resolve({ bindings: data.binding ? [data.binding] : [] }),
      data.binding ? campService.fetchSessions() : Promise.resolve({ sessions: [] }),
    ])
    if (seq !== sequence) return
    if (campResult.status === 'rejected') throw campResult.reason
    let currentSession = fallbackSession(data), campAccessible = false
    if (data.binding) {
      const accessible = sessionsResult.status === 'fulfilled'
        ? (sessionsResult.value.sessions || []).find(item => Number(item.id) === Number(data.binding.camp_id)) : null
      if (accessible) { currentSession = accessible; campAccessible = true }
      else if (data.binding.status !== 'ended') {
        if (sessionsResult.status === 'rejected') throw sessionsResult.reason
        throw Error('当前账号暂时无法访问该营期，请重新选择参营范围。')
      }
    }
    const bindings = (campResult.value.bindings || []).map(row => row.id === data.binding?.id ? data.binding : row)
    if (data.binding && !bindings.some(row => row.id === data.binding.id)) bindings.push(data.binding)
    session.value = currentSession
    context.value = { ...data, bindings, campAccessible }
    if (data.binding?.unit_id && String(route.query.unit) !== String(data.binding.unit_id)) {
      await router.replace({ query: { ...route.query, unit: String(data.binding.unit_id) } })
    }
  } catch (e) {
    if (seq === sequence) error.value = e.response?.data?.message || e.message || '项目加载失败，请重试。'
  } finally { if (seq === sequence) loading.value = false }
}
function refresh() { return load({ silent: true }) }
function clearFilters() { keyword.value = ''; statusFilter.value = 'all' }
function openProject(project) { router.push({ path: `/project-workspace/${project.id}`, query: { tab: 'overview' } }) }
function canonicalTab(value = route.query.tab) { return aliases[value] || value || 'overview' }
function back() {
  if (!binding.value) { router.push('/my-projects'); return }
  if (binding.value.status === 'ended') {
    if (!context.value.campAccessible) { router.push('/camp'); return }
    const query = { sid: String(binding.value.camp_id) }
    if (canUseTeacherPerspective.value) Object.assign(query, { scope: 'camp', tab: 'overview', perspective: 'teacher' })
    else if (session.value.is_member) Object.assign(query, { tab: 'overview', perspective: perspective.value })
    router.push({ path: '/camp', query })
    return
  }
  const tab = canonicalTab(), query = { sid: String(binding.value.camp_id), scope: 'project', unit: String(binding.value.unit_id), tab: campTabs.has(tab) ? tab : 'overview' }
  query.perspective = campView.value && canUseTeacherPerspective.value ? 'teacher' : perspective.value
  for (const key of ['node', 'entry', 'month', 'record']) if (route.query[key]) query[key] = route.query[key]
  router.push({ path: '/camp', query })
}
function changeBinding(value, targetTab) {
  const empty = value === null || value === undefined || value === '', query = { ...route.query }
  const tab = canonicalTab(targetTab)
  if (empty) {
    if (!context.value.project?.my_role) return
    delete query.binding; delete query.unit; delete query.view
    query.tab = longTabs.has(tab) ? tab : 'overview'
  } else {
    const selected = context.value.bindings?.find(row => String(row.id) === String(value))
    if (!selected || !['active', 'ended'].includes(selected.status) || !selected.unit_id) { ElMessage.error('该营期关联尚不可进入，请刷新后重试。'); return }
    query.binding = String(selected.id); query.unit = String(selected.unit_id)
    query.tab = campTabs.has(tab) ? tab : 'overview'
    if (query.view === 'camp' && !selected.can_manage) delete query.view
  }
  delete query.node; delete query.entry; delete query.record; delete query.month
  router.push({ query })
}
function changePerspective(value) {
  const query = { ...route.query }
  if (value === 'teacher' && canUseTeacherPerspective.value) query.view = 'camp'
  else if (value !== 'teacher' && context.value.project?.my_role) delete query.view
  else return
  router.replace({ query })
}
async function create() {
  if (busy.value || !form.title.trim()) return
  busy.value = true
  const path = route.fullPath
  try {
    const body = { title: form.title.trim(), goal: form.goal.trim(), background: form.background.trim(), idempotency_key: createKey.value }
    if (form.owner_user_id) body.owner_user_id = id(form.owner_user_id, '负责人用户ID无效')
    const data = await projectService.create(body)
    if (route.fullPath !== path) return
    createDialog.value = false
    await router.push({ path: `/project-workspace/${data.project.id}`, query: { tab: 'overview' } })
  } catch (e) { ElMessage.error(e.response?.data?.message || e.message || '创建失败') }
  finally { busy.value = false }
}
watch(createDialog, value => {
  if (value) { createKey.value = createRequestKey(); Object.assign(form, { title: '', goal: '', background: '', owner_user_id: '' }) }
})
watch([() => route.params.projectId, () => route.query.binding, () => route.query.view], () => { createDialog.value = false; load() }, { immediate: true })
onBeforeUnmount(() => sequence++)
</script>

<style scoped>
.camp-view { min-height: 100vh; color: var(--dew-text); }
.project-menu-space { height: 60px; }
.camp-wrap { max-width: 1280px; margin: 0 auto; padding: 24px 20px; }
.project-loading { padding: 8px 0; }
.project-load-error h1 { font-size: 21px; color: var(--dew-text-heading); }
.project-load-error p { color: var(--dew-text-muted); }
.pd-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px; margin-bottom: 26px; }
.pd-head h1 { margin: 0 0 8px; font-size: 26px; color: var(--dew-text-heading); }
.pd-head p { margin: 0; font-size: 14px; color: var(--dew-text-muted); line-height: 1.7; }
.pd-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.pd-directory-tools { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin: 24px 0 18px; }
.pd-count { margin: 0; color: var(--dew-text-muted); font-size: 13px; }
.pd-count strong { color: var(--dew-text-heading); }
.pd-filters { display: flex; align-items: center; gap: 10px; max-width: 100%; }
.pd-filters :deep(.dew-input) { width: 280px; max-width: 100%; }
.pd-filters :deep(.dew-select) { width: 130px; }
.pd-projects { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
.pd-project-card { min-width: 0; }
.pd-project-card :deep(.dew-card__body) { display: flex; flex-direction: column; height: 100%; box-sizing: border-box; }
.pd-card-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.pd-code { font-size: 11px; color: var(--dew-text-muted); overflow-wrap: anywhere; }
.pd-project-card h2 { margin: 18px 0 10px; font-size: 19px; line-height: 1.5; color: var(--dew-text-heading); overflow-wrap: anywhere; }
.pd-goal { margin: 0 0 18px; font-size: 13px; line-height: 1.7; color: var(--dew-text-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 44px; }
.pd-card-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 14px; font-size: 12px; color: var(--dew-text-muted); }
.pd-card-meta span { display: inline-flex; align-items: center; gap: 5px; }
.pd-card-meta span:first-child { color: var(--color-primary); }
.pd-plan-summary { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--dew-card-flat-border); }
.pd-plan-summary p { display: flex; align-items: center; gap: 7px; margin: 0 0 12px; font-size: 12px; }
.pd-muted { color: var(--dew-text-muted); }
.pd-progress { display: flex; flex-direction: column; gap: 9px; }
.pd-progress > div:first-child { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; color: var(--dew-text-muted); }
.pd-card-footer { display: flex; justify-content: flex-end; margin-top: auto; padding-top: 22px; }
.pd-empty { text-align: center; padding: 28px 12px; }
.pd-empty-icon { font-size: 34px; color: var(--dew-text-muted); }
.pd-empty h2 { font-size: 19px; color: var(--dew-text-heading); }
.pd-empty p { color: var(--dew-text-muted); font-size: 13px; line-height: 1.8; margin-bottom: 22px; }
.pd-form { display: flex; flex-direction: column; gap: 16px; }
.pd-form label { display: flex; flex-direction: column; gap: 7px; font-size: 13px; }
@media (max-width: 600px) {
  .camp-wrap { padding: 20px 12px; }
  .pd-head { align-items: flex-start; }
  .pd-head h1 { font-size: 23px; }
  .pd-projects { grid-template-columns: minmax(0, 1fr); gap: 14px; }
  .pd-filters { width: 100%; }
  .pd-filters :deep(.dew-input) { flex: 1; min-width: 0; width: auto; }
  .pd-filters :deep(.dew-select) { width: 116px; flex-shrink: 0; }
}
</style>
