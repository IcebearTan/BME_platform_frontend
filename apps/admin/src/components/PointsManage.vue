<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Plus, Refresh, QuestionFilled } from '@element-plus/icons-vue'
import { DewCard, DewButton, DewButtonBar, DewDialog, DewInput, DewSelect, DewSwitch, DewTag, DewMessage, DewMessageBox } from '@bme/dew-ui'
import api from '../api'

defineProps({ embedded: Boolean })
const camps = ref([]), kinds = ref([]), campId = ref(null), tab = ref('rules')
const scope = ref('camp'), platformKinds = ref([]), platformRulesAdmin = ref(false)
const rules = ref([]), rows = ref([]), members = ref([]), loading = ref(false), error = ref(''), busy = ref(false)
const total = ref(0), page = ref(1), detail = ref(null)
const ruleDialog = ref(false), proposalDialog = ref(false), actionDialog = ref(false)
const ruleForm = reactive({}), proposal = reactive({}), decision = reactive({})
const selected = computed(() => camps.value.find(c => c.id === campId.value))
const campOptions = computed(() => camps.value.map(c => ({ value: c.id, label: c.name })))
const memberOptions = computed(() => members.value.map(u => ({ value: u.id, label: u.name })))
const proposalKinds = computed(() => rules.value.filter(r => r.enabled && ['contribution', 'completion'].includes(r.kind)).map(r => ({ value: r.kind, label: r.title })))
const statuses = { review: '待审核', pending: '待到账', processing: '入账中', failed: '待重试', blocked: '身份待核', completed: '已到账', rejected: '已退回', cancelled: '已取消' }
const scopeItems = [{ value: 'camp', label: '营期' }, { value: 'platform', label: '平台' }]
const tabs = computed(() => scope.value === 'platform'
  ? [{ value: 'rules', label: '积分规则' }, { value: 'records', label: '发放记录' }, { value: 'failed', label: '入账异常' }]
  : [{ value: 'rules', label: '积分规则' }, { value: 'review', label: '发放审核' }, { value: 'records', label: '发放记录' }, { value: 'failed', label: '入账异常' }])
