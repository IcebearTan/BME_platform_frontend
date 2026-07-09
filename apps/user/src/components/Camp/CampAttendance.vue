<template>
  <div class="camp-attendance">
    <DewCard variant="default" size="lg" :no-hover="true" style="margin-bottom: 16px;">
      <template #header><h3>考勤汇总</h3></template>
      <div v-if="loading" v-loading="true" style="min-height: 80px;"></div>
      <div v-else-if="personal" class="summary">
        <DewBadge type="neutral">承诺 {{ personal.planned_days }} 天</DewBadge>
        <DewBadge type="success">出勤 {{ personal.present }}</DewBadge>
        <DewBadge type="warning">迟到 {{ personal.late }}</DewBadge>
        <DewBadge type="warning">时长不足 {{ personal.short_hours }}</DewBadge>
        <DewBadge type="danger">迟到+不足 {{ personal.late_and_short }}</DewBadge>
        <DewBadge type="neutral">缺勤 {{ personal.absent }}</DewBadge>
        <DewBadge type="primary">请假 {{ personal.on_leave }}</DewBadge>
        <span class="rate">达标率 {{ pct(personal.attendance_rate) }}</span>
      </div>
    </DewCard>

    <DewCard variant="default" size="lg" :no-hover="true">
      <template #header><h3>每日明细</h3></template>
      <div v-if="!rows.length" class="empty">暂无承诺出勤日</div>
      <div v-else class="daily-list">
        <div v-for="r in rows" :key="r.date" :class="['daily-row', 'cell-' + r.cell.status]">
          <span class="d-date">{{ r.date }}</span>
          <DewBadge :type="badgeType(r.cell.status)">{{ statusLabel(r.cell.status) }}</DewBadge>
          <span class="d-meta">{{ metaText(r.cell) }}</span>
        </div>
      </div>
    </DewCard>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { DewCard, DewBadge } from '../ui';
import { ElMessage } from 'element-plus';
import { campService } from '../../services/campService';

const props = defineProps({ sid: { type: [Number, String], required: true } });

const daily = ref({});
const personal = ref(null);
const dates = ref([]);
const loading = ref(false);

const rows = computed(() =>
  dates.value.map((d) => ({ date: d, cell: daily.value[d] || { status: 'absent' } })));

const statusLabel = (s) => ({
  present: '出勤', late: '迟到', short_hours: '时长不足', late_and_short: '迟到+不足',
  absent: '缺勤', on_leave: '请假',
}[s] || s);
const badgeType = (s) => ({
  present: 'success', late: 'warning', short_hours: 'warning', late_and_short: 'danger',
  absent: 'neutral', on_leave: 'primary',
}[s] || 'neutral');
const pct = (r) => (r == null ? '—' : (r * 100).toFixed(0) + '%');
const metaText = (c) => {
  if (c.status === 'on_leave' || c.status === 'absent') return '';
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
    daily.value = data.daily || {};
    personal.value = data.personal || null;
    dates.value = data.dates || [];
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
.empty { color: #909399; padding: 16px 0; }
.cell-present { background: rgba(103, 194, 58, .08); }
.cell-late, .cell-short_hours { background: rgba(230, 162, 60, .08); }
.cell-late_and_short { background: rgba(245, 108, 108, .10); }
.cell-absent { background: rgba(144, 147, 153, .08); }
.cell-on_leave { background: rgba(64, 158, 255, .08); }
</style>
