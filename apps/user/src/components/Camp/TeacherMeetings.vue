<template>
  <div class="teacher-meetings">
    <DewCard variant="default" size="lg" :no-hover="true">
      <template #header>
        <div class="head-row">
          <!-- 首次加载不闪「全营组会（0）」：标题计数走骨架，加载后用后端 total -->
          <h3>{{ unitId ? '本项目组会' : '全营组会' }}（<DewSkeleton v-if="initialLoading" variant="text" :width="24" :height="14" class="head-count-skel" /><template v-else>{{ total }}</template>）</h3>
          <span class="head-hint">{{ headHint }}</span>
          <!-- 右上角：按日期范围筛选 -->
          <div class="head-actions">
            <DewTag v-if="hasDateFilter" size="sm" type="primary">{{ dateStart || '…' }} ~ {{ dateEnd || '…' }}</DewTag>
            <DewButton v-if="hasDateFilter" size="sm" type="ghost" @click="clearDateFilter">清除</DewButton>
            <DewButton size="sm" type="ghost" @click="openDateFilter">按日期筛选</DewButton>
          </div>
        </div>
      </template>

      <!-- 工具栏：导生筛选（仅学习营；项目营保持项目组语义不混用「导生」文案） -->
      <div v-if="isLearning" class="filter-bar">
        <template v-if="initialLoading">
          <DewSkeleton variant="rect" :width="190" :height="32" rounded="10px" />
        </template>
        <template v-else>
          <MentorTeamFilter :key="sid" v-model="mentorId"
            :options="mentorOptions"
            @update:model-value="onFilterChange" />
        </template>
      </div>

      <!-- 加载骨架 / 错误 / 空态 / 分组列表 四态互斥 -->
      <div v-if="loading" class="mtg-skeletons">
        <div v-for="n in 4" :key="n" class="mtg-skel-folder">
          <DewSkeleton variant="text" :width="n % 2 ? '56%' : '46%'" :height="18" />
          <DewSkeleton variant="text" width="30%" :height="14" />
        </div>
      </div>

      <div v-else-if="loadError" class="error-box">
        <span class="error-text">{{ errorMsg }}</span>
        <DewButton size="sm" @click="retry">重试</DewButton>
      </div>

      <div v-else-if="!meetings.length" class="empty">
        <template v-if="mentorId === null">本营暂无组会记录</template>
        <template v-else>
          该导生暂无组会记录
          <DewButton size="sm" type="ghost" @click="clearFilter">查看全部组会</DewButton>
        </template>
      </div>

      <!-- 日期文件夹：按「会议日期」分组折叠，今天置顶 -->
      <div v-else class="folder-list">
        <DewCard v-for="g in grouped" :key="g.date" variant="inset" size="md"
                 :no-hover="true" :tinted="g.isToday" :accent="g.isToday ? 'warning' : null"
                 class="folder" :class="{ 'is-collapsed': !expanded.has(g.date), 'is-today': g.isToday }">
          <template #header>
            <div class="folder-head" @click="toggle(g.date)">
              <span class="folder-marker">
                <DewBadge v-if="g.isToday" type="warning">今日</DewBadge>
                <span v-else class="folder-dot" :class="{ 'is-future': g.isFuture }"></span>
              </span>
              <span class="folder-date">{{ formatDateHeader(g.date) }}</span>
              <span class="folder-count">{{ g.items.length }} 场</span>
              <span class="folder-arrow" :class="{ open: expanded.has(g.date) }"></span>
            </div>
          </template>
          <div v-for="m in visibleItems(g)" :key="m.id" class="mtg-row" @click="openDetail(m)">
            <DewTag size="sm" :round="true" :type="m.has_minutes ? 'success' : 'warning'">
              {{ m.has_minutes ? '已归档' : '进行中' }}
            </DewTag>
            <span class="mtg-team">{{ m.team_label }}</span>
            <span class="mtg-title">{{ m.title }}</span>
            <span v-if="timeOf(m)" class="mtg-time">{{ timeOf(m) }}</span>
            <span class="mtg-creator">发起 {{ m.creator_name }}</span>
            <span class="mtg-count">任务 {{ m.task_count }}</span>
            <span v-if="m.chapter_count" class="mtg-count">课内 {{ m.chapter_count }} 章</span>
          </div>
          <!-- 单日组会过多：默认收起，点「显示全部」展开剩余 -->
          <div v-if="g.items.length > DISPLAY_CAP && !showAllDates.has(g.date)" class="show-more">
            <DewButton size="sm" type="ghost" @click="showAll(g.date)">显示全部 {{ g.items.length }} 场</DewButton>
          </div>
        </DewCard>

        <!-- 日期较多：分页加载更早的日期 + 收起 -->
        <div v-if="hasMore || hasLoadedMore" class="load-more">
          <DewButton v-if="hasMore" size="sm" type="ghost" block :disabled="loadingMore" @click="loadMore">
            {{ loadingMore ? '加载中…' : '加载更早的组会' }}
          </DewButton>
          <DewButton v-if="hasLoadedMore" size="sm" type="ghost" @click="collapseMore">收起更早的组会</DewButton>
        </div>
      </div>
    </DewCard>

    <!-- 日期范围筛选弹窗（起始/结束，原生日历选年月日） -->
    <DewDialog v-model="dateDlg" title="按日期筛选" :width="400">
      <div class="date-filter-body">
        <div class="date-field">
          <span class="date-label">起始日期</span>
          <DewInput v-model="dateDraftStart" type="date" size="sm" />
        </div>
        <div class="date-field">
          <span class="date-label">结束日期</span>
          <DewInput v-model="dateDraftEnd" type="date" size="sm" />
        </div>
        <p v-if="dateRangeInvalid" class="date-error">起始日期不能晚于结束日期</p>
      </div>
      <template #footer>
        <DewButton size="sm" type="ghost" @click="resetDateFilter">重置</DewButton>
        <DewButton size="sm" :disabled="dateRangeInvalid" @click="applyDateFilter">确定</DewButton>
      </template>
    </DewDialog>

    <!-- 详情（复用组会详情弹窗；老师视角 _can_manage=False → 纯只读）。
         弹窗开关不动筛选与展开状态 -->
    <MeetingDetail v-model="detailVisible" :sid="sid" :meeting-id="detailId" />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { DewBadge, DewButton, DewCard, DewDialog, DewInput, DewSkeleton, DewTag } from '@bme/dew-ui';
