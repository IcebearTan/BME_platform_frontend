<template>
  <div :class="['camp-view', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <div style="height: 60px;"></div>
    <MenuComponent />
    <div class="camp-wrap">
      <div class="page-header">
        <div class="page-title-row">
          <span class="title-accent"></span>
          <h1 class="page-title">我的营期</h1>
        </div>
      </div>

      <!-- 选营 -->
      <div v-if="loadingSessions" class="camp-selector">
        <DewSkeleton variant="rect" width="280" height="34" rounded="6px" />
      </div>
      <div v-else-if="!sessions.length" class="empty-camp">
        <DewCard variant="inset" size="lg" :no-hover="true">
          你还没有加入任何营期。
        </DewCard>
      </div>
      <div v-else class="camp-selector">
        <span class="selector-label">当前营期：</span>
        <DewSelect v-model="sid" :options="sessionOptions" placeholder="选择营期" style="width: 280px;" />
        <el-tag v-if="current" size="small" style="margin-left: 12px;">
          {{ statusLabel(current.status) }} · {{ current.start_date }} ~ {{ current.end_date }}
        </el-tag>
      </div>

      <!-- Tab + 内容 -->
      <template v-if="sid">
        <DewButtonBar v-model="tab" :items="tabItems" style="margin: 16px 0;" />
        <template v-if="isMentor">
          <MentorDashboard v-if="tab === 'dashboard'" :sid="sid" />
          <MentorLeave v-else-if="tab === 'leave'" :sid="sid" />
          <MentorReward v-else-if="tab === 'reward'" :sid="sid" />
          <MentorMembers v-else-if="tab === 'members'" :sid="sid" />
        </template>
        <template v-else>
          <CampSelection v-if="tab === 'selection'" :sid="sid" />
          <CampAttendance v-else-if="tab === 'attendance'" :sid="sid" />
          <LeaveApply v-else :sid="sid" />
        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRoute } from 'vue-router';
import MenuComponent from '../components/MenuComponent.vue';
import { DewButtonBar, DewCard, DewSelect, DewSkeleton } from '../components/ui';
import { campService } from '../services/campService';
import CampSelection from '../components/Camp/CampSelection.vue';
import CampAttendance from '../components/Camp/CampAttendance.vue';
import LeaveApply from '../components/Camp/LeaveApply.vue';
import MentorDashboard from '../components/Camp/MentorDashboard.vue';
import MentorLeave from '../components/Camp/MentorLeave.vue';
import MentorReward from '../components/Camp/MentorReward.vue';
import MentorMembers from '../components/Camp/MentorMembers.vue';

const store = useStore();
const route = useRoute();
const isDarkMode = computed(() => store.getters.isDarkMode);

const sessions = ref([]);
const sid = ref(null);
const loadingSessions = ref(true);

const isMentor = computed(() => store.getters.role === 'mentor');
const studentTabs = [
  { value: 'selection', label: '选课' },
  { value: 'attendance', label: '我的考勤' },
  { value: 'leave', label: '请假' },
];
const mentorTabs = [
  { value: 'dashboard', label: '团队考勤' },
  { value: 'leave', label: '请假审批' },
  { value: 'reward', label: '发奖励' },
  { value: 'members', label: '团队成员' },
];
const tabItems = computed(() => (isMentor.value ? mentorTabs : studentTabs));
const tab = ref((tabItems.value.find((t) => t.value === route.query.tab) || tabItems.value[0]).value);

const current = computed(() => sessions.value.find((s) => s.id === sid.value));
const sessionOptions = computed(() => sessions.value.map((s) => ({ label: s.name, value: s.id })));
const statusLabel = (s) => ({ draft: '草稿', active: '进行中', archived: '已归档' }[s] || s);

onMounted(async () => {
  loadingSessions.value = true;
  try {
    const data = await campService.fetchSessions();
    // 仅保留本人是成员的营（staff 的 session_list 会返回所有营，须前端过滤；
    // 学生/导生后端已按成员过滤，is_member 恒 true，此处无影响）
    sessions.value = (data.sessions || []).filter((s) => s.is_member);
    // 选营优先级：route.query.sid（从 CampHome 入口带过来，须为成员营）> 列表第一个
    let initSid = route.query.sid ? Number(route.query.sid) : null;
    if (initSid && !sessions.value.some((s) => s.id === initSid)) initSid = null;
    if (!initSid && sessions.value.length) initSid = sessions.value[0].id;
    if (initSid) sid.value = initSid;
  } catch { /* ignore */ }
  finally { loadingSessions.value = false; }
});
</script>

<style scoped>
.camp-view { min-height: 100vh; background-attachment: fixed; }
.theme-light.camp-view {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(96, 165, 250, 0.26), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(244, 114, 182, 0.24), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(52, 211, 153, 0.22), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(251, 191, 36, 0.20), transparent 55%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(34, 211, 238, 0.10), transparent 70%),
    linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdf4 100%);
}
.theme-dark.camp-view {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(59, 130, 246, 0.18), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(236, 72, 153, 0.15), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(16, 185, 129, 0.14), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(245, 158, 11, 0.12), transparent 55%),
    linear-gradient(160deg, #16161a 0%, #0f0f12 100%);
}
.camp-wrap { max-width: 1080px; margin: 0 auto; padding: 24px 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title-row { display: flex; align-items: center; gap: 10px; }
.title-accent { display: inline-block; width: 4px; height: 20px; border-radius: 2px; background: linear-gradient(180deg, #3b82f6, #8b5cf6); }
.page-title { font-size: 18px; font-weight: 600; margin: 0; color: var(--dew-text-heading); }
.camp-selector { display: flex; align-items: center; margin-bottom: 8px; }
.selector-label { color: var(--dew-text-secondary, #909399); margin-right: 8px; }
.empty-camp { margin-top: 16px; }
</style>
