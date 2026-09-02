<template>
  <div :class="['camp-view', 'dew-page-background', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <div style="height: 60px;"></div>
    <MenuComponent />
    <div class="camp-wrap">
      <!-- 加载中 -->
      <div v-if="loadingSessions" class="camp-loading">
        <DewSkeleton variant="rect" width="100%" height="120" rounded="8px" />
      </div>

      <!-- 无营期：智能分流空态 -->
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

      <!-- 工作台：左侧营期卡片列表（可折叠）+ 右侧无卡片头部区 + tabs -->
      <div v-else-if="sid" class="camp-layout">
        <aside class="camp-aside">
          <div class="aside-head">
            <span class="aside-title">我的营期</span>
          </div>
          <div class="aside-list">
            <div v-for="s in sessions" :key="s.id"
                 :class="['camp-item', { active: s.id === sid }]"
                 :title="s.name"
                 @click="sid = s.id">
              <div class="camp-item-name">{{ s.name }}</div>
              <div class="camp-item-sub">
                <span class="status-dot" :class="'dot-status-' + s.status"></span>
                <span>{{ statusLabel(s.status) }}</span>
                <span class="camp-item-date">{{ s.start_date?.slice(5) }} ~ {{ s.end_date?.slice(5) }}</span>
              </div>
              <!-- 资格名单内的待开放营：自助报名成为导生（审核制：提交后需管理员审核） -->
              <div v-if="canRegisterMentor(s)" class="camp-item-actions" @click.stop>
                <DewButton size="sm" type="glass" :loading="registeringSid === s.id"
                  @click="registerMentor(s)">报名成为导生</DewButton>
                <div class="camp-item-hint">你在本营具有报名资格，报名后需管理员审核</div>
              </div>
              <!-- 已提交导生报名：安静态（mine 有 pending 申请或本会话内提交过） -->
              <div v-else-if="isMentorPending(s)" class="camp-item-pending" @click.stop>
                <span class="pending-dot"></span>报名待审核
              </div>
            </div>
          </div>
        </aside>

        <div class="camp-main">
          <!-- 营期头部：无卡片样式，置于最上；tabs 切换条紧随其下 -->
          <header v-if="current" class="camp-hero">
            <h1 class="hero-title">{{ current.name }}</h1>
            <!-- 信息行：状态·日期·规则（左） + 选导生阶段胶囊（右） -->
            <div class="hero-meta-row">
              <div class="hero-sub">
                <span class="status-dot" :class="'dot-status-' + current.status"></span>
                <span>{{ statusLabel(current.status) }}</span>
                <span class="sep">·</span>
                <span>{{ current.start_date }} ~ {{ current.end_date }}</span>
                <span class="sep">·</span>
                <span>期望到岗 {{ current.expected_check_in || '弹性' }}</span>
                <span class="sep">·</span>
                <span>每日 ≥ {{ current.min_daily_hours != null ? current.min_daily_hours + 'h' : '—' }}</span>
                <span class="sep">·</span>
                <span>{{ current.weekdays_only ? '仅工作日' : '含周末' }}</span>
              </div>
              <div v-if="msPhase" :class="['hero-ms', { live: msActive }]" @click="tab = 'ms'">
                <span v-if="msActive" class="ms-dot"></span>
                <span>选导生 · {{ MS_PHASE_LABEL[msPhase.phase] }}</span>
                <span v-if="msActive" class="ms-go">去处理</span>
              </div>
            </div>
            <!-- 营期进度：通栏 -->
            <div class="hero-progress">
              <DewProgress :percentage="progress.pct" size="md" />
              <div class="progress-meta">
                <span>营期进度</span>
                <span class="progress-num">{{ progress.elapsed }} / {{ progress.total }} 天 · {{ progress.pct }}%</span>
              </div>
            </div>
          </header>

          <!-- 资格名单内、尚未报名的待开放营：工作台内容需成员身份，先引导报名（审核制：通过后才入营） -->
          <DewCard v-if="current && !current.is_member" variant="inset" size="lg" :no-hover="true" class="register-card">
            <!-- 报名待审核：安静态（进页拉 mine 的 pending 导生申请，或本会话内提交过） -->
            <template v-if="isMentorPending(current)">
              <div class="register-title">报名待审核</div>
              <div class="register-hint">已提交导生报名申请，管理员审核通过后即可布置名片、参与选导生。</div>
            </template>
            <template v-else>
              <div class="register-title">你已在「{{ current.name }}」的导生资格名单内</div>
              <div class="register-hint">你在本营具有报名资格，报名后需管理员审核；审核通过后即可布置名片、参与选导生。</div>
              <DewButton type="glass" :loading="registeringSid === current.id" @click="registerMentor(current)">
                报名成为导生
              </DewButton>
            </template>
          </DewCard>

          <DewButtonBar v-else v-model="tab" :items="tabItems" style="margin: 16px 0;" />
          <CampOverview v-if="tab === 'overview' && current && current.is_member" :sid="sid" />
          <template v-if="isMentor && current?.is_member">
          <MsMentorDesk v-if="tab === 'ms'" :sid="sid" />
          <MentorDashboard v-else-if="tab === 'dashboard'" :sid="sid" />
          <MentorLeave v-else-if="tab === 'leave'" :sid="sid" />
          <MentorReward v-else-if="tab === 'reward'" :sid="sid" />
          <MentorMembers v-else-if="tab === 'members'" :sid="sid" />
        </template>
        <template v-else-if="current?.is_member">
          <MsStudentPick v-if="tab === 'ms'" :sid="sid" />
          <CampSelection v-else-if="tab === 'selection'" :sid="sid" />
          <CampAttendance v-else-if="tab === 'attendance'" :sid="sid" />
          <LeaveApply v-else-if="tab === 'leave'" :sid="sid" />
        </template>
        </div><!-- camp-main -->
      </div><!-- camp-layout -->
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import MenuComponent from '../components/MenuComponent.vue';
import { DewButtonBar, DewButton, DewCard, DewProgress, DewSkeleton } from '@bme/dew-ui';
import { ElMessage } from 'element-plus';
import { campService, MS_PHASE_LABEL } from '../services/campService';
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
// staff（老师/超管）由管理员直接分配营期，不参与导生自助报名
const isStaff = computed(() => ['teacher', 'super_admin'].includes(store.getters.role));
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

