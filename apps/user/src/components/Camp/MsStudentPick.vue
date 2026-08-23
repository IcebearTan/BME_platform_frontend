<template>
  <div class="ms-student-pick">
    <DewCard v-if="loading" variant="default" size="lg" :no-hover="true">
      <div v-loading="true" class="ms-loading"></div>
    </DewCard>

    <template v-else-if="phaseInfo">
      <DewCard variant="default" size="lg" :no-hover="true" class="section-card">
        <MsPhaseBar :phase="phaseInfo.phase" :round2-enabled="phaseInfo.round2_enabled" />
        <div class="phase-caption">{{ phaseCaption }}</div>
      </DewCard>

      <!-- 已有归属 / 已出结果：海报式结果卡（照片 + 标签 + 我的志愿留言回显） -->
      <DewCard
        v-if="phaseInfo.me.my_mentor"
        variant="default" size="lg" :no-hover="true" tinted accent="success" class="section-card"
      >
        <div class="result-poster-row">
          <div class="result-poster">
            <img v-if="myMentorAvatar" :src="myMentorAvatar" :alt="`${phaseInfo.me.my_mentor.username} 的照片`" />
            <span v-else class="result-poster-fallback">
              {{ (phaseInfo.me.my_mentor.username || '?').charAt(0) }}
            </span>
          </div>
          <div class="result-body">
            <div class="result-label">我的导生</div>
            <div class="result-name">{{ phaseInfo.me.my_mentor.username }}</div>
            <div v-if="myMentorTags.length" class="result-tags">
              <DewTag v-for="t in myMentorTags" :key="t" size="sm" round>{{ t }}</DewTag>
            </div>
            <p v-if="myMentorNote" class="result-note">“{{ myMentorNote }}”</p>
            <div class="result-hint">导生同样能看到你的信息，营期内可在「请假」等页面协作</div>
          </div>
        </div>
      </DewCard>
      <DewCard
        v-else-if="phaseInfo.phase === 'done'"
        variant="default" size="lg" :no-hover="true" class="section-card"
      >
        <div class="result-label">选导生已结束</div>
        <div class="result-hint">你本轮未被匹配，老师会在开营前为你指派导生，请留意通知。</div>
      </DewCard>

      <!-- 一轮挑选中：等待 -->
      <DewCard v-else-if="phaseInfo.phase === 'round1'" variant="default" size="lg" :no-hover="true" class="section-card">
        <div class="result-label">导生正在挑选</div>
        <div class="result-hint">
          {{ submittedText ? `${submittedText}，` : '' }}你提交了 {{ meRound1.length }} 个志愿，导生正按顺序收人。
          {{ phaseInfo.round2_enabled ? `若一轮未被选中，${phaseInfo.deadlines.round2_deadline || ''} 前可参加二轮互选。` : '本轮未选中将由老师指派。' }}
        </div>
      </DewCard>

      <!-- 浏览 + 提交志愿（collecting / round2 未匹配） -->
      <template v-else-if="submittable">
        <div v-if="phaseInfo.phase === 'round2'" class="round2-note">
          二轮互选：仅在仍有名额的导生中重新提交志愿
        </div>

        <DewButtonBar v-model="activeTag" :items="tagItems" style="margin-bottom: 14px;" />

        <div v-if="!filteredMentors.length" class="ms-empty">
          {{ phaseInfo.phase === 'round2' ? '没有可选的导生了（均已满员）' : '暂无导生发布名片' }}
        </div>
        <div v-else class="mentor-grid">
          <MsMentorCard
            v-for="(m, i) in filteredMentors"
            :key="m.user_id"
            :mentor="m"
            :picked-rank="rankOf(m.user_id)"
            :selectable="true"
            :index="i"
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

      <!-- 未开始 -->
      <DewCard v-else-if="phaseInfo.phase === 'upcoming'" variant="default" size="lg" :no-hover="true" class="section-card">
        <div class="result-label">选导生即将开始</div>
        <div class="result-hint">{{ phaseInfo.deadlines.preference_start || '' }} 起可浏览导生名片并提交志愿，届时会有通知。</div>
      </DewCard>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { DewCard, DewButtonBar, DewTag } from '../ui';
import MsPhaseBar from './MsPhaseBar.vue';
import MsMentorCard from './MsMentorCard.vue';
import MsPreferenceTray from './MsPreferenceTray.vue';
import { campService, assetUrl } from '../../services/campService';

const props = defineProps({ sid: { type: [Number, String], required: true } });

const loading = ref(true);
const phaseInfo = ref(null);
const mentors = ref([]);
const activeTag = ref('all');
const picks = ref([]);          // [{mentor_id, note}]
const submitting = ref(false);

