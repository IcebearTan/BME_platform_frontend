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

    <!-- 完全无营期：居中空态（featured 招募引导 / 未分配 / 暂无营期三分流） -->
    <DewCard v-else-if="!groups.length" variant="inset" size="lg" :no-hover="true" class="center-empty">
      <div class="empty-core">
        <div class="empty-title">这里空空如也</div>
        <div class="empty-sub">
          <template v-if="emptyGuide.type === 'recruit'">你还没有加入任何营期</template>
          <template v-else-if="emptyGuide.type === 'unassigned'">
            你尚未被分配到营期——导生/老师由管理员在「营期管理」中直接分配，无需申请加入。
          </template>
          <template v-else>暂未开放营期，敬请期待</template>
        </div>
        <DewButton v-if="emptyGuide.type === 'recruit'" type="glass" @click="$router.push('/camp-home')">
          查看「{{ emptyGuide.name }}」· 申请入营
        </DewButton>
      </div>
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

    <!-- 报名在营期工作台内进行（CampJoin：承诺到岗日 + 理由，组别随归属导生继承），中心只负责导航 -->
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
  // 当前用户等级（导生可报名组判定：LV≥2 才分组展示，2026-09-12 自由报名）
  myLevel: { type: Number, default: 1 },
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

// ── 分组（导生可报名 → 可报名 → 我的营期 → 即将开始 → 进行中 → 历史 → 其他；
//    兜底组吃掉剩余状态机组合，任何营不落空；空组隐藏）──
const groups = computed(() => {
  const ss = props.sessions;
  // 导生报名窗口内的待开放营（自由报名，2026-09-12）：09-16 起 LV1 也见本组
  // （hint 告知 LV2 门槛——等级规则不该到 LV2 才被看见），与「即将开始」互斥；
  // 仅 learning 营（项目营无导生身份，申报入口在 ProjectApplyCard）
  const mentorTodo = (s) => s.status === 'upcoming' && !s.is_member
    && s.category === 'learning' && !props.isStaff;
  // 负责人的营不进报名/旁观组（已入「我管理的营期」；身份行也以负责人优先）
  const notStaff = (s) => !s.my_staff_role;
  // taken 记账：已入组的营不再重复，剩余进兜底组（如超管视角的 selecting 营、draft 草稿）
  const taken = new Set();
  const pick = (arr) => { arr.forEach((s) => taken.add(s.id)); return arr; };
  const define = (key, title, hint, items) => (items.length ? { key, title, hint, items } : null);
  // 09-17 门槛营期行可配置：组内存在关闭门槛的营时，LV1 也有可报目标，hint 不再讲 LV2
  const mentorGateOn = (s) => s?.policy?.capabilities?.mentor_level_gate ?? true;
  const anyGateOff = ss.filter(mentorTodo).some((s) => !mentorGateOn(s));
  return [
    // 我管理的营期（阶段 1，CampStaff）：负责人工作台入口置顶；结营营归历史组
    define('staff', '我管理的营期', '你是这些营期的负责人（老师）',
      pick(ss.filter((s) => s.my_staff_role && s.status !== 'archived'))),
    define('todo', '导生可报名',
      (props.myLevel >= 2 || anyGateOff) ? '导生报名窗口开放中，报名后待管理员审核'
        : '报名导生需 LV2——达到后即可在本组营期自助报名',
      pick(ss.filter((s) => mentorTodo(s) && notStaff(s)))),
    define('joinable', '可报名', '选择阶段的营，提交申请待审批',
      // 超管不显示可报名组（后端 camp.py 管理员报名一律 400，预判入口而非事后报错）
      pick(ss.filter((s) => s.status === 'selecting' && !s.is_member && !props.isStaff && notStaff(s)))),
    define('mine', '我的营期', null,
      pick(ss.filter((s) => s.is_member && s.status !== 'archived'))),
    define('upcoming', '即将开始', '尚未开放报名的营',
      pick(ss.filter((s) => s.status === 'upcoming' && !s.is_member && (!mentorTodo(s)) && notStaff(s)))),
    define('live', '进行中', '已开营——未参与的营',
      pick(ss.filter((s) => s.status === 'running' && !s.is_member && notStaff(s)))),
    define('history', '历史营期', null,
      pick(ss.filter((s) => s.status === 'archived'))),
    // 兜底组须内联求值：数组按序执行到此处时 pick 记账已完成，剩余组合（超管视角的
    // selecting 营、draft 草稿等）全部收进来——任何营不落空
    define('other', '其他营期', '暂无报名入口的营（如草稿）',
      ss.filter((s) => !taken.has(s.id))),
  ].filter(Boolean);
});

// 卡片身份行（阶段 1 起：负责人身份优先于成员身份——职责更高，方案 §6.1）
function roleText(s) {
  if (s.my_staff_role) return s.my_staff_role === 'owner' ? '主负责人' : '老师';
  if (s.is_member) return s.my_role === 'mentor' ? '导生' : '学员';
  if (isMentorPending(s)) return '导生报名待审核';
  if (isStudentPending(s)) return '入营申请待审核';
  if (s.status === 'upcoming' && s.category === 'learning' && !props.isStaff
    && (!(s.policy?.capabilities?.mentor_level_gate ?? true) || props.myLevel >= 2)) return '可报导生';
  return '未参与';
}
function roleClass(s) {
  if (s.my_staff_role) return 'role-staff';
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
/* 空态居中（09-13 用户定：别顶在页面顶部，居中「这里空空如也」） */
.center-empty :deep(.dew-card__body) { text-align: center; padding: 56px 24px; }
.empty-title { font-size: 16px; font-weight: 650; color: var(--dew-text-heading); }
.empty-sub { font-size: 13px; color: var(--dew-text-muted); line-height: 1.7; margin: 8px 0 16px; }

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
.role-staff { color: var(--color-success); }
.role-pending { color: var(--color-warning); }
.role-none { color: var(--dew-text-faint); font-weight: 400; }

/* 窄屏：卡片单列 */
@media (max-width: 760px) {
  .group-grid { grid-template-columns: 1fr; }
}
</style>
