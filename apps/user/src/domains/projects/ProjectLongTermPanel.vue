<template>
  <div v-if="project" class="project-long-term-panel">
    <ProjectCalendar v-if="section === 'calendar'" :key="contentKey" :project="effectiveProject" :binding="binding" :camp-view="campView" @changed="emit('changed')" @navigate="forwardNavigation" />
    <ProjectRecords v-else-if="section === 'records'" :key="contentKey" :project="effectiveProject" :binding="binding" :camp-view="campView" @changed="emit('changed')" />
    <ProjectMembers v-else-if="section === 'team' && !campView" :key="contentKey" :project="effectiveProject" @changed="emit('changed')" />
    <ProjectCamps v-else-if="section === 'camps' && !campView" :key="contentKey" :project="effectiveProject" @changed="emit('changed')" @open-binding="emit('open-binding', $event)" />

    <section v-else-if="section === 'history' && canManage" class="plt-section">
      
      <p class="plt-muted">记录长期项目的成员、计划和资料调整。</p>
      <DewSkeleton v-if="historyLoading" variant="rect" width="100%" height="180" />
      <div v-else-if="historyError" role="alert"><p>{{ historyError }}</p><DewButton size="sm" @click="loadHistory">重试</DewButton></div>
      <p v-else-if="!history.length" class="plt-muted">暂无项目变更记录。</p>
      <ol v-else class="plt-history">
        <li v-for="event in history" :key="event.id">
          <div><strong>{{ event.actor || '系统' }}</strong><time>{{ displayTime(event.occurred_at) }}</time></div>
          <p>{{ event.reason || '项目资料已更新' }}</p>
        </li>
      </ol>
    </section>

    <section v-else-if="section === 'settings' && canManage" class="plt-section">
      
      <p class="plt-muted">这里维护长期项目的名称、目标和状态，各营期共用这份项目资料。</p>
      <form class="plt-form" @submit.prevent="save">
        <label>项目名称<DewInput v-model="edit.title" :maxlength="100" /></label>
        <label>项目目标<DewInput v-model="edit.goal" type="textarea" :rows="4" /></label>
        <label>项目背景<DewInput v-model="edit.background" type="textarea" :rows="5" /></label>
        <label>项目状态<DewSelect v-model="edit.status" :options="statusOptions" /></label>
        <label>变更原因<DewInput v-model="edit.reason" placeholder="请说明本次调整" :maxlength="500" /></label>
        <div class="plt-actions"><DewButton :loading="busy" :disabled="!edit.title.trim() || !edit.reason.trim()" @click="save">保存项目设置</DewButton></div>
      </form>
    </section>

    <section v-else-if="section === 'publish' && canManage" class="plt-section">
      
      <p class="plt-muted">填写的简介和详情将在项目广场向全站展示。长期团队的内部记录需另行整理后填入。</p>
      <p v-if="!canPublish" role="status" class="plt-muted">项目处于进行中或已完成状态时，可以发布公开展示。</p>
      <form v-else class="plt-form" @submit.prevent="publish">
        <label>公开简介<DewInput v-model="publication.summary" type="textarea" :rows="2" :maxlength="300" /></label>
        <label>公开详情<DewInput v-model="publication.description" type="textarea" :rows="7" /></label>
        <label>发布依据<DewInput v-model="publication.reason" :maxlength="500" /></label>
        <label class="plt-check"><input v-model="publication.confirm_public" type="checkbox">确认向全站公开上述内容</label>
        <div class="plt-actions"><DewButton :disabled="!publication.confirm_public || !publication.summary.trim() || !publication.reason.trim()" :loading="busy" @click="publish">发布到项目广场</DewButton></div>
      </form>
    </section>
    <p v-else class="plt-muted" role="status">当前视角没有此项工作的访问权限。</p>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { DewButton, DewInput, DewSelect, DewSkeleton } from '@bme/dew-ui'
import { ElMessage } from 'element-plus'
import { mutation, projectService } from './service'
import ProjectCalendar from './ProjectCalendar.vue'
import ProjectRecords from './ProjectRecords.vue'
import ProjectMembers from './ProjectMembers.vue'
import ProjectCamps from './ProjectCamps.vue'

