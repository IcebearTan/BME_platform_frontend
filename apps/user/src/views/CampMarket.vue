<template>
  <div :class="['camp-market', 'dew-page-background', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <div class="top-space"></div>
    <MenuComponent />

    <main class="market-wrap">
      <div v-if="checking" class="market-loading">
        <DewSkeleton variant="rect" width="100%" height="200" rounded="8px" />
      </div>

      <div v-else-if="guardMsg" class="market-closed">
        <DewCard variant="inset" size="lg" :no-hover="true">
          <div class="closed-label">{{ guardMsg }}</div>
          <DewButton type="glass" @click="backToCamp">返回营期工作台</DewButton>
        </DewCard>
      </div>

      <div v-else-if="loading || !phaseInfo" class="market-loading">
        <DewSkeleton variant="rect" width="100%" height="320" rounded="8px" />
      </div>

      <div v-else-if="!open && !browsing" class="market-closed">
        <DewCard variant="inset" size="lg" :no-hover="true">
          <MsPhaseBar :phase="phaseInfo.phase" />
          <div class="closed-label">{{ closedText }}</div>
          <div v-if="closedHint" class="closed-hint">{{ closedHint }}</div>
          <DewButton type="glass" @click="backToCamp">回工作台看状态</DewButton>
        </DewCard>
      </div>

      <template v-else>
        <section class="market-poster" aria-label="导生集市">
          <div class="poster-tools">
            <button type="button" class="poster-back" aria-label="返回营期工作台" @click="backToCamp">
              <span class="back-icon"><el-icon><Back /></el-icon></span><span>返回</span>
            </button>
            <button type="button" class="head-tool" @click="rulesVisible = true">
              <el-icon><Document /></el-icon><span>选导生规则</span>
            </button>
          </div>
          <div class="poster-art">
            <img :src="marketPoster" alt="导生集市活动海报" width="1600" height="800" />
          </div>
          <div class="poster-float">
            <div class="live-ticker" role="timer">
              <span class="ticker-label">{{ browsing ? '距开启提交：' : '截止时间：' }}</span><strong>{{ countdownText }}</strong>
              <span v-if="browsing && openAtText" class="ticker-sub">{{ openAtText }} 开启</span>
            </div>
          </div>
        </section>

        <el-dialog v-model="rulesVisible" title="选导生规则" width="min(680px, 94vw)" append-to-body>
          <div class="rules rules-dialog">
            <div class="rule">
              <span class="rule-num">1</span>
              <div><b>选 1-3 个志愿</b><p>按你最想去的顺序排列志愿，可选 1 到 3 位，不必选满。</p></div>
            </div>
            <div class="rule">
              <span class="rule-num">2</span>
              <div><b>老师协调</b><p>志愿截止后由老师统一协调，分配结果在工作台公布。</p></div>
            </div>
            <div class="rule">
              <span class="rule-num">3</span>
              <div><b>截止前可修改</b><p>修改时整组替换志愿，以最后一次提交为准。</p></div>
            </div>
          </div>
        </el-dialog>

        <section class="market-browser" aria-label="浏览导生名片">
          <div class="market-toolbar">
            <div class="market-filter-scroll">
              <DewButtonBar v-model="activeTag" :items="tagItems" size="lg" class="market-filter" />
            </div>
            <div class="market-count" aria-live="polite">
              <strong>{{ filteredMentors.length }}</strong> 位导生<span>共 {{ availableMentors.length }} 位</span>
            </div>
          </div>

          <div v-if="favoritesError" role="status" class="favorites-error">
            收藏暂不可用
            <button type="button" @click="loadFavorites" :disabled="favoritesLoading">重试</button>
          </div>
          <div v-if="!filteredMentors.length" class="ms-empty">暂无导生发布名片</div>
          <div v-else class="market-grid">
            <MsMentorCard
              v-for="(mentor, index) in filteredMentors"
              :key="mentor.user_id"
              :mentor="mentor"
              :picked-rank="rankOf(mentor.user_id)"
              :selectable="submittable"
              :selection-disabled="selectionLocked"
              :index="index"
              :favorite-enabled="true"
              :favorited="favoriteIds.includes(mentor.user_id)"
              :favorite-disabled="favoritesLoading || !!favoritesError || expiredByClock || favoritePending.includes(mentor.user_id)"
              @favorite="toggleFavorite(mentor.user_id)"
              size="lg"
              @add="addPick(mentor)"
            />
          </div>
        </section>

        <MsPreferenceTray
          v-if="submittable"
          :picks="picks"
          :mentor-names="mentorNames"
          :round="1"
          :already-submitted="alreadySubmitted"
          :submitting="submitting"
          :disabled="expiredByClock"
          @remove="removePick"
          @move="movePick"
          @update-note="updateNote"
          @submit="submitPicks"
        />
      </template>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Back, Document } from '@element-plus/icons-vue';
