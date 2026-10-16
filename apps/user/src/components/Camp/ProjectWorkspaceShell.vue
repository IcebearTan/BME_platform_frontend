<template>
  <div class="project-workspace">
    <header class="pws-header"><div class="pws-title"><DewButton type="ghost" size="sm" @click="$emit('back')"><el-icon><ArrowLeft /></el-icon>营期中心</DewButton><h1>{{ session.name }}</h1><DewTag size="sm">{{ statusLabel }}</DewTag></div><div class="pws-top-controls"><DewButton v-if="localPreview" size="sm" type="ghost" @click="openPreview">切换试用身份</DewButton><span>{{ session.start_date }} — {{ session.end_date }}</span><label v-if="perspectives.length > 1">当前视角 <DewSelect :model-value="perspective" :options="perspectives" size="sm" @update:model-value="value => $emit('perspective-change', value)" /></label></div></header>
    <div class="pws-layout">
      <aside class="pws-sidebar"><div class="pws-mobile"><span>工作区导航</span><DewButton size="sm" type="ghost" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">{{ menuOpen ? '收起菜单' : '展开菜单' }}</DewButton></div><label class="pws-scope-label">工作范围</label><DewSelect :model-value="selection.scope === 'camp' ? 'camp' : String(selection.unit?.unit_id || '')" :options="scopeOptions" size="sm" class="pws-scope" :disabled="loading" @update:model-value="changeScope" /><nav :class="['pws-nav', { 'is-open': menuOpen }]" aria-label="项目营功能"><template v-for="(item, index) in selection.tabs" :key="item.key"><div v-if="item.camp && !selection.tabs[index - 1]?.camp" class="pws-nav-group">营期事务</div><button type="button" :aria-current="selection.tab === item.key ? 'page' : undefined" @click="navigate(item.key)"><el-icon><component :is="icons[item.icon]" /></el-icon><span>{{ item.label }}</span></button></template></nav><p class="pws-identity">{{ teacher ? '管理老师 · 项目内容只读' : selection.unit?.my_role === 'leader' ? '本项目负责人' : '项目成员' }}</p></aside>
      <main class="pws-main">
        <div v-if="loading || resolvingLocation" class="pws-loading"><DewSkeleton variant="rect" width="100%" height="220" /></div>
        <div v-else-if="error || locationError" role="alert" class="pws-error"><p>{{ error || locationError }}</p><DewButton size="sm" @click="load()">重试</DewButton></div>
        <template v-else><div class="pws-breadcrumb">{{ session.name }} / {{ campPage ? '营期事务' : selection.scope === 'camp' ? '全营管理' : selection.unit?.name || '项目工作' }} / {{ activeLabel }}</div><div class="pws-page-heading"><div><h2>{{ activeLabel }}</h2><p v-if="selection.scope === 'project' && selection.unit && !campPage">{{ selection.unit.name }} · {{ selection.unit.member_count }}人<span v-if="selection.unit.status !== 'active'"> · {{ unitStatusText[selection.unit.status] }}</span></p></div><DewTag v-if="session.status === 'archived'" size="sm">已结营 · 只读</DewTag></div>
          <ProjectCampInbox v-if="teacher && selection.scope==='camp' && selection.tab==='members' && session.status!=='archived'" :sid="sid" @changed="refreshProject" />
          <p v-if="weekly?.mode === 'weekly'" class="pws-notice pws-attendance">累计出勤 {{ weekly.total_days || 0 }} 次 · {{ weekly.total_hours || 0 }}h</p>
          <p v-if="selection.invalidUnit" class="pws-notice" role="status">原项目不在当前可访问列表中，请从工作范围重新选择项目。</p>
          <div :key="`${sid}-${selection.scope}-${selection.unit?.unit_id}-${selection.tab}-${teacher}`" class="pws-page">
            <CampPointsPanel v-if="selection.tab === 'points'" :sid="sid" :manage="teacher" />
            <MentorDashboard v-else-if="selection.tab === 'attendance' && teacher" :sid="sid" scope-label="全营" category="project" />
            <component :is="teacher ? MentorLeave : LeaveApply" v-else-if="selection.tab === 'leave'" :sid="sid" />
            <TeacherAnnouncements v-else-if="selection.tab === 'announcements' && teacher && session.status !== 'archived'" :sid="sid" />
            <ProjectWorkspaceList v-else-if="selection.tab === 'announcements'" :sid="sid" kind="announcements" />
            <ProjectApplyCard v-else-if="selection.tab === 'apply'" :session="session" @submitted="load" />
            <ProjectHub v-else-if="selection.tab === 'preferences'" :sid="sid" :session="session" preferences-only />
            <template v-else-if="selection.scope === 'camp' && teacher">
              <template v-if="selection.tab === 'overview'"><div class="pws-camp-stats"><span><strong>{{ dashboard.summary?.project_count ?? 0 }}</strong> 个项目</span><span><strong>{{ dashboard.summary?.overdue_projects ?? 0 }}</strong> 个逾期项目</span><span><strong>{{ dashboard.summary?.unconfigured_projects ?? 0 }}</strong> 个未配置</span></div><h3>需要跟进</h3><p v-if="!attention.length" class="pws-muted">当前没有需要跟进的项目。</p><button v-for="project in attention" :key="project.key" class="pws-attention" @click="openProject(project, 'delivery')"><span>{{ project.name }}<small>{{ project.overdue_nodes ? `${project.overdue_nodes}个节点逾期` : !project.configured ? '尚未配置交付节点' : '有材料待验收或评价' }}</small></span><span>打开项目</span></button><DewButton size="sm" type="ghost" @click="navigate('projects')">查看全部项目</DewButton></template>
              <TeacherProjectDashboard v-else-if="selection.tab === 'projects'" :sid="sid" @open-project="openProject" workspace />
              <TeacherMeetings v-else-if="selection.tab === 'meetings'" :sid="sid" category="project" />
              <section v-else-if="selection.tab === 'members' && session.status === 'archived'" class="pws-frozen-members"><p class="pws-muted">项目结营冻结名单</p><p v-if="!projects.length" class="pws-muted">档案中没有项目名单。</p><article v-for="project in projects" :key="project.key || project.unit_id"><DewButton type="ghost" size="sm" @click="openProject(project, 'members')">{{ project.name }}</DewButton><p v-for="(member, index) in project.members" :key="index">{{ member.name }} · {{ member.role === 'leader' ? '负责人' : '成员' }}</p></article></section>
              <TeacherMembers v-else-if="selection.tab === 'members'" :sid="sid" category="project" :projects="projects" :camp-status="session.status" :writable="session.my_permissions?.includes('member.manage')" @reviewed="refreshProject" @open-project="project => openProject(project, 'members')" />
              <TeacherAdmissions v-else-if="selection.tab === 'admissions'" :sid="sid" category="project" @reviewed="refreshProject" />
            </template>
            <div v-else-if="!selection.unit" class="pws-empty"><h3>尚未加入项目</h3><p>营期成员加入项目后，这里会出现对应工作区。营期积分与公告仍可从侧栏查看。</p></div>
            <TeacherMeetings v-else-if="teacher && selection.tab === 'meetings'" :sid="sid" category="project" :unit-id="Number(selection.unit.unit_id)" />
            <ProjectWorkspaceRead v-else-if="teacher" :sid="sid" :project-key="selection.unit.key || selection.unit.unit_id" :section="selection.tab" :focus-node="route.query.node" @navigate="navigate" />
            <ProjectWorkspaceArchive v-else-if="selection.unit._archive" :unit="selection.unit._archive" :section="selection.tab" />
            <ProjectWorkspaceOverview v-else-if="selection.tab === 'overview'" :unit-id="Number(selection.unit.unit_id)" :role="selection.unit.my_role" :archived="session.status === 'archived'" @navigate="navigate" />
            <ProjectWorkspaceList v-else-if="selection.tab === 'members' && selection.unit.my_role !== 'leader'" :sid="sid" :unit-id="Number(selection.unit.unit_id)" kind="members" />
            <ProjectBoard v-else :sid="sid" :session="session" :units="[selection.unit]" :role="selection.unit.my_role" :section="selection.tab" :draft-cache="draftCache" workspace @changed="refreshProject" />
          </div>
        </template>
      </main>
    </div>
  </div>
