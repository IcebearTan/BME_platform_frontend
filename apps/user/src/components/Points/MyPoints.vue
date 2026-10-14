<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Coin, Refresh, ArrowRight, Tickets } from '@element-plus/icons-vue'
import { DewCard, DewButton, DewButtonBar, DewTag, DewSkeleton, DewDialog, DewMessage } from '@bme/dew-ui'
import { usePoints } from '../../composables/usePoints'
import { usePointsStore } from '../../composables/usePointsStore'
import { pointsService, formatPoints, pointsError } from '../../services/pointsService'
import PointsHelp from './PointsHelp.vue'

const route = useRoute(), router = useRouter()
const { summary, loading, failed, balanceLabel, refresh } = usePoints()
const { pointsStoreLoading, openPointsStore } = usePointsStore()
const tab = computed({ get: () => route.query.tab === 'records' ? 'records' : 'earn',
  set: value => router.replace({ query: { ...route.query, tab: value } }) })
const tabs = [{ value: 'earn', label: '赚取积分' }, { value: 'records', label: '收支明细' }]
const tasks = ref([]), taskLoading = ref(true), taskError = ref('')
const records = ref([]), recordLoading = ref(false), recordError = ref(''), total = ref(0), page = ref(1), kind = ref('all')
const detail = ref(null), connecting = ref(false)
const filters = [{ value: 'all', label: '全部' }, { value: 'earned', label: '获得' }, { value: 'spent', label: '扣减' }]
const states = { review: '待审核', pending: '待到账', processing: '入账中', failed: '待重试', completed: '已到账', rejected: '已退回', cancelled: '已取消' }
const stateType = s => ({ completed: 'success', review: 'warning', failed: 'warning', cancelled: 'neutral', rejected: 'neutral' }[s] || 'primary')
const dateLabel = s => s ? s.replace('T', ' ').slice(0, 16) : '—'
const signed = n => `${n > 0 ? '+' : ''}${formatPoints(n)}`
const accountMessage = computed(() => summary.value?.needs_identity ? '完成身份核验后使用积分' : summary.value?.status === 'unlinked' ? '尚未关联积分账户' : '积分服务暂不可用')
let recordRequest = 0
async function loadTasks() {
  taskLoading.value = true; taskError.value = ''
  try { tasks.value = ((await pointsService.tasks()).data.items || []).filter(task => task.scope === 'platform') } catch (e) { taskError.value = pointsError(e) }
  finally { taskLoading.value = false }
}
async function loadRecords() {
  const request = ++recordRequest
  recordLoading.value = true; recordError.value = ''
  try {
    const { data } = await pointsService.records({ kind: kind.value, page: page.value })
    if (request !== recordRequest) return
    records.value = data.items || []; total.value = data.total || 0
  } catch (e) { if (request === recordRequest) recordError.value = pointsError(e) }
  finally { if (request === recordRequest) recordLoading.value = false }
}
async function connect() {
  if (connecting.value) return
  connecting.value = true
  try { await pointsService.connect(); await refresh(true); DewMessage.success('积分账户已关联') }
  catch (e) { DewMessage.error(pointsError(e)) } finally { connecting.value = false }
}
async function reload() { await Promise.allSettled([refresh(true), loadTasks(), loadRecords()]) }
watch(kind, () => { page.value = 1; loadRecords() })
watch(page, loadRecords)
watch(tab, value => { detail.value = null; if (value === 'records') loadRecords() })
onMounted(reload)
</script>

