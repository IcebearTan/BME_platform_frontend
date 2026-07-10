<template>
  <div :class="['camp-home-view', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]" v-loading="loading">
    <div style="height: 60px;"></div>
    <MenuComponent />
    <div class="camp-home-wrap">

      <DewCard v-if="!loading && !session" variant="inset" size="lg" :no-hover="true">
        暂未开放营期，敬请期待。
      </DewCard>

      <!-- 非成员：营期简介（大气招募页） -->
      <template v-else-if="session && !isMember">
        <div class="camp-intro">
          <!-- ① Hero：大标题 + 介绍 + 力连接图背景 -->
          <div class="intro-hero">
            <canvas ref="forceCanvas" class="force-canvas"></canvas>
            <div class="intro-hero-inner">
              <div class="intro-eyebrow">2026 暑期训练营 · 招募中</div>
              <h1 class="intro-title">{{ session.name }}</h1>
              <p class="intro-desc">加入营期，与同伴一起沉浸式学习、每日打卡考勤、累积有效时长；导生全程辅导，完成里程碑还可领取专属勋章。提交申请后由老师审批，通过即正式入营。</p>
            </div>
          </div>

          <!-- ② 特色卡片 -->
          <div class="intro-features">
            <DewCard v-for="f in features" :key="f.key" variant="inset" size="md" class="feature-card">
              <div class="feature-top">
                <div class="feature-icon" :style="{ background: f.color + '1f', color: f.color }">
                  <el-icon><component :is="f.icon" /></el-icon>
                </div>
                <div class="feature-title">{{ f.title }}</div>
              </div>
              <div class="feature-subtitle">{{ f.subtitle }}</div>
              <div class="feature-desc">{{ f.desc }}</div>
            </DewCard>
          </div>

          <!-- ③ 申请加入 -->
          <div class="intro-cta">
            <DewButton v-if="myRequest?.status === 'pending'" type="glass" size="lg" disabled>申请审核中…</DewButton>
            <DewButton v-else-if="myRequest?.status === 'rejected'" type="glass" size="lg" @click="openJoinSheet">上次未通过，重新申请</DewButton>
            <DewButton v-else type="glass" size="lg" @click="openJoinSheet">申请加入</DewButton>
            <div class="cta-hint">提交后由老师审批 · 通过即正式入营</div>
          </div>
        </div>
      </template>

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
              <span class="card-hint">已满足 {{ personal?.satisfied || 0 }} / 承诺 {{ personal?.pledged_days || 0 }} 天</span>
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

        <!-- ③ 出勤日历（营期所有天数） -->
        <DewCard variant="default" size="lg" :no-hover="true" class="heatmap-card">
          <template #header>
            <div class="card-title-row">
              <h3>出勤日历</h3>
              <span class="card-hint">已满足 {{ personal?.satisfied || 0 }} / 承诺 {{ personal?.pledged_days || 0 }} 天</span>
            </div>
          </template>
          <div class="heatmap">
            <div class="heat-grid">
              <div v-for="(c, i) in calendarCells" :key="i"
                   :class="['heat-cell', 'heat-' + (c.cell?.status || 'unpledged'), { today: c.date === todayStr }]">
                <span class="heat-day">{{ Number(c.date.slice(8)) }}</span>
                <span class="heat-dot"></span>
              </div>
            </div>
            <div class="legend">
              <span><span class="lg-dot lg-present"></span>出勤</span>
              <span><span class="lg-dot lg-on_leave"></span>请假</span>
              <span><span class="lg-dot lg-late"></span>迟到/不足</span>
              <span><span class="lg-dot lg-absent"></span>缺勤</span>
              <span><span class="lg-dot lg-unpledged"></span>未承诺</span>
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

      <!-- 选承诺出勤日 sheet（底部弹出，上下滚动多选） -->
      <transition name="sheet">
        <div v-if="joinSheet.visible" class="sheet-mask" @click.self="closeJoinSheet">
          <div class="join-sheet">
            <div class="sheet-grip"></div>
            <div class="sheet-header">
              <h3>选择承诺出勤日</h3>
              <span class="sheet-hint">勾选你计划出勤的日期 · 已选 {{ joinSheet.selected.size }} 天</span>
            </div>
            <div class="sheet-days">
              <div v-for="d in campDays" :key="d.iso"
                   :class="['day-row', { selected: joinSheet.selected.has(d.iso) }]"
                   @click="toggleDay(d.iso)">
                <div class="day-main">
                  <div class="day-date">{{ d.label }}</div>
                  <div class="day-sub">{{ d.weekday }}</div>
                </div>
                <div class="day-mark"></div>
              </div>
            </div>
            <div class="sheet-footer">
              <DewButton type="glass" @click="closeJoinSheet">取消</DewButton>
              <DewButton type="glass" :disabled="!joinSheet.selected.size" :loading="joinSubmitting" @click="submitJoin">确认承诺 {{ joinSheet.selected.size }} 天</DewButton>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import MenuComponent from '../components/MenuComponent.vue';