const canEditRules = computed(() => scope.value === 'platform' ? platformRulesAdmin.value : !!(selected.value?.can_rules && !selected.value.readonly))
const dateText = value => value?.replace('T', ' ').slice(0, 16) || '—'
const errorText = e => e?.response?.data?.message || '操作失败，请稍后重试'
const localMinute = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0, 16) }
let generation = 0
async function initialize() {
  loading.value = true; error.value = ''
  try {
    const { data } = await api.get('/points/manage/meta')
    camps.value = data.camps || []; kinds.value = data.kinds || []; campId.value = camps.value[0]?.id || null
    platformKinds.value = data.platform_kinds || []; platformRulesAdmin.value = !!data.platform_rules_admin
    if (scope.value === 'platform' && !platformRulesAdmin.value) scope.value = 'camp'
  }
  catch (e) { error.value = errorText(e) } finally { loading.value = false }
}
function resetPanels() { ruleDialog.value = proposalDialog.value = actionDialog.value = false; detail.value = null; rules.value = []; rows.value = []; members.value = []; page.value = 1 }
async function load() {
  const current = ++generation
  if (scope.value === 'platform') {
    loading.value = true; error.value = ''
    try {
      const results = await Promise.all([
        api.get('/points/manage/rules'),
        api.get('/points/manage/platform/rewards', { params: { page: page.value, status: tab.value === 'failed' ? 'failed' : undefined } }),
      ])
      if (current !== generation) return
      rules.value = results[0].data.items || []; rows.value = results[1].data.items || []; total.value = results[1].data.total || 0
    } catch (e) { if (current === generation) error.value = errorText(e) }
    finally { if (current === generation) loading.value = false }
    return
  }
  const sid = campId.value
  if (!sid) return
  loading.value = true; error.value = ''
  try {
    const results = await Promise.all([
      api.get('/points/manage/rules', { params: { camp_id: sid } }),
      api.get('/points/manage/rewards', { params: { camp_id: sid, page: page.value, status: ['review', 'failed'].includes(tab.value) ? tab.value : undefined } }),
      api.get('/points/manage/members', { params: { camp_id: sid } }),
    ])
    if (current !== generation) return
    rules.value = results[0].data.items || []; rows.value = results[1].data.items || []; total.value = results[1].data.total || 0; members.value = results[2].data.items || []
  } catch (e) { if (current === generation) error.value = errorText(e) }
  finally { if (current === generation) loading.value = false }
}
watch(scope, () => { resetPanels(); tab.value = 'rules'; load() })
watch(campId, () => { resetPanels(); load() })
watch(tab, () => { page.value = 1; load() })
watch(page, load)
onMounted(initialize)
function editRule(row) {
  const isPlatform = scope.value === 'platform'
  const kindSource = isPlatform ? platformKinds.value : kinds.value
  Object.assign(ruleForm, { camp_id: isPlatform ? null : campId.value, kind: row?.kind || kindSource[0]?.value, amount: String(row?.amount || 1),
    period_limit: String(row?.period_limit || 1), enabled: row?.enabled || false, version: row?.version || 0, effective_at: localMinute(), existing: !!row,
    bonus_unit_hours: row?.bonus_unit_hours != null ? String(row.bonus_unit_hours) : '',
    bonus_amount: row?.bonus_amount != null ? String(row.bonus_amount) : '',
    bonus_cap: row?.bonus_cap != null ? String(row.bonus_cap) : '' })
  ruleDialog.value = true
}
function bonusValue(value, name, max) {
  if (value === '' || value == null) return null
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > max) { DewMessage.warning(`${name}须为 1-${max} 的整数，留空使用默认`); return false }
  return n
}
async function saveRule() {
  if (busy.value) return
  if (!Number.isInteger(Number(ruleForm.amount)) || Number(ruleForm.amount) < 1 || Number(ruleForm.amount) > 10000 || !ruleForm.effective_at) return DewMessage.warning('请填写有效积分与生效时间')
  const payload = { camp_id: ruleForm.camp_id, kind: ruleForm.kind, amount: Number(ruleForm.amount), period_limit: Number(ruleForm.period_limit),
    enabled: ruleForm.enabled, version: ruleForm.version, effective_at: ruleForm.effective_at }
  if (ruleForm.kind === 'daily_checkin') {
    const unit = bonusValue(ruleForm.bonus_unit_hours, '每满几小时', 24), per = bonusValue(ruleForm.bonus_amount, '每次加几分', 100), cap = bonusValue(ruleForm.bonus_cap, '封顶几分', 100)
    if (unit === false || per === false || cap === false) return
    payload.bonus_unit_hours = unit; payload.bonus_amount = per; payload.bonus_cap = cap
  }
  busy.value = true
  try { await api.post('/points/manage/rules', payload); ruleDialog.value = false; DewMessage.success('规则已保存'); await load() }
  catch (e) { DewMessage.error(errorText(e)) } finally { busy.value = false }
}
function newProposal() { Object.assign(proposal, { camp_id: campId.value, user_id: null, kind: proposalKinds.value[0]?.value, reason: '', request_key: crypto.randomUUID() }); proposalDialog.value = true }
async function submitProposal() {
  if (busy.value || !proposal.user_id || !proposal.kind || !proposal.reason.trim()) return
  busy.value = true
  try { await api.post('/points/manage/rewards', { ...proposal }); proposalDialog.value = false; DewMessage.success('已提交审核'); tab.value = 'review'; await load() }
  catch (e) { DewMessage.error(errorText(e)) } finally { busy.value = false }
}
function openAction(row, action) { Object.assign(decision, { id: row.id, action, reason: '', title: action === 'reverse' ? '撤回奖励' : '退回申请' }); actionDialog.value = true }
async function perform(row, action, reason = '') {
  if (busy.value) return
  busy.value = true
  try { const { data } = await api.post(`/points/manage/rewards/${row.id}/${action}`, { reason }); actionDialog.value = false; DewMessage.success(data.item?.status === 'completed' ? '已到账' : '已处理'); await load() }
  catch (e) { DewMessage.error(errorText(e)) } finally { busy.value = false }
}
async function approve(row) {
  try { await DewMessageBox.confirm(`为 ${row.username} 发放 ${row.amount} 积分？`, '审核奖励'); await perform(row, 'approve') } catch (e) { if (e !== 'cancel' && e !== 'close') return }
}
</script>

