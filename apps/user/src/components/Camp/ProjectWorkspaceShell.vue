<template>
  <ProjectWorkspaceFrame :title="workspaceTitle" :subtitle="workspaceSubtitle" :status-label="statusLabel" :status="session.status"
    :back-label="standalone ? binding ? '返回营期' : '我的项目' : '营期中心'"
    :scope-value="scopeValue" :scope-options="scopeOptions" :scope-label="standalone ? '项目上下文' : '工作范围'"
    :tabs="selection.tabs" :active-tab="selection.tab" :nav-label="standalone ? '项目功能' : '项目营功能'"
    :identity="identity" :breadcrumb="breadcrumb" :section-title="activeLabel" :section-subtitle="sectionSubtitle"
    :loading="busy" :error="displayError" :perspectives="perspectives" :perspective="perspective || ''"
    @back="$emit('back')" @navigate="navigate" @scope-change="changeScope" @perspective-change="value => $emit('perspective-change', value)" @retry="retry">
    <template #header-actions><DewButton v-if="localPreview" size="sm" type="ghost" @click="openPreview">切换试用身份</DewButton></template>
          <ProjectCampInbox v-if="teacher && selection.scope==='camp' && selection.tab==='members' && session.status!=='archived'" :sid="sid" @changed="refreshProject" />
          <p v-if="weekly?.mode === 'weekly'" class="pws-notice pws-attendance">累计出勤 {{ weekly.total_days || 0 }} 次 · {{ weekly.total_hours || 0 }}h</p>
          <p v-if="selection.invalidUnit" class="pws-notice" role="status">原项目不在当前可访问列表中，请从工作范围重新选择项目。</p>
          <div :key="`${sid}-${selection.scope}-${selection.unit?.unit_id}-${nativeProject?.id}-${selection.tab}-${teacher}`" class="pws-content">
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
            <ProjectLongTermPanel v-else-if="nativeProject && longSections.includes(selection.tab)" :project="effectiveProject" :binding="binding" :camp-view="nativeCampView" :section="selection.tab" @changed="refreshProject" @navigate="navigate" @open-binding="openBinding" />
            <ProjectWorkspaceOverview v-else-if="nativeProject && selection.tab === 'overview' && (!teacher || binding?.status === 'ended')" :project="effectiveProject" :binding="binding" :camp-view="nativeCampView" :unit-id="binding?.can_read_work && binding?.status === 'active' ? Number(binding.unit_id) : undefined" :role="binding?.my_role || nativeProject.my_role" :archived="session.status === 'archived'" @navigate="navigate" />
            <ProjectAssessment v-else-if="binding?.status === 'ended' && ['delivery','members','meetings','outcomes'].includes(selection.tab)" :project="effectiveProject" :binding="binding" :camp-view="nativeCampView" :section="archiveSections[selection.tab]" :draft-cache="draftCache" />
            <ProjectPeriodMembers v-else-if="binding && selection.tab === 'members'" :project="effectiveProject" :binding="binding" @changed="refreshProject" @manage="manageParticipants" />
            <div v-else-if="!selection.unit" class="pws-empty"><h3>尚未加入项目</h3><p>营期成员加入项目后，这里会出现对应工作区。营期积分与公告仍可从侧栏查看。</p></div>
            <TeacherMeetings v-else-if="teacher && selection.tab === 'meetings'" :sid="sid" category="project" :unit-id="Number(selection.unit.unit_id)" />
            <ProjectWorkspaceRead v-else-if="teacher" :sid="sid" :project-key="selection.unit.key || selection.unit.unit_id" :section="selection.tab" :focus-node="route.query.node" @navigate="navigate" />
            <ProjectWorkspaceArchive v-else-if="selection.unit._archive" :unit="selection.unit._archive" :section="selection.tab" />
            <ProjectWorkspaceOverview v-else-if="selection.tab === 'overview'" :unit-id="Number(selection.unit.unit_id)" :role="selection.unit.my_role" :archived="session.status === 'archived'" @navigate="navigate" />
            <ProjectWorkspaceList v-else-if="selection.tab === 'members' && selection.unit.my_role !== 'leader'" :sid="sid" :unit-id="Number(selection.unit.unit_id)" kind="members" />
            <ProjectBoard v-else :sid="sid" :session="workSession" :units="[selection.unit]" :role="selection.unit.my_role" :section="selection.tab" :draft-cache="draftCache" :native-project="!!nativeProject" :editable="!binding || binding.can_write_work" workspace @changed="refreshProject" />
          </div>

  </ProjectWorkspaceFrame>