import MenuComponent from '../components/MenuComponent.vue';
import { DewButton, DewButtonBar, DewCard, DewSkeleton } from '@bme/dew-ui';
import MsPhaseBar from '../components/Camp/MsPhaseBar.vue';
import MsMentorCard from '../components/Camp/MsMentorCard.vue';
import MsPreferenceTray from '../components/Camp/MsPreferenceTray.vue';
import { campService } from '../services/campService';
import marketPoster from '../assets/mentor-market-poster.webp';

const store = useStore();
const route = useRoute();
const router = useRouter();
const isDarkMode = computed(() => store.getters.isDarkMode);
const sid = Number(route.params.sid);

const checking = ref(true);
const guardMsg = ref('');
const loading = ref(true);
const phaseInfo = ref(null);
const mentors = ref([]);
const activeTag = ref('all');
const picks = ref([]);
const favoriteIds = ref([]);
const favoritePending = ref([]);
const favoritesLoading = ref(true);
const favoritesError = ref(false);
const rulesVisible = ref(false);
const submitting = ref(false);
const nowTs = ref(Date.now());
let countdownTimer = null;
let statsTimer = null;
let browseRolloverFired = false;

const open = computed(() => phaseInfo.value?.me?.submittable_round === 1);
const submittable = computed(() => phaseInfo.value?.me?.submittable_round === 1);
// 浏览期：已入营学员可逛市集/收藏，志愿开始前不能选人（开放报名 → 志愿开始 的只读窗口）
const browsing = computed(() => phaseInfo.value?.phase === 'upcoming');
const meRound1 = computed(() => phaseInfo.value?.me?.round1 || []);
const alreadySubmitted = computed(() => submittable.value && meRound1.value.length > 0);

const parseDateTime = (text) => {
  if (!text) return null;
  const timestamp = new Date(text.replace(' ', 'T')).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};
const deadlineMs = computed(() => parseDateTime(phaseInfo.value?.deadlines?.preference_deadline));
const openAtText = computed(() => phaseInfo.value?.deadlines?.preference_start || '');
const openAtMs = computed(() => parseDateTime(openAtText.value));
const expiredByClock = computed(() => deadlineMs.value !== null && deadlineMs.value <= nowTs.value);
const countdownText = computed(() => {
  const targetMs = browsing.value ? openAtMs.value : deadlineMs.value;
  if (targetMs === null) return '待定';
  const secondsLeft = Math.max(0, Math.floor((targetMs - nowTs.value) / 1000));
  if (secondsLeft <= 0) return browsing.value ? '即将开启' : '已截止';
  if (secondsLeft > 48 * 3600) {
    const days = Math.floor(secondsLeft / 86400);
    return `${days}天 ${Math.floor((secondsLeft % 86400) / 3600)}小时`;
  }
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  return `${hours}小时 ${minutes}分 ${seconds}秒`;
});
const availableMentors = computed(() => mentors.value);
const tagItems = computed(() => [
  { value: 'all', label: '全部' },
  ...(phaseInfo.value?.ms_tags || []).map((tag) => ({ value: tag, label: tag })),
]);
const filteredMentors = computed(() => (activeTag.value === 'all'
  ? availableMentors.value
  : availableMentors.value.filter((mentor) => mentor.tags?.includes(activeTag.value)))
  .slice().sort((a, b) => Number(favoriteIds.value.includes(b.user_id)) - Number(favoriteIds.value.includes(a.user_id))));
const mentorNames = computed(() => Object.fromEntries(
  mentors.value.map((mentor) => [mentor.user_id, mentor.username])));
const selectionLocked = computed(() => picks.value.length >= 3 || expiredByClock.value);

