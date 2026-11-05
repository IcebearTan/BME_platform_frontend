<template>
  <section class="project-outcomes">
    <header class="po-head"><h3>验收材料与成果</h3><div><slot name="actions" /><DewButton v-if="editable" size="sm" @click="open">登记成果</DewButton></div></header>
    <ProjectRecordFilters :model-value="filters" v-model:group-by="groupBy" placeholder="搜索成果标题、说明或贡献人" @search="filters = $event" />
    <DewSkeleton v-if="loading" variant="rect" width="100%" height="150" />
    <div v-else-if="error" role="alert" class="po-error"><p>{{ error }}</p><DewButton size="sm" @click="load">重试</DewButton></div>
    <template v-else>
      <p class="po-muted" role="status">共 {{ visible.length }} 项成果<span v-if="outcomes.some(row => !recordDate(row))"> · 部分历史成果未记录日期</span></p>
      <p v-if="!visible.length" class="po-empty">{{ outcomes.length ? '没有符合筛选条件的成果。' : '尚无成果登记。' }}</p>
      <section v-for="group in groups" :key="group.key" class="po-group"><h4>{{ group.label }}<small>{{ group.rows.length }} 项</small></h4>
        <article v-for="(row, index) in group.rows" :key="row.id || index" class="po-item"><header><h5>{{ row.title }}</h5><span :class="['po-state', `po-state-${row.status}`]">{{ stateText[row.status] || row.status }}</span></header>
          <p class="po-muted">登记日期：{{ recordDate(row) || '未记录' }}<span v-if="row.contributors?.length"> · {{ row.contributors.join('、') }}</span></p>
          <p v-if="row.description" class="po-content">{{ row.description }}</p><p v-if="row.reject_reason" class="po-error">退回原因：{{ row.reject_reason }}</p>
        </article>
      </section>
    </template>
    <DewDialog v-model="dialog" title="登记项目成果" width="560px"><div class="po-form"><label>成果标题<DewInput v-model="form.title" placeholder="如：样机一台 / 论文一篇 / 开源仓库" /></label><label>说明<DewInput v-model="form.description" type="textarea" :rows="4" placeholder="成果形态与完成情况（核验与结营档案可见）" /></label><p class="po-muted">提交后由管理员核验，核验通过后进入结营档案。</p></div><template #footer><DewButton type="ghost" :disabled="saving" @click="dialog = false">取消</DewButton><DewButton :loading="saving" :disabled="!form.title.trim()" @click="save">提交登记</DewButton></template></DewDialog>
  </section>
</template>
<script setup>
import { ref, computed, reactive, watch, onBeforeUnmount } from 'vue'
import { DewButton, DewInput, DewDialog, DewSkeleton } from '@bme/dew-ui'
import { ElMessage } from 'element-plus'
import { campService } from '../../services/campService'
import { recordDate, groupRecords, filterOutcomes, recordStates as stateText } from './projectRecordList'
import ProjectRecordFilters from './ProjectRecordFilters.vue'
import '../../styles/project-workspace.css'
const props = defineProps({ unitId: Number, editable: Boolean, items: { type: Array, default: undefined } }), emit = defineEmits(['changed'])
const outcomes = ref([]), loading = ref(true), error = ref(''), filters = ref({ q: '', from: '', to: '' }), groupBy = ref('month')
const dialog = ref(false), saving = ref(false), form = reactive({ title: '', description: '' })
const visible = computed(() => filterOutcomes(outcomes.value, filters.value)), groups = computed(() => groupRecords(visible.value, groupBy.value))
let sequence = 0
async function load() {
  const seq = ++sequence; loading.value = true; error.value = ''; outcomes.value = []
  if (props.items !== undefined) { outcomes.value = props.items; loading.value = false; return }
  try { const d = await campService.fetchOutcomes(props.unitId); if (seq === sequence) outcomes.value = d.outcomes || [] }
  catch (e) { if (seq === sequence) error.value = e.response?.data?.message || '成果加载失败' }
  finally { if (seq === sequence) loading.value = false }
}
function open() { form.title = ''; form.description = ''; dialog.value = true }
async function save() {
  if (saving.value || !props.editable || !form.title.trim()) return
  const unitId = props.unitId, seq = sequence
  saving.value = true
  try {
    await campService.registerOutcome(unitId, { title: form.title.trim(), description: form.description.trim() || null })
    if (seq !== sequence) return
    dialog.value = false; await load(); emit('changed'); ElMessage.success('成果已登记，等待核验')
  } catch (e) { if (seq === sequence) ElMessage.error(e.response?.data?.message || '登记失败') }
  finally { saving.value = false }
}
watch(() => [props.unitId, props.items], () => { dialog.value = false; filters.value = { q: '', from: '', to: '' }; load() }, { immediate: true })
onBeforeUnmount(() => sequence++)
</script>
<style scoped>
.project-outcomes { color: var(--dew-text); min-width: 0; }.po-head,.po-head>div,.po-item header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }.po-head { margin-bottom: 20px; }.po-head>div { justify-content: flex-end; }.po-head h3 { margin: 0; color: var(--dew-text-heading); font-size: 17px; }.po-muted { font-size: 12px; color: var(--dew-text-muted); }.po-empty { padding: 24px 0; color: var(--dew-text-muted); font-size: 14px; }.po-group { margin-top: 24px; }.po-group h4 { display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--dew-card-flat-border); padding-bottom: 12px; font-size: 15px; color: var(--dew-text-heading); }.po-group small { font-size: 12px; font-weight: 400; color: var(--dew-text-muted); }.po-item { padding: 18px 0; border-bottom: 1px solid var(--dew-card-flat-border); }.po-item h5 { margin: 0; font-size: 16px; color: var(--dew-text-heading); overflow-wrap: anywhere; }.po-state { font-size: 12px; }.po-state-submitted { color: var(--pws-warning-text); }.po-state-verified { color: var(--pws-success-text); }.po-state-rejected,.po-error { color: var(--pws-danger-text); font-size: 13px; }.po-content { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.7; }.po-form { display: flex; flex-direction: column; gap: 16px; }.po-form label { display: flex; flex-direction: column; gap: 7px; color: var(--dew-text); font-size: 13px; }
</style>