import MentorTeamFilter from './MentorTeamFilter.vue';
import { campService, todayLocal } from '../../services/campService';
import MeetingDetail from './MeetingDetail.vue';

const props = defineProps({
  sid: { type: [Number, String], required: true },
  /** 营期类型（session.category）：learning=培训营显示导生筛选；project=项目营不显示 */
  category: { type: String, default: 'learning' },
  unitId: { type: Number, default: null },
});

const isLearning = computed(() => props.category !== 'project');

// 分页单位 = 日期文件夹，不是组会条（保证一个日期文件夹永远完整不跨页）
const DATE_PAGE_SIZE = 10;   // 每次加载的日期文件夹数
const DISPLAY_CAP = 10;      // 单日文件夹默认展示的组会条数上限

const initialLoading = ref(true);   // 首次加载（标题计数/筛选栏骨架）
const loading = ref(false);         // 首载/筛选加载中（列表骨架）
const loadingMore = ref(false);     // 「加载更早」进行中
const loadError = ref(false);
const errorMsg = ref('');

const meetings = ref([]);
const mentors = ref([]);
const total = ref(0);
// mentorId：null=全部 / 数字=某导生（服务端 mentor_id 筛选，禁止前端全量过滤）
const mentorId = ref(null);
const hasMore = ref(false);
const nextBeforeDate = ref(null);
const hasLoadedMore = ref(false);   // 是否已「加载更早」，用于显示「收起」

// 日期范围筛选（起始/结束，含年月日的日历选择）
const dateStart = ref('');
const dateEnd = ref('');
const dateDlg = ref(false);
const dateDraftStart = ref('');
const dateDraftEnd = ref('');

