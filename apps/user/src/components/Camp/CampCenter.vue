<template>
  <div class="camp-center">
    <!-- 页头 -->
    <header class="center-head">
      <h1 class="center-title">营期中心</h1>
      <p class="center-sub">你的营期都汇聚在这里——要处理的、正在进行的、可以报名的，一眼看清。</p>
    </header>

    <!-- 加载中 -->
    <div v-if="loading" class="center-loading">
      <DewSkeleton variant="rect" width="100%" height="160" rounded="8px" />
    </div>

    <!-- 完全无营期：featured 招募引导 / 暂无营期 -->
    <DewCard v-else-if="!groups.length" variant="inset" size="lg" :no-hover="true" class="center-empty">
      <template v-if="emptyGuide.type === 'recruit'">
        <div class="empty-text">你还没有加入营期。</div>
        <DewButton type="glass" @click="$router.push('/camp-home')">
          查看「{{ emptyGuide.name }}」· 申请入营
        </DewButton>
      </template>
      <div v-else-if="emptyGuide.type === 'unassigned'" class="empty-text">
        你尚未被分配到营期。导生/老师由管理员在「营期管理」中直接分配，无需申请加入。
      </div>
      <div v-else class="empty-text">暂未开放营期，敬请期待。</div>
    </DewCard>

    <!-- 分组卡片 -->
    <section v-for="g in groups" :key="g.key" class="center-group">
      <div class="group-head">
        <span class="group-title">{{ g.title }}</span>
        <span class="group-count">{{ g.items.length }}</span>
        <span v-if="g.hint" class="group-hint">{{ g.hint }}</span>
      </div>
      <div class="group-grid">
        <DewCard v-for="s in g.items" :key="s.id" variant="default" size="md" class="camp-card">
          <!-- 卡片头：类型 + 周期 + 状态徽章 -->
          <div class="card-top">
            <span class="card-kind" :class="'kind-' + s.category">{{ CATEGORY_LABEL[s.category] || s.category }}</span>
            <span class="card-cycle">{{ s.cycle_name || '' }}</span>
            <span class="card-status" :class="'st-' + s.status">
              <span class="status-dot" :class="'dot-status-' + s.status"></span>{{ STATUS_LABEL[s.status] || s.status }}
            </span>
          </div>
          <h3 class="card-name" :title="s.name">{{ s.name }}</h3>
          <div class="card-meta">
            <span>{{ s.start_date?.slice(5) }} ~ {{ s.end_date?.slice(5) }}</span>
            <span class="meta-sep">·</span>
            <span>{{ s.member_count }} 人</span>
            <span v-if="deadlineText(s)" class="meta-sep">·</span>
            <span v-if="deadlineText(s)" class="meta-deadline">{{ deadlineText(s) }}</span>
          </div>
          <!-- 身份行 + 唯一入口：身份/报名状态只显示在身份行一处；
               所有卡统一「进入营期」按钮（位置名称一致），报名/交志愿等动作在营期工作台内完成 -->
          <div class="card-foot">
            <span class="card-role" :class="roleClass(s)">{{ roleText(s) }}</span>
            <DewButton size="sm" @click="open(s)">进入营期</DewButton>
          </div>
        </DewCard>
      </div>
    </section>

    <!-- 报名在营期工作台内进行（CampJoin：意向大组 + 承诺到岗日 + 理由），中心只负责导航 -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { DewCard, DewButton, DewSkeleton } from '@bme/dew-ui';
import { campService } from '../../services/campService';

const props = defineProps({
  sessions: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  // 待审核申请集合：{ mentor: Set<sid>, student: Set<sid> }（CampView 统一拉 mine）
  pending: { type: Object, required: true },
  isStaff: { type: Boolean, default: false },
});
const emit = defineEmits(['open']);
// open(session)：进入营期工作台（CampView 设 sid）。中心只做导航——
// 导生报名/学员报名/交志愿等所有动作统一在营期工作台内完成（报名进工作台，用户 09-02 定）

// ── 文案映射（与 CampView 工作台同一套五态/类型词汇）──
const STATUS_LABEL = {
  draft: '草稿', upcoming: '待开放', selecting: '选择阶段', running: '进行中', archived: '已结营',
};
const CATEGORY_LABEL = { learning: '培训营', project: '项目营' };

const isMentorPending = (s) => props.pending.mentor.has(s.id);
const isStudentPending = (s) => props.pending.student.has(s.id);

// ── 分组（待我处理 → 可报名 → 我的营期 → 即将开始 → 历史；空组隐藏）──
const groups = computed(() => {
  const ss = props.sessions;
  const define = (key, title, hint, items) => (items.length ? { key, title, hint, items } : null);
  return [
    define('todo', '待我处理', '导生资格名单内的营，报名后待管理员审核',
      ss.filter((s) => s.status === 'upcoming' && !s.is_member && s.has_eligibility)),
    define('joinable', '可报名', '选择阶段的营，提交申请待审批',
      // 超管不显示可报名组（后端 camp.py 管理员报名一律 400，预判入口而非事后报错）
      ss.filter((s) => s.status === 'selecting' && !s.is_member && !props.isStaff)),
    define('mine', '我的营期', null,
      ss.filter((s) => s.is_member && s.status !== 'archived')),
    define('upcoming', '即将开始', '尚未开放报名的营',
      ss.filter((s) => s.status === 'upcoming' && !s.is_member && !s.has_eligibility)),
    define('history', '历史营期', null,
      ss.filter((s) => s.is_member && s.status === 'archived')),
  ].filter(Boolean);
});

