<template>
  <section v-if="ready && userId && tabs.length && !dismissed" class="pwg-invitation" aria-label="工作台功能介绍">
    <div class="pwg-invite-icon"><el-icon><Compass /></el-icon></div>
    <div class="pwg-invite-copy"><strong>从这里，开始推进你的项目</strong><p>用一分钟熟悉工作台，找到计划、交付与团队协作的入口。</p></div>
    <div class="pwg-invite-actions"><DewButton size="sm" @click="start">开始了解<el-icon><ArrowRight /></el-icon></DewButton><DewButton size="sm" type="ghost" @click="dismiss">稍后再看</DewButton></div>
  </section>

  <el-tour v-model="open" v-model:current="current" class="pwg-tour" :content-style="contentStyle"
    :role="open ? 'dialog' : undefined" :aria-modal="open ? true : undefined" :aria-label="open ? steps[current]?.title : undefined"
    :gap="{ offset: 6, radius: 10 }" :z-index="4000" :target-area-clickable="false"
    :scroll-into-view-options="{ block: 'center', behavior: 'instant' }" @close="dismiss" @finish="dismiss">
    <el-tour-step v-for="(step, index) in steps" :key="step.key" :title="step.title" :target="step.target"
      :placement="compact ? 'bottom' : 'right'" :prev-button-props="{ children: '上一步' }"
      :next-button-props="{ children: index === 0 ? '开始导览' : index === steps.length - 1 ? '完成引导' : '下一步' }">
      <template #header>
        <div class="pwg-eyebrow"><el-icon><Compass /></el-icon>工作台使用指南<span>{{ index === 0 ? '约 1 分钟' : step.category }}</span></div>
        <h2 class="pwg-title">{{ step.title }}</h2>
      </template>
      <p class="pwg-description">{{ step.description }}</p>
      <div v-if="index === 0" class="pwg-map">
        <div v-for="(item, i) in journey" :key="item.title"><span class="pwg-map-number">0{{ i + 1 }}</span><el-icon><component :is="item.icon" /></el-icon><strong>{{ item.title }}</strong><span>{{ item.text }}</span></div>
      </div>
      <div v-else class="pwg-tip"><el-icon><InfoFilled /></el-icon><span>{{ step.tip }}</span></div>
      <p v-if="index === 0" class="pwg-role">{{ identity }}<span v-if="status === 'archived'"> · 当前为只读档案</span></p>
      <template v-if="index === steps.length - 1"><p class="pwg-finish-note">以后需要帮助，点击右上角「功能引导」即可重看。</p></template>
      <button class="pwg-skip" type="button" @click="dismiss">退出引导</button>
    </el-tour-step>
    <template #indicators="{ current: position, total }"><span class="pwg-counter" aria-live="polite">{{ position + 1 }} / {{ total }}</span></template>
  </el-tour>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'
import { Compass, ArrowRight, Calendar, DocumentChecked, User, InfoFilled } from '@element-plus/icons-vue'
import { DewButton } from '@bme/dew-ui'