const closedText = computed(() => {
  const phase = phaseInfo.value;
  if (!phase) return '';
  if (phase.me?.my_mentor) return '你已匹配到导生';
  if (phase.phase === 'done') return '本轮市集已收摊';
  return '市集暂不营业';
});
const closedHint = computed(() => {
  const phase = phaseInfo.value;
  if (!phase) return '';
  if (phase.me?.my_mentor) return '回工作台「选导生」查看你的导生卡片';
  if (phase.phase === 'done') return meRound1.value.length
    ? '志愿已截止，老师正在协调分配，结果在工作台公布'
    : '选导生已结束';
  return '';
});

const rankOf = (mentorId) => picks.value.findIndex((pick) => pick.mentor_id === mentorId) + 1;

function addPick(mentor) {
  if (!submittable.value || expiredByClock.value) return;
  if (picks.value.some((pick) => pick.mentor_id === mentor.user_id)) return;
  if (mentor.full) { ElMessage.warning('该导生名额已满'); return; }
  if (picks.value.length >= 3) { ElMessage.warning('最多选择 3 位心仪导生'); return; }
  picks.value.push({ mentor_id: mentor.user_id, note: '' });
}
const removePick = (index) => picks.value.splice(index, 1);
function movePick(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= picks.value.length) return;
  [picks.value[index], picks.value[target]] = [picks.value[target], picks.value[index]];
}
const updateNote = (index, value) => { if (picks.value[index]) picks.value[index].note = value; };

async function submitPicks() {
  // 09-12 放宽：1-3 位均可提交（与托盘 canSubmit/后端 1≤n≤3 同口径），仅空选拦截
  if (!picks.value.length || expiredByClock.value) {
    ElMessage.warning('请先选择至少 1 位心仪导生');
    return;
  }
  submitting.value = true;
  try {
    await campService.submitMsPreferences(
      sid,
      picks.value.map((pick) => ({ mentor_id: pick.mentor_id, note: pick.note || '' })),
    );
    ElMessage.success('志愿已提交，截止前可修改');
    await load();
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '提交失败');
    if (error.response?.status === 400 || error.response?.status === 403) await load();
  } finally {
    submitting.value = false;
  }
}

async function loadFavorites() {
  favoritesLoading.value = true;
  try {
    const data = await campService.fetchMsFavorites(sid);
    if (!Array.isArray(data.mentor_ids)) throw new Error('Invalid favorites response');
    favoriteIds.value = data.mentor_ids;
    favoritesError.value = false;
  } catch {
    favoritesError.value = true;
  } finally {
    favoritesLoading.value = false;
  }
}

async function toggleFavorite(mentorId) {
  if (favoritesLoading.value || favoritesError.value || expiredByClock.value || favoritePending.value.includes(mentorId)) return;
  const favorited = !favoriteIds.value.includes(mentorId);
  favoritePending.value.push(mentorId);
  try {
    await campService.setMsFavorite(sid, mentorId, favorited);
    favoriteIds.value = favoriteIds.value.filter(id => id !== mentorId);
    if (favorited) favoriteIds.value.push(mentorId);
  } catch (error) {
    ElMessage.error(error.response?.data?.message || '收藏保存失败，请重试');
  } finally {
    favoritePending.value = favoritePending.value.filter(id => id !== mentorId);
  }
}

async function load() {
  loading.value = true;
  try {
    const [phase, mentorData] = await Promise.all([
      campService.fetchMsPhase(sid),
      campService.fetchMsMentors(sid).catch(() => ({ mentors: [] })),
    ]);
    phaseInfo.value = phase;
    mentors.value = mentorData.mentors || [];
    if (phase.me?.submittable_round === 1) {
      const previous = phase.me.round1 || [];
      picks.value = previous.map((pick) => ({ mentor_id: pick.mentor_id, note: pick.note || '' }));
    } else {
      picks.value = [];
    }
    if (!tagItems.value.some((item) => item.value === activeTag.value)) activeTag.value = 'all';
    browseRolloverFired = false;
  } catch {
    ElMessage.error('加载团购导生信息失败');
  } finally {
    loading.value = false;
  }
}

async function refreshPhaseStats() {
  try {
    phaseInfo.value = await campService.fetchMsPhase(sid);
  } catch {
    // 后台播报刷新失败不打断当前选择，下一轮轮询继续恢复。
  }
}

