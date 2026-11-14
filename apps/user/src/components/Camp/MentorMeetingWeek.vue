<template>
  <DewCard class="meeting-week" size="lg" :no-hover="true">
    <template #header>
      <div class="week-heading">
        <h3>导生组会</h3>
        <DewButton size="sm" type="ghost" @click="$emit('show-dates')">按日期查看</DewButton>
      </div>
    </template>

    <div class="week-toolbar">
      <div class="week-navigation" aria-label="组会周切换">
        <DewButton size="sm" type="ghost" @click="moveWeek(-1)">上一周</DewButton>
        <strong aria-live="polite">{{ weekLabel }}</strong>
        <DewButton size="sm" type="ghost" @click="moveWeek(1)">下一周</DewButton>
        <DewButton v-if="weekStart !== currentWeek" size="sm" type="ghost" @click="weekStart = currentWeek">回到本周</DewButton>
      </div>
      <MentorTeamFilter :key="sid" v-model="mentorId" :options="mentorOptions" />
    </div>

    <div v-if="loading" class="week-loading" aria-label="正在加载本周组会">
      <DewSkeleton v-for="n in 4" :key="n" variant="rect" width="100%" :height="48" />
    </div>
    <div v-else-if="error" class="week-error" role="alert">
      <span>{{ error }}</span>
      <DewButton size="sm" @click="load">重试</DewButton>
    </div>
    <template v-else>
      <p class="week-summary" aria-live="polite">
        <span>有记录 <strong>{{ recordedCount }}</strong> / {{ currentTeams.length }} 位导生</span>
        <span>暂无记录 <strong>{{ missingCount }}</strong> 位</span>
        <span>已安排 <strong>{{ scheduledCount }}</strong> 场</span>
      </p>
      <p class="week-note">按当前在营导生统计，依据平台组会记录；今日及以前记为有记录，未来日期记为已安排。</p>
      <div class="week-status-filter" aria-label="导生组会状态筛选">
        <DewButton v-for="option in statusOptions" :key="option.value" size="sm" type="ghost"
          :active="statusFilter === option.value" :aria-pressed="statusFilter === option.value"
          @click="statusFilter = option.value">{{ option.label }}</DewButton>
      </div>

      <DewCard v-if="visibleTeams.length" variant="flat" size="sm" :no-hover="true" class="week-roster">
        <div v-for="team in visibleTeams" :key="team.user_id" class="week-team">
          <button type="button" class="week-team-head" :disabled="!team.meetings.length"
            :aria-expanded="team.meetings.length ? expanded.has(team.user_id) : undefined"
            @click="toggle(team.user_id)">
            <span class="week-mentor">
              <strong>{{ team.username }}</strong>
              <span v-if="duplicateNames.has(team.username)" class="week-secondary">编号 {{ team.user_id }}</span>
              <span v-if="team.direction" class="week-direction">{{ team.direction }}</span>
              <span v-if="!team.is_current" class="week-secondary">历史导生</span>
            </span>
            <span class="week-team-status">
              <DewTag size="sm" :type="team.recorded.length ? 'success' : 'neutral'">{{ team.statusLabel }}</DewTag>
              <span v-if="team.recorded.length && team.scheduled.length" class="week-secondary">已安排 {{ team.scheduled.length }} 场</span>
              <span v-if="team.meetings.length" class="week-chevron" :class="{ open: expanded.has(team.user_id) }" aria-hidden="true">⌄</span>
            </span>
          </button>
          <div v-if="expanded.has(team.user_id)" class="week-meetings">
            <button v-for="meeting in team.meetings" :key="meeting.id" type="button"
              class="week-meeting" @click="openDetail(meeting)">
              <span class="week-meeting-date">{{ shortDate(meeting.meeting_date) }}</span>
              <span class="week-meeting-title">{{ meeting.title }}</span>
              <DewTag size="sm" :type="meeting.meeting_date.slice(0, 10) > today ? 'neutral' : meeting.has_minutes ? 'success' : 'info'">
                {{ meeting.meeting_date.slice(0, 10) > today ? '已安排' : meeting.has_minutes ? '有纪要' : '待补纪要' }}
              </DewTag>
            </button>
          </div>
        </div>
      </DewCard>
      <p v-else class="week-empty">{{ teams.length ? '当前筛选下暂无导生' : '暂无导生或组会记录' }}</p>
    </template>
    <MeetingDetail v-model="detailVisible" :sid="sid" :meeting-id="detailId" />
  </DewCard>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { DewButton, DewCard, DewSkeleton, DewTag } from '@bme/dew-ui';
