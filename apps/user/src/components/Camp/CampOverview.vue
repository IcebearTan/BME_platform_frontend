<template>
  <!-- 看板 tab 内容：角色仪表盘/日历/规则（营期头部与进度已提升至 CampView 工作台页头） -->
  <div class="camp-overview" v-loading="loading">
    <!-- ━━ 导生：团队概览（明细在「团队考勤」tab）━━ -->
    <template v-if="isMentor">
      <DewCard variant="default" size="lg" :no-hover="true" class="dashboard-card">
        <template #header>
          <div class="card-title-row">
            <h3>本团队出勤</h3>
            <span class="card-hint">待审批请假 {{ pendingCount }} 条</span>
          </div>
        </template>
        <div class="dashboard-body">
          <div class="ring-wrap">
            <div class="multi-ring" :style="teamRingStyle">
              <div class="ring-hole">
                <div class="ring-num">{{ teamRatePct }}<span v-if="teamRatePct !== '—'" class="ring-pct">%</span></div>
                <div class="ring-label">团队达标率</div>
              </div>
            </div>
          </div>
          <div class="stat-grid">
            <div class="stat-item" v-for="s in teamStats" :key="s.key">
              <span class="stat-dot" :style="{ background: s.color }"></span>
              <span class="stat-num">{{ s.value }}</span>
              <span class="stat-label">{{ s.label }}</span>
            </div>
          </div>
        </div>
      </DewCard>
    </template>

    <!-- ━━ 学员：我的出勤仪表盘 + 日历 + 规则 ━━ -->
    <template v-else>
      <DewCard variant="default" size="lg" :no-hover="true" class="dashboard-card">
        <template #header>
          <div class="card-title-row">
            <h3>我的出勤</h3>
            <span class="card-hint">已满足 {{ personal?.satisfied || 0 }} / 已过承诺 {{ personal?.elapsed_pledged ?? 0 }} 天</span>
          </div>
        </template>
        <div class="dashboard-body">
          <div class="ring-wrap">
            <div class="multi-ring" :style="ringStyle">
              <div class="ring-hole">
                <div class="ring-num">{{ ratePct }}<span v-if="ratePct !== '—'" class="ring-pct">%</span></div>
                <div class="ring-label">达标率</div>
              </div>
            </div>
          </div>
          <div class="stat-grid">
            <div class="stat-item" v-for="s in stats" :key="s.key">
              <span class="stat-dot" :style="{ background: s.color }"></span>
              <span class="stat-num">{{ s.value }}</span>
              <span class="stat-label">{{ s.label }}</span>
            </div>
          </div>
        </div>
      </DewCard>

      <DewCard variant="default" size="lg" :no-hover="true" class="heatmap-card">
        <template #header>
          <div class="card-title-row">
            <h3>出勤日历</h3>
            <span class="card-hint">已满足 {{ personal?.satisfied || 0 }} / 已过承诺 {{ personal?.elapsed_pledged ?? 0 }} 天</span>
          </div>
        </template>
        <div class="heatmap">
          <div class="heat-grid">
            <div v-for="(c, i) in calendarCells" :key="i"
                 :class="['heat-cell', 'heat-' + campVisualKey(c.cell?.status, c.date === todayStr), {
                   today: c.date === todayStr,
                   live: c.cell?.status === 'in_progress',
                   'is-late': !!c.cell?.is_late,
                 }]"
                 :title="cellTitle(c.date, c.cell)">
              <span class="heat-day">{{ Number(c.date.slice(8)) }}</span>
              <span class="heat-dot"></span>
            </div>
          </div>
          <div class="legend">
            <span><span class="lg-dot lg-present"></span>出勤</span>
            <span><span class="lg-dot lg-insufficient"></span>未达标</span>
            <span><span class="lg-dot lg-absent"></span>缺勤</span>
            <span><span class="lg-dot lg-on_leave"></span>请假</span>
            <span><span class="lg-dot lg-pending"></span>待考勤</span>
            <span><span class="lg-dot lg-unpledged"></span>未承诺</span>
            <span><span class="lg-late-mark"></span>迟到角标</span>
          </div>
        </div>
      </DewCard>
    </template>
  </div>
</template>

