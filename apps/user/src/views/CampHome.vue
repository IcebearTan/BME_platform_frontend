<template>
  <div :class="['camp-home-view', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]" v-loading="loading">
    <div style="height: 60px;"></div>
    <MenuComponent />
    <div class="camp-home-wrap">

      <DewCard v-if="!loading && !session" variant="inset" size="lg" :no-hover="true">
        你还没有加入任何进行中的营期。
      </DewCard>

      <template v-else-if="session">
        <!-- ① Hero -->
        <DewCard glass variant="default" size="lg" class="hero-card">
          <div class="hero-eyebrow">我的营期</div>
          <h1 class="hero-title">{{ session.name }}</h1>
          <div class="hero-sub">
            <span class="status-dot" :class="'dot-status-' + session.status"></span>
            <span>{{ statusLabel(session.status) }}</span>
            <span class="sep">·</span>
            <span>{{ session.start_date }} ~ {{ session.end_date }}</span>
          </div>
          <div class="hero-progress">
            <div class="hero-bar"><div class="hero-bar-fill" :style="{ width: progress.pct + '%' }"></div></div>
            <div class="progress-meta">
              <span>营期进度</span>
              <span class="progress-num">{{ progress.elapsed }} / {{ progress.total }} 天 · {{ progress.pct }}%</span>
            </div>
          </div>
        </DewCard>

        <!-- ━━ 导生：团队概览 ━━ -->
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
                <el-progress type="circle" :percentage="teamRatePct" :width="132" :stroke-width="9" color="#6366f1" :show-text="false">
                  <template #default>
                    <div class="ring-center">
                      <div class="ring-num">{{ teamRatePct }}<span class="ring-pct">%</span></div>
                      <div class="ring-label">团队达标率</div>
                    </div>
                  </template>
                </el-progress>
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
          <div class="shortcut-row" style="margin-top: 16px;">
            <DewCard variant="default" size="md" :interactive="true" class="shortcut" @click="go('dashboard')">
              <div class="sc-icon sc-icon-info">勤</div>
              <div class="sc-title">团队考勤</div>
              <div class="sc-desc">明细矩阵</div>
            </DewCard>
            <DewCard variant="default" size="md" :interactive="true" class="shortcut" @click="go('leave')">
              <div class="sc-icon sc-icon-warning">假</div>
              <div class="sc-title">请假审批</div>
              <div class="sc-desc">待批 {{ pendingCount }}</div>
            </DewCard>
            <DewCard variant="default" size="md" :interactive="true" class="shortcut" @click="go('reward')">
              <div class="sc-icon sc-icon-primary">奖</div>
              <div class="sc-title">发奖励</div>
              <div class="sc-desc">给学员发勋章</div>
            </DewCard>
            <DewCard variant="default" size="md" :interactive="true" class="shortcut" @click="go('members')">
              <div class="sc-icon sc-icon-info">员</div>
              <div class="sc-title">团队成员</div>
              <div class="sc-desc">名册</div>
            </DewCard>
          </div>
        </template>

        <!-- ━━ 学员：我的出勤仪表盘 + 日历 + 规则 + 快捷 ━━ -->
        <template v-else>
        <!-- ② 出勤仪表盘 -->
        <DewCard variant="default" size="lg" :no-hover="true" class="dashboard-card">
          <template #header>
            <div class="card-title-row">
              <h3>我的出勤</h3>
              <span class="card-hint">承诺 {{ personal?.planned_days || 0 }} 个出勤日</span>
            </div>
          </template>
          <div class="dashboard-body">
            <div class="ring-wrap">
              <el-progress type="circle" :percentage="ratePct" :width="132" :stroke-width="9"
                color="#6366f1" :show-text="false">
                <template #default>
                  <div class="ring-center">
                    <div class="ring-num">{{ ratePct }}<span class="ring-pct">%</span></div>
                    <div class="ring-label">达标率</div>
                  </div>
                </template>
              </el-progress>
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

        <!-- ③ 承诺日热力日历 -->
        <DewCard variant="default" size="lg" :no-hover="true" class="heatmap-card">
          <template #header>
            <div class="card-title-row">
              <h3>承诺出勤日历</h3>
              <span class="card-hint">{{ personal?.present || 0 }} 天出勤 · {{ personal?.absent || 0 }} 天缺勤</span>
            </div>
          </template>
          <div class="heatmap">
            <div class="heat-weekrow">
              <span v-for="w in ['一','二','三','四','五','六','日']" :key="w" class="heat-weekday">{{ w }}</span>
            </div>
            <div class="heat-grid">
              <div v-for="(c, i) in calendarCells" :key="i"
                   :class="['heat-cell', c.empty ? 'heat-empty' : 'heat-' + c.cell.status, { today: c.date === todayStr }]">
                <template v-if="!c.empty">
                  <span class="heat-day">{{ Number(c.date.slice(8)) }}</span>
                  <span class="heat-dot"></span>
                </template>
              </div>
            </div>
            <div class="legend">
              <span><span class="lg-dot lg-present"></span>出勤</span>
              <span><span class="lg-dot lg-on_leave"></span>请假</span>
              <span><span class="lg-dot lg-late"></span>迟到/不足</span>
              <span><span class="lg-dot lg-absent"></span>缺勤</span>
            </div>
          </div>
        </DewCard>

        <!-- ④ 营期规则 + 快捷入口 -->
        <el-row :gutter="16" class="bottom-row">
          <el-col :xs="24" :span="10">
            <DewCard variant="inset" size="md" :no-hover="true" class="rule-card">
              <template #header><h3>营期规则</h3></template>
              <div class="rule-row"><span>期望到岗</span><b>{{ session.expected_check_in || '—' }}</b></div>
              <div class="rule-row"><span>每日最低时长</span><b>{{ session.min_daily_hours != null ? session.min_daily_hours + ' h' : '—' }}</b></div>
              <div class="rule-row"><span>出勤日</span><b>{{ session.weekdays_only ? '仅工作日' : '含周末' }}</b></div>
            </DewCard>
          </el-col>
          <el-col :xs="24" :span="14">
            <div class="shortcut-row">
              <DewCard variant="default" size="md" :interactive="true" class="shortcut" @click="go('selection')">
                <div class="sc-icon sc-icon-primary">选</div>
                <div class="sc-title">选课</div>
                <div class="sc-desc">营期可选课程</div>
              </DewCard>
              <DewCard variant="default" size="md" :interactive="true" class="shortcut" @click="go('attendance')">
                <div class="sc-icon sc-icon-info">勤</div>
                <div class="sc-title">完整考勤</div>
                <div class="sc-desc">每日明细</div>
              </DewCard>
              <DewCard variant="default" size="md" :interactive="true" class="shortcut" @click="go('leave')">
                <div class="sc-icon sc-icon-warning">假</div>
                <div class="sc-title">请假</div>
                <div class="sc-desc">申请与记录</div>
              </DewCard>
            </div>
          </el-col>
        </el-row>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import MenuComponent from '../components/MenuComponent.vue';
