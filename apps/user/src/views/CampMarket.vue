<template>
  <div :class="['camp-market', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
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

      <div v-else-if="!open" class="market-closed">
        <DewCard variant="inset" size="lg" :no-hover="true">
          <MsPhaseBar :phase="phaseInfo.phase" :round2-enabled="phaseInfo.round2_enabled" />
          <div class="closed-label">{{ closedText }}</div>
          <div v-if="closedHint" class="closed-hint">{{ closedHint }}</div>
          <DewButton type="glass" @click="backToCamp">回工作台看状态</DewButton>
        </DewCard>
      </div>

      <template v-else>
        <section class="market-poster" aria-label="导生集市活动海报">
          <button type="button" class="poster-back" @click="backToCamp">
            <span class="back-icon"><el-icon><Back /></el-icon></span>
            <span>返回</span>
          </button>
          <img :src="marketPoster" alt="导生集市活动海报" />
          <div class="poster-float" aria-live="polite">
            <Transition name="ticker" mode="out-in">
              <div :key="tickerMode" class="live-ticker" :class="{ attendance: tickerMode === 1 }">
                <template v-if="tickerMode === 0">
                  <span class="ticker-label">截止时间：</span>
                  <strong>{{ countdownText }}</strong>
                </template>
                <strong v-else>{{ submittedText }}</strong>
              </div>
            </Transition>
          </div>
        </section>

        <section class="rule-panel" aria-labelledby="market-rules-title">
          <div class="rule-head"><strong id="market-rules-title">集市规则</strong></div>
          <div class="rules">
            <div class="rule">
              <span class="rule-num">1</span>
              <div><b>选 3 个志愿</b><p>按你最想去的顺序排列第一、第二、第三志愿。</p></div>
            </div>
            <div class="rule">
              <span class="rule-num">2</span>
              <div><b>双方互选</b><p>导生按顺序挑选，双方互选后完成匹配。</p></div>
            </div>
            <div class="rule">
              <span class="rule-num">3</span>
              <div><b>截止前可修改</b><p>修改时整组替换志愿，以最后一次提交为准。</p></div>
            </div>
          </div>
        </section>

        <section class="market-browser" aria-label="浏览导生名片">
          <DewButtonBar
            v-model="activeTag"
            :items="tagItems"
            badge-mode="active-count"
            class="market-filter"
          />

          <div v-if="!filteredMentors.length" class="ms-empty">
            {{ phaseInfo.phase === 'round2' ? '没有可选的导生了（均已满员）' : '暂无导生发布名片' }}
          </div>
          <div v-else class="market-grid">
            <MsMentorCard
              v-for="(mentor, index) in filteredMentors"
              :key="mentor.user_id"
              :mentor="mentor"
              :picked-rank="rankOf(mentor.user_id)"
              :selectable="true"
              :selection-disabled="selectionLocked"
              :index="index"
              size="lg"
              @add="addPick(mentor)"
            />
          </div>
        </section>

        <MsPreferenceTray
          :picks="picks"
          :mentor-names="mentorNames"
          :round="submittable"
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
import { Back } from '@element-plus/icons-vue';
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
const submitting = ref(false);
const nowTs = ref(Date.now());
const tickerMode = ref(0);
let countdownTimer = null;
let tickerTimer = null;
let statsTimer = null;

const open = computed(() => !!phaseInfo.value?.me?.submittable_round);
const submittable = computed(() => phaseInfo.value?.me?.submittable_round || null);
const meRound1 = computed(() => phaseInfo.value?.me?.round1 || []);
const alreadySubmitted = computed(() => {
  if (!phaseInfo.value || !submittable.value) return false;
  const list = submittable.value === 1 ? meRound1.value : (phaseInfo.value.me.round2 || []);
  return list.length > 0;
});

const activeDeadline = computed(() => {
  const deadlines = phaseInfo.value?.deadlines;
  if (!deadlines) return '';
  return submittable.value === 2 ? deadlines.round2_deadline : deadlines.preference_deadline;
});
const deadlineMs = computed(() => {
  if (!activeDeadline.value) return null;
  const timestamp = new Date(activeDeadline.value.replace(' ', 'T')).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
});
const expiredByClock = computed(() => deadlineMs.value !== null && deadlineMs.value <= nowTs.value);
const countdownText = computed(() => {
  if (deadlineMs.value === null) return '待定';
  const secondsLeft = Math.max(0, Math.floor((deadlineMs.value - nowTs.value) / 1000));
  if (secondsLeft <= 0) return '已截止';
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  return `${hours}小时 ${minutes}分 ${seconds}秒`;
});
const submittedText = computed(() => {
  const stats = phaseInfo.value?.stats;
  if (!stats || stats.students === undefined || stats.submitted === undefined) return '';
  return `已经有 ${stats.submitted}/${stats.students} 位同学上车啦～`;
});