const detailVisible = ref(false);
const detailId = ref(null);

// ── 日期分组：今天置顶，其余倒序；组内按时间升序 ──
const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const grouped = computed(() => {
  const today = todayLocal();
  const map = new Map();
  for (const m of meetings.value) {
    const date = String(m.meeting_date || '').slice(0, 10);
    if (!date) continue;
    if (!map.has(date)) map.set(date, []);
    map.get(date).push(m);
  }
  for (const items of map.values()) {
    items.sort((a, b) => String(a.meeting_date).localeCompare(String(b.meeting_date)));
  }
  return [...map.entries()]
    .map(([date, items]) => ({ date, items, isToday: date === today, isFuture: date > today }))
    .sort((a, b) => {
      if (a.isToday !== b.isToday) return a.isToday ? -1 : 1;
      return b.date.localeCompare(a.date);
    });
});

// 折叠状态：默认展开「今天」这一组，其余收起
const expanded = ref(new Set());
const showAllDates = ref(new Set());   // 单日「显示全部」的日期集合
let defaultExpanded = false;

let reqSeq = 0;          // 请求序号：切筛选/翻页的旧响应一律丢弃

function requestPage(params = {}) {
  return campService.fetchCampMeetingsAll(props.sid, {
    unit_id: props.unitId || undefined,
    mentor_id: mentorId.value ?? undefined,
    limit: DATE_PAGE_SIZE,
    start_date: dateStart.value || undefined,
    end_date: dateEnd.value || undefined,
    ...params,
  });
}

function meetingRows(d) {
  if (!Array.isArray(d.groups) || d.groups.some((group) => !Array.isArray(group.meetings))) {
    const error = new Error('Invalid meeting overview response');
    error.userMessage = '组会数据暂不可用，请稍后重试';
    throw error;
  }
  return d.groups.flatMap((group) => group.meetings);
}

function applyResult(d) {
  meetings.value = meetingRows(d);
  mentors.value = d.mentors || [];
  total.value = d.total || 0;
  hasMore.value = !!d.has_more;
  nextBeforeDate.value = d.next_before_date || null;
}

async function load() {
  const seq = ++reqSeq;
  loading.value = true;
  loadError.value = false;
  try {
    const d = await requestPage();
    if (seq !== reqSeq) return;                    // 过期响应：丢弃
    applyResult(d);
    if (!defaultExpanded) {
      defaultExpanded = true;
      if (grouped.value.some((g) => g.isToday)) expanded.value = new Set([todayLocal()]);
    }
  } catch (e) {
    if (seq !== reqSeq) return;
    loadError.value = true;
    errorMsg.value = e.userMessage || e.response?.data?.message || '加载全营组会失败';
  } finally {
    if (seq === reqSeq) {
      loading.value = false;
      initialLoading.value = false;
    }
  }
}

async function loadMore() {
  if (loadingMore.value || loading.value || !hasMore.value || !nextBeforeDate.value) return;
  const seq = ++reqSeq;
  loadingMore.value = true;
  try {
    const d = await requestPage({ before_date: nextBeforeDate.value });
    if (seq !== reqSeq) return;                    // 期间发生筛选/切营：丢弃
    meetings.value = [...meetings.value, ...meetingRows(d)];
    mentors.value = d.mentors || [];
    total.value = d.total || 0;
    hasMore.value = !!d.has_more;
    nextBeforeDate.value = d.next_before_date || null;
    hasLoadedMore.value = true;
  } catch (e) {
    // 加载更早失败：静默，按钮恢复可点、用户可重试
  } finally {
    loadingMore.value = false;
  }
}

// 收起：回到最近的 DATE_PAGE_SIZE 个日期（重新拉第一页）
function collapseMore() {
  hasLoadedMore.value = false;
  showAllDates.value = new Set();
  load();
}

