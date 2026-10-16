<template>
  <main class="project-domain">
    <div v-if="loading" class="project-loading"><DewSkeleton variant="rect" width="100%" height="220" /></div>
    <div v-else-if="error" role="alert"><p>{{ error }}</p><DewButton @click="load">重试</DewButton></div>
    <template v-else-if="!projectId">
      <header class="pd-head"><div><h1>我的项目</h1><p>持续记录项目、团队与每一个关键节点。</p></div><DewButton @click="createDialog = true">创建项目</DewButton></header>
      <ProjectImport v-if="isAdmin" :projects="projects" @changed="load" />
      <p v-if="!projects.length" class="pd-muted">还没有参与的项目，可以先创建一个项目。</p>
      <div class="pd-projects"><DewCard v-for="p in projects" :key="p.id" no-hover><h2>{{ p.title }}</h2><p>{{ statusText[p.status] }} · {{ p.member_count }}人 · {{ p.my_role === 'leader' ? '负责人' : p.my_role === 'admin' ? '管理员' : '成员' }}</p><p class="pd-muted">{{ p.code }} · {{ p.zero_date ? 'D0 '+p.zero_date : '正式启动日待确认' }}</p><DewButton @click="router.push(`/project-workspace/${p.id}`)">进入项目</DewButton></DewCard></div>
    </template>
    <template v-else-if="project">
      <header class="pd-head"><div><DewButton type="ghost" size="sm" @click="router.push('/my-projects')">我的项目</DewButton><h1>{{ project.title }}</h1><p>{{ project.code }} · {{ statusText[project.status] }} · {{ project.member_count }}人</p><p v-if="binding">本期：{{ binding.camp_name }} · {{ binding.status==='active'?'参营中':'本期已结束' }}<span v-if="campView"> · {{ binding.can_manage ? '老师只读视角' : '本期只读视角' }}</span></p></div><div><DewButton v-if="binding" size="sm" type="ghost" @click="campPage('projects')">返回营期</DewButton><DewButton v-if="campView && project.my_role" size="sm" @click="projectView">我的项目视角</DewButton><DewButton v-if="effectiveProject.can_manage" size="sm" @click="openEdit">项目设置</DewButton></div></header>
      <div class="pd-layout"><nav aria-label="项目功能"><button v-for="tab in tabs" :key="tab.key" :aria-current="section === tab.key ? 'page' : undefined" @click="navigate(tab.key)">{{ tab.label }}</button></nav><section class="pd-content">
        <template v-if="section === 'overview'"><h2>项目概览</h2><p v-if="!campView && project.research_summary">研发节点：{{ project.research_summary.done }} / {{ project.research_summary.total }} 已完成 · {{ project.research_summary.rate===null?'尚未建立计划':project.research_summary.rate+'%' }}</p><p class="pd-muted">{{ project.zero_date ? '正式启动日 D0 · '+project.zero_date : '正式启动日待确认' }}</p><h3>项目目标</h3><p class="pd-text">{{ project.goal || '尚未填写项目目标' }}</p><h3>项目背景</h3><p class="pd-text">{{ project.background || '尚未填写项目背景' }}</p></template>
        <ProjectMembers v-else-if="section === 'members'" :project="effectiveProject" @changed="refresh" />
        <ProjectCalendar v-else-if="section === 'calendar'" :project="effectiveProject" :binding="binding" :camp-view="campView" @changed="refresh" />
        <ProjectRecords v-else-if="section === 'records'" :project="effectiveProject" :binding="binding" :camp-view="campView" @changed="refresh" />
        <ProjectCamps v-else-if="section === 'camps'" :project="effectiveProject" @changed="refresh" @open-binding="openBinding" />
        <ProjectAssessment v-else-if="binding && ['assessment','camp-members','camp-meetings','camp-outcomes'].includes(section)" :project="effectiveProject" :binding="binding" :camp-view="campView" :section="section" :draft-cache="assessmentDrafts" />
        <template v-else-if="section==='history'"><h2>项目变更记录</h2><p v-for="event in history" :key="event.id">{{ event.occurred_at.replace('T',' ') }} · {{ event.actor }} · {{ event.reason }}</p></template>
        <template v-else-if="section==='publish'"><h2>公开展示</h2><p>确认后，填写的简介和详情会出现在项目广场。</p><div class="pd-form"><label>公开简介<DewInput v-model="publication.summary" /></label><label>公开详情<DewInput v-model="publication.description" type="textarea" :rows="5" /></label><label>发布依据<DewInput v-model="publication.reason" /></label><label><input v-model="publication.confirm_public" type="checkbox">确认向全站公开上述内容</label><DewButton :disabled="!publication.confirm_public||!publication.summary.trim()||!publication.reason.trim()" :loading="busy" @click="publish">发布到项目广场</DewButton></div></template>
        <div v-if="binding" class="pd-camp-actions"><DewButton size="sm" type="ghost" @click="campPage('points')">本期积分</DewButton><DewButton size="sm" type="ghost" @click="campPage('announcements')">本期公告</DewButton></div>
      </section></div>
    </template>
    <DewDialog v-model="createDialog" title="创建项目" width="580px"><div class="pd-form"><label>项目名称<DewInput v-model="form.title" placeholder="项目名称" /></label><label>项目目标<DewInput v-model="form.goal" type="textarea" :rows="3" /></label><label>项目背景<DewInput v-model="form.background" type="textarea" :rows="3" /></label><label v-if="isAdmin">负责人用户ID<DewInput v-model="form.owner_user_id" type="number" /></label></div><template #footer><DewButton :loading="busy" :disabled="!form.title.trim()" @click="create">创建</DewButton></template></DewDialog>
    <DewDialog v-model="editDialog" title="项目设置" width="580px"><div class="pd-form"><label>项目名称<DewInput v-model="edit.title" /></label><label>项目目标<DewInput v-model="edit.goal" type="textarea" :rows="3" /></label><label>项目背景<DewInput v-model="edit.background" type="textarea" :rows="3" /></label><label>项目状态<DewSelect v-model="edit.status" :options="Object.entries(statusText).map(([value,label]) => ({value,label}))" /></label><label>变更原因<DewInput v-model="edit.reason" placeholder="请说明本次调整" /></label></div><template #footer><DewButton :loading="busy" :disabled="!edit.title?.trim() || !edit.reason?.trim()" @click="save">保存</DewButton></template></DewDialog>
  </main>