import { DewCard } from '../components/ui';
import { ElMessage } from 'element-plus';
import { campService } from '../services/campService';

const store = useStore();
const router = useRouter();
const isDarkMode = computed(() => store.getters.isDarkMode);

const loading = ref(true);
const isMentor = computed(() => store.getters.role === 'mentor');
const session = ref(null);
const personal = ref(null);
const daily = ref({});
const dates = ref([]);
const teamSummary = ref(null);   // 导生：本团队 dashboard.summary
const teamLeaves = ref([]);      // 导生：本团队请假

const statusLabel = (s) => ({ draft: '未开始', active: '进行中', archived: '已结束' }[s] || s);
const ratePct = computed(() => Math.round((personal.value?.attendance_rate || 0) * 100));

const STATS_DEF = [
  { key: 'present', label: '出勤', color: 'var(--color-success)' },
  { key: 'late', label: '迟到', color: 'var(--color-warning)' },
  { key: 'short_hours', label: '时长不足', color: 'var(--color-warning)' },
  { key: 'late_and_short', label: '迟到+不足', color: 'var(--color-danger)' },
  { key: 'absent', label: '缺勤', color: 'var(--dew-text-faint)' },
  { key: 'on_leave', label: '请假', color: 'var(--color-info)' },
];
const stats = computed(() => STATS_DEF.map((s) => ({ ...s, value: personal.value?.[s.key] || 0 })));

// 导生团队汇总
const teamRatePct = computed(() => Math.round((teamSummary.value?.attendance_rate || 0) * 100));
const teamStats = computed(() => STATS_DEF.map((s) => ({ ...s, value: teamSummary.value?.[s.key] || 0 })));
const pendingCount = computed(() => teamLeaves.value.filter((l) => l.status === 'pending').length);

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
  for (const d of sorted) cells.push({ date: d, cell: daily.value[d] || { status: 'absent' } });
  while (cells.length % 7 !== 0) cells.push({ empty: true });
  return cells;
});

function go(tab) { router.push({ path: '/camp', query: { tab } }); }