const statusLabel = (s) => ({
  draft: '草稿', upcoming: '待开放', selecting: '选择阶段', running: '进行中', archived: '已结营',
}[s] || s);

// ── 营期头部（原 CampOverview hero 提升：所有 tab 共用）──
const progress = computed(() => {
  const s = current.value;
  if (!s?.start_date) return { pct: 0, elapsed: 0, total: 0 };
  const start = new Date(s.start_date);
  const end = new Date(s.end_date);
  const today = new Date();
  start.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0); today.setHours(0, 0, 0, 0);
  const total = Math.max(1, Math.round((end - start) / 86400000) + 1);
  const elapsed = Math.min(total, Math.max(0, Math.round((today - start) / 86400000) + 1));
  return { pct: Math.round((elapsed / total) * 100), elapsed, total };
});

// 选导生阶段（仅启用时拉取；chip 点击直接切 ms tab）
const msPhase = ref(null);
const msActive = computed(() => msPhase.value?.phase === 'collecting');
watch(sid, () => {
  msPhase.value = null;
  if (sid.value && current.value?.mentor_selection_enabled) {
    campService.fetchMsPhase(sid.value)
      .then((p) => { msPhase.value = p; })
      .catch(() => {});
  }
}, { immediate: true });

// 营期列表加载完成后按 query 校正 tab：ms tab 依赖 session.mentor_selection_enabled，
// 初始化时 current 尚为 null，直接到达 /camp?tab=ms 会先落到默认 tab；
// 切营后旧 tab 在新营不存在（如 ms 未启用）时回落到第一个
watch(tabItems, (items) => {
  const want = route.query.tab;
  if (want && items.some((t) => t.value === want) && tab.value !== want) {
    tab.value = want;
  } else if (!items.some((t) => t.value === tab.value)) {
    tab.value = items[0].value;
  }
});