<template>
  <div class="my-points">
    <div class="points-heading"><h2>我的积分</h2><PointsHelp text="积分与商城共用，等级不受兑换影响。待审核、待到账奖励不计入可用余额。" /><span class="points-spacer" /><DewButton type="ghost" size="sm" :loading="loading" aria-label="刷新积分" @click="reload"><el-icon><Refresh /></el-icon></DewButton></div>
    <DewCard no-hover class="points-summary">
      <div class="points-wallet">
        <div><span class="points-label"><el-icon><Coin /></el-icon>可用积分</span><DewSkeleton v-if="loading && !summary" width="130px" height="44px" /><strong v-else class="points-balance" data-testid="points-balance">{{ balanceLabel }}</strong></div>
        <span class="points-spacer" /><DewButton :loading="pointsStoreLoading" @click="openPointsStore">积分商城<el-icon><ArrowRight /></el-icon></DewButton>
      </div>
      <div v-if="failed" class="points-account-state"><span>积分暂未更新</span><PointsHelp :text="summary?.updated_at ? `上次更新：${dateLabel(summary.updated_at)}。当前显示上次成功查询的余额。` : '查询失败时不会把余额显示为 0，请稍后重试。'" /><DewButton type="ghost" size="sm" @click="refresh(true)">重试</DewButton></div>
      <div v-else-if="summary && summary.status !== 'ready'" class="points-account-state"><span>{{ accountMessage }}</span><PointsHelp v-if="summary.message" :text="summary.message" /><DewButton v-if="summary.needs_identity" type="ghost" size="sm" @click="router.push('/user-center/identity')">去核验</DewButton><DewButton v-else-if="summary.status === 'unlinked'" type="ghost" size="sm" :loading="connecting" @click="connect">关联账户</DewButton></div>
    </DewCard>
    <DewButtonBar v-model="tab" :items="tabs" class="points-tabs" />
    <template v-if="tab === 'earn'">
      <DewCard no-hover>
        <DewSkeleton v-if="taskLoading" :lines="3" />
        <div v-else-if="taskError" class="points-empty"><span>{{ taskError }}</span><DewButton size="sm" @click="loadTasks">重试</DewButton></div>
        <div v-else-if="!tasks.length" class="points-empty">暂无生效的积分任务</div>
        <div v-for="task in tasks" :key="task.id" class="points-task">
          <div class="points-task-copy"><div class="points-task-title">{{ task.title }}<PointsHelp :text="task.help" /></div><span class="points-label">{{ task.frequency }}</span></div>
          <strong v-if="task.enabled && task.amount != null" class="points-gain">+{{ formatPoints(task.amount) }}</strong>
          <DewButton v-if="task.enabled && task.action_path" size="sm" type="ghost" @click="router.push(task.action_path)">去完成<el-icon><ArrowRight /></el-icon></DewButton>
          <DewTag v-else type="neutral" size="sm">待开放</DewTag>
        </div>
      </DewCard>
    </template>
    <template v-else-if="tab === 'records'">
      <div class="points-toolbar"><DewButtonBar v-model="kind" :items="filters" size="sm" /><span class="points-spacer" /><span class="points-label">训练营记录</span><PointsHelp text="当前展示训练营产生的奖励与撤回。商城兑换、退款及其他平台记录请到积分商城查看。" /><DewButton type="ghost" size="sm" :loading="pointsStoreLoading" @click="openPointsStore">商城记录</DewButton></div>
      <DewCard no-hover>
        <DewSkeleton v-if="recordLoading" :lines="4" />
        <div v-else-if="recordError" class="points-empty"><span>{{ recordError }}</span><DewButton size="sm" @click="loadRecords">重试</DewButton></div>
        <div v-else-if="!records.length" class="points-empty">暂无收支记录</div>
        <template v-else><button v-for="item in records" :key="item.id" class="points-record" @click="detail = item"><div><strong>{{ item.title }}</strong><span>{{ item.camp_name }} · {{ dateLabel(item.completed_at) }}</span></div><div class="points-record-amount"><strong :class="{ 'points-gain': item.amount > 0 }">{{ signed(item.amount) }}</strong><span>余额 {{ formatPoints(item.balance_after) }}</span></div><el-icon><ArrowRight /></el-icon></button></template>
        <el-pagination v-if="total > 20" v-model:current-page="page" :total="total" :page-size="20" layout="prev, pager, next" class="points-pagination" />
      </DewCard>
    </template>
    <DewDialog :model-value="!!detail" title="积分记录" :width="480" @update:model-value="detail = null">
      <template v-if="detail"><div class="points-detail-top"><strong class="points-balance">{{ signed(detail.amount) }}</strong><DewTag :type="stateType(detail.status)">{{ states[detail.status] }}</DewTag></div><dl class="points-detail"><dt>事项</dt><dd>{{ detail.title }}</dd><dt>营期</dt><dd>{{ detail.camp_name }}</dd><dt>依据</dt><dd>{{ detail.reason }}</dd><dt v-if="detail.review_note">审核意见</dt><dd v-if="detail.review_note">{{ detail.review_note }}</dd><dt v-if="detail.last_error">处理进度</dt><dd v-if="detail.last_error">{{ detail.last_error }}</dd><dt>时间</dt><dd>{{ dateLabel(detail.completed_at || detail.created_at) }}</dd><dt v-if="detail.balance_after != null">余额变动</dt><dd v-if="detail.balance_after != null">{{ formatPoints(detail.balance_before) }} → {{ formatPoints(detail.balance_after) }}</dd><dt>规则版本</dt><dd>v{{ detail.rule_version }}</dd><dt v-if="detail.transaction_uuid">流水号</dt><dd v-if="detail.transaction_uuid">{{ detail.transaction_uuid }}</dd></dl><DewButton v-if="detail.source_path" size="sm" @click="router.push(detail.source_path)"><el-icon><Tickets /></el-icon>查看来源</DewButton></template>
    </DewDialog>
  </div>