const availableMentors = computed(() => phaseInfo.value?.phase === 'round2'
  ? mentors.value.filter((mentor) => !mentor.full)
  : mentors.value);
const countForTag = (tag) => tag === 'all'
  ? availableMentors.value.length
  : availableMentors.value.filter((mentor) => mentor.tags?.includes(tag)).length;
const tagItems = computed(() => [
  { value: 'all', label: '全部', badge: countForTag('all') },
  ...(phaseInfo.value?.ms_tags || []).map((tag) => ({ value: tag, label: tag, badge: countForTag(tag) })),
]);
const filteredMentors = computed(() => activeTag.value === 'all'
  ? availableMentors.value
  : availableMentors.value.filter((mentor) => mentor.tags?.includes(activeTag.value)));
const mentorNames = computed(() => Object.fromEntries(
  mentors.value.map((mentor) => [mentor.user_id, mentor.username])));
const selectionLocked = computed(() => picks.value.length >= 3 || expiredByClock.value);

const closedText = computed(() => {
  const phase = phaseInfo.value;
  if (!phase) return '';
  if (phase.me?.my_mentor) return '你已匹配到导生';
  if (phase.phase === 'round1') return '导生正在挑选，市集暂停营业';
  if (phase.phase === 'done') return '本轮市集已收摊';
  if (phase.phase === 'upcoming') return '市集尚未开门';
  return '市集暂不营业';
});
const closedHint = computed(() => {
  const phase = phaseInfo.value;
  if (!phase) return '';
  if (phase.me?.my_mentor) return '回工作台「选导生」查看你的导生卡片';
  if (phase.phase === 'round1') return '你提交的志愿正在按顺序被导生收人，结果出来会有通知';
  if (phase.phase === 'done') return phase.me && (meRound1.value.length || (phase.me.round2 || []).length)
    ? '本轮未被匹配，老师会在开营前指派导生'
    : '选导生已结束';
  if (phase.phase === 'upcoming') return `${phase.deadlines.preference_start || ''} 开门，届时可浏览名片并提交志愿`;
  return '';
});

const rankOf = (mentorId) => picks.value.findIndex((pick) => pick.mentor_id === mentorId) + 1;

