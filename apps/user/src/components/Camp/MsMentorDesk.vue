<template>
  <div class="ms-mentor-desk">
    <DewCard v-if="loading" variant="default" size="lg" :no-hover="true">
      <div v-loading="true" class="ms-loading"></div>
    </DewCard>

    <template v-else-if="phaseInfo">
      <DewCard variant="default" size="lg" :no-hover="true" class="section-card">
        <MsPhaseBar :phase="phaseInfo.phase" :round2-enabled="phaseInfo.round2_enabled" />
        <div class="phase-caption">{{ deskCaption }}</div>
      </DewCard>

      <!-- 名片（upcoming/collecting 可编辑；锁定后只读展示） -->
      <MsMentorProfile
        v-if="!locked"
        :sid="sid"
        :ms-tags="phaseInfo.ms_tags"
        :locked="false"
        @saved="reloadAll"
      />
      <DewCard v-else-if="profile" variant="default" size="lg" :no-hover="true" class="section-card">
        <template #header>
          <div class="head-row">
            <h3>我的导生名片</h3>
            <span class="head-hint">已锁定</span>
          </div>
        </template>
        <div class="locked-profile">
          <el-avatar :size="56" :src="assetUrl(profile.photo_url)" shape="square">
            {{ (username || '?').charAt(0) }}
          </el-avatar>
          <div class="locked-meta">
            <div class="locked-name">{{ username }}</div>
            <div v-if="profile.tags?.length" class="locked-tags">
              <DewTag v-for="t in profile.tags" :key="t" size="sm" round>{{ t }}</DewTag>
            </div>
            <p class="locked-bio">{{ profile.bio || '（未填写介绍）' }}</p>
          </div>
        </div>
      </DewCard>
      <DewCard v-else variant="default" size="lg" :no-hover="true" class="section-card">
        <div class="result-hint">你未发布名片（本轮对学员不可见）。下个营期记得在志愿期开始前发布。</div>
      </DewCard>

      <!-- 意向单（collecting 预览 / round1/round2 正式收人） -->
      <DewCard
        v-if="phaseInfo.phase === 'collecting' || phaseInfo.phase === 'round1' || phaseInfo.phase === 'round2'"
        variant="default" size="lg" :no-hover="true" class="section-card"
      >
        <template #header>
          <div class="head-row">
            <h3>意向单</h3>
            <span class="head-hint">
              已收 {{ suitorsInfo?.matched ?? 0 }} / {{ suitorsInfo?.capacity ?? 0 }} ·
              {{ suitorsInfo?.preview ? '预览中，志愿截止后开放收人' : (suitorsInfo?.round === 2 ? '二轮' : '一轮') + '选择你的学员' }}
            </span>
          </div>
        </template>

        <div v-if="!suitors.length" class="ms-empty">还没有学员选择你</div>
        <TransitionGroup v-else name="suitor" tag="div" class="suitor-list">
          <div v-for="s in suitors" :key="s.user_id" class="suitor-item" :class="{ taken: s.matched }">
            <el-avatar :size="40" :src="assetUrl(s.avatar)">{{ (s.username || '?').charAt(0) }}</el-avatar>
            <div class="suitor-main">
              <div class="suitor-name-row">
                <span class="suitor-name">{{ s.username }}</span>
                <span class="rank-chip">志愿 {{ s.rank }}</span>
              </div>
              <p v-if="s.note" class="suitor-note">“{{ s.note }}”</p>
            </div>
            <div class="suitor-side">
              <span v-if="s.matched" class="taken-tag">已被 {{ s.matched_mentor_name || '其他导生' }} 收下</span>
              <DewButton
                v-else
                size="sm"
                type="glass"
                :disabled="suitorsInfo?.preview || !canPick"
                @click="pick(s)"
              >
                {{ suitorsInfo?.preview ? '预览' : '收下' }}
              </DewButton>
            </div>
          </div>
        </TransitionGroup>
      </DewCard>

      <!-- 结束后：我的团队 -->
      <DewCard
        v-if="phaseInfo.phase === 'done'"
        variant="default" size="lg" :no-hover="true" class="section-card"
      >
        <template #header>
          <div class="head-row">
            <h3>我的团队</h3>
            <span class="head-hint">{{ matched.length }} 位学员</span>
          </div>
        </template>
        <div v-if="!matched.length" class="ms-empty">本轮没有收到学员</div>
        <div v-else class="team-grid">
          <div v-for="m in matched" :key="m.user_id" class="team-item">
            <el-avatar :size="36" :src="assetUrl(m.avatar)">{{ (m.username || '?').charAt(0) }}</el-avatar>
            <div class="team-meta">
              <span class="team-name">{{ m.username }}</span>
              <span class="team-src">{{ m.source === 'admin' ? '老师指派' : (m.round === 2 ? '二轮互选' : '一轮互选') }}</span>
            </div>
          </div>
        </div>
      </DewCard>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import { DewCard, DewButton, DewTag } from '../ui';
import MsPhaseBar from './MsPhaseBar.vue';
import MsMentorProfile from './MsMentorProfile.vue';
import { campService, assetUrl } from '../../services/campService';

const props = defineProps({ sid: { type: [Number, String], required: true } });

