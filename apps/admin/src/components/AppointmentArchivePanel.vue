<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../api'

const emit = defineEmits(['changed'])
const visible = ref(false), users = ref([]), userId = ref(null), year = ref('')
const data = ref(null), loading = ref(false), error = ref('')
const backfill = reactive({ visible: false, busy: false, form: {} })
let requestNumber = 0
const records = computed(() => data.value?.records || [])
async function load() {
  const number = ++requestNumber
  data.value = null
  error.value = ''
  if (!userId.value) { loading.value = false; return }
  loading.value = true
  try {
    const response = await api.get(`/admin/officers/history/${userId.value}`, { params: year.value ? { year: year.value } : {} })
    if (number === requestNumber) data.value = response.data.data
  } catch (e) {
    if (number === requestNumber) error.value = e.response?.data?.message || '履历加载失败，请重试'
  } finally { if (number === requestNumber) loading.value = false }
}
async function open(id = null) {
  visible.value = true
  year.value = ''
  userId.value = id
  if (!users.value.length) {
    try { users.value = (await api.get('/user/user_list')).data || [] }
    catch { error.value = '人员名单加载失败，请重新打开重试'; return }
  }
  await load()
}
watch([userId, year], () => { if (visible.value) load() })
function openBackfill() {
  backfill.form = { user_id: userId.value, title: '', department: '', org_slot: 'club', term_start: null, term_end: null, historical_year: null, source_note: '', end_reason: '' }
  backfill.visible = true
}
async function save() {
  const f = backfill.form
  if (!f.user_id || !f.title.trim() || !f.source_note.trim()) return ElMessage.warning('请选择人员并填写历史职位和资料来源')
  backfill.busy = true
  try {
    await api.post('/admin/officers/history', f)
    backfill.visible = false
    userId.value = f.user_id
    year.value = ''
    await load()
    emit('changed')
    ElMessage.success('历史任职已补录，当前权限不变')
  } catch (e) { ElMessage.error(e.response?.data?.message || '历史补录失败') }
  finally { backfill.busy = false }
}
const eventLabel = kind => ({ officer_appointed: '登记任命', officer_ended: '登记卸任', officer_edited: '信息纠错', officer_backfilled: '历史补录' }[kind] || '任职变更')
defineExpose({ open })
</script>

<template>
  <el-dialog v-model="visible" title="个人任职档案" width="900px" append-to-body>
    <el-form inline @submit.prevent>
      <el-form-item label="人员"><el-select v-model="userId" filterable placeholder="选择人员" style="width: 240px;"><el-option v-for="u in users" :key="u.User_Id" :value="u.User_Id" :label="`${u.User_Name} · #${u.User_Id}`" /></el-select></el-form-item>
      <el-form-item label="年份"><el-select v-model="year" placeholder="全部年份" style="width: 160px;"><el-option label="全部年份" value="" /><el-option v-for="y in data?.years || []" :key="y" :value="String(y)" :label="`${y} 年`" /></el-select></el-form-item>
      <el-form-item><el-button @click="openBackfill">补录历史任职</el-button></el-form-item>
      <el-form-item><el-button :loading="loading" @click="load">刷新</el-button></el-form-item>
    </el-form>
    <el-alert type="info" :closable="false" title="跨年任期会出现在覆盖的每个年份。早期记录可能缺少日志；历史补录不授予当前权限。" />
    <el-alert v-if="error" type="error" :closable="false" :title="error" />
    <el-table :data="records" v-loading="loading" empty-text="暂无已登记的任职记录">
      <el-table-column type="expand"><template #default="{ row }"><div class="archive-details"><p>资料来源：{{ row.source_note || '未登记' }}</p><p>结束原因：{{ row.end_reason || '未登记' }}</p><p v-if="!row.events.length">没有可用的早期操作日志。</p><p v-for="e in row.events" :key="e.id">{{ eventLabel(e.kind) }} · {{ e.occurred_at?.replace('T', ' ') || '操作时间不详' }}<span v-if="e.detail.reason"> · {{ e.detail.reason }}</span></p></div></template></el-table-column>
      <el-table-column label="职位" prop="title" min-width="120" />
      <el-table-column label="组别" prop="department" min-width="120" />
      <el-table-column label="任期起" width="130"><template #default="{ row }">{{ row.term_start || '日期不详' }}</template></el-table-column>
      <el-table-column label="任期止" width="130"><template #default="{ row }">{{ row.term_end || (row.status === 'active' ? '在任' : '日期不详') }}</template></el-table-column>
      <el-table-column label="记录来源" width="120"><template #default="{ row }">{{ { system: '系统记录', legacy: '既有记录', backfill: '历史补录' }[row.record_source] || '既有记录' }}</template></el-table-column>
      <el-table-column label="已知年份" min-width="140"><template #default="{ row }">{{ row.years.join('、') || '年份不详' }}</template></el-table-column>
    </el-table>
  </el-dialog>
  <el-dialog v-model="backfill.visible" title="补录历史任职" width="560px" append-to-body :close-on-click-modal="false">
    <el-alert type="info" :closable="false" title="只补录已经结束的历史任职。日期未知可留空；仅知道年份时填写年份，不推算日期。" />
    <el-form :model="backfill.form" label-width="100px" @submit.prevent>
      <el-form-item label="人员" required><el-select v-model="backfill.form.user_id" filterable style="width: 100%;"><el-option v-for="u in users" :key="u.User_Id" :value="u.User_Id" :label="`${u.User_Name} · #${u.User_Id}`" /></el-select></el-form-item>
      <el-form-item label="历史职位" required><el-input v-model="backfill.form.title" maxlength="30" /></el-form-item>
      <el-form-item label="历史组别"><el-input v-model="backfill.form.department" maxlength="50" /></el-form-item>
      <el-form-item label="职位类别"><el-radio-group v-model="backfill.form.org_slot"><el-radio value="club">社团职务</el-radio><el-radio value="group">组内职位</el-radio></el-radio-group></el-form-item>
      <el-form-item label="任期起"><el-date-picker v-model="backfill.form.term_start" type="date" value-format="YYYY-MM-DD" placeholder="日期不详可留空" /></el-form-item>
      <el-form-item label="任期止"><el-date-picker v-model="backfill.form.term_end" type="date" value-format="YYYY-MM-DD" placeholder="日期不详可留空" /></el-form-item>
      <el-form-item label="已知年份"><el-input-number v-model="backfill.form.historical_year" :min="1900" :max="new Date().getFullYear()" :precision="0" placeholder="年份不详可留空" /></el-form-item>
      <el-form-item label="资料来源" required><el-input v-model="backfill.form.source_note" type="textarea" maxlength="500" show-word-limit placeholder="例如：2025届任命名单，经负责人核对" /></el-form-item>
      <el-form-item label="结束原因"><el-input v-model="backfill.form.end_reason" maxlength="200" /></el-form-item>
    </el-form>
    <template #footer><div class="dialog-footer"><el-button @click="backfill.visible = false">取消</el-button><el-button type="primary" :loading="backfill.busy" @click="save">保存历史任职</el-button></div></template>
  </el-dialog>
</template>

<style scoped>
.archive-details { padding: 12px 24px; line-height: 1.7; color: var(--text-color-secondary); }
</style>