// ── 日期范围筛选 ──
const hasDateFilter = computed(() => !!(dateStart.value || dateEnd.value));
const dateRangeInvalid = computed(() =>
  !!(dateDraftStart.value && dateDraftEnd.value && dateDraftStart.value > dateDraftEnd.value));
function openDateFilter() {
  dateDraftStart.value = dateStart.value;
  dateDraftEnd.value = dateEnd.value;
  dateDlg.value = true;
}
function applyDateFilter() {
  if (dateRangeInvalid.value) return;
  dateStart.value = dateDraftStart.value;
  dateEnd.value = dateDraftEnd.value;
  dateDlg.value = false;
  onFilterChange();
}
function resetDateFilter() {
  // 「重置」只清空弹窗内已选的日期，方便重新选择；不关闭弹窗、不立即应用
  dateDraftStart.value = '';
  dateDraftEnd.value = '';
}
function clearDateFilter() {
  // 一键清除已生效的日期筛选（右上角「清除」按钮）
  dateStart.value = '';
  dateEnd.value = '';
  dateDraftStart.value = '';
  dateDraftEnd.value = '';
  onFilterChange();
}

function retry() { load(); }
function onFilterChange() {
  hasMore.value = false;
  nextBeforeDate.value = null;
  hasLoadedMore.value = false;
  showAllDates.value = new Set();
  meetings.value = [];
  load();
}
function clearFilter() { mentorId.value = null; onFilterChange(); }
function toggle(date) {
  const next = new Set(expanded.value);
  if (next.has(date)) next.delete(date);
  else next.add(date);
  expanded.value = next;
}
function showAll(date) {
  const next = new Set(showAllDates.value);
  next.add(date);
  showAllDates.value = next;
}
function openDetail(m) {
  detailId.value = m.id;
  detailVisible.value = true;
}
// 单日组会条数：未「显示全部」时截断到上限
function visibleItems(g) {
  if (showAllDates.value.has(g.date)) return g.items;
  return g.items.slice(0, DISPLAY_CAP);
}
// 切营：清筛选/展开/分页态、回完整准备态
watch(() => [props.sid, props.unitId], () => {
  mentorId.value = null;
  hasMore.value = false;
  nextBeforeDate.value = null;
  hasLoadedMore.value = false;
  showAllDates.value = new Set();
  expanded.value = new Set();
  defaultExpanded = false;
  initialLoading.value = true;
  meetings.value = [];
  mentors.value = [];
  total.value = 0;
  dateStart.value = '';
  dateEnd.value = '';
  dateDraftStart.value = '';
  dateDraftEnd.value = '';
  dateDlg.value = false;
  load();
}, { immediate: true });
defineExpose({ reload: load });

// 筛选选项来自后端本营真实导生列表（mentors 契约：user_id/username/direction）
const mentorOptions = computed(() => [
  { label: '全部导生', value: null },
  ...mentors.value.map((m) => ({
    label: m.direction ? `${m.username} · ${m.direction}` : m.username,
    value: m.user_id,
  })),
]);

const headHint = computed(() =>
  (isLearning.value
    ? '只读总览——发起、布置与审阅由各组导生在其工作台完成'
    : '只读总览——发起、布置与审阅由各项目负责人在其工作台完成'));

// 「年 月 日 + 两个空格 + 星期」（星期全称）；单数月/日前补 0 占位，保证末尾对齐
function formatDateHeader(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  const pad = (n) => String(n).padStart(2, '0');
  return `${y}年${pad(m)}月${pad(d)}日  ${wd}`;
}
// 日期已在文件夹头上，组会条只显示时分；后端 meeting_date 是 Date（无时分）时不渲染
function timeOf(m) {
  return String(m.meeting_date || '').slice(11);
}
</script>

<style scoped>
.head-row { display: flex; align-items: center; gap: 10px; width: 100%; flex-wrap: wrap; }
.head-row h3 { margin: 0; }
.head-count-skel { display: inline-block; vertical-align: middle; }
.head-hint { font-size: 12px; color: var(--dew-text-faint); }
.head-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.filter-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.mentor-filter { width: 210px; }