const props = defineProps({
  workspace: Object, tabs: { type: Array, default: () => [] }, scopeLabel: String,
  hasScope: Boolean, identity: String, status: String, ready: Boolean, contextKey: String,
})
const emit = defineEmits(['active-change'])
const store = useStore(), open = ref(false), current = ref(0), dismissed = ref(false), compact = ref(false)
const userId = computed(() => store.state.user?.User_Id || store.state.user?.id || store.state.user?.user_id)
const storageKey = computed(() => userId.value ? `bme-user-project-guide-v1:${userId.value}` : null)
const contentStyle = { width: 'min(440px, calc(100vw - 32px))', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto' }
const teacher = computed(() => props.identity?.includes('管理老师'))
const leader = computed(() => props.identity?.includes('负责人') && !teacher.value)
const archived = computed(() => props.status === 'archived' || props.tabs.some(tab => tab.group === '本期档案'))
const has = key => props.tabs.some(tab => tab.key === key)
const target = selector => () => props.workspace?.querySelector(selector) || null
const journey = computed(() => [
  { title: teacher.value ? '掌握全营进展' : '看清项目计划', text: teacher.value ? '查看总览与待跟进事项' : '了解进度与关键日期', icon: Calendar },
  { title: teacher.value ? '查看项目材料' : has('delivery') ? '推进阶段交付' : '沉淀研发记录', text: teacher.value ? '跟进考核与组会记录' : has('delivery') ? '按节点提交与跟进' : '记录过程与阶段成果', icon: DocumentChecked },
  { title: '找到协作入口', text: '成员、记录与营期事务', icon: User },
])
function navStep(key, description, tip) {
  const tab = props.tabs.find(item => item.key === key)
  return tab ? { key, title: tab.label, category: tab.group || '日常工作', description, tip, target: target(`[data-guide-tab="${key}"]`) } : null
}
const steps = computed(() => [
  { key: 'welcome', title: '让项目的每一步，都有方向', description: '这里集中展示项目进展、阶段工作与团队协作。接下来，带你认识当前身份可用的主要功能。' },
  props.hasScope && { key: 'scope', title: `先确认你的${props.scopeLabel || '工作范围'}`, category: '找到位置', description: props.scopeLabel === '项目上下文' ? '长期项目保留持续研发的计划与记录；选择具体营期后，还可以查看对应的本期工作。可选范围以这里的列表为准。' : teacher.value ? '在这里切换全营管理和具体项目。全营看整体进展，进入项目后查看对应材料与记录。' : '参与多个项目时，在这里切换。每个项目分别展示自己的节点、成员和工作记录。', tip: '切换前先确认项目名称与当前身份，避免把材料交到其他项目。', target: target('.pws-scope') },
  navStep('overview', teacher.value ? has('projects') ? '从概览查看全营项目数量与需要跟进的事项，再进入具体项目了解详情。' : '查看当前项目的共享概览，了解目标、节点与本期工作进展。' : '从概览了解当前进度和下一步工作；已设置正式启动日的项目，还会展示项目日与研发节点进度。', '日常进入工作台，可以先从「工作概览」开始。'),
  navStep('calendar', '在月历或时间线中查看关键日期。D0 是正式启动日，研发节点可以按固定日期或相对 D0 安排。', teacher.value ? '这里展示本期共享日程，管理老师以只读方式查看。' : 'D0 与研发计划由有权限的长期项目负责人维护；本期考核仍以营期配置的节点为准。'),
  navStep('delivery', archived.value ? '本期已经结束，在这里查看冻结的考核节点、交付材料和评价，回顾本期完成情况。' : teacher.value ? '查看各节点的要求、提交材料与评价，掌握项目的阶段交付情况。' : leader.value ? '查看节点要求与截止日期，跟进成员材料并完成节点评价。单人项目按节点要求提交材料，由管理员验收。' : '选择节点查看交付要求，提交自己的说明和附件，并跟进反馈与本人评价。', archived.value ? '本期档案只读，长期项目工作会继续保留。' : teacher.value ? '管理老师查看项目内容时为只读，写入操作由有权限的项目成员处理。' : '提交材料后还要留意评价或验收状态，提交与完成是两个不同状态。'),
  has('projects') && navStep('projects', '对比本营各项目的节点进度、逾期情况与材料状态，选择项目进入详情。', '优先查看逾期、未配置节点和有材料待处理的项目。'),
  navStep('records', teacher.value ? '查看项目向本期共享的研发记录、验证结论和阶段成果，了解团队的研发过程。' : '把研发过程、验证结论和阶段成果留在项目中，支持记录说明与附件，便于团队持续查阅。', teacher.value ? '当前只展示本期共享内容，项目内部记录不会在此开放。' : '这里的长期记录跨营期保留；本期交付材料请放到对应考核节点。'),
  navStep(has('team') ? 'team' : 'members', has('team') ? '在这里查看长期协作团队。参加营期时，还有单独的「本期参营人员」名单。' : teacher.value ? '查看当前工作范围内的人员与组队情况，按当前授权处理人员管理事务。' : '查看当前项目的成员与身份，找到一起推进工作的伙伴。', '可执行的操作以当前页面展示和实际权限为准。'),
  has('meetings') && navStep('meetings', archived.value ? '查阅本期留存的组会记录，回顾讨论结论和工作安排。' : '集中查看组会安排、讨论纪要与资料，让每次讨论都有记录可追溯。', props.tabs.some(tab => tab.camp) ? `营期事务中还可以找到${props.tabs.filter(tab => tab.camp).map(tab => tab.label).join('、')}，以当前营期开放的功能为准。` : '会后可以回到这里查阅结论，再推进相应节点。'),
  navStep('settings', '在项目设置中维护项目信息；变更记录保留调整依据；需要对外介绍时，可从公开展示入口发布项目。', '公开展示需要主动发布，团队内部的工作记录按原有可见范围保留。'),
  { key: 'finish', title: '准备好了，开始你的下一步', category: '开始使用', description: teacher.value ? '先从概览找到需要跟进的项目，再查看节点材料和团队情况。' : '先确认工作范围，再查看计划和当前节点，和团队一起推进下一次交付。', tip: '本次导览只介绍功能入口，结束后会回到你原来的工作位置。' },
].filter(Boolean))

function readPreference() {
  try { dismissed.value = !!storageKey.value && !!localStorage.getItem(storageKey.value) }
  catch { dismissed.value = false }
}
function dismiss() {
  open.value = false; dismissed.value = true
  try { if (storageKey.value) localStorage.setItem(storageKey.value, 'seen') } catch { /* 存储不可用时仍可正常使用引导 */ }
}
let starting = 0, returnFocus = null, scrollBeforeGuide = null
async function start() {
  if (!props.ready || open.value) return
  const attempt = ++starting
  returnFocus = document.activeElement; scrollBeforeGuide = { x: window.scrollX, y: window.scrollY }
  emit('active-change', true)
  await nextTick()
  if (attempt !== starting || !props.ready) { emit('active-change', false); return }
  current.value = 0; open.value = true
}
function updateCompact() { compact.value = window.innerWidth <= 540 }
watch(storageKey, () => { open.value = false; readPreference() }, { immediate: true })
watch(() => [props.contextKey, props.ready, JSON.stringify(props.tabs)], () => {
  starting++
  if (open.value) open.value = false
})
watch(open, async value => {
  if (value) return
  emit('active-change', false)
  await nextTick()
  if (scrollBeforeGuide) window.scrollTo({ left: scrollBeforeGuide.x, top: scrollBeforeGuide.y, behavior: 'instant' })
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true })
  else props.workspace?.querySelector('.pws-guide-trigger')?.focus({ preventScroll: true })
  scrollBeforeGuide = null; returnFocus = null
})
onMounted(() => { updateCompact(); window.addEventListener('resize', updateCompact) })
onBeforeUnmount(() => { starting++; window.removeEventListener('resize', updateCompact); if (open.value) emit('active-change', false) })
defineExpose({ start })
</script>