onMounted(async () => {
  await loadSessions();
  // staff 不参与导生自助报名，无需拉待审核申请；静默请求，不阻塞首屏
  if (!isStaff.value) loadPendingMentorSids();
});

// 营期列表加载（导生报名改审核制后不再触发重拉：提交不改变成员关系）
async function loadSessions() {
  loadingSessions.value = true;
  try {
    const data = await campService.fetchSessions();
    // 保留本人是成员的营，外加「待开放」营（后端会把导生资格名单内的营一并返回，
    // is_member=false，供自助报名；staff 的 session_list 返回所有营，仍按成员过滤）
    sessions.value = (data.sessions || [])
      .filter((s) => s.is_member || (!isStaff.value && s.status === 'upcoming'));
    // 选营优先级：route.query.sid（从 CampHome 入口带过来，须在保留列表内）> 列表第一个
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
}

// ── 导生自助报名（Q-007 演进：资格名单内用户对 upcoming 营提交报名，2026-09 起改审核制）──
const registeringSid = ref(null);
// 待审核导生报名的营：进页拉 join-requests/mine 判定 + 本会话内提交过即记入（兜底）
const pendingMentorSids = ref(new Set());
const isMentorPending = (s) => pendingMentorSids.value.has(s.id);
const canRegisterMentor = (s) => !isStaff.value && s.status === 'upcoming' && !s.is_member && !isMentorPending(s);
async function registerMentor(s) {
  if (registeringSid.value || isMentorPending(s)) return;
  registeringSid.value = s.id;
  try {
    const r = await campService.registerMentor(s.id);
    // 首提与重复提交都走 200：message 分别为「报名已提交，管理员审核通过后即可布置导生名片」
    // 与「已提交报名申请，等待管理员审核」，原样透出
    ElMessage.success(r.message || '报名已提交，等待管理员审核');
    // 审核制下报名不再直接入营：不重拉营期列表，就地切「报名待审核」安静态
    pendingMentorSids.value.add(s.id);
  } catch (e) {
    // 名单外 403 / 非 upcoming 400：后端 message 面向用户，直接展示
    ElMessage.error(e.response?.data?.message || '报名失败，请稍后重试');
  } finally {
    registeringSid.value = null;
  }
}
// 进页判定跨会话的待审核导生报名（mine 行含 apply_role/status；失败静默，仅失去该态展示）
async function loadPendingMentorSids() {
  try {
    const data = await campService.fetchMyJoinRequests();
    for (const r of data.requests || []) {
      if (r.apply_role === 'mentor' && r.status === 'pending') pendingMentorSids.value.add(r.camp_session_id);
    }
  } catch { /* 静默 */ }
}
</script>

<style scoped>
.camp-view { min-height: 100vh; }
/* 容器上限放宽：展开侧栏时吃掉两侧留白，而不是挤压主内容（主内容保持折叠态的舒适宽度） */
.camp-wrap { max-width: 1280px; margin: 0 auto; padding: 24px 20px; }
.camp-loading { padding: 8px 0; }
.empty-camp { margin-top: 16px; }
.empty-text { color: var(--dew-text-muted, #909399); line-height: 1.7; margin-bottom: 12px; }

/* ── 工作台布局：左侧营期卡片列表 + 右侧内容 ── */
.camp-layout { display: flex; align-items: flex-start; gap: 20px; }
.camp-aside { width: 224px; flex-shrink: 0; }
.aside-head { margin-bottom: 10px; min-height: 28px; }
.aside-title { font-size: 13px; font-weight: 600; letter-spacing: 1px; color: var(--dew-text-muted); white-space: nowrap; }
.aside-list { display: flex; flex-direction: column; gap: 8px; }
.camp-item {
  border: 1px solid var(--dew-card-border);
  border-radius: var(--radius-md, 8px);
  padding: 10px 12px; cursor: pointer;
  background: transparent;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s var(--dew-bounce, ease);
  min-width: 0;
}
.camp-item:hover { transform: translateY(-1px); border-color: var(--dew-text-faint); }
.camp-item.active {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
}
.camp-item-name {
  font-size: 13.5px; font-weight: 600; color: var(--dew-text-heading);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.camp-item.active .camp-item-name { color: var(--color-primary); }
.camp-item-sub { display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 12px; color: var(--dew-text-muted); }
.camp-item-date { margin-left: auto; color: var(--dew-text-faint); white-space: nowrap; }
.camp-aside.collapsed .camp-item { display: flex; align-items: center; justify-content: center; padding: 12px 0; }

/* 状态圆点（侧栏 + hero 共用；五态：draft/upcoming/selecting/running/archived） */
.status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.dot-status-draft { background: var(--dew-text-faint); }
.dot-status-upcoming { background: var(--color-info); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-info) 18%, transparent); }
.dot-status-selecting { background: var(--color-warning); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-warning) 18%, transparent); }
.dot-status-running { background: var(--color-success); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-success) 18%, transparent); }
.dot-status-archived { background: var(--dew-text-faint); opacity: 0.6; }