const props = defineProps({ project: Object, binding: Object, campView: Boolean, section: String })
const emit = defineEmits(['changed', 'navigate', 'open-binding'])
const effectiveProject = computed(() => props.campView ? { ...props.project, can_manage: false, can_write: false } : props.project)
const canManage = computed(() => !!props.project?.can_manage && !props.campView)
const canPublish = computed(() => canManage.value && ['active', 'completed'].includes(props.project?.status))
const contentKey = computed(() => `${props.project?.id}:${props.binding?.id || ''}:${props.campView}`)
const statusOptions = [
  { value: 'active', label: '进行中' }, { value: 'paused', label: '已暂停' },
  { value: 'completed', label: '已完成' }, { value: 'terminated', label: '已终止' },
  { value: 'archived', label: '已归档' },
]
const edit = reactive({ title: '', goal: '', background: '', status: 'active', reason: '' })
const publication = reactive({ summary: '', description: '', reason: '', confirm_public: false })
const history = ref([]), historyLoading = ref(false), historyError = ref(''), busy = ref(false)
let contextSequence = 0, historySequence = 0

const message = (error, fallback) => typeof error.response?.data?.message === 'string' ? error.response.data.message : fallback
const displayTime = value => String(value || '').replace('T', ' ').replace(/Z$/, '')
function forwardNavigation(tab, node, source) { emit('navigate', tab, node, source) }
function resetEdit() {
  Object.assign(edit, { title: props.project?.title || '', goal: props.project?.goal || '', background: props.project?.background || '', status: props.project?.status || 'active', reason: '' })
}
async function loadHistory() {
  const seq = ++historySequence, context = contextSequence, id = props.project?.id
  history.value = []; historyError.value = ''; historyLoading.value = false
  if (!id || !canManage.value || props.section !== 'history') return
  historyLoading.value = true
  try {
    const data = await projectService.history(id)
    if (seq === historySequence && context === contextSequence) history.value = data.events || []
  } catch (error) {
    if (seq === historySequence && context === contextSequence) historyError.value = message(error, '项目变更记录加载失败')
  } finally {
    if (seq === historySequence && context === contextSequence) historyLoading.value = false
  }
}
async function save() {
  if (busy.value || !canManage.value || !edit.title.trim() || !edit.reason.trim()) return
  const context = contextSequence, id = props.project.id
  busy.value = true
  try {
    await projectService.update(id, mutation(props.project, { ...edit }))
    if (context !== contextSequence) return
    edit.reason = ''; emit('changed'); ElMessage.success('项目已更新')
  } catch (error) {
    if (context === contextSequence) ElMessage.error(message(error, '项目设置保存失败'))
  } finally {
    if (context === contextSequence) busy.value = false
  }
}
async function publish() {
  if (busy.value || !canPublish.value || !publication.confirm_public || !publication.summary.trim() || !publication.reason.trim()) return
  const context = contextSequence, id = props.project.id
  busy.value = true
  try {
    await projectService.publish(id, mutation(props.project, { ...publication }))
    if (context !== contextSequence) return
    publication.confirm_public = false; publication.reason = ''; emit('changed'); ElMessage.success('已发布到项目广场')
  } catch (error) {
    if (context === contextSequence) ElMessage.error(message(error, '公开展示发布失败'))
  } finally {
    if (context === contextSequence) busy.value = false
  }
}
watch(contentKey, () => {
  contextSequence++; historySequence++; busy.value = false
  resetEdit(); Object.assign(publication, { summary: '', description: '', reason: '', confirm_public: false })
}, { immediate: true })
watch(() => props.section, (section, previous) => { if (section === 'settings' && previous !== 'settings') resetEdit() })
watch(() => [contentKey.value, props.section, props.project?.version, canManage.value], loadHistory, { immediate: true })
onBeforeUnmount(() => { contextSequence++; historySequence++ })
</script>

<style scoped>
/* 栏目标题由共同工作台提供，嵌入的业务组件只保留内容与操作。 */
.project-long-term-panel :deep(.pc-head h2),
.project-long-term-panel :deep(.pr-head h2),
.project-long-term-panel :deep(.pcb-head h2),
.project-long-term-panel :deep(.project-members > h2) { display: none; }
.project-long-term-panel :deep(.pr-head),
.project-long-term-panel :deep(.pcb-head) { justify-content: flex-end; margin-bottom: 18px; }

.plt-section h2 { margin: 0 0 12px; font-size: 21px; }
.plt-muted { color: var(--dew-text-muted); font-size: 13px; line-height: 1.8; }
.plt-form { display: flex; flex-direction: column; gap: 20px; max-width: 760px; margin-top: 24px; }
.plt-form label { display: flex; flex-direction: column; gap: 8px; font-size: 13px; }
.plt-form .plt-check { flex-direction: row; align-items: center; }
.plt-actions { display: flex; gap: 12px; }
.plt-history { margin: 24px 0 0; padding: 0; list-style: none; }
.plt-history li { padding: 16px 0; border-bottom: 1px solid var(--dew-card-flat-border); }
.plt-history li > div { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.plt-history time { color: var(--dew-text-muted); font-size: 12px; }
.plt-history p { margin: 10px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 14px; }
</style>
