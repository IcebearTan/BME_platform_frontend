<template>
  <div :class="['camp-home-view', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]" v-loading="loading">
    <div style="height: 60px;"></div>
    <MenuComponent />
    <div class="camp-home-wrap">
      <!-- 空态 -->
      <DewCard v-if="!loading && !session" variant="inset" size="lg" :no-hover="true">
        你还没有加入任何进行中的营期。
      </DewCard>

      <template v-else-if="session">
        <!-- ① Hero（活动氛围） -->
        <DewCard glass variant="default" size="lg" class="hero-card">
          <h1 class="hero-title">{{ session.name }}</h1>
          <div class="hero-meta">
            <el-tag size="small" :type="statusType(session.status)">{{ statusLabel(session.status) }}</el-tag>
            <span>{{ session.start_date }} ~ {{ session.end_date }}</span>
          </div>
          <div class="hero-progress">
            <div class="progress-label">
              <span>营期进度</span>
              <span class="progress-num">{{ progress.elapsed }} / {{ progress.total }} 天</span>
            </div>
            <el-progress :percentage="progress.pct" :stroke-width="10" :show-text="false" />
          </div>
        </DewCard>

        <!-- ② 出勤仪表盘（主角） -->
        <DewCard variant="default" size="lg" :no-hover="true" class="dashboard-card">
          <template #header><h3>我的出勤</h3></template>
          <div class="dashboard-body">
            <div class="rate-block">
              <div class="rate-num">{{ personal ? pct(personal.attendance_rate) : '—' }}</div>
              <div class="rate-label">达标率</div>
            </div>
            <div class="status-badges">
              <DewBadge type="success">出勤 {{ personal?.present || 0 }}</DewBadge>
              <DewBadge type="warning">迟到 {{ personal?.late || 0 }}</DewBadge>
              <DewBadge type="warning">时长不足 {{ personal?.short_hours || 0 }}</DewBadge>
              <DewBadge type="danger">迟到+不足 {{ personal?.late_and_short || 0 }}</DewBadge>
              <DewBadge type="neutral">缺勤 {{ personal?.absent || 0 }}</DewBadge>
              <DewBadge type="primary">请假 {{ personal?.on_leave || 0 }}</DewBadge>
            </div>
          </div>
        </DewCard>

        <!-- ③ 承诺日热力日历 -->
        <DewCard variant="default" size="lg" :no-hover="true" class="heatmap-card">
          <template #header><h3>承诺出勤日历</h3></template>
          <div class="legend">
            <span class="lg cell-present">✓ 出勤</span>
            <span class="lg cell-on_leave">休 请假</span>
            <span class="lg cell-late">迟 迟到</span>
            <span class="lg cell-absent">✗ 缺勤</span>
          </div>
          <div class="heatmap">
            <div class="heat-weekrow">
              <span v-for="w in ['一','二','三','四','五','六','日']" :key="w" class="heat-weekday">{{ w }}</span>
            </div>
            <div class="heat-grid">
              <div v-for="(c, i) in calendarCells" :key="i"
                   :class="['heat-cell', c.empty ? 'heat-empty' : 'cell-' + c.cell.status, { today: c.date === todayStr }]">
                <template v-if="!c.empty">
                  <span class="heat-day">{{ Number(c.date.slice(8)) }}</span>
                  <span class="heat-mark">{{ glyph(c.cell.status) }}</span>
                </template>
              </div>
            </div>
          </div>
        </DewCard>

        <!-- ④ 营期规则 + 快捷入口 -->
        <el-row :gutter="16" class="bottom-row">
          <el-col :xs="24" :span="10">
            <DewCard variant="inset" size="md" :no-hover="true" class="rule-card">
              <template #header><h3>营期规则</h3></template>
              <div class="rule-row"><span>期望到岗</span><b>{{ session.expected_check_in || '—' }}</b></div>
              <div class="rule-row"><span>每日最低时长</span><b>{{ session.min_daily_hours != null ? session.min_daily_hours + ' 小时' : '—' }}</b></div>
              <div class="rule-row"><span>出勤日</span><b>{{ session.weekdays_only ? '仅工作日' : '含周末' }}</b></div>
            </DewCard>
          </el-col>
          <el-col :xs="24" :span="14">
            <div class="shortcut-row">
              <DewCard variant="default" size="md" :interactive="true" accent="primary" class="shortcut" @click="go('selection')">
                <div class="sc-title">选课</div>
                <div class="sc-desc">营期可选课程</div>
              </DewCard>
              <DewCard variant="default" size="md" :interactive="true" accent="success" class="shortcut" @click="go('attendance')">
                <div class="sc-title">完整考勤</div>
                <div class="sc-desc">每日明细</div>
              </DewCard>
              <DewCard variant="default" size="md" :interactive="true" accent="warning" class="shortcut" @click="go('leave')">
                <div class="sc-title">请假</div>
                <div class="sc-desc">申请与记录</div>
              </DewCard>
            </div>
          </el-col>
        </el-row>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import MenuComponent from '../components/MenuComponent.vue';
import { DewCard, DewBadge } from '../components/ui';
import { ElMessage } from 'element-plus';
import { campService } from '../services/campService';

const store = useStore();
const router = useRouter();
const isDarkMode = computed(() => store.getters.isDarkMode);

const loading = ref(true);
const session = ref(null);
const personal = ref(null);
const daily = ref({});
const dates = ref([]);

