<template>
  <div class="mentor-dashboard">
    <DewCard v-if="summary" variant="default" size="lg" :no-hover="true" style="margin-bottom: 16px;">
      <template #header><h3>本团队出勤汇总</h3></template>
      <div class="summary">
        <DewBadge type="success">出勤 {{ summary.present }}</DewBadge>
        <DewBadge type="warning">迟到 {{ summary.late }}</DewBadge>
        <DewBadge type="warning">时长不足 {{ summary.short_hours }}</DewBadge>
        <DewBadge type="danger">迟到+不足 {{ summary.late_and_short }}</DewBadge>
        <DewBadge type="neutral">缺勤 {{ summary.absent }}</DewBadge>
        <DewBadge type="primary">请假 {{ summary.on_leave }}</DewBadge>
        <span class="rate">达标率 {{ pct(summary.attendance_rate) }}</span>
      </div>
    </DewCard>

    <DewCard variant="default" size="lg" :no-hover="true">
      <template #header><h3>考勤明细（{{ rows.length }} 名学员）</h3></template>
      <div v-if="!rows.length" class="empty">本团队暂无承诺出勤数据</div>
      <el-table v-else :data="rows" border stripe size="small" v-loading="loading">
        <el-table-column label="学员" prop="username" fixed="left" min-width="90" />
        <el-table-column v-for="d in dates" :key="d" :label="label(d)" min-width="50" align="center">
          <template #default="{ row }">
            <div v-if="row.daily && row.daily[d]" :class="['cell', 'cell-' + row.daily[d].status]"
                 :title="tip(row.daily[d])">{{ glyph(row.daily[d].status) }}</div>
          </template>
        </el-table-column>
      </el-table>
    </DewCard>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { DewCard, DewBadge } from '../ui';
import { ElMessage } from 'element-plus';
import { campService } from '../../services/campService';

const props = defineProps({ sid: { type: [Number, String], required: true } });

const loading = ref(false);
const board = ref({});
const summary = computed(() => board.value.summary || null);
const dates = computed(() => board.value.dates || []);
const rows = computed(() => board.value.rows || []);

const GLYPH = { present: '✓', late: '迟', short_hours: '短', late_and_short: '!', absent: '✗', on_leave: '休' };
const glyph = (s) => GLYPH[s] || '';
const label = (d) => { const [, m, day] = d.split('-'); return `${parseInt(m)}/${parseInt(day)}`; };
const pct = (r) => (r == null ? '—' : (r * 100).toFixed(0) + '%');
const tip = (c) => {
  const p = [c.status];
  if (c.first_check_in) p.push('签到 ' + c.first_check_in.slice(11, 16));
  if (c.total_hours != null) p.push('时长 ' + c.total_hours + 'h');
  if (c.in_progress) p.push('未签退');
  return p.join(' / ');
};

async function load() {
  loading.value = true;
  try { board.value = await campService.fetchDashboard(props.sid); }
  catch { ElMessage.error('加载团队考勤失败'); }
  finally { loading.value = false; }
}
watch(() => props.sid, load, { immediate: true });
</script>

<style scoped>
.summary { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.summary .rate { margin-left: 8px; font-weight: 600; }
.empty { color: var(--dew-text-muted); padding: 16px 0; }
.cell { height: 26px; line-height: 26px; text-align: center; border-radius: 4px; font-size: 12px; font-weight: 600; }
.cell-present { background: rgba(16, 185, 129, .18); color: #10b981; }
.cell-late, .cell-short_hours { background: rgba(245, 158, 11, .18); color: #f59e0b; }
.cell-late_and_short { background: rgba(239, 68, 68, .20); color: #ef4444; }
.cell-absent { background: rgba(156, 163, 175, .18); color: #9ca3af; }
.cell-on_leave { background: rgba(99, 102, 241, .18); color: #6366f1; }
</style>