const meRound1 = computed(() => phaseInfo.value?.me?.round1 || []);
const submittable = computed(() => phaseInfo.value?.me?.submittable_round || null);
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

const myMentorAvatar = computed(() => {
  const mine = phaseInfo.value?.me?.my_mentor;
  if (!mine) return '';
  const m = mentors.value.find((x) => x.user_id === mine.user_id);
  return m ? assetUrl(m.photo_url || m.avatar || '') : '';
});

// 我的导生的标签（从 mentors 列表查，phase 只回 user_id/username）
const myMentorTags = computed(() => {
  const mine = phaseInfo.value?.me?.my_mentor;
  if (!mine) return [];
  return mentors.value.find((x) => x.user_id === mine.user_id)?.tags || [];
});

// 留言回显：匹配成功的那条志愿（一轮/二轮）里的 note
const myMentorNote = computed(() => {
  const me = phaseInfo.value?.me;
  if (!me?.my_mentor) return '';
  const prefs = [...(me.round1 || []), ...(me.round2 || [])];
  return prefs.find((p) => p.mentor_id === me.my_mentor.user_id)?.note || '';
});

// 从众信号：本轮已交志愿的去重学员数 / 营内学员总数（后端 phase.stats）
const submittedText = computed(() => {
  const s = phaseInfo.value?.stats;
  if (!s || !s.students) return '';
  return `已有 ${s.submitted}/${s.students} 位同学提交志愿`;
});

const phaseCaption = computed(() => {
  const p = phaseInfo.value;
  if (!p) return '';
  if (p.phase === 'collecting')
    return `浏览导生名片，提交 3 个有序志愿 · ${p.deadlines.preference_deadline || ''} 截止${submittedText.value ? ` · ${submittedText.value}` : ''}`;
  if (p.phase === 'round1') return '志愿收集完毕，导生正在挑选';
  if (p.phase === 'round2') return `二轮互选进行中 · ${p.deadlines.round2_deadline || ''} 截止`;
  if (p.phase === 'done') return '选导生结束，结果已公布';
  if (p.phase === 'upcoming') return '导生正在准备名片';
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
      props.sid, picks.value.map((p) => ({ mentor_id: p.mentor_id, note: p.note || '' })));
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
      campService.fetchMsPhase(props.sid),
      campService.fetchMsMentors(props.sid).catch(() => ({ mentors: [] })),
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
    ElMessage.error('加载选导生信息失败');
  } finally {
    loading.value = false;
  }
}

watch(() => props.sid, load, { immediate: true });
</script>

<style scoped>
.ms-student-pick { display: flex; flex-direction: column; gap: 16px; }

.section-card { width: 100%; }
.ms-loading { min-height: 160px; }

.phase-caption {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--dew-card-flat-border, rgba(0, 0, 0, 0.08));
  font-size: 12.5px;
  color: var(--dew-text-muted);
}

.round2-note {
  padding: 8px 14px;
  border-radius: var(--radius-md, 12px);
  font-size: 13px;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
}

.mentor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(224px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.ms-empty {
  padding: 40px 0;
  text-align: center;
  font-size: 13px;
  color: var(--dew-text-muted);
}

/* 海报式结果卡：左海报右信息 */
.result-poster-row { display: flex; gap: 20px; align-items: stretch; }
.result-poster {
  flex-shrink: 0;
  width: 148px;
  aspect-ratio: 4 / 5;
  border-radius: var(--radius-md, 12px);
  overflow: hidden;
  background: linear-gradient(135deg, var(--color-primary), var(--color-info));
}
.result-poster img { width: 100%; height: 100%; object-fit: cover; display: block; }
.result-poster-fallback {
  display: flex; align-items: center; justify-content: center;
  height: 100%;
  font-size: 44px; font-weight: 700; color: rgba(255, 255, 255, 0.95);
}
.result-body { min-width: 0; flex: 1; }
.result-label { font-size: 12px; letter-spacing: 1px; color: var(--dew-text-faint); margin-bottom: 6px; }
.result-name { font-size: 24px; font-weight: 700; color: var(--dew-text-heading); }
.result-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.result-note {
  margin: 12px 0 0;
  padding: 8px 12px;
  border-left: 2px solid color-mix(in srgb, var(--color-success) 55%, transparent);
  font-size: 13px; line-height: 1.6;
  color: var(--dew-text-muted);
  background: color-mix(in srgb, var(--color-success) 6%, transparent);
  border-radius: 0 var(--radius-md, 12px) var(--radius-md, 12px) 0;
}
.result-hint { margin-top: 12px; font-size: 13px; color: var(--dew-text-muted); line-height: 1.6; }
</style>