const store = useStore();
const username = computed(() => store.state.user?.username || '');

const loading = ref(true);
const phaseInfo = ref(null);
const suitorsInfo = ref(null);   // {round, preview, capacity, matched, remaining}
const suitors = ref([]);
const matched = ref([]);

const profile = computed(() => phaseInfo.value?.me?.profile || null);
const locked = computed(() => phaseInfo.value?.me?.profile_locked ?? true);
const canPick = computed(() =>
  (suitorsInfo.value?.remaining ?? 0) > 0 && !suitorsInfo.value?.preview);

const deskCaption = computed(() => {
  const p = phaseInfo.value;
  if (!p) return '';
  if (p.phase === 'upcoming') return `完善名片，${p.deadlines.preference_start || ''} 起学员可见`;
  if (p.phase === 'collecting') return `学员正在提交志愿 · ${p.deadlines.preference_deadline || ''} 截止后开始收人`;
  if (p.phase === 'round1') return `一轮挑选 · ${p.deadlines.round1_deadline || ''} 截止`;
  if (p.phase === 'round2') return `二轮互选 · ${p.deadlines.round2_deadline || ''} 截止`;
  if (p.phase === 'done') return '选导生结束';
  return '';
});

async function pick(s) {
  try {
    const r = await campService.msPickStudent(props.sid, s.user_id);
    ElMessage.success(`已收下 ${s.username}（${r.matched_count}/${suitorsInfo.value.capacity}）`);
    await reloadAll();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '收下失败');
    // 常见：刚被别人收走 / 名额刚满 / 窗口切换 —— 重拉
    await reloadAll();
  }
}

async function reloadAll() {
  const sid = props.sid;
  try {
    const ph = await campService.fetchMsPhase(sid);
    if (sid !== props.sid) return;   // 切营防串台
    phaseInfo.value = ph;
    if (['collecting', 'round1', 'round2'].includes(ph.phase)) {
      const su = await campService.fetchMsSuitors(sid).catch(() => null);
      if (sid !== props.sid) return;
      if (su && su.code === 200) {
        suitorsInfo.value = su;
        suitors.value = su.suitors || [];
      } else {
        suitorsInfo.value = null;
        suitors.value = [];
      }
    } else {
      suitorsInfo.value = null;
      suitors.value = [];
    }
    const mm = await campService.fetchMsMatched(sid).catch(() => null);
    if (sid !== props.sid) return;
    matched.value = (mm && mm.matched) || [];
  } finally {
    loading.value = false;
  }
}

watch(() => props.sid, () => { loading.value = true; reloadAll(); }, { immediate: true });
</script>

<style scoped>
.ms-mentor-desk { display: flex; flex-direction: column; gap: 16px; }

.section-card { width: 100%; }
.ms-loading { min-height: 160px; }

.phase-caption {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--dew-card-flat-border, rgba(0, 0, 0, 0.08));
  font-size: 12.5px;
  color: var(--dew-text-muted);
}

.head-row { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.head-row h3 { margin: 0; font-size: 16px; font-weight: 600; }
.head-hint { font-size: 12px; color: var(--dew-text-muted); }

.ms-empty {
  padding: 30px 0;
  text-align: center;
  font-size: 13px;
  color: var(--dew-text-muted);
}

/* 名片锁定态 */
.locked-profile { display: flex; gap: 14px; }
.locked-meta { min-width: 0; }
.locked-name { font-size: 15px; font-weight: 600; color: var(--dew-text-heading); }
.locked-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.locked-bio {
  margin: 8px 0 0;
  font-size: 12.5px;
  color: var(--dew-text-muted);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 意向单（订单式列表） */
.suitor-list { display: flex; flex-direction: column; gap: 10px; }
.suitor-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md, 12px);
  background: var(--dew-card-flat-bg, rgba(0, 0, 0, 0.03));
  transition: transform 0.25s var(--dew-bounce, ease);
}
.suitor-item:hover { transform: translateX(3px); }
.suitor-item.taken { opacity: 0.55; }

.suitor-main { flex: 1; min-width: 0; }
.suitor-name-row { display: flex; align-items: center; gap: 8px; }
.suitor-name { font-size: 14px; font-weight: 600; color: var(--dew-text); }
.rank-chip {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 999px;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}
.suitor-note {
  margin: 4px 0 0;
  font-size: 12.5px;
  color: var(--dew-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.suitor-side { flex: none; }
.taken-tag { font-size: 12px; color: var(--dew-text-muted); }

.suitor-enter-active, .suitor-leave-active { transition: all 0.25s var(--dew-bounce, ease); }
.suitor-enter-from, .suitor-leave-to { opacity: 0; transform: translateY(6px); }

/* 团队 */
.team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.team-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md, 12px);
  background: var(--dew-card-flat-bg, rgba(0, 0, 0, 0.03));
}
.team-meta { display: flex; flex-direction: column; }
.team-name { font-size: 13.5px; font-weight: 600; color: var(--dew-text); }
.team-src { font-size: 11px; color: var(--dew-text-faint); }

.result-hint { font-size: 13px; color: var(--dew-text-muted); line-height: 1.6; }
</style>