function startLiveUpdates() {
  countdownTimer = window.setInterval(() => {
    nowTs.value = Date.now();
    // 浏览期到点（志愿开始时刻过钟）：立即拉新阶段+志愿切收集态，不等 30s 轮询
    if (browsing.value && openAtMs.value !== null && openAtMs.value <= nowTs.value
        && !browseRolloverFired) {
      browseRolloverFired = true;
      load();
    }
  }, 1000);
  statsTimer = window.setInterval(refreshPhaseStats, 30_000);
}
function stopLiveUpdates() {
  window.clearInterval(countdownTimer);
  window.clearInterval(statsTimer);
}

const backToCamp = () => router.push({ path: '/camp', query: { tab: 'ms', sid } });

onMounted(async () => {
  try {
    const data = await campService.fetchSessions();
    const camp = (data.sessions || []).find((session) => session.id === sid && session.is_member);
    if (!camp) {
      guardMsg.value = '你还不是这个营期的成员';
      router.replace('/camp');
      return;
    }
    // 身份解耦后无全局学员角色：志愿收集面向本营学员（my_role=student），导生走工作台名片侧
    if (camp.my_role !== 'student') {
      guardMsg.value = '团购导生面向学员开放';
      router.replace({ path: '/camp', query: { tab: 'ms', sid } });
      return;
    }
    if (!camp.mentor_selection_enabled) {
      guardMsg.value = '这个营期没有开启团购导生';
      router.replace({ path: '/camp', query: { sid } });
      return;
    }
    await load();
    await loadFavorites();
    startLiveUpdates();
  } catch {
    guardMsg.value = '加载营期信息失败，请稍后再试';
  } finally {
    checking.value = false;
  }
});
onUnmounted(stopLiveUpdates);
</script>

<style scoped>
.camp-market { min-height: 100vh; }
.market-wrap {
  --market-leaf: color-mix(in srgb, var(--color-success) 65%, var(--color-warning));
  --color-primary: color-mix(in srgb, var(--market-leaf) 72%, var(--dew-text-heading));
  --color-primary-hover: color-mix(in srgb, var(--market-leaf) 55%, var(--dew-text-heading));
  --color-info: color-mix(in srgb, var(--color-warning) 55%, var(--color-success));
  --dew-card-border: color-mix(in srgb, var(--market-leaf) 14%, transparent);
}
.market-browser :deep(.fallback-info) {
  --fallback-color: var(--color-info);
}
.top-space { height: 60px; }
.market-wrap { max-width: 1280px; margin: 0 auto; padding: 24px 24px 220px; }
.market-loading { padding: 8px 0; }

