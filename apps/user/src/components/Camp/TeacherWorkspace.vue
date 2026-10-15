<template>
  <div class="teacher-workspace">
    <!-- 身份行：主负责人/协同老师标识 + 阶段化提示 -->
    <div class="ws-head">
      <DewTag :type="isOwner ? 'primary' : 'info'" size="sm" :round="true">
        {{ isOwner ? '主负责人' : '协同老师' }}
      </DewTag>
      <span class="ws-hint">{{ stageHint }}</span>
    </div>

    <div class="ws-nav-scroll"><DewButtonBar v-model="section" :items="sectionItems" /></div>

    <TeacherProjectDashboard v-if="section === 'projects'" :sid="sid" />
    <TeacherOverview v-else-if="section === 'overview'" ref="overviewRef" :sid="sid" @navigate="goSection" />
    <TeacherAdmissions v-else-if="section === 'admissions'" ref="admissionsRef" :sid="sid"
      :ms-enabled="!!session?.mentor_selection_enabled" @reviewed="refreshOverview" />
    <TeacherMsAssign v-else-if="section === 'ms'" :sid="sid" @reviewed="refreshOverview" />
    <TeacherMembers v-else-if="section === 'members'" :sid="sid"
      :att-enabled="caps.attendance" @reviewed="refreshOverview" />
    <TrainingGroups v-else-if="section === 'groups'" :sid="sid" :session="session" />
    <TeacherAnnouncements v-else-if="section === 'announcements'" :sid="sid" />
    <CampPointsPanel v-else-if="section === 'points'" :key="sid" :sid="sid" manage />
    <TeacherProgress v-else-if="section === 'progress'" :sid="sid" />
    <TeacherMeetings v-else-if="section === 'meetings'" :sid="sid" :category="session?.category" />
    <MentorDashboard v-else-if="section === 'attendance'" :sid="sid" scope-label="全营" />
    <MentorLeave v-else-if="section === 'leaves'" :sid="sid" @reviewed="refreshOverview" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { DewButtonBar, DewTag } from '@bme/dew-ui';
import TeacherOverview from './TeacherOverview.vue';
import TeacherProjectDashboard from './TeacherProjectDashboard.vue';
import TeacherAdmissions from './TeacherAdmissions.vue';
import TeacherMsAssign from './TeacherMsAssign.vue';
import TeacherMembers from './TeacherMembers.vue';
import TrainingGroups from './TrainingGroups.vue';
import TeacherAnnouncements from './TeacherAnnouncements.vue';
import TeacherProgress from './TeacherProgress.vue';
import TeacherMeetings from './TeacherMeetings.vue';
import MentorDashboard from './MentorDashboard.vue';
import MentorLeave from './MentorLeave.vue';
import CampPointsPanel from './CampPointsPanel.vue';

const props = defineProps({
  sid: { type: [Number, String], required: true },
  /** 营期行（session_list 契约：status / my_staff_role / my_permissions / mentor_selection_enabled / policy） */
  session: { type: Object, default: null },
});

// 外壳只做子页导航（方案 §6.2：不能长成包含所有表格的超大组件）。
const route = useRoute(), router = useRouter();
const section = ref('overview');
const caps = computed(() => props.session?.policy?.capabilities || {});

// 「选导生收官」是开营前 selecting 阶段的临时运营能力（2026-09-21 收缩拍板）：
// 三条件同时成立才显示——启用选导生 + 营期处于 selecting + 当前用户持有
// mentor_selection.operate（角色权限 × 营期阶段组合授权，后端 ms_stage_guard 同口径）。
const msTabVisible = computed(() =>
  props.session?.mentor_selection_enabled === true
  && props.session?.status === 'selecting'
  && (props.session?.my_permissions || []).includes('mentor_selection.operate'));