import { campService, todayLocal } from '../../services/campService';
import MentorTeamFilter from './MentorTeamFilter.vue';
import MeetingDetail from './MeetingDetail.vue';

const props = defineProps({ sid: { type: [Number, String], required: true } });
defineEmits(['show-dates']);

function shiftDate(value, days) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day + days);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
const today = todayLocal();
const [year, month, day] = today.split('-').map(Number);
const currentWeek = shiftDate(today, -((new Date(year, month - 1, day).getDay() + 6) % 7));
const weekStart = ref(currentWeek);
const weekEnd = computed(() => shiftDate(weekStart.value, 6));
const weekLabel = computed(() => `${weekStart.value === currentWeek ? '本周 · ' : ''}${weekStart.value.replaceAll('-', '/')} — ${weekEnd.value.slice(5).replace('-', '/')}`);
const mentorId = ref(null);
const mentors = ref([]);
const meetings = ref([]);
const loading = ref(true);
const error = ref('');
const statusFilter = ref('all');
const expanded = ref(new Set());
const detailVisible = ref(false);
const detailId = ref(null);
const statusOptions = [
  { value: 'all', label: '全部' },
  { value: 'missing', label: '暂无记录' },
  { value: 'recorded', label: '有记录' },
  { value: 'scheduled', label: '已安排' },
];
const mentorOptions = computed(() => [
  { label: '全部导生', value: null },
  ...mentors.value.map(mentor => ({
    value: mentor.user_id,
    label: mentor.direction ? `${mentor.username} · ${mentor.direction}` : mentor.username,
  })),
]);
const duplicateNames = computed(() => {
  const counts = new Map();
  for (const mentor of mentors.value) counts.set(mentor.username, (counts.get(mentor.username) || 0) + 1);
  return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name));
});
const teams = computed(() => {
  const byMentor = new Map();
  for (const meeting of meetings.value) {
    if (meeting.scope !== 'team' || !meeting.mentor_id) continue;
    if (!byMentor.has(meeting.mentor_id)) byMentor.set(meeting.mentor_id, []);
    byMentor.get(meeting.mentor_id).push(meeting);
  }
  return mentors.value
    .filter(mentor => mentorId.value === null || mentor.user_id === mentorId.value)
    .filter(mentor => mentor.is_current || byMentor.has(mentor.user_id))
    .map(mentor => {
      const rows = (byMentor.get(mentor.user_id) || []).sort((a, b) => b.meeting_date.localeCompare(a.meeting_date));
      const recorded = rows.filter(meeting => meeting.meeting_date.slice(0, 10) <= today);
      const scheduled = rows.filter(meeting => meeting.meeting_date.slice(0, 10) > today);
      const statusLabel = recorded.length ? `有记录 ${recorded.length} 场` : scheduled.length ? `已安排 ${scheduled.length} 场` : '暂无记录';
      return { ...mentor, meetings: rows, recorded, scheduled, statusLabel };
    })
    .sort((a, b) => Number(!a.is_current) - Number(!b.is_current)
      || Number(!!a.recorded.length) - Number(!!b.recorded.length)
      || Number(!!a.scheduled.length) - Number(!!b.scheduled.length)
      || a.username.localeCompare(b.username, 'zh-CN'));
});
const currentTeams = computed(() => teams.value.filter(team => team.is_current));
const recordedCount = computed(() => currentTeams.value.filter(team => team.recorded.length).length);
const missingCount = computed(() => currentTeams.value.length - recordedCount.value);
const scheduledCount = computed(() => currentTeams.value.reduce((count, team) => count + team.scheduled.length, 0));
const visibleTeams = computed(() => teams.value.filter(team => {
  if (statusFilter.value === 'missing') return !team.recorded.length;
  if (statusFilter.value === 'recorded') return !!team.recorded.length;
  if (statusFilter.value === 'scheduled') return !!team.scheduled.length;
  return true;
}));