<template>
  <div class="points-management selectable">
    <div :class="embedded ? 'pm-header' : 'page-header'"><div :class="embedded ? 'pm-title' : 'page-title'">积分管理</div><el-tooltip content="营期规则由平台管理员配置；平台规则（每日打卡、发帖、文章过审）对全体用户生效。规则版本与操作记录保留，重试不会重复发放。" placement="top"><button class="pm-help" aria-label="管理说明"><el-icon><QuestionFilled /></el-icon></button></el-tooltip><DewButtonBar v-model="scope" :items="scopeItems" size="sm" /><span class="pm-spacer" /><div v-if="scope === 'camp'" class="pm-camp-select"><DewSelect v-model="campId" :options="campOptions" :disabled="busy" placeholder="选择营期" /></div><DewButton type="ghost" size="sm" :loading="loading" aria-label="刷新积分管理" @click="camps.length || scope === 'platform' ? load() : initialize()"><el-icon><Refresh /></el-icon></DewButton></div>
    <div v-if="error" class="pm-error" role="alert">{{ error }}<DewButton size="sm" @click="camps.length || scope === 'platform' ? load() : initialize()">重试</DewButton></div>
    <template v-if="scope === 'platform' || selected">
      <div class="pm-toolbar"><DewButtonBar v-model="tab" :items="tabs" size="sm" /><span class="pm-spacer" /><DewTag v-if="scope === 'camp' && selected?.readonly" type="neutral" size="sm">只读</DewTag><DewButton v-if="tab === 'rules' && canEditRules" size="sm" @click="editRule()"><el-icon><Plus /></el-icon>新增规则</DewButton><DewButton v-else-if="scope === 'camp' && !selected?.readonly && proposalKinds.length" size="sm" @click="newProposal">提报奖励</DewButton></div>
      <DewCard no-hover class="table-card">
        <el-table v-if="tab === 'rules'" :data="rules" v-loading="loading" empty-text="暂无积分规则">
          <el-table-column label="奖励事项" min-width="140"><template #default="{ row }">{{ row.title }}<el-tooltip :content="row.help" placement="top"><button class="pm-help" :aria-label="`${row.title}规则说明`"><el-icon><QuestionFilled /></el-icon></button></el-tooltip></template></el-table-column>
          <el-table-column label="积分" width="80"><template #default="{ row }"><strong class="pm-amount">+{{ row.amount }}</strong><small v-if="row.kind === 'daily_checkin'" class="pm-secondary">每满{{ row.bonus_unit_hours || 2 }}h +{{ row.bonus_amount || 1 }}<template v-if="row.bonus_cap">，封顶{{ row.bonus_cap }}</template></small></template></el-table-column>
          <el-table-column label="次数" min-width="100"><template #default="{ row }">{{ row.kind === 'contribution' ? `${row.period_limit} 次/月` : row.kind === 'attendance' ? '1 次/日' : row.kind === 'chapter' ? '1 次/章' : row.kind === 'completion' ? '1 次/营' : '每日首次' }}</template></el-table-column>
          <el-table-column label="状态" width="90"><template #default="{ row }"><DewTag size="sm" :type="row.enabled ? 'success' : 'neutral'">{{ row.enabled ? '启用' : '停用' }}</DewTag></template></el-table-column>
          <el-table-column label="版本 / 生效" min-width="155"><template #default="{ row }"><span>v{{ row.version }}</span><small class="pm-secondary">{{ dateText(row.effective_at) }}</small></template></el-table-column>
          <el-table-column v-if="canEditRules" label="操作" width="75"><template #default="{ row }"><DewButton type="ghost" size="sm" @click="editRule(row)">编辑</DewButton></template></el-table-column>
        </el-table>
        <el-table v-else :data="rows" v-loading="loading" empty-text="暂无记录">
          <el-table-column label="学员 / 事项" min-width="180"><template #default="{ row }"><button class="pm-record-link" @click="detail = row">{{ row.username }}<small>{{ row.title }}</small></button></template></el-table-column>
          <el-table-column label="积分" width="80"><template #default="{ row }"><strong :class="{ 'pm-amount': row.amount > 0 }">{{ row.amount > 0 ? '+' : '' }}{{ row.amount }}</strong></template></el-table-column>
          <el-table-column label="状态" width="95"><template #default="{ row }"><DewTag size="sm" :type="row.status === 'completed' ? 'success' : row.status === 'failed' ? 'warning' : 'neutral'">{{ statuses[row.status] }}</DewTag></template></el-table-column>
          <el-table-column label="时间" min-width="145"><template #default="{ row }">{{ dateText(row.created_at) }}</template></el-table-column>
          <el-table-column v-if="scope === 'platform' ? platformRulesAdmin : (selected?.can_review && !selected.readonly)" label="操作" min-width="160"><template #default="{ row }"><div class="pm-actions"><template v-if="row.status === 'review'"><DewButton type="ghost" size="sm" :disabled="busy" @click="approve(row)">通过</DewButton><DewButton type="ghost" size="sm" :disabled="busy" @click="openAction(row, 'reject')">退回</DewButton></template><DewButton v-else-if="['failed', 'blocked'].includes(row.status)" type="ghost" size="sm" :disabled="busy" @click="perform(row, 'retry')">重试</DewButton><DewButton v-if="row.amount > 0 && ['completed','pending','failed'].includes(row.status)" type="ghost" size="sm" :disabled="busy" @click="openAction(row, 'reverse')">撤回</DewButton></div></template></el-table-column>
        </el-table>
        <div v-if="tab !== 'rules' && total > 20" class="pagination-wrapper"><el-pagination v-model:current-page="page" :total="total" :page-size="20" layout="prev, pager, next" /></div>
      </DewCard>
    </template>
    <div v-else-if="!loading && !error" class="pm-empty">暂无可管理的营期</div>
    <DewDialog v-model="ruleDialog" :title="ruleForm.existing ? '编辑积分规则' : '新增积分规则'" :width="500" :close-on-click-modal="!busy">
      <el-form label-position="top" @submit.prevent="saveRule"><el-form-item label="奖励事项"><DewSelect v-model="ruleForm.kind" :options="scope === 'platform' ? platformKinds : kinds" :disabled="ruleForm.existing" /></el-form-item><div class="pm-form-row"><el-form-item label="单次积分"><DewInput v-model="ruleForm.amount" type="number" aria-label="单次积分" /></el-form-item><el-form-item v-if="ruleForm.kind === 'contribution'" label="每月最多次数"><DewInput v-model="ruleForm.period_limit" type="number" aria-label="每月最多次数" /></el-form-item></div><template v-if="ruleForm.kind === 'daily_checkin'"><div class="pm-form-row"><el-form-item label="每满几小时"><DewInput v-model="ruleForm.bonus_unit_hours" type="number" aria-label="每满几小时" /></el-form-item><el-form-item label="每次加几分"><DewInput v-model="ruleForm.bonus_amount" type="number" aria-label="每次加几分" /></el-form-item><el-form-item label="封顶几分（选填）"><DewInput v-model="ruleForm.bonus_cap" type="number" aria-label="时长奖励封顶" /></el-form-item></div><el-form-item><span class="pm-secondary">打卡时长奖励选填，留空默认每满 2 小时 +1 分、不封顶；次日结算。</span></el-form-item></template><el-form-item label="生效时间"><el-date-picker v-model="ruleForm.effective_at" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" format="YYYY-MM-DD HH:mm" aria-label="生效时间" /><el-tooltip content="保存新版本；仅对生效后的事件适用，历史记录不重算。" placement="top"><button type="button" class="pm-help" aria-label="版本说明"><el-icon><QuestionFilled /></el-icon></button></el-tooltip></el-form-item><el-form-item label="启用"><DewSwitch v-model="ruleForm.enabled" /></el-form-item></el-form><template #footer><DewButton type="ghost" :disabled="busy" @click="ruleDialog = false">取消</DewButton><DewButton :loading="busy" @click="saveRule">保存规则</DewButton></template>
    </DewDialog>
    <DewDialog v-model="proposalDialog" title="提报积分奖励" :width="500" :close-on-click-modal="!busy"><el-form label-position="top" @submit.prevent="submitProposal"><el-form-item label="学员"><DewSelect v-model="proposal.user_id" :options="memberOptions" filterable /></el-form-item><el-form-item label="奖励事项"><DewSelect v-model="proposal.kind" :options="proposalKinds" /></el-form-item><el-form-item label="依据"><DewInput v-model="proposal.reason" type="textarea" :rows="3" :maxlength="512" placeholder="填写成果、贡献或结业依据" /></el-form-item></el-form><template #footer><DewButton type="ghost" :disabled="busy" @click="proposalDialog = false">取消</DewButton><DewButton :loading="busy" :disabled="!proposal.user_id || !proposal.kind || !proposal.reason?.trim()" @click="submitProposal">提交审核</DewButton></template></DewDialog>
    <DewDialog v-model="actionDialog" :title="decision.title" :width="460" :close-on-click-modal="!busy"><DewInput v-model="decision.reason" type="textarea" :rows="3" :maxlength="512" placeholder="填写处理原因" /><template #footer><DewButton type="ghost" :disabled="busy" @click="actionDialog = false">取消</DewButton><DewButton :loading="busy" :disabled="!decision.reason?.trim()" @click="perform(decision, decision.action, decision.reason)">确认</DewButton></template></DewDialog>
    <DewDialog :model-value="!!detail" title="发放记录" :width="480" @update:model-value="detail = null"><dl v-if="detail" class="pm-detail"><dt>学员</dt><dd>{{ detail.username }}</dd><dt>事项</dt><dd>{{ detail.title }} · {{ detail.amount }} 积分</dd><dt>依据</dt><dd>{{ detail.reason }}</dd><dt>状态</dt><dd>{{ statuses[detail.status] }}</dd><dt>规则版本</dt><dd>v{{ detail.rule_version }}</dd><dt v-if="detail.review_note">审核意见</dt><dd v-if="detail.review_note">{{ detail.review_note }}</dd><dt v-if="detail.last_error">异常原因</dt><dd v-if="detail.last_error">{{ detail.last_error }}</dd><dt v-if="detail.transaction_uuid">流水号</dt><dd v-if="detail.transaction_uuid">{{ detail.transaction_uuid }}</dd></dl></DewDialog>
  </div>