<style scoped>
.pwg-invitation { display: flex; align-items: center; gap: 16px; border: 1px solid var(--dew-card-flat-border); border-left: 3px solid var(--color-primary); border-radius: 10px; background: var(--dew-card-flat-bg-hover); padding: 18px 20px; margin-bottom: 24px; }
.pwg-invite-icon { width: 40px; height: 40px; display: grid; place-items: center; background: var(--color-primary-light); color: var(--color-primary); border-radius: 12px; font-size: 23px; flex-shrink: 0; }
.pwg-invite-copy { flex: 1; min-width: 0; }.pwg-invite-copy strong { color: var(--dew-text-heading); font-size: 14px; }.pwg-invite-copy p { color: var(--dew-text-muted); line-height: 1.7; font-size: 12px; margin: 6px 0 0; }.pwg-invite-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
@media (max-width: 1000px) { .pwg-invitation { flex-wrap: wrap; }.pwg-invite-copy { flex-basis: calc(100% - 56px); }.pwg-invite-actions { margin-left: 56px; } }
@media (max-width: 540px) { .pwg-invitation { gap: 12px; padding: 16px; }.pwg-invite-icon { display: none; }.pwg-invite-copy { flex-basis: 100%; }.pwg-invite-actions { margin-left: 0; } }
</style>

