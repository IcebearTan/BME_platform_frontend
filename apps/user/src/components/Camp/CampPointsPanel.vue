<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Refresh, ArrowRight } from '@element-plus/icons-vue'
import { DewButton, DewButtonBar, DewCard, DewDialog, DewSkeleton, DewTag } from '@bme/dew-ui'
import PointsManagement from '../Points/PointsManagement.vue'
import PointsHelp from '../Points/PointsHelp.vue'
import { pointsService, pointsError, formatPoints } from '../../services/pointsService'

const props = defineProps({ sid: { type: [Number, String], required: true }, manage: Boolean })
const router = useRouter(), tab = ref('progress'), loading = ref(false), error = ref('')
const tasks = ref([]), rows = ref([]), detail = ref(null), page = ref(1), total = ref(0)
const tabs = [{ value: 'progress', label: '发放进度' }, { value: 'rules', label: '奖励规则' }]
const states = { review: '待审核', pending: '待到账', processing: '入账中', failed: '待重试', completed: '已到账', rejected: '已退回', cancelled: '已取消' }
const stateType = s => s === 'completed' ? 'success' : ['review', 'failed'].includes(s) ? 'warning' : 'neutral'
const dateText = value => value?.replace('T', ' ').slice(0, 16) || '—'
const signed = n => `${n > 0 ? '+' : ''}${formatPoints(n)}`
let generation = 0
async function load() {
  const current = ++generation, sid = Number(props.sid)
  if (props.manage) return
  loading.value = true; error.value = ''
  try {
    const [rules, rewards] = await Promise.all([pointsService.campTasks(sid), pointsService.campRewards(sid, { page: page.value })])
    if (current !== generation) return
    tasks.value = (rules.data.items || []).filter(r => r.camp_id === sid)
    rows.value = (rewards.data.items || []).filter(r => r.camp_id === sid)
    total.value = rewards.data.total || 0
  } catch (e) { if (current === generation) error.value = pointsError(e) }
  finally { if (current === generation) loading.value = false }
}
watch(() => [props.sid, props.manage], () => {
  generation++; tasks.value = []; rows.value = []; detail.value = null; total.value = 0; page.value = 1; load()
}, { immediate: true })
watch(page, load)
onBeforeUnmount(() => { generation++ })
</script>
<template>
  <PointsManagement v-if="manage" :key="sid" :sid="sid" />
  <div v-else class="camp-points">
    <div class="cp-toolbar"><DewButtonBar v-model="tab" :items="tabs" size="sm" /><PointsHelp text="仅展示本营奖励。审核通过后提交到账，未确认的积分不计入余额；积分总额与收支明细在个人中心查看。" /><span class="cp-spacer" /><DewButton type="ghost" size="sm" :loading="loading" aria-label="刷新营期积分" @click="load"><el-icon><Refresh /></el-icon></DewButton></div>
    <DewCard no-hover>
      <DewSkeleton v-if="loading" :lines="3" />
      <div v-else-if="error" class="cp-empty" role="alert">{{ error }}<DewButton size="sm" @click="load">重试</DewButton></div>
      <template v-else-if="tab === 'progress'">
        <div v-if="!rows.length" class="cp-empty">本营暂无发放记录</div>
        <button v-for="item in rows" :key="item.id" class="cp-record" @click="detail = item"><div><strong>{{ item.title }}</strong><small>{{ dateText(item.created_at) }}</small></div><strong>{{ signed(item.amount) }}</strong><DewTag :type="stateType(item.status)" size="sm">{{ states[item.status] }}</DewTag><el-icon><ArrowRight /></el-icon></button>
        <el-pagination v-if="total > 20" v-model:current-page="page" :total="total" :page-size="20" layout="prev, pager, next" />
      </template>
      <template v-else>
        <div v-if="!tasks.length" class="cp-empty">本营暂无生效的积分规则</div>
        <div v-for="task in tasks" :key="task.id" class="cp-rule"><strong>{{ task.title }}</strong><PointsHelp :text="task.help" /><span class="cp-spacer" /><strong class="cp-gain">+{{ formatPoints(task.amount) }}</strong><span class="cp-frequency">{{ task.kind === 'contribution' ? `${task.period_limit} 次/月` : task.kind === 'attendance' ? '每日一次' : task.kind === 'chapter' ? '每章一次' : '每营一次' }}</span></div>
      </template>
    </DewCard>
    <DewDialog :model-value="!!detail" title="发放详情" :width="480" @update:model-value="detail = null"><template v-if="detail"><div class="cp-toolbar"><h3>{{ detail.title }} · {{ signed(detail.amount) }}</h3><span class="cp-spacer" /><DewTag :type="stateType(detail.status)">{{ states[detail.status] }}</DewTag></div><dl class="cp-detail"><dt>依据</dt><dd>{{ detail.reason }}</dd><dt>时间</dt><dd>{{ dateText(detail.created_at) }}</dd><dt v-if="detail.review_note">审核意见</dt><dd v-if="detail.review_note">{{ detail.review_note }}</dd><dt v-if="detail.last_error">处理进度</dt><dd v-if="detail.last_error">{{ detail.last_error }}</dd><dt>规则版本</dt><dd>v{{ detail.rule_version }}</dd><dt v-if="detail.transaction_uuid">流水号</dt><dd v-if="detail.transaction_uuid">{{ detail.transaction_uuid }}</dd></dl><DewButton v-if="detail.source_path" size="sm" @click="router.push(detail.source_path)">查看来源</DewButton></template></DewDialog>
  </div>
</template>
<style scoped>
.camp-points { display: flex; flex-direction: column; gap: 16px; min-width: 0; color: var(--dew-text); }
.cp-toolbar, .cp-rule { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.cp-toolbar h3 { font-size: 16px; color: var(--dew-text-heading); }
.cp-spacer { flex: 1; }
.cp-empty { display: flex; justify-content: center; align-items: center; gap: 12px; padding: 32px 0; font-size: 13px; color: var(--dew-text-muted); }
.cp-rule { padding: 16px 0; border-bottom: 1px solid var(--dew-card-divider); }
.cp-rule:last-child, .cp-record:last-child { border-bottom: 0; }
.cp-gain { color: var(--color-primary); font-variant-numeric: tabular-nums; }
.cp-frequency { min-width: 64px; font-size: 12px; color: var(--dew-text-muted); text-align: right; }
.cp-record { display: flex; width: 100%; align-items: center; gap: 16px; padding: 16px 4px; border: 0; border-bottom: 1px solid var(--dew-card-divider); background: transparent; color: var(--dew-text); font: inherit; text-align: left; cursor: pointer; }
.cp-record:hover { background: var(--dew-ghost-hover-bg); border-radius: var(--radius-md); }
.cp-record > div { flex: 1; min-width: 0; }
.cp-record small { display: block; margin-top: 6px; color: var(--dew-text-muted); }
.cp-detail { display: grid; grid-template-columns: 76px 1fr; gap: 14px; font-size: 13px; }
.cp-detail dt { color: var(--dew-text-muted); }
.cp-detail dd { margin: 0; overflow-wrap: anywhere; }
</style>