.market-poster { position: relative; padding-bottom: 38px; }
.poster-art {
  display: block;
  width: 100%;
  margin: 0 auto;
  padding: 0;
  border: 0;
  background: transparent;
}
.poster-art img {
  display: block;
  width: 100%;
  height: auto;
}
.poster-tools { position: absolute; inset: 14px 12px auto; display: flex; justify-content: space-between; align-items: center; gap: 12px; pointer-events: none; z-index: 1; }
.poster-tools > button { pointer-events: auto; }
.poster-back {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  gap: 7px;
  padding: 0 13px 0 7px;
  border: 2px solid var(--dew-card-flat-bg);
  border-radius: var(--radius-full);
  color: var(--color-primary);
  background: var(--dew-card-flat-bg);
  box-shadow: 0 5px 0 var(--color-primary-hover), 0 10px 20px color-mix(in srgb, var(--dew-text-heading) 22%, transparent);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transform: rotate(-2deg);
  transition: transform 0.2s var(--dew-bounce, ease), box-shadow 0.2s ease;
}
.back-icon { display: grid; width: 24px; height: 24px; place-items: center; border-radius: var(--radius-full); color: var(--dew-text-on-primary, white); background: var(--color-primary); }
.poster-back:hover { transform: translateY(-2px) rotate(-2deg); }
.poster-back:active { transform: translateY(2px) rotate(-2deg); box-shadow: 0 2px 0 var(--color-primary-hover); }
.poster-float { position: absolute; right: 18px; bottom: 46px; max-width: calc(100% - 36px); }
.live-ticker {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  padding: 0 17px;
  border: 2px solid var(--dew-card-flat-bg);
  border-radius: var(--radius-full);
  color: var(--dew-text-heading);
  background: var(--dew-card-flat-bg);
  box-shadow: 0 4px 0 color-mix(in srgb, var(--color-warning) 76%, var(--dew-card-flat-bg)), 0 10px 20px color-mix(in srgb, var(--dew-text-heading) 20%, transparent);
  font-size: 13px;
  font-weight: 800;
}
.ticker-label { font-size: 14px; }
.ticker-sub { margin-left: 8px; font-size: 12px; font-weight: 600; color: var(--dew-text-muted); }
.live-ticker strong { color: var(--color-warning); font-size: 15px; font-weight: 900; font-variant-numeric: tabular-nums; }
.head-tool {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid var(--dew-card-border);
  border-radius: var(--radius-md);
  color: var(--dew-text-heading);
  background: var(--dew-card-flat-bg);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.head-tool:hover { border-color: color-mix(in srgb, var(--market-leaf) 45%, var(--dew-card-border)); color: var(--color-primary); }
.rules { display: grid; gap: 18px; }
.rules-dialog { padding: 4px 2px 8px; }
.rule { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
.rule-num {
  display: grid;
  width: 28px;
  height: 28px;
  flex: none;
  place-items: center;
  border-radius: var(--radius-full);
  color: color-mix(in srgb, var(--color-warning) 78%, var(--dew-text-heading));
  background: color-mix(in srgb, var(--color-warning) 22%, transparent);
  font-size: 12px;
  font-weight: 800;
}
.rule b { color: var(--dew-text-heading); font-size: 13px; }
.rule p { margin: 4px 0 0; color: var(--dew-text-muted); font-size: 12px; line-height: 1.5; }

.market-browser { position: relative; margin-top: -20px; }
.market-toolbar {
  position: sticky;
  z-index: 8;
  top: 64px;
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  padding: 14px 16px;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
}
.favorites-error { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; color: var(--dew-text-muted); font-size: 13px; }
.favorites-error button { border: 0; background: transparent; color: var(--color-primary); cursor: pointer; }
.market-filter-scroll { min-width: 0; overflow-x: auto; scrollbar-width: none; }
.market-filter-scroll::-webkit-scrollbar { display: none; }
.market-filter { width: max-content; }
.market-count { display: flex; flex: none; align-items: baseline; gap: 4px; color: var(--dew-text-heading); font-size: 13px; white-space: nowrap; }
.market-count strong { color: var(--color-primary); font-size: 18px; font-variant-numeric: tabular-nums; }
.market-count span { margin-left: 5px; color: var(--dew-text-muted); font-size: 12px; }
.market-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(252px, 1fr));
  align-items: stretch;
  gap: 24px 20px;
}
.ms-empty { padding: 60px 0; color: var(--dew-text-muted); font-size: 13px; text-align: center; }
.market-closed { margin-top: 24px; }
.closed-label { margin: 14px 0 4px; color: var(--dew-text-heading); font-size: 17px; font-weight: 700; }
.closed-hint { margin-bottom: 14px; color: var(--dew-text-muted); font-size: 13px; line-height: 1.6; }

@media (prefers-reduced-motion: reduce) {
  .poster-back { transition: none; }
}
@media (max-width: 760px) {
  .market-wrap { padding: 16px 12px 112px; }
  .poster-tools { position: relative; inset: auto; margin: 0 4px 16px; }
  .poster-back { min-height: 34px; font-size: 12px; }
  .market-poster { padding-bottom: 64px; }
  .poster-float { right: 4px; bottom: 12px; }
  .market-browser { margin-top: 0; }
  .live-ticker { min-height: 38px; padding: 0 12px; }
  .live-ticker strong { font-size: 13px; }
  .head-tool { min-height: 34px; padding: 0 9px; font-size: 12px; }
  .market-toolbar { top: 58px; gap: 10px; margin-bottom: 20px; padding: 10px; }
  .market-count { flex-direction: column; align-items: flex-end; gap: 0; }
  .market-count strong { font-size: 16px; }
  .market-count span { margin-left: 0; font-size: 11px; }
  .market-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px 12px; }
}
@media (max-width: 430px) {
  .market-grid { grid-template-columns: 1fr; }
}
</style>