</template>
<script setup>
import { ref, computed, watch, reactive, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { DewCard, DewButton, DewInput, DewDialog, DewSelect, DewSkeleton } from '@bme/dew-ui'
import { ElMessage } from 'element-plus'
import { projectService, mutation } from './service'
import ProjectMembers from './ProjectMembers.vue'
import ProjectCalendar from './ProjectCalendar.vue'
import ProjectRecords from './ProjectRecords.vue'
import ProjectCamps from './ProjectCamps.vue'
import ProjectAssessment from './ProjectAssessment.vue'
import ProjectImport from './ProjectImport.vue'
const route = useRoute(), router = useRouter(), store = useStore()
const projectId = computed(() => Number(route.params.projectId) || null)
const bindingId=computed(()=>Number(route.query.binding)||null),binding=ref(null)
const campView=computed(()=>!!binding.value&&((binding.value.can_manage&&route.query.view==='camp')||!project.value?.my_role))
const effectiveProject=computed(()=>campView.value?{...project.value,can_manage:false,can_write:false}:project.value)
const tabs = computed(()=>[{key:'overview',label:'项目概览'},{key:'calendar',label:'项目日历'},{key:'records',label:'记录与成果'},...(!campView.value?[{key:'members',label:'长期成员'},{key:'camps',label:'参加的营期'}]:[]),...(binding.value?[{key:'assessment',label:'本期考核'},{key:'camp-members',label:'本期参营人员'},{key:'camp-meetings',label:'本期组会'},{key:'camp-outcomes',label:'本期成果'}]:[]),...(!campView.value&&project.value?.can_manage?[{key:'history',label:'项目变更记录'},{key:'publish',label:'公开展示'}]:[])])
const section = computed(() => tabs.value.some(t => t.key === route.query.tab) ? route.query.tab : 'overview')
const projects = ref([]), project = ref(null), loading = ref(true), error = ref(''), busy = ref(false), createDialog = ref(false), editDialog = ref(false)
const form = reactive({title:'',goal:'',background:'',owner_user_id:''}), edit = reactive({})
const statusText = { active:'进行中', paused:'已暂停', completed:'已完成', terminated:'已终止', archived:'已归档' }
const isAdmin = computed(() => store.state.user?.role === 'super_admin')
const history=ref([]),publication=reactive({summary:'',description:'',reason:'',confirm_public:false})
const assessmentDrafts=reactive({}),createKey=ref(crypto.randomUUID())
let sequence = 0
async function load() {
  const seq = ++sequence; loading.value = true; error.value = ''; project.value = null; createDialog.value = editDialog.value = false
  try {
    if(route.params.projectId && (!Number.isInteger(Number(route.params.projectId))||Number(route.params.projectId)<1))throw Error('项目编号无效')
    if(route.query.binding && (!Number.isInteger(Number(route.query.binding))||Number(route.query.binding)<1))throw Error('营期关联参数无效')
    if (!(await projectService.status()).enabled) throw Error('独立项目功能尚未开放')
    const data = projectId.value ? await projectService.context(projectId.value,bindingId.value,route.query.view) : await projectService.list()
    if (seq !== sequence) return
    project.value = data.project || null; projects.value = data.projects || [];binding.value=data.binding||null
    if(data.binding?.unit_id&&String(route.query.unit)!==String(data.binding.unit_id))await router.replace({query:{...route.query,unit:String(data.binding.unit_id)}})
  } catch (e) { if (seq === sequence) error.value = e.response?.data?.message || e.message || '项目加载失败' }
  finally { if (seq === sequence) loading.value = false }
}
async function refresh() { const id = projectId.value, seq = sequence; try { const d = await projectService.context(id,bindingId.value,route.query.view); if (seq === sequence && projectId.value === id) {project.value = d.project;binding.value=d.binding} } catch (e) { ElMessage.error(e.response?.data?.message || '刷新失败') } }
function navigate(tab) { const query={...route.query,tab};if(tab!=='assessment')delete query.node;router.push({query}) }
function openBinding(row){router.push({query:{binding:row.id,unit:row.unit_id||undefined,tab:'assessment'}})}
function projectView(){const query={...route.query};delete query.view;router.replace({query})}
function campPage(tab){router.push({path:'/camp',query:{sid:binding.value.camp_id,scope:binding.value.can_manage?'camp':'project',tab:binding.value.can_manage?tab:tab==='projects'?'announcements':tab}})}
async function publish(){busy.value=true;try{await projectService.publish(projectId.value,mutation(project.value,{...publication}));await refresh();ElMessage.success('已发布到项目广场')}catch(e){ElMessage.error(e.response?.data?.message||'发布失败')}finally{busy.value=false}}
async function create() { if (busy.value) return; busy.value = true; try { const body = {...form,idempotency_key:createKey.value}; if (form.owner_user_id) body.owner_user_id = Number(form.owner_user_id); else delete body.owner_user_id; const d = await projectService.create(body); await router.push(`/project-workspace/${d.project.id}`) } catch(e) { ElMessage.error(e.response?.data?.message || '创建失败') } finally { busy.value = false } }
function openEdit() { Object.assign(edit,{title:project.value.title,goal:project.value.goal || '',background:project.value.background || '',status:project.value.status,reason:''}); editDialog.value = true }
async function save() { if (busy.value) return; busy.value = true; try { await projectService.update(projectId.value,mutation(project.value,{...edit})); editDialog.value = false; await refresh(); ElMessage.success('项目已更新') } catch(e) { ElMessage.error(e.response?.data?.message || '保存失败') } finally { busy.value = false } }
watch(createDialog,value=>{if(value)createKey.value=crypto.randomUUID()})
watch([projectId,bindingId,()=>route.query.view],load,{immediate:true})
watch(section,async tab=>{history.value=[];if(tab==='history'&&project.value?.can_manage){try{history.value=(await projectService.history(projectId.value)).events}catch(e){ElMessage.error(e.response?.data?.message||'记录加载失败')}}})
onBeforeUnmount(() => sequence++)
</script>
<style scoped>
.project-domain{max-width:1280px;margin:0 auto;padding:32px 24px;color:var(--dew-text)}.pd-head{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:25px}.pd-head h1{font-size:25px;margin:10px 0}.pd-head p,.pd-muted{color:var(--dew-text-muted);font-size:13px}.pd-projects{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}.pd-projects h2{font-size:18px}.pd-layout{display:grid;grid-template-columns:190px minmax(0,1fr);border:1px solid var(--dew-card-flat-border);border-radius:12px;background:var(--dew-card-flat-bg);min-height:560px;overflow:clip}.pd-layout nav{display:flex;flex-direction:column;padding:16px 10px;gap:5px;border-right:1px solid var(--dew-card-flat-border)}.pd-layout nav button{padding:13px;border:0;border-radius:8px;background:transparent;color:var(--dew-text);font:inherit;text-align:left;cursor:pointer}.pd-layout nav button[aria-current=page]{background:var(--color-primary-light);color:var(--color-primary)}.pd-content{padding:25px;min-width:0}.pd-content h2{margin-top:0;font-size:21px}.pd-text{white-space:pre-wrap;overflow-wrap:anywhere}.pd-form{display:flex;flex-direction:column;gap:16px}.pd-form label{display:flex;flex-direction:column;gap:7px;font-size:13px}@media(max-width:600px){.project-domain{padding:20px 12px}.pd-layout{grid-template-columns:1fr}.pd-layout nav{flex-direction:row;flex-wrap:wrap;border-right:0;border-bottom:1px solid var(--dew-card-flat-border)}.pd-content{padding:18px}.pd-head{flex-wrap:wrap}}
</style>
