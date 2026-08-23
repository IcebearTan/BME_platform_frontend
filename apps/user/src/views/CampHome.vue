<template>
  <!-- 方案 A 后本页退化为「招募着陆页」：成员/已分配者由 loadFeatured 直接 redirect 到 /camp 工作台，
       成员看板与快捷卡已迁入 /camp 的「看板」tab（CampOverview.vue） -->
  <div :class="['camp-home-view', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]" v-loading="loading">
    <div style="height: 60px;"></div>
    <MenuComponent />
    <div class="camp-home-wrap">

      <DewCard v-if="!loading && !session" variant="inset" size="lg" :no-hover="true">
        暂未开放营期，敬请期待。
      </DewCard>

      <!-- 非成员学员：营期简介（大气招募页） -->
      <template v-else-if="session && !isMember && isStudent">
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

      <!-- 非成员 staff（导生/老师/超管）：未分配提示，不申请 -->
      <template v-else-if="session && !isMember">
        <DewCard variant="inset" size="lg" :no-hover="true">
          你尚未被分配到该营期。导生/老师由管理员在「营期管理」中直接分配，无需申请加入。
        </DewCard>
      </template>

      <!-- 成员：不渲染内容，loadFeatured 已 redirect 到 /camp -->

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
                   :class="['day-row', { selected: joinSheet.selected.has(d.iso), disabled: d.disabled }]"
                   @click="d.disabled || toggleDay(d.iso)">
                <div class="day-main">
                  <div class="day-date">{{ d.label }}</div>
                  <div class="day-sub">{{ d.disabled ? d.why : d.weekday }}</div>
                </div>
                <div class="day-mark">
                  <el-icon class="day-check"><Check /></el-icon>
                </div>
              </div>
            </div>
            <div class="sheet-reason">
              <DewInput v-model="joinReason" type="textarea" :rows="2" placeholder="申请理由（可选，老师审批时可见）" />
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
import { DewCard, DewButton, DewInput } from '../components/ui';
import { ElMessage } from 'element-plus';
import { Calendar, Clock, User, Trophy, Check } from '@element-plus/icons-vue';
import { campService } from '../services/campService';

const store = useStore();
const router = useRouter();
const isDarkMode = computed(() => store.getters.isDarkMode);

const loading = ref(true);
const isStudent = computed(() => store.getters.role === 'student');
const session = ref(null);
const isMember = ref(false);
const myRequest = ref(null);
const joinSubmitting = ref(false);

async function loadFeatured() {
  const data = await campService.fetchFeatured();
  session.value = data.session || null;
  isMember.value = !!data.is_member;
  myRequest.value = data.my_request || null;
  // 成员/已分配者本页无事可做：直接回营期工作台（带上 sid 免二次选营）
  if (session.value && isMember.value) {
    router.replace({ path: '/camp', query: session.value.id ? { sid: session.value.id } : {} });
  }
}

// 选承诺出勤日 sheet（底部弹出，上下滚动多选营期范围内日期）
const joinSheet = reactive({ visible: false, selected: new Set() });
const joinReason = ref('');
const campDays = computed(() => {
  const s = session.value;
  if (!s) return [];
  const out = [];
  const wk = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const pad = (n) => String(n).padStart(2, '0');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let cur = new Date(s.start_date);
  const end = new Date(s.end_date);
  while (cur <= end) {
    const iso = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
    // 与后端 join_request_submit 同口径：过去日不可承诺；仅工作日营不含周末
    const past = cur < today;
    const weekend = cur.getDay() === 0 || cur.getDay() === 6;
    out.push({
      iso, label: `${cur.getMonth() + 1}/${cur.getDate()}`, weekday: wk[cur.getDay()],
      disabled: past || (s.weekdays_only && weekend),
      why: past ? '已过去' : '非工作日',
    });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
});
function openJoinSheet() {
  joinSheet.selected = new Set();
  joinReason.value = '';
  joinSheet.visible = true;
}
function closeJoinSheet() { joinSheet.visible = false; }
function toggleDay(iso) {
  if (joinSheet.selected.has(iso)) joinSheet.selected.delete(iso);
  else joinSheet.selected.add(iso);
}
async function submitJoin() {
  if (joinSubmitting.value) return;   // 重入护栏：防双击连发两个申请（第二个撞 409）
  if (!session.value || !joinSheet.selected.size) return;
  joinSubmitting.value = true;
  try {
    await campService.requestJoin(session.value.id, [...joinSheet.selected], joinReason.value.trim());
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
.day-row.disabled {
  cursor: not-allowed; opacity: 0.45;
  border-style: dashed;
}
.day-row.disabled:hover { transform: none; }
.day-row.selected {
  border-color: var(--color-success);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
}
.day-main { display: flex; flex-direction: column; gap: 2px; }
.day-date { font-size: 15px; font-weight: 600; color: var(--dew-text-heading); }
.day-sub { font-size: 12px; color: var(--dew-text-muted); }
.day-mark {
  width: 22px; height: 22px; border-radius: 50%;
  border: 2px solid var(--dew-text-faint);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s var(--dew-bounce);
  flex-shrink: 0;
}
.day-check {
  color: #fff;
  font-size: 13px;
  opacity: 0;
  transform: scale(0.5);
  transition: opacity 0.2s ease, transform 0.2s var(--dew-bounce);
}
.day-row.selected .day-mark {
  border-color: var(--color-success);
  background: var(--color-success);
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.18);
}
.day-row.selected .day-check {
  opacity: 1;
  transform: scale(1);
}
.sheet-reason { margin: 4px 0 12px; }
.sheet-footer { display: flex; gap: 10px; padding-top: 12px; border-top: 1px solid var(--dew-card-divider); }
.sheet-footer .dew-button { flex: 1; }
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s; }
.sheet-enter-active .join-sheet, .sheet-leave-active .join-sheet { transition: transform 0.3s var(--dew-bounce); }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .join-sheet, .sheet-leave-to .join-sheet { transform: translateY(100%); }
</style>