</template>

<style scoped>
.my-points { display: flex; flex-direction: column; gap: 20px; min-width: 0; font-family: var(--dew-font); color: var(--dew-text); }
.points-heading, .points-wallet, .points-toolbar, .points-task, .points-detail-top, .points-account-state { display: flex; align-items: center; gap: 12px; }
.points-heading h2 { margin: 0; font-size: 22px; color: var(--dew-text-heading); }
.points-spacer { flex: 1; }
.points-wallet { gap: 28px; flex-wrap: wrap; }
.points-label { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--dew-text-muted); }
.points-balance { display: block; margin-top: 8px; color: var(--dew-text-heading); font-size: 36px; line-height: 1.3; font-variant-numeric: tabular-nums; }
.points-account-state { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--dew-card-divider); color: var(--dew-text-muted); font-size: 12px; }
.points-tabs { align-self: flex-start; max-width: 100%; }
.points-toolbar { flex-wrap: wrap; }
.points-task { padding: 18px 0; border-bottom: 1px solid var(--dew-card-divider); }
.points-task:last-child { border-bottom: 0; }
.points-task-copy { flex: 1; min-width: 0; }
.points-task-title { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-bottom: 5px; font-weight: 600; color: var(--dew-text-heading); }
.points-gain { color: var(--color-primary); font-variant-numeric: tabular-nums; }
.points-task > strong { font-size: 21px; min-width: 52px; text-align: right; }
.points-empty { display: flex; justify-content: center; align-items: center; gap: 12px; padding: 36px 12px; color: var(--dew-text-muted); font-size: 13px; }
.points-record { display: flex; width: 100%; align-items: center; gap: 16px; padding: 18px 8px; background: transparent; border: 0; border-bottom: 1px solid var(--dew-card-divider); color: var(--dew-text); text-align: left; font: inherit; cursor: pointer; }
.points-record:hover { background: var(--dew-ghost-hover-bg); border-radius: var(--radius-md); }
.points-record > div:first-child { flex: 1; min-width: 0; }
.points-record strong { display: block; font-weight: 600; }
.points-record span { display: block; font-size: 12px; color: var(--dew-text-muted); margin-top: 5px; }
.points-record-amount { text-align: right; font-variant-numeric: tabular-nums; }
.points-record-amount strong { font-size: 20px; }
.points-pagination { justify-content: center; margin-top: 16px; }
.points-detail-top { justify-content: space-between; }
.points-detail { display: grid; grid-template-columns: 72px 1fr; gap: 14px; margin: 24px 0; font-size: 13px; }
.points-detail dt { color: var(--dew-text-muted); }
.points-detail dd { margin: 0; overflow-wrap: anywhere; color: var(--dew-text); }
@media (max-width: 600px) { .points-wallet { gap: 16px; } .points-wallet > .points-spacer { display: none; } .points-wallet > :last-child { margin-left: auto; } .points-task { flex-wrap: wrap; } .points-task-copy { flex-basis: calc(100% - 76px); } .points-task > :last-child { margin-left: auto; } .points-tabs :deep(.dew-bar__item) { padding-left: 8px; padding-right: 8px; } .points-record { gap: 10px; } }
</style>