</template>
<style scoped>
.points-management { display: flex; flex-direction: column; gap: 18px; min-width: 0; color: var(--dew-text); font-family: var(--dew-font); }
.pm-header, .pm-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.pm-title { font-size: 18px; font-weight: 600; color: var(--dew-text-heading); }
.pm-spacer { flex: 1; }
.pm-camp-select { width: 220px; max-width: 100%; }
.pm-help { display: inline-flex; align-items: center; border: 0; padding: 4px; color: var(--dew-text-muted); background: transparent; cursor: help; vertical-align: middle; }
.pm-help:hover { color: var(--color-primary); }
.table-card :deep(.dew-card__body) { padding: 0; }
.pm-amount { color: var(--color-primary); font-variant-numeric: tabular-nums; }
.pm-secondary, .pm-record-link small { display: block; color: var(--dew-text-muted); font-size: 12px; }
.pm-record-link { border: 0; background: transparent; padding: 0; color: var(--dew-text-heading); text-align: left; font: inherit; cursor: pointer; }
.pm-record-link:hover { color: var(--color-primary); }
.pm-actions { display: flex; gap: 4px; }
.pm-form-row { display: flex; gap: 16px; }
.pm-form-row > * { flex: 1; min-width: 0; }
.pm-detail { display: grid; grid-template-columns: 76px 1fr; gap: 14px; font-size: 13px; }
.pm-detail dt { color: var(--dew-text-muted); }
.pm-detail dd { margin: 0; overflow-wrap: anywhere; }
.pm-error, .pm-empty { padding: 24px 0; display: flex; gap: 12px; align-items: center; justify-content: center; color: var(--dew-text-muted); }
@media (max-width: 600px) { .pm-camp-select { width: 100%; order: 3; } .pm-toolbar :deep(.dew-bar__item) { padding-left: 8px; padding-right: 8px; } .pm-form-row { display: block; } }
</style>