let requestSeq = 0;
async function load() {
  const seq = ++requestSeq;
  loading.value = true;
  error.value = '';
  try {
    // 七个完整日期覆盖全周，不受同一天场次数量影响。
    const data = await campService.fetchCampMeetingsAll(props.sid, {
      start_date: weekStart.value, end_date: weekEnd.value, limit: 7,
      mentor_id: mentorId.value ?? undefined,
    });
    if (seq !== requestSeq) return;
    if (!Array.isArray(data.groups) || data.groups.some(group => !Array.isArray(group.meetings))
        || !Array.isArray(data.mentors) || data.mentors.some(mentor => typeof mentor.is_current !== 'boolean')
        || data.has_more) {
      throw new Error('组会周总览数据暂不可用，请稍后重试');
    }
    meetings.value = data.groups.flatMap(group => group.meetings);
    mentors.value = data.mentors;
  } catch (failure) {
    if (seq === requestSeq) error.value = failure.userMessage || failure.response?.data?.message || failure.message || '加载组会失败';
  } finally {
    if (seq === requestSeq) loading.value = false;
  }
}
function moveWeek(direction) { weekStart.value = shiftDate(weekStart.value, direction * 7); }
function toggle(id) {
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
}
function openDetail(meeting) { detailId.value = meeting.id; detailVisible.value = true; }
function shortDate(value) { return value.slice(5, 10).replace('-', '/'); }
watch([weekStart, mentorId], () => {
  expanded.value = new Set();
  detailVisible.value = false;
  load();
}, { immediate: true });
onBeforeUnmount(() => { requestSeq++; });
defineExpose({ reload: load });
</script>

<style scoped>
.week-heading, .week-navigation, .week-summary, .week-status-filter { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.week-heading { justify-content: space-between; }
.week-heading h3 { margin: 0; }
.week-toolbar { display: grid; gap: 18px; }
.week-navigation strong { color: var(--dew-text-heading); font-size: var(--text-sm); font-variant-numeric: tabular-nums; }
.week-loading { display: grid; gap: 12px; margin-top: 20px; }
.week-error { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 24px 0; color: var(--dew-text-muted); }
.week-summary { margin: 22px 0 8px; gap: 12px 24px; font-size: var(--text-sm); color: var(--dew-text-muted); }
.week-summary strong { color: var(--dew-text-heading); font-size: var(--text-lg); }
.week-note { margin: 0 0 12px; font-size: var(--text-xs); line-height: 1.7; color: var(--dew-text-muted); }
.week-status-filter { gap: 4px; margin-bottom: 12px; }
.week-roster :deep(.dew-card__body) { padding-top: 0; padding-bottom: 0; }
.week-team + .week-team { border-top: 1px solid var(--dew-card-divider); }
.week-team-head, .week-meeting { width: 100%; border: 0; background: transparent; font: inherit; text-align: left; cursor: pointer; color: var(--dew-text); }
.week-team-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 16px 2px; }
.week-team-head:disabled { cursor: default; opacity: 1; }
.week-team-head:enabled:hover, .week-meeting:hover { background: var(--dew-ghost-hover-bg); }
.week-team-head:focus-visible, .week-meeting:focus-visible { outline: 2px solid var(--color-primary); outline-offset: -2px; }
.week-mentor, .week-team-status { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.week-mentor { min-width: 0; font-size: var(--text-sm); overflow-wrap: anywhere; }
.week-direction, .week-secondary { font-size: var(--text-xs); color: var(--dew-text-muted); }
.week-team-status { justify-content: flex-end; flex-shrink: 0; }
.week-chevron { display: inline-block; transform: rotate(-90deg); width: 14px; text-align: center; }
.week-chevron.open { transform: none; }
.week-meetings { padding: 0 0 12px 12px; }
.week-meeting { display: flex; align-items: center; gap: 12px; padding: 10px 0; }
.week-meeting-date { font-size: var(--text-xs); color: var(--dew-text-muted); }
.week-meeting-title { flex: 1; min-width: 0; overflow-wrap: anywhere; font-size: var(--text-sm); }
.week-empty { text-align: center; color: var(--dew-text-muted); padding: 24px 0; font-size: var(--text-sm); }
@media (max-width: 600px) {
  .week-team-head { align-items: flex-start; }
  .week-mentor { flex-direction: column; align-items: flex-start; gap: 4px; }
  .week-navigation { gap: 6px; }
  .week-navigation strong { order: -1; width: 100%; }
  .week-summary { gap: 8px 16px; }
  .week-team-status { max-width: 48%; }
}
</style>