const sectionItems = computed(() => {
  const items = [
    props.session?.category === 'project'
      ? { value: 'projects', label: '项目总览' }
      : { value: 'overview', label: '概览' },
    { value: 'admissions', label: '报名审批' },
  ];
  if (msTabVisible.value) {
    items.push({ value: 'ms', label: '选导生收官' });
  }
  items.push({ value: 'members', label: '成员管理' });
  if (props.session?.category === 'learning') items.push({ value: 'groups', label: '培训小组' });
  items.push({ value: 'announcements', label: '营期公告' });
  if (props.session?.category !== 'project') items.push({ value: 'progress', label: '学习进度' });
  items.push({ value: 'meetings', label: '组会总览' });
  if (caps.value.attendance) items.push({ value: 'attendance', label: '全营考勤' });
  items.push({ value: 'leaves', label: '请假审批' });
  if ((props.session?.my_permissions || []).includes('reward.issue')) items.push({ value: 'points', label: '积分奖励' });
  return items;
});

watch(() => [props.sid, props.session?.category], () => {
  section.value = props.session?.category === 'project' ? 'projects' : 'overview';
}, { immediate: true });

// 营期状态刷新后失效的子页自动回落：停在 ms 时营期进入 running → Tab 消失即回概览，
// 不残留一个后端已 409 的子页
watch(msTabVisible, (visible) => {
  if (!visible && section.value === 'ms') section.value = 'overview';
});

watch(sectionItems, items => { if (!items.some(item => item.value === section.value)) section.value = 'overview' });
watch(() => route.query.tab, (value, previous) => {
  if (value === 'points' && sectionItems.value.some(item => item.value === 'points')) section.value = 'points';
  else if (previous === 'points' && section.value === 'points') section.value = 'overview';
}, { immediate: true });
watch(section, value => {
  const query = { ...route.query };
  if (value === 'points' && query.tab !== 'points') router.replace({ query: { ...query, tab: 'points' } });
  else if (value !== 'points' && query.tab === 'points') { delete query.tab; router.replace({ query }); }
});

// 顶部提示随阶段变化：running 后不再提「选导生」类暗示仍可操作的文案
const stageHint = computed(() => {
  const st = props.session?.status;
  if (props.session?.category === 'project') {
    if (st === 'archived') return '营期已结营，在项目总览查看冻结的进度与成果';
    if (st === 'running') return '在项目总览检查全营节点进度、待评价材料和逾期项目';
    return '项目申报与组队阶段，项目总览展示已建项目及节点配置';
  }
  if (st === 'selecting') {
    return '报名审批、选导生收官、成员与请假运营在本工作台处理；开营后选导生入口自动收起，补分组转「成员管理」';
  }
  if (st === 'running') {
    return '营期进行中：报名、成员改派、公告、学习进度、组会与请假在本工作台处理；未分组学员请走「成员管理」';
  }
  if (st === 'archived') {
    return '营期已结营：本工作台只读复盘（进度看板 / 组会 / 成员档案），不可再变更营内数据';
  }
  return '营期运营在本工作台处理；营期配置等平台动作由管理员在管理端完成';
});

const isOwner = computed(() => props.session?.my_staff_role === 'owner');

const overviewRef = ref(null);
const admissionsRef = ref(null);
// 子页处理完成后刷新概览的待办计数（实时投影，无需状态同步协议）
function refreshOverview() {
  overviewRef.value?.reload?.();
}
// 概览待办 → 子页（section 由后端 work_items 契约下发；ms 已收起时回落概览）
function goSection(key) {
  if (!key) return;
  if (key === 'ms' && !msTabVisible.value) {
    section.value = 'overview';
    return;
  }
  section.value = key;
}
</script>

<style scoped>
.ws-nav-scroll { max-width: 100%; overflow-x: auto; margin: 14px 0; scrollbar-width: none; }
.ws-nav-scroll :deep(.dew-bar) { min-width: max-content; }
.ws-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ws-hint { font-size: 12px; color: var(--dew-text-faint); }
</style>
