<template>
  <div class="pwo">
    <template v-if="project">
      <div class="pwo-native-summary">
        <DewCard variant="flat" no-hover>
          <span class="pwo-label">正式启动日 D0</span>
          <strong class="pwo-metric">{{ project.zero_date || '待确认' }}</strong>
          <p class="pwo-muted">{{ dayNumber || '确认启动日后，项目日历按相对天数展示计划。' }}</p>
        </DewCard>
        <DewCard v-if="!campView" variant="flat" no-hover>
          <span class="pwo-label">研发节点进度</span>
          <strong class="pwo-metric">{{ research.total ? `${research.done} / ${research.total}` : '尚未建立计划' }}</strong>
          <div v-if="research.total" class="pwo-progress" role="progressbar" aria-label="研发节点完成进度" :aria-valuenow="research.rate" aria-valuemin="0" aria-valuemax="100"><span :style="{ width: `${research.rate}%` }" /></div>
          <p class="pwo-muted">{{ research.total ? `已完成 ${research.rate}%` : '在项目日历中安排关键节点。' }}</p>
        </DewCard>
      </div>
      <div class="pwo-quick-actions">
        <DewButton size="sm" @click="$emit('navigate', 'calendar')">查看项目日历</DewButton>
        <DewButton size="sm" type="ghost" @click="$emit('navigate', 'records')">记录与成果</DewButton>
        <DewButton v-if="!campView" size="sm" type="ghost" @click="$emit('navigate', 'team')">长期团队</DewButton>
      </div>
      <section class="pwo-brief">
        <h3>项目目标</h3><p class="pwo-text">{{ project.goal || '尚未填写项目目标' }}</p>
        <details v-if="project.background"><summary>项目背景</summary><p class="pwo-text">{{ project.background }}</p></details>
      </section>
    </template>
    <DewSkeleton v-if="loading" variant="rect" width="100%" height="200" />
    <div v-else-if="error" role="alert"><p>{{ error }}</p><DewButton size="sm" @click="load">重试</DewButton></div>
    <DewCard v-else-if="project && binding?.status === 'ended' && binding.can_read_work" variant="flat" no-hover class="pwo-next">
      <span class="pwo-label">本期已结束</span>
      <h3>{{ binding.camp_name }}</h3>
      <p>本期考核、材料与评价按结束时的冻结档案查看。长期项目工作继续保留。</p>
      <DewButton size="sm" @click="$emit('navigate', 'delivery')">查看本期冻结档案</DewButton>
    </DewCard>
    <template v-else-if="canReadPeriod">
      <div class="pwo-summary"><span><strong>{{ nodes.length ? completed + ' / ' + nodes.length : '—' }}</strong> {{ project ? '本期考核完成' : '节点完成' }}</span><span>{{ project ? '本期职责' : '当前职责' }}：{{ periodRole === 'leader' ? '项目负责人' : '项目成员' }}</span></div>
      <DewCard variant="flat" no-hover class="pwo-next">
        <span class="pwo-label">{{ archived ? '结营复盘' : periodRole === 'leader' ? '需要你处理' : '下一步工作' }}</span>
        <h3>{{ next ? next.title : nodes.length ? '全部节点已完成' : '尚未配置交付节点' }}</h3>
        <p v-if="next">{{ next.due_date ? `截止 ${next.due_date}` : '未设置截止日期' }} · {{ periodRole === 'leader' ? '查看成员材料与节点评价' : '查看交付要求、提交材料和本人评价' }}</p>
        <p v-else-if="!nodes.length">{{ periodRole === 'leader' ? '先建立项目节点计划，再开始交付。' : '项目负责人建立节点后，会在这里展示。' }}</p>
        <DewButton size="sm" @click="$emit('navigate', 'delivery', next?.id)">{{ archived ? '查看节点记录' : nodes.length ? '进入节点与交付' : '查看节点计划' }}</DewButton>
      </DewCard>
      <section><h3>{{ project ? '本期考核节点' : '项目节点' }}</h3><button v-for="node in nodes" :key="node.id" class="pwo-node" @click="$emit('navigate', 'delivery', node.id)"><span>{{ node.title }}<small>{{ node.due_date || '未设置截止' }}</small></span><span>{{ node.node_complete ? '已完成' : node.status === 'returned' ? '待补交' : node.status === 'submitted' ? '已提交' : '未完成' }}</span></button></section>
    </template>
  </div>
