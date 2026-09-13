<template>
  <!-- 项目营·单元周考勤面板（09-13）：负责人看本项目成员的按周出勤统计。
       数据源 /camp/units/<uid>/attendance/weekly（复用营级周分桶口径）；与活动考勤两区并显不并口径。 -->
  <div class="pwa-wrap">
    <div v-if="loading" class="pwa-loading"><DewSkeleton variant="rect" width="100%" height="120" rounded="8px" /></div>
    <template v-else-if="rows.length">
      <div class="pwa-scroll">
        <table class="pwa-table">
          <thead>
            <tr>
              <th class="col-name">成员</th>
              <th v-for="w in weekCols" :key="w.label" class="col-week" :title="`${w.start} ~ ${w.end}`">{{ w.label }}</th>
              <th class="col-total">累计</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in tableRows" :key="r.user_id">
              <td class="col-name">{{ r.username || `#${r.user_id}` }}</td>
              <td v-for="w in r.weeks" :key="w.label" class="col-week"
                  :title="`${w.start} ~ ${w.end} · ${w.days} 次 · ${w.hours}h`">
                <span :class="['wk', { hit: w.days > 0 }]">{{ w.days }}</span>
              </td>
              <td class="col-total">{{ r.total_days }} 次 · {{ r.total_hours }}h</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pwa-note">周格 = 该周打卡次数（悬停看周范围与时长）；口径与营级周考勤一致</div>
    </template>
    <div v-else class="pwa-empty">本项目成员还没有周打卡记录</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { DewSkeleton } from '@bme/dew-ui';
import { campService } from '../../services/campService';

const props = defineProps({ unitId: { type: Number, required: true } });

const loading = ref(true);
const rows = ref([]);

// 周列 = 全体成员周桶的并集；行 = 各成员周桶按周列补 0（避免表格错位）
const weekCols = computed(() => {
  const seen = new Map();
  rows.value.forEach((r) => (r.weeks || []).forEach((w) => seen.set(w.label, w)));
  return [...seen.values()].sort((a, b) => (a.label < b.label ? -1 : 1));
});
const tableRows = computed(() => rows.value.map((r) => {
  const m = new Map((r.weeks || []).map((w) => [w.label, w]));
  return { ...r, weeks: weekCols.value.map((c) => m.get(c.label) || { ...c, days: 0, hours: 0 }) };
}));

async function load() {
  loading.value = true;
  try {
    const d = await campService.fetchUnitWeeklyAttendance(props.unitId);
    rows.value = d.rows || [];
  } catch (e) {
    if (e.response?.status !== 400) {   // 400=未开考勤/非周模式,静默不渲染
      ElMessage.error(e.response?.data?.message || '加载周考勤失败');
    }
    rows.value = [];
  } finally {
    loading.value = false;
  }
}
onMounted(load);
watch(() => props.unitId, load);
</script>

<style scoped>
.pwa-wrap { display: flex; flex-direction: column; gap: 8px; }
.pwa-loading, .pwa-empty { padding: 6px 0; }
.pwa-empty { font-size: 12.5px; color: var(--dew-text-faint); }
.pwa-note { font-size: 11.5px; color: var(--dew-text-faint); }

.pwa-scroll { overflow-x: auto; }
.pwa-table { border-collapse: collapse; width: 100%; font-size: 12.5px; }
.pwa-table th, .pwa-table td { padding: 6px 10px; text-align: center; white-space: nowrap; }
.pwa-table thead th {
  font-size: 11.5px; font-weight: 600; color: var(--dew-text-muted);
  border-bottom: 1px solid var(--dew-card-border);
}
.col-name { text-align: left; font-weight: 600; color: var(--dew-text-heading); position: sticky; left: 0; }
.col-week { color: var(--dew-text-faint); }
.col-total { color: var(--dew-text-muted); font-weight: 600; }
.pwa-table tbody tr { border-bottom: 1px dashed var(--dew-card-border); }
.pwa-table tbody tr:last-child { border-bottom: none; }
.wk {
  display: inline-flex; min-width: 22px; height: 20px; align-items: center; justify-content: center;
  border-radius: 5px; font-size: 11.5px; color: var(--dew-text-faint);
  background: color-mix(in srgb, var(--dew-text-faint) 8%, transparent);
}
.wk.hit { color: var(--color-success); font-weight: 700; background: color-mix(in srgb, var(--color-success) 12%, transparent); }
</style>