const statusLabel = (s) => ({ draft: '草稿', active: '进行中', archived: '已归档' }[s] || s);
const statusType = (s) => ({ draft: 'info', active: 'success', archived: 'warning' }[s] || 'info');
const pct = (r) => (r == null ? '—' : (r * 100).toFixed(0) + '%');

const GLYPH = { present: '✓', late: '迟', short_hours: '短', late_and_short: '!', absent: '✗', on_leave: '休' };
const glyph = (s) => GLYPH[s] || '';

const todayStr = computed(() => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
});

const progress = computed(() => {
  if (!session.value?.start_date) return { pct: 0, elapsed: 0, total: 0 };
  const start = new Date(session.value.start_date);
  const end = new Date(session.value.end_date);
  const today = new Date();
  start.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0); today.setHours(0, 0, 0, 0);
  const total = Math.max(1, Math.round((end - start) / 86400000) + 1);
  const elapsed = Math.min(total, Math.max(0, Math.round((today - start) / 86400000) + 1));
  return { pct: Math.round((elapsed / total) * 100), elapsed, total };
});

const calendarCells = computed(() => {
  const sorted = [...dates.value].sort();
  if (!sorted.length) return [];
  const first = new Date(sorted[0]);
  const lead = (first.getDay() + 6) % 7;  // 周一 = 0
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push({ empty: true });
  for (const d of sorted) {
    cells.push({ date: d, cell: daily.value[d] || { status: 'absent' } });
  }
  while (cells.length % 7 !== 0) cells.push({ empty: true });
  return cells;
});

function go(tab) {
  router.push({ path: '/camp', query: { tab } });
}

onMounted(async () => {
  loading.value = true;
  try {
    const data = await campService.fetchSessions();
    const list = data.sessions || [];
    const active = list.find((s) => s.status === 'active') || list[0] || null;
    if (!active) { session.value = null; return; }
    session.value = active;
    const att = await campService.fetchMyAttendance(active.id);
    personal.value = att.personal || null;
    daily.value = att.daily || {};
    dates.value = att.dates || [];
  } catch (e) {
    ElMessage.error('加载营期主页失败');
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.camp-home-view { min-height: 100vh; background-attachment: fixed; }
.theme-light.camp-home-view {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(96, 165, 250, 0.26), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(244, 114, 182, 0.24), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(52, 211, 153, 0.22), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(251, 191, 36, 0.20), transparent 55%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(34, 211, 238, 0.10), transparent 70%),
    linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdf4 100%);
}
.theme-dark.camp-home-view {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(59, 130, 246, 0.18), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(236, 72, 153, 0.15), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(16, 185, 129, 0.14), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(245, 158, 11, 0.12), transparent 55%),
    linear-gradient(160deg, #16161a 0%, #0f0f12 100%);
}
.camp-home-wrap { max-width: 1080px; margin: 0 auto; padding: 24px 20px; }
.hero-card { margin-bottom: 16px; }
.hero-title { font-size: 26px; font-weight: 700; margin: 0 0 8px 0; color: var(--dew-text-heading); }
.hero-meta { display: flex; align-items: center; gap: 10px; color: var(--dew-text-secondary, #909399); font-size: 14px; }
.hero-progress { margin-top: 16px; }
.progress-label { display: flex; justify-content: space-between; font-size: 13px; color: var(--dew-text-secondary, #909399); margin-bottom: 6px; }
.progress-num { font-weight: 600; }
.dashboard-card, .heatmap-card { margin-bottom: 16px; }
.dashboard-body { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
.rate-block { text-align: center; min-width: 120px; }
.rate-num { font-size: 40px; font-weight: 800; color: #3b82f6; line-height: 1; }
.rate-label { font-size: 13px; color: var(--dew-text-secondary, #909399); margin-top: 4px; }
.status-badges { display: flex; flex-wrap: wrap; gap: 8px; }
.legend { display: flex; gap: 14px; margin-bottom: 12px; font-size: 12px; color: var(--dew-text-secondary, #909399); flex-wrap: wrap; }
.legend .lg { padding: 2px 8px; border-radius: 4px; }
.heat-weekrow { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 6px; }
.heat-weekday { text-align: center; font-size: 12px; color: var(--dew-text-secondary, #909399); }
.heat-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.heat-cell { aspect-ratio: 1 / 0.85; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.heat-empty { background: transparent; }
.heat-day { font-size: 11px; opacity: 0.65; }
.heat-mark { font-weight: 700; }
.heat-cell.today { outline: 2px solid #3b82f6; }
.bottom-row { margin-bottom: 16px; }
.rule-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
.rule-row span { color: var(--dew-text-secondary, #909399); }
.shortcut-row { display: flex; gap: 12px; }
.shortcut { flex: 1; min-width: 0; }
.sc-title { font-weight: 600; margin-bottom: 4px; }
.sc-desc { font-size: 12px; color: var(--dew-text-secondary, #909399); }
/* 色块配色（与 CampAttendance 一致） */
.cell-present { background: rgba(103, 194, 58, .18); color: #67c23a; }
.cell-late, .cell-short_hours { background: rgba(230, 162, 60, .18); color: #e6a23c; }
.cell-late_and_short { background: rgba(245, 108, 108, .20); color: #f56c6c; }
.cell-absent { background: rgba(144, 147, 153, .18); color: #909399; }
.cell-on_leave { background: rgba(64, 158, 255, .18); color: #409eff; }
</style>
