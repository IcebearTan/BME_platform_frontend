<template>
  <div class="camp-attendance">
    <!-- 09-12 模式 C（学期校区·按周累计）：周次数 + 周时长，无承诺日/逐日评估 -->
    <template v-if="mode === 'weekly'">
      <DewCard variant="default" size="lg" :no-hover="true" style="margin-bottom: 16px;">
        <template #header><h3>出勤周报（按周累计）</h3></template>
        <div v-if="loading" v-loading="true" style="min-height: 80px;"></div>
        <div v-else class="summary">
          <DewBadge type="primary">累计出勤 {{ weekly.total_days || 0 }} 次</DewBadge>
          <DewBadge type="success">累计时长 {{ weekly.total_hours || 0 }}h</DewBadge>
          <span class="rate">打卡照常，按周考察出勤次数与时长</span>
        </div>
      </DewCard>
      <DewCard variant="default" size="lg" :no-hover="true">
        <template #header><h3>每周明细</h3></template>
        <div v-if="!weekly.weeks?.length" class="empty">还没有出勤记录，打卡后按周汇总在这里</div>
        <div v-else class="weekly-list">
          <div v-for="w in weeklyWeeksDesc" :key="w.label" class="weekly-row">
            <span class="w-label">{{ w.label }}</span>
            <span class="w-range">{{ w.start?.slice(5) }} ~ {{ w.end?.slice(5) }}</span>
            <DewBadge :type="w.days ? 'success' : 'neutral'">{{ w.days }} 次</DewBadge>
            <span class="w-hours">{{ w.hours }}h</span>
          </div>
        </div>
      </DewCard>
    </template>

    <!-- 模式 A（假期营·每日承诺出勤）：原承诺日视图 -->
    <template v-else>
      <DewCard variant="default" size="lg" :no-hover="true" style="margin-bottom: 16px;">
        <template #header><h3>考勤汇总</h3></template>
        <div v-if="loading" v-loading="true" style="min-height: 80px;"></div>
        <div v-else-if="personal" class="summary">
          <DewBadge type="neutral">承诺 {{ personal.pledged_days ?? personal.planned_days }} 天</DewBadge>
          <DewBadge type="success">出勤 {{ (personal.present || 0) + (personal.late || 0) }}<template v-if="personal.late">（迟到 {{ personal.late }}）</template></DewBadge>
          <DewBadge type="warning">未达标 {{ (personal.short_hours || 0) + (personal.late_and_short || 0) }}<template v-if="personal.late_and_short">（迟到 {{ personal.late_and_short }}）</template></DewBadge>
          <DewBadge type="danger">缺勤 {{ personal.absent || 0 }}</DewBadge>
          <DewBadge type="primary">请假 {{ personal.on_leave || 0 }}</DewBadge>
          <span class="rate">达标率 {{ pct(personal.attendance_rate) }}</span>
        </div>
      </DewCard>

      <DewCard variant="default" size="lg" :no-hover="true">
        <template #header><h3>每日明细</h3></template>
        <div v-if="!rows.length" class="empty">暂无承诺出勤日</div>
        <div v-else class="daily-list">
          <div v-for="r in rows" :key="r.date" :class="['daily-row', 'cell-' + campVisualKey(r.cell.status, r.date === todayIso)]">
            <span class="d-date">{{ r.date }}</span>
            <DewBadge :type="badgeType(r.cell.status)">{{ statusLabel(r.cell.status) }}</DewBadge>
            <span class="d-meta">{{ metaText(r.cell) }}</span>
          </div>
        </div>
      </DewCard>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { DewCard, DewBadge } from '@bme/dew-ui';
import { ElMessage } from 'element-plus';
import { campService, campVisualKey, CAMP_STATUS_TEXT, todayLocal } from '../../services/campService';

const props = defineProps({ sid: { type: [Number, String], required: true } });

const mode = ref('daily');
const daily = ref({});
const personal = ref(null);
const dates = ref([]);
const weekly = ref({});
const loading = ref(false);

const todayIso = todayLocal();
const rows = computed(() =>
  dates.value.map((d) => ({ date: d, cell: daily.value[d] || { status: 'unpledged' } })));
const weeklyWeeksDesc = computed(() => [...(weekly.value.weeks || [])].reverse());   // 最新周在前

// 徽章文案保留后端细分语义（出勤·迟到 等），颜色按归类映射
const statusLabel = (s) => CAMP_STATUS_TEXT[s] || s;
const badgeType = (s) => ({
  present: 'success', late: 'success',
  short_hours: 'warning', late_and_short: 'warning',
  absent: 'danger', on_leave: 'primary',
  pledged: 'neutral', in_progress: 'neutral', unpledged: 'neutral',
}[s] || 'neutral');
const pct = (r) => (r == null ? '—' : (r * 100).toFixed(0) + '%');
const metaText = (c) => {
  if (['on_leave', 'absent', 'pledged', 'unpledged'].includes(c.status)) return '';
  const parts = [];
  if (c.first_check_in) parts.push('签到 ' + c.first_check_in.slice(11, 16));
  if (c.total_hours != null) parts.push('时长 ' + c.total_hours + 'h');
  if (c.in_progress) parts.push('未签退');
  return parts.join(' · ');
};

async function load() {
  loading.value = true;
  try {
    const data = await campService.fetchMyAttendance(props.sid);
    mode.value = data.mode || 'daily';
    daily.value = data.daily || {};
    personal.value = data.personal || null;
    dates.value = data.dates || [];
    weekly.value = data.weeks ? { weeks: data.weeks, total_days: data.total_days, total_hours: data.total_hours } : {};
  } catch {
    ElMessage.error('加载考勤失败');
  } finally {
    loading.value = false;
  }
}

watch(() => props.sid, load, { immediate: true });
</script>

<style scoped>
.summary { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.summary .rate { margin-left: 8px; font-weight: 600; }
.daily-list { display: flex; flex-direction: column; gap: 6px; }
.daily-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 8px; }
.d-date { width: 110px; font-weight: 600; }
.d-meta { color: #909399; font-size: 13px; }
.weekly-list { display: flex; flex-direction: column; gap: 6px; }
.weekly-row { display: flex; align-items: center; gap: 12px; padding: 8px 12px; border-radius: 8px; background: rgba(148, 163, 184, .05); }
.w-label { width: 90px; font-weight: 600; }
.w-range { flex: 1; color: #909399; font-size: 13px; }
.w-hours { width: 64px; text-align: right; color: #909399; font-size: 13px; }
.empty { color: #909399; padding: 16px 0; }
.cell-present { background: rgba(16, 185, 129, .08); }
.cell-insufficient { background: rgba(245, 158, 11, .08); }
.cell-absent { background: rgba(239, 68, 68, .08); }
.cell-on_leave { background: rgba(99, 102, 241, .08); }
.cell-pending { background: rgba(148, 163, 184, .05); }
.cell-unpledged { background: transparent; }
</style>
