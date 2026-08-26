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
            <div class="result-actions">
              <DewButton type="ghost" size="sm" @click="gratitudeVisible = true">写封感谢信</DewButton>
            </div>
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

      <!-- 收集期 / 二轮未匹配：状态 + 市集入口（浏览与提交住在 /camp/:sid/market） -->
      <DewCard
        v-else-if="submittable" variant="default" size="lg" :no-hover="true"
        :tinted="!alreadySubmitted" :accent="alreadySubmitted ? null : 'primary'" class="section-card"
      >
        <!-- 未交志愿：大 CTA -->
        <template v-if="!alreadySubmitted">
          <div class="cta-label">{{ submittable === 2 ? '二轮互选 · 重新提交志愿' : '选导生进行中' }}</div>
          <div class="cta-title">去逛导生市集，交出你的 3 个志愿</div>
          <div class="cta-meta">
            <span v-if="trayDeadline">{{ trayDeadline }} 截止</span>
            <span v-if="trayDeadline && submittedText"> · </span>
            <span v-if="submittedText">{{ submittedText }}</span>
          </div>
          <DewButton type="glass" @click="goMarket">进入团购导生</DewButton>
        </template>

        <!-- 已交志愿：回显（真相源 phase 接口）+ 再逛逛 -->
        <template v-else>
          <div class="cta-label">已提交 {{ submittedPicks.length }} 个志愿 · 截止前可在市集整组修改</div>
          <div class="pick-list">
            <div v-for="(p, i) in submittedPicks" :key="p.mentor_id" class="pick-row">
              <span class="pick-rank">{{ i + 1 }}</span>
              <span class="pick-name">{{ mentorNames[p.mentor_id] || `导生#${p.mentor_id}` }}</span>
              <span v-if="p.note" class="pick-note">“{{ p.note }}”</span>
            </div>
          </div>
          <div class="cta-meta" v-if="trayDeadline">截止 {{ trayDeadline }}</div>
          <DewButton type="ghost" @click="goMarket">再逛逛 · 修改志愿</DewButton>
        </template>
      </DewCard>

      <!-- 未开始 -->
      <DewCard v-else-if="phaseInfo.phase === 'upcoming'" variant="default" size="lg" :no-hover="true" class="section-card">
        <div class="result-label">选导生即将开始</div>
        <div class="result-hint">{{ phaseInfo.deadlines.preference_start || '' }} 起可浏览导生名片并提交志愿，届时会有通知。</div>
      </DewCard>
    </template>

    <!-- 感谢信：给我的导生（信件独立成表，营期仅作展示上下文） -->
    <GratitudeDialog
      v-model="gratitudeVisible"
      :recipient="myMentorRecipient"
      :camp-session-id="sid"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { DewCard, DewButton, DewTag } from '@bme/dew-ui';
import MsPhaseBar from './MsPhaseBar.vue';
import GratitudeDialog from '../Gratitude/GratitudeDialog.vue';
import { campService, assetUrl } from '../../services/campService';

const props = defineProps({ sid: { type: [Number, String], required: true } });
const router = useRouter();

const loading = ref(true);
const phaseInfo = ref(null);
const mentors = ref([]);
const gratitudeVisible = ref(false);

const meRound1 = computed(() => phaseInfo.value?.me?.round1 || []);
const submittable = computed(() => phaseInfo.value?.me?.submittable_round || null);
const alreadySubmitted = computed(() => {
  if (!phaseInfo.value || !submittable.value) return false;
  const list = submittable.value === 1 ? meRound1.value : (phaseInfo.value.me.round2 || []);
  return list.length > 0;
});
const submittedPicks = computed(() => (
  submittable.value === 1 ? meRound1.value : (phaseInfo.value.me?.round2 || [])));

const trayDeadline = computed(() => {
  const d = phaseInfo.value?.deadlines;
  if (!d) return '';
  return submittable.value === 2 ? d.round2_deadline : d.preference_deadline;
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

// 感谢信收件人：我的导生（供 GratitudeDialog 使用）
const myMentorRecipient = computed(() => {
  const mine = phaseInfo.value?.me?.my_mentor;
  if (!mine) return { user_id: null, username: '', avatar: '' };
  return { user_id: mine.user_id, username: mine.username, avatar: myMentorAvatar.value };
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

const goMarket = () => router.push(`/camp/${props.sid}/market`);

async function load() {
  loading.value = true;
  try {
    const [ph, ms] = await Promise.all([
      campService.fetchMsPhase(props.sid),
      campService.fetchMsMentors(props.sid).catch(() => ({ mentors: [] })),
    ]);
    phaseInfo.value = ph;
    mentors.value = ms.mentors || [];
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

/* ── 市集入口卡：未交 = 大 CTA；已交 = 志愿回显 ── */
.cta-label { font-size: 12px; letter-spacing: 1px; color: var(--dew-text-faint); }
.cta-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--dew-text-heading);
  margin: 8px 0 10px;
  line-height: 1.4;
}
.cta-meta { font-size: 13px; color: var(--dew-text-muted); margin-bottom: 16px; }

.pick-list { display: flex; flex-direction: column; gap: 8px; margin: 12px 0 4px; }
.pick-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: var(--radius-md, 12px);
  background: var(--dew-card-flat-bg, rgba(0, 0, 0, 0.03));
}
.pick-rank {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  background: var(--color-primary);
  color: #fff;
}
.pick-name { font-size: 13.5px; font-weight: 600; color: var(--dew-text); }
.pick-note {
  font-size: 12.5px;
  color: var(--dew-text-muted);
  margin-left: auto;
  max-width: 46%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.result-actions { margin-top: 14px; }
</style>
