<template>
  <div class="project-records">
    <header class="pr-head"><div><h2>记录与成果</h2><p class="pr-muted">按实际发生日期整理项目过程与成果。</p></div><div class="pr-actions">
      <DewButton v-if="route.query.record" size="sm" type="ghost" @click="allRecords">查看全部记录</DewButton>
      <template v-if="current.can_write && !campView"><DewButton size="sm" type="ghost" @click="open()">新增记录</DewButton><DewButton v-if="current.can_manage" size="sm" @click="open(null, 'outcome')">提交成果</DewButton></template>
    </div></header>
    <ProjectRecordFilters v-if="!route.query.record" :model-value="filters" :group-by="groupBy" :kinds="kindOptions" @search="search" @update:group-by="changeGroup" />
    <DewSkeleton v-if="loading && !rows.length" variant="rect" width="100%" height="180" />
    <p v-if="error" role="alert" class="pr-error">{{ error }} <DewButton size="sm" @click="load">重试</DewButton></p>
    <template v-if="!loading || rows.length">
      <p v-if="!error" class="pr-muted" role="status">{{ loading ? '正在更新…' : route.query.record ? '当前记录' : `共 ${total} 条记录` }}</p>
      <div v-if="!error && !rows.length" class="pr-empty">{{ route.query.record ? '当前记录不可访问或已不存在。' : filtered ? '没有符合筛选条件的记录，请调整关键词或日期。' : '暂无项目记录，可新增记录或提交成果。' }}</div>
      <section v-for="group in groups" :key="group.key" class="pr-group"><h3 class="pr-group-title">{{ group.label }}<span>{{ group.rows.length }} 条</span></h3>
        <article v-for="row in group.rows" :key="row.id" class="pr-record"><header><h4>{{ row.title }}</h4><span :class="['pr-state', `pr-state-${row.status}`]">{{ kindText[row.kind] }} · {{ stateText[row.status] }}</span></header>
          <p class="pr-muted"><time :datetime="row.occurred_on">{{ row.occurred_on }}</time> · {{ row.author }}</p><p class="pr-content">{{ row.content }}</p>
          <div v-if="row.files?.length" class="pr-files"><DewButton v-for="file in row.files" :key="file.id" size="sm" type="ghost" @click="download(file)">{{ file.filename }}</DewButton></div>
          <div class="pr-actions"><DewButton v-if="row.can_edit && current.can_write && !campView" size="sm" type="ghost" @click="open(row)">编辑记录</DewButton><template v-if="row.can_verify && !campView"><DewButton size="sm" @click="verify(row,'verified')">核验成果</DewButton><DewButton size="sm" type="ghost" @click="verify(row,'rejected')">退回成果</DewButton></template></div>
        </article>
      </section>
      <nav v-if="!error && !route.query.record && total > pageSize" class="pr-pagination" aria-label="项目记录分页"><DewButton size="sm" type="ghost" :disabled="page <= 1 || loading" @click="changePage(page - 1)">上一页</DewButton><span>第 {{ page }} / {{ Math.ceil(total / pageSize) }} 页</span><DewButton size="sm" type="ghost" :disabled="!hasMore || loading" @click="changePage(page + 1)">下一页</DewButton></nav>
    </template>
    <DewDialog v-model="dialog" :title="form.id ? '编辑项目记录' : form.kind === 'outcome' ? '提交项目成果' : '新增项目记录'" width="640px"><div class="pr-form">
      <label>记录类型<DewSelect v-model="form.kind" :disabled="!!form.id" :options="kindOptions.filter(item => item.value !== 'outcome' || current.can_manage)" /></label>
      <label>标题<DewInput v-model="form.title" placeholder="记录标题" /></label>
      <label>实际日期<input v-model="form.occurred_on" type="date" :max="today" aria-label="记录实际日期"></label>
      <label>记录内容<DewInput v-model="form.content" type="textarea" :rows="5" placeholder="记录过程、结论和下一步" /></label>
      <label>本期共享范围<DewSelect v-model="form.binding_id" :disabled="!!bindingError" :options="[{value:'',label:'仅长期项目团队'},...bindings.filter(b=>b.status==='active').map(b=>({value:b.id,label:b.camp_name}))]" /></label><p v-if="bindingError" class="pr-error" role="alert">{{ bindingError }}</p>
      <label>附件（合计48MB，最多20个）<input type="file" multiple @change="selectFiles"></label><p v-if="files.length" class="pr-muted">已选 {{ files.length }} 个附件</p><p v-if="form.id && form.files?.length" class="pr-muted">保留原有 {{ form.files.length }} 个附件；新选附件将追加。</p>
      <label>记录原因<DewInput v-model="form.reason" placeholder="说明本次新增或调整" /></label><p v-if="form.kind === 'outcome'" class="pr-muted">提交后等待管理员核验。</p>
    </div><template #footer><DewButton type="ghost" :disabled="busy" @click="dialog = false">取消</DewButton><DewButton :loading="busy" :disabled="!form.title?.trim() || !form.reason?.trim() || !form.occurred_on" @click="save">{{ !form.id && form.kind === 'outcome' ? '提交成果' : '保存记录' }}</DewButton></template></DewDialog>
  </div>
