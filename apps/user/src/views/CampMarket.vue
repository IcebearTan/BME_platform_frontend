<template>
  <div :class="['camp-market', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <div style="height: 60px;"></div>
    <MenuComponent />

    <div class="market-wrap">
      <!-- 守卫检查中（成员校验 / ms 启用校验） -->
      <div v-if="checking" class="market-loading">
        <DewSkeleton variant="rect" width="100%" height="200" rounded="8px" />
      </div>

      <!-- 校验失败：回工作台（redirect 已发起，此处仅兜底展示） -->
      <div v-else-if="guardMsg" class="market-closed">
        <DewCard variant="inset" size="lg" :no-hover="true">
          <div class="closed-label">{{ guardMsg }}</div>
          <DewButton type="glass" @click="backToCamp">返回营期工作台</DewButton>
        </DewCard>
      </div>

      <!-- 市集数据加载中 -->
      <div v-else-if="loading || !phaseInfo" class="market-loading">
        <DewSkeleton variant="rect" width="100%" height="320" rounded="8px" />
      </div>

      <!-- 打烊：非可提交阶段（round1 / done / upcoming / 已匹配） -->
      <div v-else-if="!open" class="market-closed">
        <DewCard variant="inset" size="lg" :no-hover="true">
          <MsPhaseBar :phase="phaseInfo.phase" :round2-enabled="phaseInfo.round2_enabled" />
          <div class="closed-label">{{ closedText }}</div>
          <div v-if="closedHint" class="closed-hint">{{ closedHint }}</div>
          <DewButton type="glass" @click="backToCamp">回工作台看状态</DewButton>
        </DewCard>
      </div>

      <!-- 营业：collecting / round2 未匹配 -->
      <template v-else>
        <!-- 头部：返回 + 营名 + 阶段条 + 截止 + 从众信号 -->
        <header class="market-hero">
          <div class="hero-top">
            <span class="back-link" @click="backToCamp">返回工作台</span>
            <span class="hero-camp">{{ campName }}</span>
          </div>
          <h1 class="hero-title">团购导生</h1>
          <div class="hero-sub">
            <span>交出 3 个有序志愿，导生按顺序收人，双方互选后开营</span>
          </div>
          <div class="hero-phase">
            <MsPhaseBar :phase="phaseInfo.phase" :round2-enabled="phaseInfo.round2_enabled" />
            <span class="phase-deadline">{{ deadlineText }}</span>
          </div>
          <div v-if="submittedText" class="hero-signal">{{ submittedText }}</div>
        </header>

        <div v-if="phaseInfo.phase === 'round2'" class="round2-note">
          二轮互选：仅在仍有名额的导生中重新提交志愿
        </div>

        <DewButtonBar v-model="activeTag" :items="tagItems" class="market-filter" />

        <div v-if="!filteredMentors.length" class="ms-empty">
          {{ phaseInfo.phase === 'round2' ? '没有可选的导生了（均已满员）' : '暂无导生发布名片' }}
        </div>
        <div v-else class="market-grid">
          <MsMentorCard
            v-for="(m, i) in filteredMentors"
            :key="m.user_id"
            :mentor="m"
            :picked-rank="rankOf(m.user_id)"
            :selectable="true"
            :index="i"
            size="lg"
            @toggle="togglePick(m)"
          />
        </div>

        <MsPreferenceTray
          :picks="picks"
          :mentor-names="mentorNames"
          :deadline="trayDeadline"
          :round="submittable"
          :already-submitted="alreadySubmitted"
          :submitting="submitting"
          @remove="removePick"
          @move-up="moveUp"
          @update-note="updateNote"
          @submit="submitPicks"
        />
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import MenuComponent from '../components/MenuComponent.vue';
import { DewButton, DewButtonBar, DewCard, DewSkeleton } from '@bme/dew-ui';
import MsPhaseBar from '../components/Camp/MsPhaseBar.vue';
import MsMentorCard from '../components/Camp/MsMentorCard.vue';
import MsPreferenceTray from '../components/Camp/MsPreferenceTray.vue';
import { campService } from '../services/campService';

const store = useStore();
const route = useRoute();
const router = useRouter();
const isDarkMode = computed(() => store.getters.isDarkMode);

const sid = Number(route.params.sid);
// 守卫：学员 + 该营成员 + 营启用选导生；否则回落（规范 §1.2 例外条款）
const checking = ref(true);
const guardMsg = ref('');
const campName = ref('');

const loading = ref(true);
const phaseInfo = ref(null);
const mentors = ref([]);
const activeTag = ref('all');
const picks = ref([]);          // [{mentor_id, note}]
const submitting = ref(false);