import { DewCard, DewButton } from '../components/ui';
import { ElMessage } from 'element-plus';
import { Calendar, Clock, User, Trophy } from '@element-plus/icons-vue';
import { campService } from '../services/campService';

const store = useStore();
const router = useRouter();
const isDarkMode = computed(() => store.getters.isDarkMode);

const loading = ref(true);
const isMentor = computed(() => store.getters.role === 'mentor');
const session = ref(null);
const isMember = ref(false);
const myRequest = ref(null);
const joinSubmitting = ref(false);
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
  { key: 'absent', label: '缺勤', color: 'var(--color-danger)' },
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
  return sorted.map((d) => ({ date: d, cell: daily.value[d] || { status: 'unpledged' } }));
});

function go(tab) { router.push({ path: '/camp', query: { tab } }); }

async function loadFeatured() {
  const data = await campService.fetchFeatured();
  session.value = data.session || null;
  isMember.value = !!data.is_member;
  myRequest.value = data.my_request || null;
  if (session.value && isMember.value) {
    if (isMentor.value) {
      const db = await campService.fetchDashboard(session.value.id);
      teamSummary.value = db.summary || null;
      const lv = await campService.fetchTeamLeaves(session.value.id);
      teamLeaves.value = lv.leaves || [];
    } else {
      const att = await campService.fetchMyAttendance(session.value.id);
      personal.value = att.personal || null;
      daily.value = att.daily || {};
      dates.value = att.dates || [];
    }
  }
}

// 选承诺出勤日 sheet（底部弹出，上下滚动多选营期范围内日期）
const joinSheet = reactive({ visible: false, selected: new Set() });
const campDays = computed(() => {
  const s = session.value;
  if (!s) return [];
  const out = [];
  const wk = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const pad = (n) => String(n).padStart(2, '0');
  let cur = new Date(s.start_date);
  const end = new Date(s.end_date);
  while (cur <= end) {
    const iso = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
    out.push({ iso, label: `${cur.getMonth() + 1}/${cur.getDate()}`, weekday: wk[cur.getDay()] });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
});
function openJoinSheet() {
  joinSheet.selected = new Set();
  joinSheet.visible = true;
}
function closeJoinSheet() { joinSheet.visible = false; }
function toggleDay(iso) {
  if (joinSheet.selected.has(iso)) joinSheet.selected.delete(iso);
  else joinSheet.selected.add(iso);
}
async function submitJoin() {
  if (!session.value || !joinSheet.selected.size) return;
  joinSubmitting.value = true;
  try {
    await campService.requestJoin(session.value.id, [...joinSheet.selected]);
    ElMessage.success('申请已提交，等待审批');
    joinSheet.visible = false;
    await loadFeatured();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '提交失败');
  } finally {
    joinSubmitting.value = false;
  }
}

// ── 特色卡片（基于营期数据）──
const features = computed(() => {
  const s = session.value;
  if (!s) return [];
  let days = 0;
  try {
    const a = new Date(s.start_date), b = new Date(s.end_date);
    days = Math.max(1, Math.round((b - a) / 86400000) + 1);
  } catch { days = 0; }
  return [
    { key: 'dur', icon: Calendar, title: days ? days + ' 天' : '营期', subtitle: s.start_date + ' ~ ' + s.end_date, desc: '完整周期 · 系统化推进', color: '#6366f1' },
    { key: 'hrs', icon: Clock, title: s.min_daily_hours != null ? s.min_daily_hours + ' h' : '弹性', subtitle: '每日有效时长', desc: s.expected_check_in ? '期望 ' + s.expected_check_in + ' 到岗' : '弹性考勤 · 累积有效时长', color: '#06b6d4' },
    { key: 'mentor', icon: User, title: '导生辅导', subtitle: '团队互助', desc: '导生答疑带学 · 同伴一起进步', color: '#ec4899' },
    { key: 'reward', icon: Trophy, title: '勋章奖励', subtitle: '里程碑激励', desc: '完成阶段目标 · 领取专属徽章', color: '#f59e0b' },
  ];
});

