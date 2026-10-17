<template>
  <div class="pwo">
    <template v-if="project">
      <div class="pwo-native-summary">
        <DewCard variant="flat" no-hover :class="['pwo-day-card', `is-${dayState.tone}`]">
          <div :class="['pwo-day-layout', { 'without-day': !dayState.display }]">
            <button v-if="dayState.display" type="button" class="pwo-day-square" :aria-label="`${dayState.display}，${dayState.caption}，查看项目日历`" @click="$emit('navigate', 'calendar')">
              <span class="pwo-day-eyebrow">PROJECT DAY</span>
              <strong :class="['pwo-day-number', { 'is-long': dayState.display.length > 4 }]">{{ dayState.display }}</strong>
              <span class="pwo-day-caption">{{ dayState.caption }}</span>
            </button>
            <div class="pwo-day-details">
              <span class="pwo-day-status">{{ dayState.label }}</span>
              <h3>{{ dayState.title }}</h3>
              <dl><div><dt>今天</dt><dd>{{ today }}</dd></div><div><dt>正式启动 D0</dt><dd>{{ project.zero_date || '待确认' }}</dd></div></dl>
              <p v-if="dayLoading" class="pwo-day-note" role="status">正在查看今日节点…</p>
              <DewButton v-else-if="dayError" size="sm" type="ghost" @click="loadToday">重新加载今日节点</DewButton>
              <DewButton v-else-if="dayState.items.length" size="sm" type="ghost" @click="$emit('navigate', 'calendar')">查看今日节点</DewButton>
            </div>
          </div>
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
      <div class="pwo-summary">
        <p class="pwo-summary-item"><span class="pwo-summary-label">{{ project ? '本期考核' : '节点进度' }}：</span><span class="pwo-summary-value">{{ nodes.length ? `已完成 ${completed} / ${nodes.length} 个节点` : project ? '尚未设置考核节点' : '尚未设置交付节点' }}</span></p>
        <p class="pwo-summary-item"><span class="pwo-summary-label">{{ project ? '本期身份' : '当前身份' }}：</span><span class="pwo-summary-value">{{ periodRole === 'leader' ? '项目负责人' : '项目成员' }}</span></p>
      </div>
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
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { DewCard, DewButton, DewSkeleton } from '@bme/dew-ui'
import { campService } from '../../services/campService'
import { projectService } from '../../domains/projects/service'
import { projectDayStatus, projectToday } from '../../domains/projects/projectDayStatus'
const props = defineProps({ unitId: Number, role: String, archived: Boolean, project: Object, binding: Object, campView: Boolean })
defineEmits(['navigate'])
const nodes = ref([]), loading = ref(false), error = ref('')
let sequence = 0
const now = ref(Date.now()), todayEntries = ref([]), dayLoading = ref(false), dayError = ref(false)
const today = computed(() => projectToday(props.project?.timezone || 'Asia/Shanghai', now.value))
const dayState = computed(() => projectDayStatus(props.project, today.value, todayEntries.value, props.binding))
let daySequence = 0, clockTimer
function updateClock() { now.value = Date.now() }
async function loadToday() {
  const seq = ++daySequence
  todayEntries.value = []; dayError.value = false; dayLoading.value = false
  if (!props.project?.id || !dayState.value.display) return
  dayLoading.value = true
  try {
    const data = await projectService.calendar(props.project.id, { from: today.value, to: today.value, binding: props.binding?.id, camp_view: props.campView ? 1 : undefined })
    if (seq === daySequence) todayEntries.value = data.items || []
  } catch { if (seq === daySequence) dayError.value = true }
  finally { if (seq === daySequence) dayLoading.value = false }
}
const effectiveUnit = computed(() => Number(props.unitId || props.binding?.unit_id))
const canReadPeriod = computed(() => Number.isInteger(effectiveUnit.value) && effectiveUnit.value > 0 && !props.campView && (!props.project || (props.binding?.status === 'active' && props.binding.can_read_work === true)))
const periodRole = computed(() => props.binding?.my_role || props.role)
const research = computed(() => {
  const summary = props.project?.research_summary || {}, total = Number(summary.total) || 0, done = Number(summary.done) || 0
  const rate = total ? Math.round(Math.max(0, Math.min(100, summary.rate ?? done / total * 100))) : 0
  return { total, done, rate }
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
watch(() => [effectiveUnit.value, props.project?.id, props.binding?.id, canReadPeriod.value], load, { immediate: true })
watch(() => JSON.stringify([props.project?.id, props.project?.version, props.project?.zero_date, props.project?.timezone, props.binding?.id, props.campView, today.value]), loadToday, { immediate: true })
onMounted(() => { clockTimer = window.setInterval(updateClock, 60000); document.addEventListener('visibilitychange', updateClock) })
onBeforeUnmount(() => { sequence++; daySequence++; window.clearInterval(clockTimer); document.removeEventListener('visibilitychange', updateClock) })
</script>
<style scoped>
.pwo { display: flex; flex-direction: column; gap: 24px; }.pwo-summary { display: flex; align-items: baseline; gap: 12px 28px; flex-wrap: wrap; }.pwo-summary-item { display: inline-flex; align-items: baseline; flex-wrap: wrap; gap: 4px; margin: 0; font-size: 14px; line-height: 22px; }.pwo-summary-label { color: var(--dew-text-muted); }.pwo-summary-value { color: var(--dew-text-heading); font-weight: 600; }.pwo-next { border: 1px solid var(--dew-card-flat-border); }.pwo-next h3 { margin: 12px 0; font-size: 18px; }.pwo-next p { color: var(--dew-text-muted); font-size: 13px; margin-bottom: 18px; }.pwo-label { color: var(--color-primary); font-size: 12px; }.pwo h3 { font-size: 16px; }.pwo-node { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 16px; border: 0; border-bottom: 1px solid var(--dew-card-flat-border); padding: 16px 0; color: var(--dew-text); background: transparent; text-align: left; cursor: pointer; font: inherit; }.pwo-node small { display: block; color: var(--dew-text-muted); margin-top: 4px; }
.pwo-native-summary { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 16px; }
.pwo-day-card { --day-accent: var(--dew-text-heading); --day-ink: color-mix(in srgb, var(--day-accent) 60%, var(--dew-text-heading)); --day-bg: var(--dew-card-flat-bg-hover); --day-border: var(--dew-card-flat-border); }
.pwo-day-card.is-launch, .pwo-day-card.is-complete { --day-accent: var(--color-success); --day-bg: var(--color-success-light); --day-border: var(--color-success); }
.pwo-day-card.is-milestone { --day-accent: var(--color-primary); --day-bg: var(--color-primary-light); --day-border: var(--color-primary); }
.pwo-day-card.is-assessment { --day-accent: var(--color-warning); --day-bg: var(--color-warning-light); --day-border: var(--color-warning); }
.pwo-day-layout { display: grid; grid-template-columns: 128px minmax(0, 1fr); gap: 20px; align-items: center; min-height: 144px; }
.pwo-day-layout.without-day { grid-template-columns: 1fr; }
.pwo-day-square { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; width: 128px; aspect-ratio: 1; padding: 12px 8px; border: 1px solid var(--day-border); border-radius: 16px; background: var(--day-bg); color: var(--day-ink, var(--day-accent)); font: inherit; cursor: pointer; }
.pwo-day-square:hover { border-color: var(--day-accent); }
.pwo-day-square:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 4px; }
.pwo-day-eyebrow { font-size: 10px; font-weight: 600; letter-spacing: 1.6px; line-height: 1; }
.pwo-day-number { font-size: 48px; font-weight: 700; letter-spacing: -2px; line-height: 1; font-variant-numeric: tabular-nums; }
.pwo-day-number.is-long { font-size: 30px; letter-spacing: -1px; }
.pwo-day-caption { font-size: 11px; line-height: 1.3; }
.pwo-day-details { min-width: 0; }
.pwo-day-status { font-size: 11px; font-weight: 600; color: var(--day-ink, var(--day-accent)); }
.pwo-day-details h3 { margin: 8px 0 14px; font-size: 16px; line-height: 1.5; color: var(--dew-text-heading); overflow-wrap: anywhere; }
.pwo-day-details dl { display: flex; flex-direction: column; gap: 7px; margin: 0; font-size: 12px; }
.pwo-day-details dl div { display: flex; gap: 8px; flex-wrap: wrap; }
.pwo-day-details dt { color: var(--dew-text-muted); }
.pwo-day-details dd { color: var(--dew-text); margin: 0; font-variant-numeric: tabular-nums; }
.pwo-day-details :deep(.dew-button) { margin-top: 12px; }
.pwo-day-note { margin: 10px 0 0; font-size: 12px; color: var(--dew-text-muted); }
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
@media (min-width: 601px) and (max-width: 1000px) { .pwo-day-layout { grid-template-columns: 104px minmax(0, 1fr); gap: 12px; }.pwo-day-square { width: 104px; }.pwo-day-number { font-size: 40px; }.pwo-day-number.is-long { font-size: 26px; } }
@media (max-width: 380px) { .pwo-day-layout { grid-template-columns: 100px minmax(0, 1fr); gap: 12px; }.pwo-day-square { width: 100px; }.pwo-day-number { font-size: 38px; } }
</style>
