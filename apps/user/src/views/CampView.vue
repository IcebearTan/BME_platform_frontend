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
          <template v-if="emptyGuide.type === 'recruit'">
            <div class="empty-text">你还没有加入营期。</div>
            <DewButton type="glass" @click="router.push('/camp-home')">
              查看「{{ emptyGuide.name }}」· 申请入营
            </DewButton>
          </template>
          <div v-else-if="emptyGuide.type === 'unassigned'" class="empty-text">
            你尚未被分配到营期。导生/老师由管理员在「营期管理」中直接分配，无需申请加入。
          </div>
          <div v-else class="empty-text">暂未开放营期，敬请期待。</div>
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
        <CampOverview v-if="tab === 'overview' && current" :sid="sid" :session="current" @go="(t) => (tab = t)" />
        <template v-if="isMentor">
          <MsMentorDesk v-if="tab === 'ms'" :sid="sid" />
          <MentorDashboard v-else-if="tab === 'dashboard'" :sid="sid" />
          <MentorLeave v-else-if="tab === 'leave'" :sid="sid" />
          <MentorReward v-else-if="tab === 'reward'" :sid="sid" />
          <MentorMembers v-else-if="tab === 'members'" :sid="sid" />
        </template>
        <template v-else>
          <MsStudentPick v-if="tab === 'ms'" :sid="sid" />
          <CampSelection v-else-if="tab === 'selection'" :sid="sid" />
          <CampAttendance v-else-if="tab === 'attendance'" :sid="sid" />
          <LeaveApply v-else-if="tab === 'leave'" :sid="sid" />
        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import MenuComponent from '../components/MenuComponent.vue';
import { DewButtonBar, DewButton, DewCard, DewSelect, DewSkeleton } from '../components/ui';
import { ElMessage } from 'element-plus';
import { campService } from '../services/campService';
import CampOverview from '../components/Camp/CampOverview.vue';
import CampSelection from '../components/Camp/CampSelection.vue';
import CampAttendance from '../components/Camp/CampAttendance.vue';
import LeaveApply from '../components/Camp/LeaveApply.vue';
import MentorDashboard from '../components/Camp/MentorDashboard.vue';
import MentorLeave from '../components/Camp/MentorLeave.vue';
import MentorReward from '../components/Camp/MentorReward.vue';
import MentorMembers from '../components/Camp/MentorMembers.vue';
import MsStudentPick from '../components/Camp/MsStudentPick.vue';
import MsMentorDesk from '../components/Camp/MsMentorDesk.vue';

const store = useStore();
const route = useRoute();
const router = useRouter();
const isDarkMode = computed(() => store.getters.isDarkMode);

const sessions = ref([]);
const sid = ref(null);
const loadingSessions = ref(true);
// 空状态分流：recruit=学生可申请（CTA 去招募页）/ unassigned=staff 未分配 / none=暂无营期
const emptyGuide = ref({ type: 'none', name: '' });

const isMentor = computed(() => store.getters.role === 'mentor');
const isStudent = computed(() => store.getters.role === 'student');
// 注意：studentTabs/mentorTabs 依赖 current，tab 初始化（tabItems.value）在 setup 期立即求值，
// 故 current 必须声明在它们之前，否则 TDZ 报错 Cannot access 'current' before initialization
const current = computed(() => sessions.value.find((s) => s.id === sid.value));
// 看板为默认 tab（营期概要+仪表盘，自 CampHome 成员视图迁入）；
// 选导生为开营前置阶段，启用时紧随看板（session 数据来自 _session_dict 的 mentor_selection_enabled）
const studentTabs = computed(() => {
  const t = [
    { value: 'overview', label: '看板' },
    { value: 'selection', label: '选课' },
    { value: 'attendance', label: '我的考勤' },
    { value: 'leave', label: '请假' },
  ];
  if (current.value?.mentor_selection_enabled) t.splice(1, 0, { value: 'ms', label: '选导生' });
  return t;
});
const mentorTabs = computed(() => {
  const t = [
    { value: 'overview', label: '看板' },
    { value: 'dashboard', label: '团队考勤' },
    { value: 'leave', label: '请假审批' },
    { value: 'reward', label: '发奖励' },
    { value: 'members', label: '团队成员' },
  ];
  if (current.value?.mentor_selection_enabled) t.splice(1, 0, { value: 'ms', label: '选导生' });
  return t;
});
const tabItems = computed(() => (isMentor.value ? mentorTabs.value : studentTabs.value));
const tab = ref((tabItems.value.find((t) => t.value === route.query.tab) || tabItems.value[0]).value);

const sessionOptions = computed(() => sessions.value.map((s) => ({ label: s.name, value: s.id })));
const statusLabel = (s) => ({ draft: '草稿', active: '进行中', archived: '已归档' }[s] || s);

// 营期列表加载完成后按 query 校正 tab：ms tab 依赖 session.mentor_selection_enabled，
// 初始化时 current 尚为 null，直接到达 /camp?tab=ms 会先落到默认 tab
watch(tabItems, (items) => {
  const want = route.query.tab;
  if (want && items.some((t) => t.value === want) && tab.value !== want) {
    tab.value = want;
  }
});

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
    // 无成员营时的分流：学生看是否有招募中的营（引导去 /camp-home 申请），staff 提示待分配
    if (!sessions.value.length) {
      try {
        const f = await campService.fetchFeatured();
        if (f.session && isStudent.value) emptyGuide.value = { type: 'recruit', name: f.session.name };
        else if (f.session) emptyGuide.value = { type: 'unassigned' };
      } catch { /* featured 拉失败按暂无营期展示 */ }
    }
  } catch {
    ElMessage.error('加载营期列表失败，请刷新重试');
  } finally { loadingSessions.value = false; }
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
.empty-text { color: var(--dew-text-muted, #909399); line-height: 1.7; margin-bottom: 12px; }
</style>