</template>
<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { DewCard, DewButton, DewSkeleton } from '@bme/dew-ui'
import { campService } from '../../services/campService'
const props = defineProps({ unitId: Number, role: String, archived: Boolean, project: Object, binding: Object, campView: Boolean })
defineEmits(['navigate'])
const nodes = ref([]), loading = ref(false), error = ref('')
let sequence = 0
const effectiveUnit = computed(() => Number(props.unitId || props.binding?.unit_id))
const canReadPeriod = computed(() => Number.isInteger(effectiveUnit.value) && effectiveUnit.value > 0 && !props.campView && (!props.project || (props.binding?.status === 'active' && props.binding.can_read_work === true)))
const periodRole = computed(() => props.binding?.my_role || props.role)
const research = computed(() => {
  const summary = props.project?.research_summary || {}, total = Number(summary.total) || 0, done = Number(summary.done) || 0
  const rate = total ? Math.round(Math.max(0, Math.min(100, summary.rate ?? done / total * 100))) : 0
  return { total, done, rate }
})
const dayNumber = computed(() => {
  if (!props.project?.zero_date) return ''
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: props.project.timezone || 'Asia/Shanghai' }).format(new Date())
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${props.project.zero_date}T00:00:00Z`)) / 86400000)
  return days === 0 ? '今天是 D0，项目正式启动。' : days > 0 ? `当前 D+${days}` : `距离正式启动还有 ${Math.abs(days)} 天`
})
const completed = computed(() => nodes.value.filter(n => n.node_complete).length)
const next = computed(() => nodes.value.find(n => !n.node_complete))
async function load() {
  const seq = ++sequence; loading.value = false; error.value = ''; nodes.value = []
  if (!canReadPeriod.value) return
  loading.value = true
  try { const d = await campService.fetchMilestones(effectiveUnit.value); if (seq === sequence) nodes.value = d.milestones || [] }
  catch (e) { if (seq === sequence) error.value = e.response?.data?.message || '项目概览加载失败' }
  finally { if (seq === sequence) loading.value = false }
}
watch(() => [effectiveUnit.value, props.project?.id, props.binding?.id, canReadPeriod.value], load, { immediate: true }); onBeforeUnmount(() => sequence++)
</script>
<style scoped>
.pwo { display: flex; flex-direction: column; gap: 24px; }.pwo-summary { display: flex; align-items: center; gap: 26px; flex-wrap: wrap; color: var(--dew-text-muted); }.pwo-summary strong { font-size: 26px; color: var(--dew-text-heading); }.pwo-next { border: 1px solid var(--dew-card-flat-border); }.pwo-next h3 { margin: 12px 0; font-size: 18px; }.pwo-next p { color: var(--dew-text-muted); font-size: 13px; margin-bottom: 18px; }.pwo-label { color: var(--color-primary); font-size: 12px; }.pwo h3 { font-size: 16px; }.pwo-node { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 16px; border: 0; border-bottom: 1px solid var(--dew-card-flat-border); padding: 16px 0; color: var(--dew-text); background: transparent; text-align: left; cursor: pointer; font: inherit; }.pwo-node small { display: block; color: var(--dew-text-muted); margin-top: 4px; }
.pwo-native-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.pwo-metric { display: block; color: var(--dew-text-heading); font-size: 24px; margin-top: 12px; }
.pwo-muted { color: var(--dew-text-muted); font-size: 13px; line-height: 1.7; margin-bottom: 0; }
.pwo-quick-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.pwo-progress { height: 5px; overflow: hidden; background: var(--dew-card-flat-border); border-radius: 4px; margin-top: 14px; }
.pwo-progress span { display: block; height: 100%; background: var(--color-primary); border-radius: inherit; }
.pwo-brief { padding-bottom: 8px; border-bottom: 1px solid var(--dew-card-flat-border); }
.pwo-brief h3 { margin: 0 0 10px; }
.pwo-brief details { margin: 18px 0 12px; }
.pwo-brief summary { color: var(--dew-text-muted); cursor: pointer; font-size: 13px; }
.pwo-text { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.8; font-size: 14px; }
@media (max-width: 600px) { .pwo-native-summary { grid-template-columns: 1fr; } .pwo-metric { font-size: 22px; } }
</style>