</template>
<script setup>
import { computed, ref, reactive, watch, defineAsyncComponent, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, House, DocumentChecked, ChatDotRound, User, Collection, Grid, Bell, Present, Calendar, DataLine, Edit } from '@element-plus/icons-vue'
import { DewButton, DewSelect, DewTag, DewSkeleton } from '@bme/dew-ui'
import { campService } from '../../services/campService'
import { resolveProjectWorkspace } from './projectWorkspaceNav'
import {projectService} from '../../domains/projects/service'
const ProjectCampInbox=defineAsyncComponent(()=>import('../../domains/projects/ProjectCampInbox.vue'))
const ProjectBoard = defineAsyncComponent(() => import('./ProjectBoard.vue'))
const ProjectWorkspaceOverview = defineAsyncComponent(() => import('./ProjectWorkspaceOverview.vue'))
const ProjectWorkspaceRead = defineAsyncComponent(() => import('./ProjectWorkspaceRead.vue'))
const ProjectWorkspaceArchive = defineAsyncComponent(() => import('./ProjectWorkspaceArchive.vue'))
const TeacherProjectDashboard = defineAsyncComponent(() => import('./TeacherProjectDashboard.vue'))
const TeacherMeetings = defineAsyncComponent(() => import('./TeacherMeetings.vue'))
const TeacherMembers = defineAsyncComponent(() => import('./TeacherMembers.vue'))
const TeacherAdmissions = defineAsyncComponent(() => import('./TeacherAdmissions.vue'))
const TeacherAnnouncements = defineAsyncComponent(() => import('./TeacherAnnouncements.vue'))
const CampPointsPanel = defineAsyncComponent(() => import('./CampPointsPanel.vue'))
const LeaveApply = defineAsyncComponent(() => import('./LeaveApply.vue'))
const MentorLeave = defineAsyncComponent(() => import('./MentorLeave.vue'))
const MentorDashboard = defineAsyncComponent(() => import('./MentorDashboard.vue'))
const ProjectWorkspaceList = defineAsyncComponent(() => import('./ProjectWorkspaceList.vue'))
const ProjectApplyCard = defineAsyncComponent(() => import('./ProjectApplyCard.vue'))
const ProjectHub = defineAsyncComponent(() => import('./ProjectHub.vue'))
const props = defineProps({ sid: Number, session: Object, perspective: String })
defineEmits(['back', 'perspective-change'])
const route = useRoute(), router = useRouter(), projects = ref([]), dashboard = ref({}), loading = ref(true), error = ref(''), menuOpen = ref(false)
const resolvingLocation = ref(false), locationError = ref(''), weekly = ref(null)
const draftCache = reactive({})
const previewPath = import.meta.env.DEV ? '/dev/project-workspace' : ''
function openPreview() { if (previewPath) router.push(previewPath) }
const localPreview = computed(() => import.meta.env.DEV && route.query.preview === 'workspace')
const icons = { House, DocumentChecked, ChatDotRound, User, Collection, Grid, Bell, Present, Calendar, DataLine, Edit }
const unitStatusText = { paused: '已暂停', terminated: '已终止' }
const statusLabel = computed(() => ({ draft: '草稿', upcoming: '待开放', selecting: '组队中', running: '进行中', archived: '已结营' }[props.session.status]))
const teacher = computed(() => props.perspective === 'teacher')
const perspectives = computed(() => (props.session.available_perspectives || []).map(value => ({ value, label: value === 'teacher' ? '管理老师' : '项目参与者' })))
const selection = computed(() => resolveProjectWorkspace(route.query, { teacher: teacher.value, projects: projects.value, session: props.session }))
const campPage = computed(() => selection.value.tabs.find(t => t.key === selection.value.tab)?.camp)
const activeLabel = computed(() => selection.value.tabs.find(t => t.key === selection.value.tab)?.label || '工作概览')
const scopeOptions = computed(() => [...(teacher.value ? [{ value: 'camp', label: '全营管理' }] : []), ...projects.value.map(p => ({ value: String(p.unit_id), label: `${p.name}${teacher.value ? '' : p.my_role === 'leader' ? ' · 负责人' : ' · 成员'}` }))])
const attention = computed(() => (dashboard.value.projects || []).filter(p => p.risks?.length && p.status === 'active'))
let generation = 0, locationGeneration = 0, attendanceGeneration = 0
let bridgeGeneration=0
async function load({ silent = false } = {}) {
  const seq = ++generation
  if (!silent) { loading.value = true; projects.value = []; dashboard.value = {} }
  error.value = ''
  try {
    if (teacher.value) {
      const d = await campService.fetchProjectDashboard(props.sid)
      if (seq !== generation) return
      dashboard.value = d; projects.value = (d.projects || []).map(p => ({ ...p, unit_id: p.unit_id || p.key, my_role: 'viewer' }))
    } else if (props.session.status === 'archived') {
      const d = await campService.fetchArchive(props.sid)
      if (seq !== generation) return
      projects.value = (d.archive?.snapshot?.units || []).map((u, i) => ({ ...u, unit_id: u.unit_id || `archive-${i}`, name: u.name, member_count: u.members?.filter(m => m.status !== 'ended').length || 0, my_role: 'viewer', _archive: u }))
    } else {
      const d = await campService.fetchProjectMine(props.sid)
      if (seq !== generation) return
      projects.value = [...(d.leading || []).map(p => ({ ...p, my_role: 'leader' })), ...(d.joining || []).map(p => ({ ...p, my_role: 'member' }))].filter((p, i, all) => all.findIndex(other => other.unit_id === p.unit_id) === i)
    }
  } catch (e) { if (seq === generation) error.value = e.response?.data?.message || '项目工作区加载失败，请重试' }
  finally { if (seq === generation) loading.value = false }
}
async function resolveLocation() {
  const seq = ++locationGeneration
  resolvingLocation.value = false; locationError.value = ''
  if (loading.value || error.value) return
  const query = { ...route.query }
  if (query.node && !query.unit) {
    resolvingLocation.value = true
    try {
      const target = await campService.resolveProjectNode(props.sid, query.node)
      if (seq !== locationGeneration) return
      await router.replace({ query: { ...query, scope: 'project', unit: String(target.unit_id), tab: 'delivery' } })
    } catch (e) { if (seq === locationGeneration) locationError.value = e.response?.data?.message || '通知对应的项目暂不可访问，请重新选择工作范围' }
    finally { if (seq === locationGeneration) resolvingLocation.value = false }
  } else if (!query.unit && !teacher.value && projects.value.length) {
    await router.replace({ query: { ...query, scope: 'project', unit: String(projects.value[0].unit_id), tab: query.tab || 'overview' } })
  }
}
function navigate(tab, node) {
  menuOpen.value = false
  const query = { ...route.query, scope: selection.value.scope, tab }
  if (selection.value.scope === 'project' && selection.value.unit) query.unit = String(selection.value.unit.unit_id)
  else delete query.unit
  if (node) query.node = String(node); else delete query.node
  router.push({ query })
}
function changeScope(value) {
  menuOpen.value = false
  const query = { ...route.query, scope: value === 'camp' ? 'camp' : 'project' }
  if (value === 'camp') { delete query.unit; query.tab = 'overview' }
  else query.unit = value
  delete query.node
  router.push({ query })
}
function openProject(project, tab = 'overview', node = null) { const query = { ...route.query, scope: 'project', unit: String(project.unit_id || project.key), tab: typeof tab === 'string' ? tab : 'overview' }; if (node) query.node = String(node); else delete query.node; router.push({ query }) }
function refreshProject() { return load({ silent: true }) }
watch(() => [props.sid, teacher.value, props.session.status], () => load(), { immediate: true })
watch(() => [loading.value, props.sid, teacher.value, route.query.node, route.query.unit, route.query.tab], resolveLocation, { immediate: true })
watch(() => [props.sid, teacher.value, props.session.status, props.session.policy?.capabilities?.attendance, props.session.policy?.attendance_mode], async () => {
  const seq = ++attendanceGeneration; weekly.value = null
  if (teacher.value || props.session.status === 'archived' || !props.session.policy?.capabilities?.attendance || props.session.policy.attendance_mode !== 'weekly') return
  try { const data = await campService.fetchMyAttendance(props.sid); if (seq === attendanceGeneration) weekly.value = data }
  catch { /* 不把不可用的出勤数据显示成零 */ }
}, { immediate: true })
onBeforeUnmount(() => { generation++; locationGeneration++; attendanceGeneration++ })
watch(()=>[loading.value,selection.value.scope,selection.value.unit?.unit_id,selection.value.tab],async()=>{
  const seq=++bridgeGeneration,unit=selection.value.unit?.unit_id,path=route.fullPath
  if(loading.value||selection.value.scope!=='project'||!unit||campPage.value||props.session.status==='archived')return
  try{if(!(await projectService.status()).enabled)return;const d=await projectService.resolveLegacy(unit);if(seq!==bridgeGeneration||route.fullPath!==path||!d.mapped)return;const aliases={overview:'overview',delivery:'assessment',members:'camp-members',meetings:'camp-meetings',outcomes:'camp-outcomes'};if(!aliases[selection.value.tab])return;await router.replace({path:`/project-workspace/${d.project_id}`,query:{binding:d.binding_id,unit,tab:aliases[selection.value.tab],node:route.query.node||undefined,view:teacher.value?'camp':undefined}})}catch{/* 未迁移或未开放时保留原营期路径 */}
})
onBeforeUnmount(()=>bridgeGeneration++)
</script>
<style scoped>
.project-workspace { --pws-line: var(--dew-card-flat-border); color: var(--dew-text); background: var(--dew-card-flat-bg); border: 1px solid var(--pws-line); border-radius: 12px; overflow: clip; min-width: 0; }.pws-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 16px 20px; border-bottom: 1px solid var(--pws-line); flex-wrap: wrap; }.pws-title { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }.pws-title h1 { margin: 0; font-size: 20px; color: var(--dew-text-heading); }.pws-top-controls { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; font-size: 12px; color: var(--dew-text-muted); }.pws-top-controls label { display: flex; gap: 8px; align-items: center; }.pws-top-controls :deep(.dew-select) { width: 140px; }.pws-layout { display: grid; grid-template-columns: 218px minmax(0, 1fr); min-height: 600px; }.pws-sidebar { padding: 20px 12px; border-right: 1px solid var(--pws-line); background: var(--dew-card-flat-bg-hover); }.pws-scope-label { display: block; padding: 0 8px; margin-bottom: 8px; font-size: 12px; color: var(--dew-text-muted); }.pws-scope { width: 100%; }.pws-nav { display: flex; flex-direction: column; gap: 4px; margin-top: 22px; }.pws-nav button { display: flex; align-items: center; gap: 10px; padding: 12px; border: 0; border-radius: 8px; background: transparent; color: var(--dew-text); font: inherit; text-align: left; cursor: pointer; }.pws-nav button:hover, .pws-nav button[aria-current=page] { background: var(--color-primary-light); color: var(--color-primary); }.pws-nav-group { color: var(--dew-text-muted); border-top: 1px solid var(--pws-line); padding: 14px 10px 4px; margin-top: 12px; font-size: 12px; }.pws-identity { font-size: 12px; color: var(--dew-text-muted); padding: 18px 10px; }.pws-main { min-width: 0; padding: 24px; }.pws-breadcrumb { color: var(--dew-text-muted); font-size: 12px; overflow-wrap: anywhere; margin-bottom: 14px; }.pws-page-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 12px; }.pws-page-heading h2 { margin: 0; font-size: 21px; }.pws-page-heading p { color: var(--dew-text-muted); font-size: 12px; }.pws-page { min-width: 0; }.pws-page :deep(.sec-title:first-child) { margin-top: 0; }.pws-page :deep(.sec-card) { border: 0; box-shadow: none; background: transparent; }.pws-page :deep(.sec-card > .dew-card__body) { padding: 0; }.pws-notice, .pws-muted { color: var(--dew-text-muted); font-size: 13px; line-height: 1.7; }.pws-notice { margin-bottom: 20px; }.pws-empty { padding: 40px 0; color: var(--dew-text-muted); }.pws-empty h3 { color: var(--dew-text-heading); }.pws-camp-stats { display: flex; gap: 28px; flex-wrap: wrap; padding-bottom: 22px; }.pws-camp-stats strong { font-size: 25px; }.pws-attention { display: flex; justify-content: space-between; width: 100%; gap: 16px; text-align: left; background: transparent; color: var(--dew-text); border: 0; border-bottom: 1px solid var(--pws-line); padding: 18px 0; font: inherit; cursor: pointer; }.pws-attention small { display: block; color: var(--dew-text-muted); margin-top: 5px; }.pws-mobile { display: none; }
@media(max-width:760px) { .pws-layout { grid-template-columns: 180px minmax(0, 1fr); }.pws-main { padding: 18px; } }
@media(max-width:540px) { .pws-layout { display: block; }.pws-sidebar { border-right: 0; border-bottom: 1px solid var(--pws-line); padding: 12px; }.pws-mobile { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px; }.pws-nav { display: none; }.pws-nav.is-open { display: flex; }.pws-scope-label, .pws-identity { display: none; }.pws-header { padding: 14px; }.pws-title h1 { font-size: 18px; }.pws-main { padding: 18px 14px; } }
</style>