onMounted(async () => {
  loading.value = true;
  try {
    const data = await campService.fetchSessions();
    const list = data.sessions || [];
    const active = list.find((s) => s.status === 'active') || list[0] || null;
    if (!active) { session.value = null; return; }
    session.value = active;
    if (isMentor.value) {
      const db = await campService.fetchDashboard(active.id);
      teamSummary.value = db.summary || null;
      const lv = await campService.fetchTeamLeaves(active.id);
      teamLeaves.value = lv.leaves || [];
    } else {
      const att = await campService.fetchMyAttendance(active.id);
      personal.value = att.personal || null;
      daily.value = att.daily || {};
      dates.value = att.dates || [];
    }
  } catch { ElMessage.error('加载营期主页失败'); }
  finally { loading.value = false; }
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
.camp-home-wrap { max-width: 1080px; margin: 0 auto; padding: 24px 20px 40px; }

/* Hero */
.hero-card { margin-bottom: 16px; }
.hero-eyebrow { font-size: 12px; letter-spacing: 2px; color: var(--dew-text-faint); margin-bottom: 6px; }
.hero-title { font-size: 28px; font-weight: 700; margin: 0 0 10px; color: var(--dew-text-heading); letter-spacing: 0.5px; }
.hero-sub { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--dew-text-muted); }
.status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dot-status-active { background: var(--color-success); box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18); }
.dot-status-draft { background: var(--dew-text-faint); }
.dot-status-archived { background: var(--color-warning); }
.hero-sub .sep { color: var(--dew-text-faint); }
.hero-progress { margin-top: 18px; }
.hero-bar { height: 6px; background: rgba(0, 0, 0, 0.06); border-radius: var(--radius-full); overflow: hidden; }
.hero-bar-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #6366f1); border-radius: var(--radius-full); transition: width 0.6s var(--dew-bounce); }
.progress-meta { display: flex; justify-content: space-between; font-size: 12px; color: var(--dew-text-muted); margin-top: 8px; }
.progress-num { font-weight: 600; color: var(--dew-text-heading); }

/* common card title */
.dashboard-card, .heatmap-card { margin-bottom: 16px; }
.card-title-row { display: flex; justify-content: space-between; align-items: baseline; }
.card-title-row h3 { margin: 0; font-size: 15px; }
.card-hint { font-size: 12px; color: var(--dew-text-faint); }

/* dashboard */
.dashboard-body { display: flex; align-items: center; gap: 28px; flex-wrap: wrap; }
.ring-wrap { flex-shrink: 0; }
.ring-center { text-align: center; }
.ring-num { font-size: 28px; font-weight: 700; color: var(--color-info); line-height: 1; }
.ring-pct { font-size: 14px; font-weight: 600; }
.ring-label { font-size: 12px; color: var(--dew-text-muted); margin-top: 4px; }
.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px 24px; flex: 1; min-width: 240px; }
.stat-item { display: flex; align-items: center; gap: 8px; }
.stat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.stat-num { font-size: 18px; font-weight: 600; color: var(--dew-text-heading); }
.stat-label { font-size: 12px; color: var(--dew-text-muted); }

/* heatmap */
.heat-weekrow { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 8px; }
.heat-weekday { text-align: center; font-size: 11px; color: var(--dew-text-faint); }
.heat-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.heat-cell { aspect-ratio: 1; border-radius: var(--radius-md); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; transition: transform 0.2s var(--dew-bounce); }
.heat-cell:hover { transform: scale(1.08); }
.heat-empty { background: transparent; }
.heat-day { font-size: 12px; font-weight: 500; color: var(--dew-text); }
.heat-dot { width: 5px; height: 5px; border-radius: 50%; }
.heat-cell.today { outline: 2px solid var(--color-primary); outline-offset: -2px; }
.legend { display: flex; gap: 16px; margin-top: 14px; font-size: 12px; color: var(--dew-text-muted); flex-wrap: wrap; }
.legend span { display: flex; align-items: center; gap: 5px; }
.lg-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.lg-present { background: var(--color-success); }
.lg-on_leave { background: var(--color-info); }
.lg-late { background: var(--color-warning); }
.lg-absent { background: var(--dew-text-faint); }
.heat-present { background: rgba(16, 185, 129, 0.12); } .heat-present .heat-dot { background: var(--color-success); }
.heat-late, .heat-short_hours { background: rgba(245, 158, 11, 0.12); } .heat-late .heat-dot, .heat-short_hours .heat-dot { background: var(--color-warning); }
.heat-late_and_short { background: rgba(239, 68, 68, 0.12); } .heat-late_and_short .heat-dot { background: var(--color-danger); }
.heat-absent { background: rgba(156, 163, 175, 0.14); } .heat-absent .heat-dot { background: var(--dew-text-faint); }
.heat-on_leave { background: rgba(99, 102, 241, 0.12); } .heat-on_leave .heat-dot { background: var(--color-info); }

/* bottom */
.bottom-row { margin-bottom: 16px; }
.rule-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
.rule-row span { color: var(--dew-text-muted); }
.rule-row b { color: var(--dew-text-heading); font-weight: 600; }
.shortcut-row { display: flex; gap: 12px; height: 100%; }
.shortcut { flex: 1; min-width: 0; }
.sc-icon { width: 38px; height: 38px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; font-size: 16px; margin-bottom: 10px; }
.sc-icon-primary { background: linear-gradient(135deg, #3b82f6, #6366f1); }
.sc-icon-info { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
.sc-icon-warning { background: linear-gradient(135deg, #f59e0b, #f97316); }
.sc-title { font-weight: 600; font-size: 14px; color: var(--dew-text-heading); margin-bottom: 2px; }
.sc-desc { font-size: 12px; color: var(--dew-text-muted); }
</style>