/* 骨架：接近真实文件夹头结构 */
.mtg-skeletons { display: flex; flex-direction: column; }
.mtg-skel-folder { display: flex; flex-direction: column; gap: 8px; padding: 14px 4px; }
.mtg-skel-folder + .mtg-skel-folder { border-top: 1px solid var(--dew-card-divider); }

.error-box { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 26px 0; }
.error-text { font-size: 13px; color: var(--color-warning); }
.empty { padding: 28px 0; color: var(--dew-text-faint); font-size: 13px; text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 10px; }

/* ── 日期文件夹 ── */
.folder-list { display: flex; flex-direction: column; gap: 10px; }
.folder.is-collapsed :deep(.dew-card__body) { display: none; }
/* 今天文件夹：强化淡橙底 + 暖色描边，突出「今日」 */
.folder.is-today { border-color: color-mix(in srgb, var(--color-warning) 45%, var(--dew-card-border)); }
.folder.is-today :deep(.dew-card__tint) { opacity: 0.6; }
.folder-head {
  display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none;
  /* 撑满 DewCard md 尺寸 header 的 padding（上14 左右16 下12），让整条 header（含边缘）都可点击 */
  margin: -14px -16px -12px;
  padding: 14px 16px 12px;
}
/* 左侧标记：今天=「今日」徽标，其余=时间线圆点（居中于「今日」中心；过去灰、未来绿）；
   固定宽度保证日期左对齐同一列 */
.folder-marker { display: inline-flex; align-items: center; justify-content: center; width: 40px; flex-shrink: 0; }
.folder-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--dew-text-muted); }
.folder-dot.is-future { background: var(--color-success); }
/* 日期：字体/大小与组会条「组会名称」一致，顶格左对齐 */
.folder-date { font-size: 14px; font-weight: 600; color: var(--dew-text-heading); }
/* 数量：字体/大小与组会条末尾的「任务 N」一致，右对齐 */
.folder-count { margin-left: auto; font-size: 12px; color: var(--dew-text-muted); white-space: nowrap; }
/* 展开箭头（纯 CSS，收起=向右 ▸，展开=向下 ▾） */
.folder-arrow {
  width: 8px; height: 8px; flex-shrink: 0;
  border-right: 2px solid var(--dew-text-faint);
  border-bottom: 2px solid var(--dew-text-faint);
  transform: rotate(-45deg);
  transition: transform 0.2s ease;
}
.folder-arrow.open { transform: rotate(45deg); }

/* ── 组会条（普通行，顶格与文件夹头日期对齐） ── */
.mtg-row {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 10px 2px; cursor: pointer;
  transition: background 0.15s ease;
}
.mtg-row:hover { background: var(--dew-ghost-hover-bg); }
.mtg-row + .mtg-row { border-top: 1px solid var(--dew-card-divider); }
.mtg-team { font-size: 12px; color: var(--dew-text-faint); min-width: 60px; }
.mtg-title { font-weight: 600; font-size: 14px; color: var(--dew-text-heading); flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mtg-time { font-size: 12px; color: var(--dew-text-muted); }
.mtg-creator { font-size: 12px; color: var(--dew-text-muted); }
.mtg-count { font-size: 12px; color: var(--dew-text-muted); }

/* 单日「显示全部」 / 底部「加载更早·收起」 */
.show-more { display: flex; justify-content: center; padding: 8px 0 4px; }
.load-more { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 4px; }

/* 日期范围筛选弹窗 */
.date-filter-body { display: flex; flex-direction: column; gap: 12px; }
.date-field { display: grid; grid-template-columns: 64px 1fr; align-items: center; gap: 10px; }
.date-label { font-size: 13px; color: var(--dew-text-muted); }
.date-error { margin: 0; font-size: 12px; color: var(--color-danger); }

/* 尊重系统减弱动效设置：骨架呼吸动画停用为静态占位 */
@media (prefers-reduced-motion: reduce) {
  .teacher-meetings :deep(.dew-skeleton) { animation: none; opacity: 0.7; }
}
</style>