// ── 力连接图（canvas 粒子+连线，非成员视图背景，纯 JS 无依赖）──
const forceCanvas = ref(null);
let _rafId = null;
function startForceGraph() {
  const canvas = forceCanvas.value;
  if (!canvas) return;
  const host = canvas.parentElement;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  let W = 0, H = 0;
  const resize = () => {
    const r = host.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);
  const N = Math.max(24, Math.min(50, Math.floor(W / 30)));
  const dots = Array.from({ length: N }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
  }));
  const MAXD = 130;
  const tick = () => {
    const dark = isDarkMode.value;
    const dotC = dark ? 'rgba(190,205,255,' : 'rgba(99,102,241,';
    const lineC = dark ? 'rgba(150,170,225,' : 'rgba(99,102,241,';
    ctx.clearRect(0, 0, W, H);
    for (const d of dots) {
      d.x += d.vx; d.y += d.vy;
      if (d.x < 0 || d.x > W) d.vx *= -1;
      if (d.y < 0 || d.y > H) d.vy *= -1;
    }
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
        const dist = Math.hypot(dx, dy);
        if (dist < MAXD) {
          const a = (1 - dist / MAXD) * (dark ? 0.2 : 0.32);
          ctx.strokeStyle = lineC + a.toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(dots[i].x, dots[i].y);
          ctx.lineTo(dots[j].x, dots[j].y);
          ctx.stroke();
        }
      }
    }
    for (const d of dots) {
      ctx.fillStyle = dotC + (dark ? 0.55 : 0.7) + ')';
      ctx.beginPath();
      ctx.arc(d.x, d.y, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
    _rafId = requestAnimationFrame(tick);
  };
  tick();
  canvas._cleanup = () => window.removeEventListener('resize', resize);
}
function stopForceGraph() {
  if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
  if (forceCanvas.value && forceCanvas.value._cleanup) forceCanvas.value._cleanup();
}
watch([session, isMember], () => {
  stopForceGraph();
  if (session.value && !isMember.value) nextTick(startForceGraph);
});
onUnmounted(stopForceGraph);

onMounted(async () => {
  loading.value = true;
  try { await loadFeatured(); }
  catch { ElMessage.error('加载营期主页失败'); }
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
.heat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(46px, 1fr)); gap: 6px; }
.heat-cell { aspect-ratio: 1; border-radius: var(--radius-md); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; transition: transform 0.2s var(--dew-bounce); }
.heat-cell:hover { transform: scale(1.08); }
.heat-day { font-size: 12px; font-weight: 500; color: var(--dew-text); }
.heat-dot { width: 5px; height: 5px; border-radius: 50%; }
.heat-cell.today { outline: 2px solid var(--color-primary); outline-offset: -2px; }
.legend { display: flex; gap: 16px; margin-top: 14px; font-size: 12px; color: var(--dew-text-muted); flex-wrap: wrap; }
.legend span { display: flex; align-items: center; gap: 5px; }
.lg-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.lg-present { background: var(--color-success); }
.lg-on_leave { background: var(--color-info); }
.lg-late { background: var(--color-warning); }
.lg-absent { background: var(--color-danger); }
.lg-future { background: var(--color-info); opacity: 0.35; }
.lg-unpledged { background: var(--dew-text-faint); opacity: 0.4; }
.heat-present { background: rgba(16, 185, 129, 0.12); } .heat-present .heat-dot { background: var(--color-success); }
.heat-late, .heat-short_hours { background: rgba(245, 158, 11, 0.12); } .heat-late .heat-dot, .heat-short_hours .heat-dot { background: var(--color-warning); }
.heat-late_and_short { background: rgba(239, 68, 68, 0.12); } .heat-late_and_short .heat-dot { background: var(--color-danger); }
.heat-absent { background: rgba(239, 68, 68, 0.14); } .heat-absent .heat-dot { background: var(--color-danger); }
.heat-on_leave { background: rgba(99, 102, 241, 0.12); } .heat-on_leave .heat-dot { background: var(--color-info); }
.heat-unpledged { background: transparent; border: 1px dashed rgba(150,150,150,0.3); } .heat-unpledged .heat-dot { background: transparent; } .heat-unpledged .heat-day { color: var(--dew-text-faint); opacity: 0.5; }
.heat-pledged { background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.35); } .heat-pledged .heat-dot { background: var(--color-info); opacity: 0.5; } .heat-pledged .heat-day { color: var(--color-info); }

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

