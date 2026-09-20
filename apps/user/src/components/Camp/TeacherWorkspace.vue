<template>
  <div class="teacher-workspace">
    <!-- 身份行：主负责人/协同老师标识 + 权限提示 -->
    <div class="ws-head">
      <DewTag :type="isOwner ? 'primary' : 'info'" size="sm" :round="true">
        {{ isOwner ? '主负责人' : '协同老师' }}
      </DewTag>
      <span class="ws-hint">报名审批、请假审批与成员运营在本工作台处理；营期配置等平台动作由管理员在管理端完成</span>
    </div>

    <DewButtonBar v-model="section" :items="sectionItems" style="margin: 14px 0;" />

    <TeacherOverview v-if="section === 'overview'" ref="overviewRef" :sid="sid" @navigate="section = $event" />
    <TeacherAdmissions v-else-if="section === 'admissions'" ref="admissionsRef" :sid="sid"
      :ms-enabled="!!session?.mentor_selection_enabled" @reviewed="refreshOverview" />
    <MentorLeave v-else-if="section === 'leaves'" :sid="sid" @reviewed="refreshOverview" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { DewButtonBar, DewTag } from '@bme/dew-ui';
import TeacherOverview from './TeacherOverview.vue';
import TeacherAdmissions from './TeacherAdmissions.vue';
import MentorLeave from './MentorLeave.vue';

const props = defineProps({
  sid: { type: [Number, String], required: true },
  /** 营期行（session_list 契约：my_staff_role / mentor_selection_enabled） */
  session: { type: Object, default: null },
});

// 外壳只做子页导航（方案 §6.2：不能长成包含所有表格的超大组件）。
// 阶段 2 接入：成员名单与改派、选导生运营、全营学习进度与考勤；阶段 3 接公告与待办中心。
const section = ref('overview');
const sectionItems = [
  { value: 'overview', label: '概览' },
  { value: 'admissions', label: '报名审批' },
  { value: 'leaves', label: '请假审批' },
];

const isOwner = computed(() => props.session?.my_staff_role === 'owner');

const overviewRef = ref(null);
const admissionsRef = ref(null);
// 子页处理完成后刷新概览的待办计数（实时投影，无需状态同步协议）
function refreshOverview() {
  overviewRef.value?.reload?.();
}
</script>

<style scoped>
.ws-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ws-hint { font-size: 12px; color: var(--dew-text-faint); }
</style>