// ── 阶段门控：仅 collecting / round2 未匹配时营业 ──
const open = computed(() => !!phaseInfo.value?.me?.submittable_round);
const submittable = computed(() => phaseInfo.value?.me?.submittable_round || null);

const meRound1 = computed(() => phaseInfo.value?.me?.round1 || []);
const alreadySubmitted = computed(() => {
  if (!phaseInfo.value || !submittable.value) return false;
  const list = submittable.value === 1 ? meRound1.value : (phaseInfo.value.me.round2 || []);
  return list.length > 0;
});

const trayDeadline = computed(() => {
  const d = phaseInfo.value?.deadlines;
  if (!d) return '';
  return submittable.value === 2 ? d.round2_deadline : d.preference_deadline;
});

const deadlineText = computed(() => (trayDeadline.value ? `${trayDeadline.value} 截止` : ''));

// 从众信号：全营汇总（X/N 已交），非单导师热度（热度红线见规范 §五）
const submittedText = computed(() => {
  const s = phaseInfo.value?.stats;
  if (!s || !s.students) return '';
  return `已有 ${s.submitted}/${s.students} 位同学提交志愿`;
});

const tagItems = computed(() => [
  { value: 'all', label: '全部' },
  ...(phaseInfo.value?.ms_tags || []).map((t) => ({ value: t, label: t })),
]);

const filteredMentors = computed(() => {
  let list = mentors.value;
  if (activeTag.value !== 'all') list = list.filter((m) => m.tags?.includes(activeTag.value));
  // 二轮只给有余额的导生（后端已挡满员提交，前端同样隐藏免得点了报错）
  if (phaseInfo.value?.phase === 'round2') list = list.filter((m) => !m.full);
  return list;
});

const mentorNames = computed(
  () => Object.fromEntries(mentors.value.map((m) => [m.user_id, m.username])));

// 打烊文案：按阶段 + 是否已出结果
const closedText = computed(() => {
  const p = phaseInfo.value;
  if (!p) return '';
  if (p.me?.my_mentor) return '你已匹配到导生';
  if (p.phase === 'round1') return '导生正在挑选，市集暂停营业';
  if (p.phase === 'done') return '本轮市集已收摊';
  if (p.phase === 'upcoming') return '市集尚未开门';
  return '市集暂不营业';
});
const closedHint = computed(() => {
  const p = phaseInfo.value;
  if (!p) return '';
  if (p.me?.my_mentor) return '回工作台「选导生」查看你的导生卡片';
  if (p.phase === 'round1') return '你提交的志愿正在按顺序被导生收人，结果出来会有通知';
  if (p.phase === 'done') return p.me && (meRound1.value.length || (p.me.round2 || []).length)
    ? '本轮未被匹配，老师会在开营前指派导生' : '选导生已结束';
  if (p.phase === 'upcoming') return `${p.deadlines.preference_start || ''} 开门，届时可浏览名片并提交志愿`;
  return '';
});

const rankOf = (mentorId) => picks.value.findIndex((p) => p.mentor_id === mentorId) + 1;

function togglePick(m) {
  const i = picks.value.findIndex((p) => p.mentor_id === m.user_id);
  if (i >= 0) {
    picks.value.splice(i, 1);
    return;
  }
  if (m.full) { ElMessage.warning('该导生名额已满'); return; }
  if (picks.value.length >= 3) { ElMessage.warning('最多提交 3 个志愿，先移除一个'); return; }
  picks.value.push({ mentor_id: m.user_id, note: '' });
}

const removePick = (i) => picks.value.splice(i, 1);
const moveUp = (i) => {
  if (i <= 0) return;
  const arr = picks.value;
  [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
};
const updateNote = (i, v) => { if (picks.value[i]) picks.value[i].note = v; };

async function submitPicks() {
  if (!picks.value.length) return;
  submitting.value = true;
  try {
    await campService.submitMsPreferences(
      sid, picks.value.map((p) => ({ mentor_id: p.mentor_id, note: p.note || '' })));
    ElMessage.success('志愿已提交，截止前可修改');
    await load();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '提交失败');
    // 常见原因：所选导生刚满员 / 窗口刚切换 —— 重拉最新状态
    if (e.response?.status === 400 || e.response?.status === 403) await load();
  } finally {
    submitting.value = false;
  }
}