// 卡片身份行
function roleText(s) {
  if (s.is_member) return s.my_role === 'mentor' ? '导生' : '学员';
  if (isMentorPending(s)) return '导生报名待审核';
  if (isStudentPending(s)) return '入营申请待审核';
  if (s.has_eligibility) return '资格名单内';
  return '未参与';
}
function roleClass(s) {
  if (s.is_member) return s.my_role === 'mentor' ? 'role-mentor' : 'role-member';
  if (isMentorPending(s) || isStudentPending(s)) return 'role-pending';
  return 'role-none';
}

// 截止/阶段提示（U-2，用户 09-11 定：结束临近给简单提示，别杂乱）
// 单 span 内并列：报名进行中（selecting）· 仅剩 N 天（结束 ≤7 天，含今日）；非 archived 才提示
function deadlineText(s) {
  const parts = [];
  if (s.status === 'selecting') parts.push('报名进行中');
  const left = daysLeft(s.end_date);
  if (left != null && left >= 0 && left <= 7 && s.status !== 'archived') {
    parts.push(left === 0 ? '今日结束' : `仅剩 ${left} 天`);
  }
  return parts.join(' · ');
}
function daysLeft(end) {
  if (!end) return null;
  const d = new Date(`${String(end).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function open(s) {
  emit('open', s);
}

// ── 完全空态：featured 招募引导（与原工作台空态同一分流：学生 recruit / staff unassigned）──
const emptyGuide = ref({ type: 'none', name: '' });
onMounted(async () => {
  if (props.sessions.length) return;
  try {
    const f = await campService.fetchFeatured();
    if (f.session) {
      emptyGuide.value = props.isStaff
        ? { type: 'unassigned' }
        : { type: 'recruit', name: f.session.name };
    }
  } catch { /* featured 拉失败按暂无营期展示 */ }
});
</script>

<style scoped>
.camp-center { display: flex; flex-direction: column; gap: 24px; }
.center-head { padding: 4px 0 0; }
.center-title { font-size: 24px; font-weight: 700; margin: 0 0 6px; color: var(--dew-text-heading); letter-spacing: 0.5px; }
.center-sub { font-size: 13.5px; color: var(--dew-text-muted); margin: 0; }
.center-loading { padding: 8px 0; }
.center-empty :deep(.dew-card__body) { text-align: left; }
.empty-text { color: var(--dew-text-muted, #909399); line-height: 1.7; margin-bottom: 12px; }

/* 分组 */
.center-group { display: flex; flex-direction: column; gap: 12px; }
.group-head { display: flex; align-items: baseline; gap: 8px; }
.group-title { font-size: 14px; font-weight: 600; color: var(--dew-text-heading); letter-spacing: 0.5px; }
.group-count {
  min-width: 20px; height: 18px; padding: 0 6px; border-radius: 999px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 600; color: var(--dew-text-muted);
  background: color-mix(in srgb, var(--dew-text-faint) 14%, transparent);
}
.group-hint { font-size: 12px; color: var(--dew-text-faint); }
.group-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }

/* 卡片 */
.camp-card { display: flex; flex-direction: column; }
.card-top { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.card-kind {
  font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.5px;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
}
.card-kind.kind-project {
  color: var(--color-warning);
  background: color-mix(in srgb, var(--color-warning) 12%, transparent);
}
.card-cycle { font-size: 12px; color: var(--dew-text-faint); }
.card-status { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--dew-text-muted); }
.card-name {
  font-size: 16.5px; font-weight: 600; color: var(--dew-text-heading); margin: 0 0 8px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.card-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 12.5px; color: var(--dew-text-muted); }
.meta-sep { color: var(--dew-text-faint); }
.meta-deadline { color: var(--color-warning); }

/* 状态圆点（与 CampView 工作台同款五态） */
.status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.dot-status-draft { background: var(--dew-text-faint); }
.dot-status-upcoming { background: var(--color-info); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-info) 18%, transparent); }
.dot-status-selecting { background: var(--color-warning); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-warning) 18%, transparent); }
.dot-status-running { background: var(--color-success); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-success) 18%, transparent); }
.dot-status-archived { background: var(--dew-text-faint); opacity: 0.6; }

/* 卡片底：身份/报名状态（唯一显示位置）+ 统一入口按钮 */
.card-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 14px; }
.card-role { font-size: 12px; font-weight: 600; letter-spacing: 0.3px; }
.role-member { color: var(--color-success); }
.role-mentor { color: var(--color-primary); }
.role-pending { color: var(--color-warning); }
.role-none { color: var(--dew-text-faint); font-weight: 400; }

/* 窄屏：卡片单列 */
@media (max-width: 760px) {
  .group-grid { grid-template-columns: 1fr; }
}
</style>