</template>
<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DewButton, DewInput, DewSelect, DewDialog, DewSkeleton } from '@bme/dew-ui'
import { ElMessage, ElMessageBox } from 'element-plus'
import { projectService, mutation, createRequestKey } from './service'
import { groupRecords, recordKinds as kindText, recordStates as stateText } from './projectRecordList'
import ProjectRecordFilters from './ProjectRecordFilters.vue'
import '../../styles/project-workspace.css'
const props = defineProps({ project: Object, binding: Object, campView: Boolean }), emit = defineEmits(['changed'])
const route = useRoute(), router = useRouter()
const rows = ref([]), bindings = ref([]), loading = ref(true), error = ref(''), dialog = ref(false), busy = ref(false), files = ref([]), form = reactive({}), context = ref(null)
const current = computed(() => context.value || props.project), operationKey = ref(createRequestKey())
const kindOptions = Object.entries(kindText).map(([value, label]) => ({ value, label }))
const filters = computed(() => ({ q: String(route.query.record_q || ''), from: String(route.query.record_from || ''), to: String(route.query.record_to || ''), kind: String(route.query.record_kind || '') }))
const groupBy = computed(() => route.query.record_group === 'day' ? 'day' : 'month')
const page = computed(() => /^\d+$/.test(String(route.query.record_page)) && Number(route.query.record_page) > 0 ? Number(route.query.record_page) : 1)
const pageSize = 20, total = ref(0), hasMore = ref(false)
const groups = computed(() => groupRecords(rows.value, groupBy.value)), filtered = computed(() => Object.values(filters.value).some(Boolean))
const today = computed(() => new Intl.DateTimeFormat('en-CA', { timeZone: current.value.timezone || 'Asia/Shanghai' }).format(new Date()))
let sequence = 0, scopeSequence = 0
async function load() {
  const seq = ++sequence; loading.value = true; error.value = ''
  try {
    const d = await projectService.records(props.project.id, { binding: props.binding?.id, record_id: route.query.record || undefined, camp_view: props.campView ? 1 : undefined, ...(!route.query.record ? { ...filters.value, page: page.value, page_size: pageSize } : {}) })
    if (seq !== sequence) return
    rows.value = d.records; total.value = d.total ?? d.records.length; hasMore.value = Boolean(d.has_more); context.value = d.project
  } catch (e) { if (seq === sequence) error.value = e.response?.data?.message || '记录加载失败' }
  finally { if (seq === sequence) loading.value = false }
}
function search(value) { const query = { ...route.query }; for (const [key, val] of Object.entries(value)) { if (val) query[`record_${key}`] = val; else delete query[`record_${key}`] } delete query.record_page; router.replace({ query }) }
function changeGroup(value) { router.replace({ query: { ...route.query, record_group: value } }) }
function changePage(value) { router.replace({ query: { ...route.query, record_page: String(value) } }) }
function allRecords() { const query = { ...route.query }; delete query.record; router.push({ query }) }
function open(row, kind = 'record') {
  operationKey.value = createRequestKey()
  for (const key of Object.keys(form)) delete form[key]
  Object.assign(form, { id: null, kind, title: '', content: '', occurred_on: today.value, binding_id: '', reason: '' }, row || {})
  if (!form.binding_id) form.binding_id = ''
  files.value = []; dialog.value = true
}
function selectFiles(e) { const selected = [...e.target.files]; if (selected.length + (form.files?.length || 0) > 20 || selected.reduce((n, f) => n + f.size, 0) + (form.files || []).reduce((n, f) => n + f.size, 0) > 48 * 1024 * 1024) { ElMessage.warning('附件合计不能超过48MB，最多20个'); e.target.value = ''; files.value = []; return } files.value = selected }
async function save() {
  if (busy.value) return
  busy.value = true
  try {
    await projectService.saveRecord(props.project.id, { ...mutation(current.value, { kind: form.kind, title: form.title, content: form.content, occurred_on: form.occurred_on, binding_id: form.binding_id || null, reason: form.reason }), idempotency_key: operationKey.value }, files.value, form.id)
    dialog.value = false; await load(); emit('changed'); ElMessage.success('记录已保存')
  } catch (e) { ElMessage.error(e.response?.data?.message || '保存失败') }
  finally { busy.value = false }
}
async function download(file) { try { window.open(await projectService.fileUrl(file.id, props.binding?.id), '_blank', 'noopener') } catch (e) { ElMessage.error(e.response?.data?.message || '附件不可访问') } }
async function verify(row, status) {
  let reason
  try { reason = (await ElMessageBox.prompt('填写核验依据', '项目成果核验', { inputValidator: v => !!v?.trim() || '请填写依据' })).value } catch { return }
  try { await projectService.verifyRecord(props.project.id, row.id, mutation(current.value, { status, reason })); await load(); emit('changed') } catch (e) { ElMessage.error(e.response?.data?.message || '核验失败') }
}
const bindingError = ref('')
watch(() => [props.project.id, props.binding?.id, props.campView], async () => {
  const scope = ++scopeSequence
  dialog.value = false; bindings.value = []; rows.value = []; context.value = null; bindingError.value = ''
  load()
  if (!props.campView) { try { const b = await projectService.camps(props.project.id); if (scope === scopeSequence) bindings.value = b.bindings } catch { if (scope === scopeSequence) bindingError.value = '参营范围加载失败，请刷新后再提交共享记录。' } }
}, { immediate: true })
watch(() => [route.query.record, filters.value.q, filters.value.from, filters.value.to, filters.value.kind, page.value], () => { rows.value = []; load() })
onBeforeUnmount(() => { sequence++; scopeSequence++ })
</script>
<style scoped>
.project-records { color: var(--dew-text); min-width: 0; }.pr-head,.pr-record header,.pr-actions,.pr-files,.pr-pagination { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }.pr-head { margin-bottom: 18px; }.pr-head h2 { margin: 0; color: var(--dew-text-heading); font-size: 18px; }.pr-head p { margin-bottom: 0; }.pr-group { margin-top: 24px; }.pr-group-title { display: flex; align-items: center; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--dew-card-flat-border); font-size: 15px; color: var(--dew-text-heading); }.pr-group-title span { font-size: 12px; font-weight: 400; color: var(--dew-text-muted); }.pr-record { padding: 18px 0; border-bottom: 1px solid var(--dew-card-flat-border); }.pr-record h4 { margin: 0; font-size: 16px; color: var(--dew-text-heading); overflow-wrap: anywhere; }.pr-content { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.7; }.pr-muted { color: var(--dew-text-muted); font-size: 12px; }.pr-state { font-size: 12px; color: var(--dew-text-muted); }.pr-state-pending { color: var(--pws-warning-text, var(--color-warning)); }.pr-state-verified { color: var(--pws-success-text, var(--color-success)); }.pr-state-rejected,.pr-error { color: var(--pws-danger-text, var(--color-danger)); }.pr-actions,.pr-files { justify-content: flex-start; }.pr-record .pr-actions,.pr-files { margin-top: 12px; }.pr-files :deep(.dew-btn) { max-width: 100%; }.pr-empty { padding: 30px 0; color: var(--dew-text-muted); font-size: 14px; }.pr-pagination { justify-content: center; margin-top: 24px; font-size: 13px; }.pr-form { display: flex; flex-direction: column; gap: 15px; }.pr-form label { display: flex; flex-direction: column; gap: 7px; font-size: 13px; color: var(--dew-text); }.pr-form input { max-width: 100%; font: inherit; color: var(--dew-text); background: var(--dew-card-flat-bg); border: 1px solid var(--pws-field-border); padding: 8px; border-radius: var(--radius-md); }
</style>