<script setup>
// 看板 tab：角色仪表盘 + 出勤日历 + 营期规则（自 CampHome 成员视图迁移）。
// 营期头部（名称/状态/进度/选导生 chip）已提升至 CampView 工作台页头，此处不再渲染。
import { ref, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import { DewCard } from '../ui';
import { campService, campVisualKey, CAMP_STATUS_TEXT } from '../../services/campService';

const props = defineProps({
  sid: { type: Number, required: true },
});

const store = useStore();
const isMentor = computed(() => store.getters.role === 'mentor');

const loading = ref(false);
const personal = ref(null);
const daily = ref({});
const dates = ref([]);
const teamSummary = ref(null);   // 导生：本团队 dashboard.summary
const teamLeaves = ref([]);      // 导生：本团队请假

// 达标率 null（营未开始/无已过承诺日）显示「—」而非误导性的 0%
const ratePct = computed(() => {
  const r = personal.value?.attendance_rate;
  return r == null ? '—' : Math.round(r * 100);
});
// 出勤分布多段环（已过承诺日的状态比例：出勤绿/迟到黄/缺勤红/请假蓝）
function ringStyleFrom(p) {
  const seg = [
    { c: 'var(--color-success)', v: p.present || 0 },
    { c: 'var(--color-warning)', v: (p.late || 0) + (p.short_hours || 0) },
    { c: 'var(--color-danger)', v: (p.late_and_short || 0) + (p.absent || 0) },
    { c: 'var(--color-info)', v: p.on_leave || 0 },
  ];
  const total = seg.reduce((s, x) => s + x.v, 0);
  if (!total) return { background: 'conic-gradient(rgba(150,150,150,0.15) 0% 100%)' };
  let acc = 0;
  const stops = [];
  for (const s of seg) {
    const pct = s.v / total * 100;
    if (pct > 0) { stops.push(`${s.c} ${acc.toFixed(2)}% ${(acc + pct).toFixed(2)}%`); acc += pct; }
  }
  return { background: `conic-gradient(${stops.join(', ')})` };
}
const ringStyle = computed(() => ringStyleFrom(personal.value || {}));
const teamRingStyle = computed(() => ringStyleFrom(teamSummary.value || {}));

const STATS_DEF = [
  { key: 'present', label: '出勤', color: 'var(--color-success)' },
  { key: 'late', label: '迟到', color: 'var(--color-warning)' },
  { key: 'short_hours', label: '时长不足', color: 'var(--color-warning)' },
  { key: 'late_and_short', label: '迟到+不足', color: 'var(--color-danger)' },
  { key: 'absent', label: '缺勤', color: 'var(--color-danger)' },
  { key: 'on_leave', label: '请假', color: 'var(--color-info)' },
];
const stats = computed(() => STATS_DEF.map((s) => ({ ...s, value: personal.value?.[s.key] || 0 })));
const teamRatePct = computed(() => {
  const r = teamSummary.value?.attendance_rate;
  return r == null ? '—' : Math.round(r * 100);
});
const teamStats = computed(() => STATS_DEF.map((s) => ({ ...s, value: teamSummary.value?.[s.key] || 0 })));
const pendingCount = computed(() => teamLeaves.value.filter((l) => l.status === 'pending').length);

const todayStr = computed(() => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
});

const calendarCells = computed(() => {
  const sorted = [...dates.value].sort();
  return sorted.map((d) => ({ date: d, cell: daily.value[d] || { status: 'unpledged' } }));
});

// 格子悬浮提示：日期 + 完整状态文案（含迟到）+ 签到/时长明细
const cellTitle = (date, cell) => {
  const parts = [date, CAMP_STATUS_TEXT[cell?.status] || cell?.status || '未承诺'];
  if (cell?.is_late) parts.push('迟到');
  if (cell?.first_check_in) parts.push('签到 ' + cell.first_check_in.slice(11, 16));
  if (cell?.total_hours != null) parts.push('时长 ' + cell.total_hours + 'h');
  if (cell?.in_progress) parts.push('未签退');
  return parts.join(' · ');
};

// 跟随选营器切换：看板数据按当前 sid 拉取（多营上下文一致，比 featured 单营更准确）
async function load() {
  if (!props.sid) return;
  loading.value = true;
  try {
    if (isMentor.value) {
      const db = await campService.fetchDashboard(props.sid);
      teamSummary.value = db.summary || null;
      const lv = await campService.fetchTeamLeaves(props.sid);
      teamLeaves.value = lv.leaves || [];
    } else {
      const att = await campService.fetchMyAttendance(props.sid);
      personal.value = att.personal || null;
      daily.value = att.daily || {};
      dates.value = att.dates || [];
    }
  } catch {
    ElMessage.error('加载看板数据失败');
  } finally {
    loading.value = false;
  }
}