/* ── 营期简介（非成员招募页） ── */
.camp-intro { display: flex; flex-direction: column; gap: 20px; }
.intro-hero {
  position: relative; height: 420px; overflow: hidden;
  border-radius: var(--radius-lg);
  border: 1px solid var(--dew-card-border);
  background: var(--dew-card-bg);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
}
.force-canvas { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.intro-hero-inner {
  position: relative; z-index: 1; height: 100%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 32px 24px;
}
.intro-eyebrow {
  font-size: 12px; letter-spacing: 3px; color: var(--color-info);
  margin-bottom: 14px; font-weight: 600;
}
.intro-title {
  font-size: 46px; font-weight: 800; margin: 0 0 18px; letter-spacing: 1px;
  background: linear-gradient(135deg, var(--dew-text-heading), var(--color-info));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.intro-desc { max-width: 600px; margin: 0; font-size: 15px; line-height: 1.8; color: var(--dew-text-muted); }
.intro-features { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.feature-card { text-align: center; }
.feature-top { display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 6px; }
.feature-icon { width: 46px; height: 46px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; }
.feature-icon .el-icon { font-size: 22px; }
.feature-title { font-size: 20px; font-weight: 700; color: var(--dew-text-heading); }
.feature-subtitle { font-size: 12px; color: var(--color-info); margin-bottom: 4px; font-weight: 600; }
.feature-desc { font-size: 12px; color: var(--dew-text-muted); line-height: 1.5; }
.intro-cta { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 4px 0 12px; }
.cta-hint { font-size: 12px; color: var(--dew-text-faint); }
@media (max-width: 900px) { .intro-features { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) {
  .intro-features { grid-template-columns: 1fr; }
  .intro-title { font-size: 34px; }
  .intro-hero { height: 360px; }
}

/* 选日 sheet（底部弹出） */
.sheet-mask {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0,0,0,0.45);
  display: flex; align-items: flex-end; justify-content: center;
  backdrop-filter: blur(4px);
}
.join-sheet {
  width: 100%; max-width: 520px; max-height: 80vh;
  background: var(--dew-card-bg);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  border: 1px solid var(--dew-card-border);
  box-shadow: 0 -8px 40px rgba(0,0,0,0.2);
  display: flex; flex-direction: column;
  padding: 12px 20px 20px;
}
.sheet-grip { width: 40px; height: 4px; border-radius: 999px; background: var(--dew-text-faint); opacity: 0.4; margin: 0 auto 12px; }
.sheet-header h3 { margin: 0 0 4px; font-size: 17px; color: var(--dew-text-heading); }
.sheet-hint { font-size: 12px; color: var(--dew-text-muted); }
.sheet-days {
  flex: 1; overflow-y: auto; margin: 14px 0; padding-right: 4px;
  display: flex; flex-direction: column; gap: 8px;
}
.day-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; border-radius: var(--radius-md);
  border: 1px solid var(--dew-card-border);
  background: var(--dew-card-bg);
  cursor: pointer; transition: all 0.25s var(--dew-bounce);
}
.day-row:hover { transform: translateY(-1px); }
.day-row.selected {
  border-color: var(--color-info);
  background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05));
}
.day-main { display: flex; flex-direction: column; gap: 2px; }
.day-date { font-size: 15px; font-weight: 600; color: var(--dew-text-heading); }
.day-sub { font-size: 12px; color: var(--dew-text-muted); }
.day-mark { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--dew-text-faint); transition: all 0.2s; flex-shrink: 0; }
.day-row.selected .day-mark { border-color: var(--color-info); background: var(--color-info); box-shadow: 0 0 0 4px rgba(99,102,241,0.18); }
.sheet-footer { display: flex; gap: 10px; padding-top: 12px; border-top: 1px solid var(--dew-card-divider); }
.sheet-footer .dew-button { flex: 1; }
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-active .join-sheet, .sheet-leave-active .join-sheet { transition: transform 0.3s var(--dew-bounce); }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .join-sheet, .sheet-leave-to .join-sheet { transform: translateY(100%); }
</style>