/* 待开放营的导生报名按钮（资格名单内可见）与审核制说明 */
.camp-item-actions { margin-top: 8px; }
.camp-item-hint { margin-top: 6px; font-size: 11px; line-height: 1.6; color: var(--dew-text-faint); }
/* 已提交导生报名：安静态徽标（虚线胶囊 + 静态圆点，无交互动效） */
.camp-item-pending {
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border: 1px dashed var(--dew-card-border);
  border-radius: 999px;
  font-size: 11.5px;
  color: var(--dew-text-muted);
}
.pending-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-warning); flex-shrink: 0; }
.register-card { margin-top: 16px; }
.register-title { font-size: 16px; font-weight: 600; color: var(--dew-text-heading); margin-bottom: 8px; }
.register-hint { font-size: 13px; color: var(--dew-text-muted); line-height: 1.7; margin-bottom: 14px; }

/* ── 营期头部：无卡片样式，置于 tabs 之上（所有 tab 共用）── */
.camp-main { flex: 1; min-width: 0; }
.camp-hero { padding-bottom: 4px; }
.hero-title { font-size: 24px; font-weight: 700; margin: 0 0 8px; color: var(--dew-text-heading); letter-spacing: 0.5px; }
/* 信息行：元信息（左）与选导生胶囊（右）同排，进度条通栏其下 */
.hero-meta-row { display: flex; align-items: center; justify-content: space-between; gap: 12px 16px; margin-top: 4px; flex-wrap: wrap; }
.hero-sub { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--dew-text-muted); flex-wrap: wrap; min-width: 0; }
.hero-sub .sep { color: var(--dew-text-faint); }
/* 选导生阶段胶囊：启用即常驻（点击进 ms tab），进行中主色高亮 */
.hero-ms {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  cursor: pointer;
  flex-shrink: 0;
  color: var(--dew-text-muted);
  border: 1px solid var(--dew-card-border);
  transition: transform 0.25s var(--dew-bounce, ease), color 0.2s ease;
}
.hero-ms:hover { transform: translateY(-1px); }
.hero-ms.live {
  color: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 35%, transparent);
  background: color-mix(in srgb, var(--color-primary) 9%, transparent);
}
.ms-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: ms-pulse 2s ease infinite;
}
@keyframes ms-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
.ms-go { font-size: 11.5px; opacity: 0.75; }
.hero-progress { margin-top: 16px; }
.progress-meta { display: flex; justify-content: space-between; font-size: 12px; color: var(--dew-text-muted); margin-top: 8px; }
.progress-num { font-weight: 600; color: var(--dew-text-heading); }

/* 窄屏：侧栏列表横排 */
@media (max-width: 760px) {
  .camp-layout { flex-direction: column; }
  .camp-aside { width: 100%; }
  .aside-list { flex-direction: row; overflow-x: auto; padding-bottom: 4px; }
  .camp-item { flex-shrink: 0; min-width: 150px; }
}
</style>