watch(() => props.sid, load, { immediate: true });
</script>

<style scoped>
/* common card title */
.dashboard-card, .heatmap-card { margin-bottom: 16px; }
.card-title-row { display: flex; justify-content: space-between; align-items: baseline; }
.card-title-row h3 { margin: 0; font-size: 15px; }
.card-hint { font-size: 12px; color: var(--dew-text-faint); }

/* dashboard */
.dashboard-body { display: flex; align-items: center; gap: 28px; flex-wrap: wrap; }
.ring-wrap { flex-shrink: 0; }
.multi-ring { width: 132px; height: 132px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.4s var(--dew-bounce); }
.ring-hole { width: 96px; height: 96px; border-radius: 50%; background: #ffffff; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: inset 0 2px 8px rgba(0,0,0,0.06); }
.theme-dark .ring-hole { background: #16161a; }
.ring-num { font-size: 28px; font-weight: 700; color: var(--color-info); line-height: 1; }
.ring-pct { font-size: 14px; font-weight: 600; }
.ring-label { font-size: 12px; color: var(--dew-text-muted); margin-top: 4px; }
.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px 24px; flex: 1; min-width: 240px; }
.stat-item { display: flex; align-items: center; gap: 8px; }
.stat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.stat-num { font-size: 18px; font-weight: 600; color: var(--dew-text-heading); }
.stat-label { font-size: 12px; color: var(--dew-text-muted); }

/* heatmap —— 视觉归类（campVisualKey）：4 判定色 + 2 中性态，迟到=角标 */
.heat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(46px, 1fr)); gap: 6px; }
.heat-cell { aspect-ratio: 1; border-radius: var(--radius-md); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; transition: transform 0.2s var(--dew-bounce); position: relative; }
.heat-cell:hover { transform: scale(1.08); }
.heat-day { font-size: 12px; font-weight: 500; color: var(--dew-text); }
.heat-dot { width: 5px; height: 5px; border-radius: 50%; }
.heat-cell.today { outline: 2px solid var(--color-primary); outline-offset: -2px; }
/* 判定色：蓝只留给请假 */
.heat-present { background: rgba(16, 185, 129, 0.12); } .heat-present .heat-dot { background: var(--color-success); }
.heat-insufficient { background: rgba(245, 158, 11, 0.12); } .heat-insufficient .heat-dot { background: var(--color-warning); }
.heat-absent { background: rgba(239, 68, 68, 0.14); } .heat-absent .heat-dot { background: var(--color-danger); }
.heat-on_leave { background: rgba(99, 102, 241, 0.12); } .heat-on_leave .heat-dot { background: var(--color-info); }
/* 中性态：待考勤=实线描边，未承诺=虚线（都不评价） */
.heat-pending { background: transparent; border: 1px solid rgba(148, 163, 184, 0.45); } .heat-pending .heat-dot { background: rgba(148, 163, 184, 0.55); }
.heat-unpledged { background: transparent; border: 1px dashed rgba(150,150,150,0.3); } .heat-unpledged .heat-dot { background: transparent; } .heat-unpledged .heat-day { color: var(--dew-text-faint); opacity: 0.5; }
/* 今天进行中：待考勤样式 + 主色圆点脉动（今天本身另有描边圈） */
.heat-cell.live .heat-dot { background: var(--color-primary); animation: heat-pulse 2s ease infinite; }
@keyframes heat-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
/* 迟到角标：右上角琥珀小点（只叠加在判定色上） */
.heat-cell.is-late::after {
  content: ''; position: absolute; top: 3px; right: 3px;
  width: 5px; height: 5px; border-radius: 50%; background: var(--color-warning);
}
.legend { display: flex; gap: 16px; margin-top: 14px; font-size: 12px; color: var(--dew-text-muted); flex-wrap: wrap; }
.legend span { display: flex; align-items: center; gap: 5px; }
.lg-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.lg-present { background: var(--color-success); }
.lg-insufficient { background: var(--color-warning); }
.lg-absent { background: var(--color-danger); }
.lg-on_leave { background: var(--color-info); }
.lg-pending { background: transparent; border: 1px solid rgba(148, 163, 184, 0.45); }
.lg-unpledged { background: transparent; border: 1px dashed rgba(150,150,150,0.3); }
.lg-late-mark { width: 5px; height: 5px; border-radius: 50%; background: var(--color-warning); display: inline-block; }
</style>