async function load() {
  loading.value = true;
  try {
    const [ph, ms] = await Promise.all([
      campService.fetchMsPhase(sid),
      campService.fetchMsMentors(sid).catch(() => ({ mentors: [] })),
    ]);
    phaseInfo.value = ph;
    mentors.value = ms.mentors || [];
    // 已有志愿回填托盘（当前可提交轮次）
    const r = ph.me?.submittable_round;
    if (r) {
      const prev = r === 1 ? ph.me.round1 : ph.me.round2;
      picks.value = (prev || []).map((x) => ({ mentor_id: x.mentor_id, note: x.note || '' }));
      // 二轮回填时剔除已满员的（防直接提交报错）
      if (r === 2) {
        picks.value = picks.value.filter(
          (p) => !mentors.value.find((m) => m.user_id === p.mentor_id)?.full);
      }
    } else {
      picks.value = [];
    }
  } catch {
    ElMessage.error('加载团购导生信息失败');
  } finally {
    loading.value = false;
  }
}

const backToCamp = () => router.push({ path: '/camp', query: { tab: 'ms', sid } });

onMounted(async () => {
  try {
    if (store.getters.role !== 'student') {
      guardMsg.value = '团购导生面向学员开放';
      router.replace({ path: '/camp', query: { tab: 'ms', sid } });
      return;
    }
    const data = await campService.fetchSessions();
    const camp = (data.sessions || []).find((s) => s.id === sid && s.is_member);
    if (!camp) {
      guardMsg.value = '你还不是这个营期的成员';
      router.replace('/camp');
      return;
    }
    if (!camp.mentor_selection_enabled) {
      guardMsg.value = '这个营期没有开启团购导生';
      router.replace({ path: '/camp', query: { sid } });
      return;
    }
    campName.value = camp.name;
    await load();
  } catch {
    guardMsg.value = '加载营期信息失败，请稍后再试';
  } finally {
    checking.value = false;
  }
});
</script>

<style scoped>
/* 市集与工作台同属营期域，沿用同一套页面底色 */
.camp-market { min-height: 100vh; background-attachment: fixed; }
.theme-light.camp-market {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(96, 165, 250, 0.26), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(244, 114, 182, 0.24), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(52, 211, 153, 0.22), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(251, 191, 36, 0.20), transparent 55%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(34, 211, 238, 0.10), transparent 70%),
    linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdf4 100%);
}
.theme-dark.camp-market {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(59, 130, 246, 0.18), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(236, 72, 153, 0.15), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(16, 185, 129, 0.14), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(245, 158, 11, 0.12), transparent 55%),
    linear-gradient(160deg, #16161a 0%, #0f0f12 100%);
}

.market-wrap { max-width: 1280px; margin: 0 auto; padding: 24px 20px 48px; }
.market-loading { padding: 8px 0; }

/* ── 头部：无卡片裸排版（规范 §3.1 页头不包卡）── */
.hero-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
.back-link {
  font-size: 13px;
  color: var(--dew-text-muted);
  cursor: pointer;
  transition: color 0.2s ease, transform 0.2s var(--dew-bounce, ease);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.back-link::before { content: '←'; }
.back-link:hover { color: var(--color-primary); transform: translateX(-2px); }
.hero-camp { font-size: 13px; color: var(--dew-text-faint); }

.hero-title { font-size: 30px; font-weight: 700; margin: 0 0 6px; color: var(--dew-text-heading); letter-spacing: 0.5px; }
.hero-sub { font-size: 13px; color: var(--dew-text-muted); }
.hero-phase {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-top: 14px;
}
.phase-deadline { font-size: 12.5px; color: var(--color-primary); font-weight: 600; }
/* 从众信号：全营汇总进度，做一行克制的强调 */
.hero-signal {
  margin-top: 10px;
  font-size: 12.5px;
  color: var(--dew-text-muted);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.hero-signal::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary);
  animation: signal-pulse 2s ease infinite;
}
@keyframes signal-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

.round2-note {
  margin-top: 16px;
  padding: 8px 14px;
  border-radius: var(--radius-md, 12px);
  font-size: 13px;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
}

.market-filter { margin: 16px 0 18px; }

.market-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(252px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.ms-empty {
  padding: 60px 0;
  text-align: center;
  font-size: 13px;
  color: var(--dew-text-muted);
}

/* 打烊/守卫兜底卡 */
.market-closed { margin-top: 24px; }
.closed-label { font-size: 17px; font-weight: 700; color: var(--dew-text-heading); margin: 14px 0 4px; }
.closed-hint { font-size: 13px; color: var(--dew-text-muted); line-height: 1.6; margin-bottom: 14px; }

@media (max-width: 760px) {
  .hero-title { font-size: 24px; }
  .market-grid { grid-template-columns: repeat(auto-fill, minmax(224px, 1fr)); gap: 12px; }
}
</style>