<style>
.pwg-tour { --el-bg-color: var(--dew-card-flat-bg); --el-text-color-primary: var(--dew-text-heading); --el-text-color-regular: var(--dew-text); --el-color-primary: var(--color-primary); --el-color-primary-light-3: var(--color-primary-hover); --el-border-color-light: var(--dew-card-flat-border); --el-fill-color-blank: var(--dew-card-flat-bg); }
.pwg-tour .el-tour__content { border: 1px solid var(--dew-card-flat-border); border-radius: 16px; padding: 26px; background: var(--dew-card-flat-bg); color: var(--dew-text); box-shadow: var(--shadow-xl); }
.pwg-tour .el-tour__header { padding: 0 20px 0 0; }.pwg-tour .el-tour__body { padding: 0; }.pwg-tour .el-tour__footer { margin-top: 24px; padding: 18px 0 0; border-top: 1px solid var(--dew-card-flat-border); }.pwg-tour .el-tour__closebtn { top: 18px; right: 18px; color: var(--dew-text-muted); }.pwg-tour .el-tour__arrow:before { background: var(--dew-card-flat-bg); border-color: var(--dew-card-flat-border); }
.pwg-eyebrow { display: flex; align-items: center; gap: 6px; color: var(--color-primary); font-size: 11px; font-weight: 600; letter-spacing: .04em; }.pwg-eyebrow > span { margin-left: auto; margin-right: 14px; color: var(--dew-text-muted); font-weight: 400; letter-spacing: 0; }.pwg-title { margin: 16px 0 12px; color: var(--dew-text-heading); font-size: 23px; line-height: 1.5; letter-spacing: -.02em; }.pwg-description { margin: 0; color: var(--dew-text-muted); font-size: 14px; line-height: 1.9; overflow-wrap: anywhere; }
.pwg-map { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 24px 0 18px; border: 1px solid var(--dew-card-flat-border); border-radius: 10px; background: var(--dew-card-flat-bg-hover); }.pwg-map > div { position: relative; display: flex; flex-direction: column; gap: 8px; padding: 18px 12px; }.pwg-map > div + div { border-left: 1px solid var(--dew-card-flat-border); }.pwg-map-number { font-size: 10px; color: var(--dew-text-muted); font-variant-numeric: tabular-nums; }.pwg-map .el-icon { font-size: 21px; color: var(--color-primary); margin: 2px 0 4px; }.pwg-map strong { font-size: 12px; color: var(--dew-text-heading); line-height: 1.6; }.pwg-map div > span:last-child { font-size: 11px; color: var(--dew-text-muted); line-height: 1.7; }
.pwg-role { font-size: 11px; color: var(--dew-text-muted); margin: 0; }.pwg-tip { display: flex; gap: 8px; padding: 14px; border-radius: 8px; background: var(--dew-card-flat-bg-hover); color: var(--dew-text-muted); font-size: 12px; line-height: 1.8; margin-top: 20px; }.pwg-tip .el-icon { flex-shrink: 0; margin-top: 4px; color: var(--color-primary); }.pwg-skip { display: block; margin: 18px 0 0 auto; padding: 0; background: transparent; border: 0; font: inherit; font-size: 11px; color: var(--dew-text-muted); cursor: pointer; }.pwg-skip:hover { color: var(--dew-text-heading); }.pwg-skip:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 4px; }.pwg-counter { font-size: 12px; color: var(--dew-text-muted); font-variant-numeric: tabular-nums; }.pwg-finish-note { color: var(--dew-text); font-size: 12px; line-height: 1.8; margin: 18px 0 0; }
.pwg-tour .el-button { height: 34px; padding: 8px 16px; border-radius: 8px; background: var(--dew-card-flat-bg); color: var(--dew-text); border-color: var(--dew-card-flat-border); }.pwg-tour .el-button--primary { background: var(--color-primary); border-color: var(--color-primary); color: var(--el-color-white); }.pwg-tour .el-button--primary:hover { background: var(--color-primary-hover); border-color: var(--color-primary-hover); }.pwg-tour .el-button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
@media (max-width: 540px) { .pwg-tour .el-tour__content { padding: 20px; }.pwg-title { font-size: 20px; }.pwg-map > div { padding: 14px 10px; }.pwg-tour .el-tour__footer { margin-top: 18px; }.pwg-eyebrow { font-size: 10px; } }
</style>