</template>

<script setup>
import { computed, ref, reactive, watch, defineAsyncComponent, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DewButton } from '@bme/dew-ui'
import { campService } from '../../services/campService'
import { resolveProjectWorkspace, nativeWorkspaceTabs, canonicalProjectTab } from './projectWorkspaceNav'
import { projectService } from '../../domains/projects/service'
import ProjectWorkspaceFrame from './ProjectWorkspaceFrame.vue'
const ProjectLongTermPanel = defineAsyncComponent(() => import('../../domains/projects/ProjectLongTermPanel.vue'))
const ProjectPeriodMembers = defineAsyncComponent(() => import('../../domains/projects/ProjectPeriodMembers.vue'))
const ProjectAssessment = defineAsyncComponent(() => import('../../domains/projects/ProjectAssessment.vue'))
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
const props = defineProps({ sid: Number, session: { type: Object, default: () => ({}) }, perspective: String, standalone: Boolean, projectContext: Object })
const emit = defineEmits(['back', 'perspective-change', 'binding-change', 'project-changed'])
const route = useRoute(), router = useRouter(), projects = ref([]), dashboard = ref({}), loading = ref(!props.standalone), error = ref('')
const resolvingLocation = ref(false), locationError = ref(''), weekly = ref(null)
const mappedContext = ref(null), contextLoading = ref(false), contextError = ref('')
const draftCache = reactive({})
const longSections = ['calendar', 'records', 'team', 'camps', 'settings', 'history', 'publish']
const archiveSections = {delivery:'assessment',members:'camp-members',meetings:'camp-meetings',outcomes:'camp-outcomes'}
const previewPath = import.meta.env.DEV ? '/dev/project-workspace' : ''
function openPreview() { if (previewPath) router.push(previewPath) }
const localPreview = computed(() => import.meta.env.DEV && route.query.preview === 'workspace')
const nativeContext = computed(() => props.standalone ? props.projectContext : mappedContext.value)
const nativeProject = computed(() => nativeContext.value?.project)
const binding = computed(() => nativeContext.value?.binding)
const teacher = computed(() => props.perspective === 'teacher')
const nativeCampView = computed(() => teacher.value || Boolean(binding.value && !nativeProject.value?.my_role))
const effectiveProject = computed(() => nativeCampView.value ? {...nativeProject.value,can_manage:false,can_write:false} : nativeProject.value)
const workSession = computed(() => binding.value && !binding.value.can_write_work ? {...props.session,status:'archived'} : props.session)
const statusLabel = computed(() => props.standalone && !binding.value ? ({active:'进行中',paused:'已暂停',completed:'已完成',terminated:'已终止',archived:'已归档'}[nativeProject.value?.status] || '') : ({draft:'草稿',upcoming:'待开放',selecting:'组队中',running:'进行中',archived:'已结营'}[props.session.status] || ''))
const perspectives = computed(() => (props.session.available_perspectives || []).map(value => ({value,label:value === 'teacher' ? '管理老师' : '项目参与者'})))
const baseSelection = computed(() => resolveProjectWorkspace(route.query, {teacher:teacher.value,projects:projects.value,session:props.session}))
const selection = computed(() => {
  if (!props.standalone && (!nativeProject.value || baseSelection.value.scope === 'camp')) return baseSelection.value
  const unit = props.standalone ? (binding.value ? {unit_id:binding.value.unit_id,name:nativeProject.value?.title,member_count:binding.value.participants?.length || 0,my_role:binding.value.my_role || 'viewer',leader_user_id:binding.value.leader_user_id,status:binding.value.status === 'active' ? 'active' : 'terminated'} : null) : baseSelection.value.unit
  const tabs = nativeWorkspaceTabs({project:effectiveProject.value,binding:binding.value,teacher:teacher.value,session:props.session})
  const wanted = canonicalProjectTab(route.query.tab, Boolean(binding.value))
  return {scope:'project',unit,tabs,tab:tabs.some(t => t.key === wanted) ? wanted : 'overview',invalidUnit:false}
})
const campPage = computed(() => selection.value.tabs.find(t => t.key === selection.value.tab)?.camp)
const activeLabel = computed(() => selection.value.tabs.find(t => t.key === selection.value.tab)?.label || '工作概览')
const workspaceTitle = computed(() => props.standalone && !binding.value ? nativeProject.value?.title || '项目工作台' : props.session.name || binding.value?.camp_name || '项目工作台')
const workspaceSubtitle = computed(() => props.standalone && !binding.value ? nativeProject.value?.code || '' : [props.session.start_date,props.session.end_date].filter(Boolean).join(' — '))
const scopeValue = computed(() => props.standalone ? binding.value ? String(binding.value.id) : 'project' : selection.value.scope === 'camp' ? 'camp' : String(selection.value.unit?.unit_id || ''))
const scopeOptions = computed(() => props.standalone ? [...(nativeProject.value?.my_role ? [{value:'project',label:'长期项目'}] : []),...(nativeContext.value?.bindings || (binding.value ? [binding.value] : [])).filter(b => ['active','ended'].includes(b.status)).map(b => ({value:String(b.id),label:b.camp_name + (b.status === 'ended' ? ' · 已结束' : '')}))] : [...(teacher.value ? [{value:'camp',label:'全营管理'}] : []),...projects.value.map(p => ({value:String(p.unit_id),label:`${p.name}${teacher.value ? '' : p.my_role === 'leader' ? ' · 负责人' : ' · 成员'}`}))])
const identity = computed(() => teacher.value ? '管理老师 · 项目内容只读' : binding.value ? binding.value.my_role === 'leader' ? '本期负责人' : binding.value.is_participant ? '本期项目成员' : '长期项目成员 · 未参加本期' : nativeProject.value?.my_role === 'leader' ? '长期项目负责人' : selection.value.unit?.my_role === 'leader' ? '本项目负责人' : '项目成员')
const breadcrumb = computed(() => `${workspaceTitle.value} / ${selection.value.scope === 'camp' ? '全营管理' : campPage.value ? '营期事务' : selection.value.unit?.name || nativeProject.value?.title || '项目工作'} / ${activeLabel.value}`)
const sectionSubtitle = computed(() => longSections.includes(selection.value.tab) ? nativeCampView.value ? '本期共享内容 · 只读' : '长期项目工作 · 跨营期保留' : selection.value.scope === 'project' && selection.value.unit && !campPage.value ? `${selection.value.unit.name} · ${binding.value ? '本期 ' : ''}${selection.value.unit.member_count}人` : '')
const busy = computed(() => props.standalone ? Boolean(props.projectContext?.loading) : loading.value || resolvingLocation.value || contextLoading.value)
const displayError = computed(() => props.standalone ? props.projectContext?.error || '' : error.value || locationError.value || contextError.value)
const attention = computed(() => (dashboard.value.projects || []).filter(p => p.risks?.length && p.status === 'active'))
let generation = 0, locationGeneration = 0, attendanceGeneration = 0, contextGeneration = 0
async function load({silent = false} = {}) {
  if (props.standalone) return
  const seq = ++generation
  if (!silent) {loading.value = true; projects.value = []; dashboard.value = {}; mappedContext.value = null}
  error.value = ''
  try {
    if (teacher.value) {
      const d = await campService.fetchProjectDashboard(props.sid)
      if (seq !== generation) return
      dashboard.value = d; projects.value = (d.projects || []).map(p => ({...p,unit_id:p.unit_id || p.key,my_role:'viewer'}))
    } else if (props.session.status === 'archived') {
      const d = await campService.fetchArchive(props.sid)
      if (seq !== generation) return
      projects.value = (d.archive?.snapshot?.units || []).map((u,i) => ({...u,unit_id:u.unit_id || `archive-${i}`,name:u.name,member_count:u.members?.filter(m => m.status !== 'ended').length || 0,my_role:'viewer',_archive:u}))
    } else {
      const d = await campService.fetchProjectMine(props.sid)
      if (seq !== generation) return
      projects.value = [...(d.leading || []).map(p => ({...p,my_role:'leader'})),...(d.joining || []).map(p => ({...p,my_role:'member'}))].filter((p,i,all) => all.findIndex(other => other.unit_id === p.unit_id) === i)
    }
  } catch (e) {if (seq === generation) error.value = e.response?.data?.message || '项目工作区加载失败，请重试'}
  finally {if (seq === generation) loading.value = false}
}
async function resolveContext() {
  if (props.standalone) return
  const seq = ++contextGeneration, unit = baseSelection.value.unit?.unit_id
  contextLoading.value = false; contextError.value = ''; mappedContext.value = null
  if (loading.value || error.value || baseSelection.value.scope !== 'project' || !unit || props.session.status === 'archived') return
  contextLoading.value = true
  try {
    if (!(await projectService.status()).enabled) return
    const map = await projectService.resolveLegacy(unit)
    if (!map.mapped) return
    const data = await projectService.context(map.project_id,map.binding_id,teacher.value ? 'camp' : undefined)
    if (seq !== contextGeneration) return
    if (Number(data.binding?.camp_id) !== Number(props.sid) || Number(data.binding?.unit_id) !== Number(unit)) throw Error('项目与当前营期不匹配，请重新选择工作范围')
    mappedContext.value = data
  } catch (e) {if (seq === contextGeneration) contextError.value = e.response?.data?.message || e.message || '项目关联加载失败'}
  finally {if (seq === contextGeneration) contextLoading.value = false}
}
async function resolveLocation() {
  if (props.standalone) return
  const seq = ++locationGeneration
  resolvingLocation.value = false; locationError.value = ''
  if (loading.value || error.value) return
  const query = {...route.query}
  if (query.node && !query.unit) {
    resolvingLocation.value = true
    try {
      const target = await campService.resolveProjectNode(props.sid,query.node)
      if (seq !== locationGeneration) return
      await router.replace({query:{...query,scope:'project',unit:String(target.unit_id),tab:'delivery'}})
    } catch (e) {if (seq === locationGeneration) locationError.value = e.response?.data?.message || '通知对应的项目暂不可访问，请重新选择工作范围'}
    finally {if (seq === locationGeneration) resolvingLocation.value = false}
  } else if (!query.unit && !teacher.value && projects.value.length) {
    await router.replace({query:{...query,scope:'project',unit:String(projects.value[0].unit_id),tab:query.tab || 'overview'}})
  }
}
async function navigate(tab,node,source) {
  if (source?.bindingId && Number(source.bindingId) !== Number(binding.value?.id) && nativeProject.value) {
    const path = route.fullPath
    try {
      const data = await projectService.context(nativeProject.value.id,source.bindingId,teacher.value ? 'camp' : undefined)
      if (route.fullPath !== path) return
      if (!data.binding?.can_read_work) throw Error('当前账号无法读取该营期的考核记录')
      const query = props.standalone ? {...route.query,binding:String(data.binding.id),unit:String(data.binding.unit_id),tab} : {sid:String(data.binding.camp_id),scope:'project',unit:String(data.binding.unit_id),tab,perspective:props.perspective}
      for (const field of ['node','entry','record','month']) delete query[field]
      if (node) query.node = String(node)
      await router.push(props.standalone ? {query} : {path:'/camp',query})
    } catch (e) { const {ElMessage} = await import('element-plus'); ElMessage.error(e.response?.data?.message || e.message || '来源记录不可访问') }
    return
  }
  const query = {...route.query,tab}
  if (!props.standalone) {query.scope = selection.value.scope; if (selection.value.scope === 'project' && selection.value.unit) query.unit = String(selection.value.unit.unit_id); else delete query.unit}
  for (const field of ['node','entry','record','month']) delete query[field]
  if (node) query.node = String(node)
  router.push({query})
}
function changeScope(value) {
  if (props.standalone) {emit('binding-change',value === 'project' ? null : value);return}
  const query = {...route.query,scope:value === 'camp' ? 'camp' : 'project'}
  if (value === 'camp') {delete query.unit; query.tab = 'overview'} else query.unit = value
  for (const field of ['node','entry','record','month']) delete query[field]
  router.push({query})
}
function openProject(project,tab = 'overview',node = null) {
  const query = {...route.query,scope:'project',unit:String(project.unit_id || project.key),tab:typeof tab === 'string' ? tab : 'overview'}
  for (const field of ['node','entry','record','month']) delete query[field]
  if (node) query.node = String(node)
  router.push({query})
}
function openBinding(row) {
  if (props.standalone) {emit('binding-change',row.id,'delivery');return}
  if (row.status === 'ended') {router.push({path:`/project-workspace/${nativeProject.value.id}`,query:{binding:String(row.id),unit:String(row.unit_id),tab:'delivery',view:teacher.value ? 'camp' : undefined}});return}
  if (Number(row.camp_id) === Number(props.sid)) {openProject({unit_id:row.unit_id},'delivery');return}
  router.push({path:'/camp',query:{sid:String(row.camp_id),scope:'project',unit:String(row.unit_id),tab:'delivery',perspective:'student'}})
}
function manageParticipants() {router.push({path:'/camp',query:{sid:String(props.sid),scope:'camp',tab:'members',perspective:'teacher'}})}
async function refreshProject() {
  if (props.standalone) {emit('project-changed');return}
  await load({silent:true}); await resolveContext()
}
function retry() {if (props.standalone) emit('project-changed'); else load()}
watch(() => [props.sid,teacher.value,props.session.status],() => load(),{immediate:true})
watch(() => [loading.value,props.sid,teacher.value,baseSelection.value.scope,baseSelection.value.unit?.unit_id],resolveContext,{immediate:true,flush:'sync'})
watch(() => [loading.value,props.sid,teacher.value,route.query.node,route.query.unit],resolveLocation,{immediate:true})
watch(() => [props.sid,teacher.value,props.session.status,props.session.policy?.capabilities?.attendance,props.session.policy?.attendance_mode],async () => {
  const seq = ++attendanceGeneration; weekly.value = null
  if (!props.sid || teacher.value || props.session.status === 'archived' || !props.session.policy?.capabilities?.attendance || props.session.policy.attendance_mode !== 'weekly') return
  try {const data = await campService.fetchMyAttendance(props.sid); if (seq === attendanceGeneration) weekly.value = data} catch { /* 出勤不可用时不展示虚假的零值 */ }
},{immediate:true})
onBeforeUnmount(() => {generation++;locationGeneration++;attendanceGeneration++;contextGeneration++})
</script>
<style scoped>
.pws-content{min-width:0}.pws-empty{padding:40px 0;color:var(--dew-text-muted)}.pws-empty h3{color:var(--dew-text-heading)}.pws-camp-stats{display:flex;gap:28px;flex-wrap:wrap;padding-bottom:22px}.pws-camp-stats strong{font-size:25px}.pws-attention{display:flex;justify-content:space-between;width:100%;gap:16px;text-align:left;background:transparent;color:var(--dew-text);border:0;border-bottom:1px solid var(--dew-card-flat-border);padding:18px 0;font:inherit;cursor:pointer}.pws-attention small{display:block;color:var(--dew-text-muted);margin-top:5px}
</style>
