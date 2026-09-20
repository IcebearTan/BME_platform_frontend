<template>
  <div class="teacher-workspace">
    <!-- 身份行：主负责人/协同老师标识 + 权限提示 -->
    <div class="ws-head">
      <DewTag :type="isOwner ? 'primary' : 'info'" size="sm" :round="true">
        {{ isOwner ? '主负责人' : '协同老师' }}
      </DewTag>
      <span class="ws-hint">报名审批、选导生、成员与请假运营在本工作台处理；营期配置等平台动作由管理员在管理端完成</span>
    </div>

    <DewButtonBar v-model="section" :items="sectionItems" style="margin: 14px 0;" />

    <TeacherOverview v-if="section === 'overview'" ref="overviewRef" :sid="sid" @navigate="goSection" />
    <TeacherAdmissions v-else-if="section === 'admissions'" ref="admissionsRef" :sid="sid"
      :ms-enabled="!!session?.mentor_selection_enabled" @reviewed="refreshOverview" />
    <TeacherMsAssign v-else-if="section === 'ms'" :sid="sid" @reviewed="refreshOverview" />
    <TeacherMembers v-else-if="section === 'members'" :sid="sid" @reviewed="refreshOverview" />
    <TeacherAnnouncements v-else-if="section === 'announcements'" :sid="sid" />
    <TeacherProgress v-else-if="section === 'progress'" :sid="sid" />
    <TeacherMeetings v-else-if="section === 'meetings'" :sid="sid" />
    <MentorDashboard v-else-if="section === 'attendance'" :sid="sid" scope-label="全营" />
    <MentorLeave v-else-if="section === 'leaves'" :sid="sid" @reviewed="refreshOverview" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { DewButtonBar, DewTag } from '@bme/dew-ui';
import TeacherOverview from './TeacherOverview.vue';
import TeacherAdmissions from './TeacherAdmissions.vue';
import TeacherMsAssign from './TeacherMsAssign.vue';
import TeacherMembers from './TeacherMembers.vue';
import TeacherAnnouncements from './TeacherAnnouncements.vue';
import TeacherProgress from './TeacherProgress.vue';
import TeacherMeetings from './TeacherMeetings.vue';
import MentorDashboard from './MentorDashboard.vue';
import MentorLeave from './MentorLeave.vue';

const props = defineProps({
  sid: { type: [Number, String], required: true },
  /** 营期行（session_list 契约：my_staff_role / mentor_selection_enabled / policy） */
  session: { type: Object, default: null },
});

// 外壳只做子页导航（方案 §6.2：不能长成包含所有表格的超大组件）。
// 待接入：待办中心。
const section = ref('overview');
const caps = computed(() => props.session?.policy?.capabilities || {});
const sectionItems = computed(() => {
  const items = [
    { value: 'overview', label: '概览' },
    { value: 'admissions', label: '报名审批' },
  ];
  if (props.session?.mentor_selection_enabled) {
    items.push({ value: 'ms', label: '选导生收官' });
  }
  items.push({ value: 'members', label: '成员管理' });
  items.push({ value: 'announcements', label: '营期公告' });
  items.push({ value: 'progress', label: '学习进度' });
  items.push({ value: 'meetings', label: '组会总览' });
  if (caps.value.attendance) items.push({ value: 'attendance', label: '全营考勤' });
  items.push({ value: 'leaves', label: '请假审批' });
  return items;
});

const isOwner = computed(() => props.session?.my_staff_role === 'owner');

const overviewRef = ref(null);
const admissionsRef = ref(null);
// 子页处理完成后刷新概览的待办计数（实时投影，无需状态同步协议）
function refreshOverview() {
  overviewRef.value?.reload?.();
}
// 概览待办 → 子页（未分配学员/未交志愿 → 选导生收官页）
function goSection(key) {
  if (key === 'ms') { section.value = 'ms'; return; }
  section.value = key;
}
</script>

<style scoped>
.ws-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ws-hint { font-size: 12px; color: var(--dew-text-faint); }
</style>