function addPick(mentor) {
  if (expiredByClock.value) return;
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
  const validCount = submittable.value === 1
    ? picks.value.length === 3
    : picks.value.length >= 1 && picks.value.length <= 3;
  if (!validCount || expiredByClock.value) {
    ElMessage.warning(submittable.value === 1 ? '请选择 3 位心仪导生' : '请至少选择 1 位心仪导生');
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

async function load() {
  loading.value = true;
  try {
    const [phase, mentorData] = await Promise.all([
      campService.fetchMsPhase(sid),
      campService.fetchMsMentors(sid).catch(() => ({ mentors: [] })),
    ]);
    phaseInfo.value = phase;
    mentors.value = mentorData.mentors || [];
    const round = phase.me?.submittable_round;
    if (round) {
      const previous = round === 1 ? phase.me.round1 : phase.me.round2;
      picks.value = (previous || []).map((pick) => ({ mentor_id: pick.mentor_id, note: pick.note || '' }));
      if (round === 2) {
        picks.value = picks.value.filter(
          (pick) => !mentors.value.find((mentor) => mentor.user_id === pick.mentor_id)?.full,
        );
      }
    } else {
      picks.value = [];
    }
    if (!tagItems.value.some((item) => item.value === activeTag.value)) activeTag.value = 'all';
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
  countdownTimer = window.setInterval(() => { nowTs.value = Date.now(); }, 1000);
  tickerTimer = window.setInterval(() => {
    tickerMode.value = submittedText.value ? (tickerMode.value === 0 ? 1 : 0) : 0;
  }, 2000);
  statsTimer = window.setInterval(refreshPhaseStats, 30_000);
}
function stopLiveUpdates() {
  window.clearInterval(countdownTimer);
  window.clearInterval(tickerTimer);
  window.clearInterval(statsTimer);
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
    const camp = (data.sessions || []).find((session) => session.id === sid && session.is_member);
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
    await load();
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
.camp-market { min-height: 100vh; background: transparent; }
.top-space { height: 60px; }
.market-wrap { max-width: 1280px; margin: 0 auto; padding: 24px 24px 220px; }
.market-loading { padding: 8px 0; }

.market-poster {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--dew-card-border);
  border-radius: var(--radius-xl);
  background: var(--dew-card-flat-bg);
  box-shadow: var(--dew-card-shadow);
}
.market-poster > img { display: block; width: 100%; aspect-ratio: 2 / 1; object-fit: cover; }
.poster-back {
  position: absolute;
  z-index: 3;
  top: 18px;
  left: 18px;
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
.back-icon {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: var(--radius-full);
  color: var(--dew-text-on-primary, white);
  background: var(--color-primary);
}
.poster-back:hover { transform: translateY(-2px) rotate(-2deg); }
.poster-back:active { transform: translateY(2px) rotate(-2deg); box-shadow: 0 2px 0 var(--color-primary-hover); }
.poster-float { position: absolute; right: 18px; bottom: 18px; min-width: 215px; }
.live-ticker {
  display: flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 13px;
  border: 1px solid var(--dew-card-border);
  border-radius: var(--radius-md);
  color: var(--dew-text-muted);
  background: var(--dew-card-elevated-bg);
  box-shadow: var(--dew-card-shadow);
  backdrop-filter: blur(16px) saturate(1.35);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.live-ticker strong { color: var(--color-warning); font-variant-numeric: tabular-nums; }
.live-ticker.attendance strong { color: var(--color-primary); }
.ticker-enter-active,
.ticker-leave-active { transition: opacity 0.2s ease, transform 0.2s ease, filter 0.2s ease; }
.ticker-enter-from { opacity: 0; transform: translateY(-5px) scale(0.985); filter: blur(2px); }
.ticker-leave-to { opacity: 0; transform: translateY(5px) scale(0.98); filter: blur(2px); }

.rule-panel {
  margin-top: 18px;
  padding: 14px 16px 15px;
  border: 1px solid var(--dew-card-border);
  border-radius: var(--radius-xl);
  background: var(--dew-card-bg);
  box-shadow: var(--dew-card-shadow);
  backdrop-filter: blur(20px) saturate(1.35);
}
.rule-head { color: var(--dew-text-heading); font-size: 15px; }
.rules { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-top: 12px; }
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

.market-browser { margin-top: 20px; }
.market-filter { max-width: 100%; margin-bottom: 18px; }
.market-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(252px, 1fr));
  align-items: stretch;
  gap: 16px;
}
.ms-empty { padding: 60px 0; color: var(--dew-text-muted); font-size: 13px; text-align: center; }
.market-closed { margin-top: 24px; }
.closed-label { margin: 14px 0 4px; color: var(--dew-text-heading); font-size: 17px; font-weight: 700; }
.closed-hint { margin-bottom: 14px; color: var(--dew-text-muted); font-size: 13px; line-height: 1.6; }

@media (prefers-reduced-motion: reduce) {
  .poster-back,
  .ticker-enter-active,
  .ticker-leave-active { transition: none; }
}
@media (max-width: 980px) {
  .rules { grid-template-columns: 1fr; gap: 12px; }
}
@media (max-width: 760px) {
  .market-wrap { padding: 16px 12px 28px; }
  .market-poster { border-radius: var(--radius-lg); }
  .market-poster > img { aspect-ratio: 1.48 / 1; }
  .poster-back { top: 11px; left: 11px; min-height: 34px; padding-right: 10px; font-size: 12px; }
  .back-icon { width: 21px; height: 21px; }
  .poster-float { right: 10px; bottom: 10px; left: 10px; display: flex; justify-content: flex-end; min-width: 0; }
  .live-ticker { max-width: 100%; min-height: 34px; padding: 0 10px; overflow: hidden; font-size: 11px; text-overflow: ellipsis; }
  .rule-panel { border-radius: var(--radius-lg); }
  .market-filter { overflow-x: auto; }
  .market-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
}
@media (max-width: 430px) {
  .market-poster > img { aspect-ratio: 1.25 / 1; }
  .market-grid { grid-template-columns: 1fr; }
}
</style>
