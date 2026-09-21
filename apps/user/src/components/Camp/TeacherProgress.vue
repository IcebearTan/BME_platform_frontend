<template>
  <div class="teacher-progress">
    <!-- 全营摘要（首次加载走骨架，不闪 0/undefined；口径随筛选变化由 scope_label 说明） -->
    <div class="stat-grid">
      <template v-if="initialLoading">
        <DewCard v-for="n in 3" :key="`sk-${n}`" variant="default" size="md" :no-hover="true">
          <DewSkeleton variant="text" width="40%" />
          <DewSkeleton variant="text" width="70%" :height="26" style="margin-top: 10px;" />
          <DewSkeleton variant="text" width="55%" style="margin-top: 8px;" />
        </DewCard>
      </template>
      <template v-else>
        <DewCard variant="default" size="md" :no-hover="true">
          <div class="stat-label">团队 / 学员</div>
          <div class="stat-value">
            {{ summary.group_count ?? '—' }} <span class="stat-unit">组 / {{ summary.student_count ?? '—' }} 人</span>
          </div>
          <div class="stat-sub">{{ summary.scope_label ? `${summary.scope_label}汇总（与翻页无关）` : '' }}</div>
        </DewCard>
        <DewCard variant="default" size="md" :no-hover="true">
          <div class="stat-label">章节认证进度</div>
          <div class="stat-value">{{ summary.certified_rate != null ? summary.certified_rate + '%' : '—' }}</div>
          <div class="stat-sub">{{ summary.certified_chapters ?? 0 }} / {{ summary.total_chapters ?? 0 }} 章</div>
        </DewCard>
        <DewCard variant="default" size="md" :no-hover="true">
          <div class="stat-label">已完成课程</div>
          <div class="stat-value">{{ summary.completed_courses ?? 0 }}</div>
          <div class="stat-sub">全章认证齐即计完成</div>
        </DewCard>
      </template>
    </div>

    <!-- 工具栏：导生筛选（服务端过滤，不做前端本地筛选） -->
    <div class="board-toolbar">
      <template v-if="initialLoading">
        <DewSkeleton variant="rect" :width="200" :height="32" rounded="10px" />
      </template>
      <template v-else>
        <span class="filter-label">按导生团队</span>
        <DewSelect v-model="mentorId" size="sm" class="mentor-filter"
          :options="mentorOptions" @update:model-value="onFilterChange" />
      </template>
    </div>

    <!-- 列表区域：骨架 / 错误 / 空态 / 数据 各态互斥 -->
    <div v-if="initialLoading" class="board-body">
      <DewCard v-for="n in pageSize" :key="`gsk-${n}`" variant="default" size="lg"
        :no-hover="true" class="group-card">
        <template #header>
          <div class="g-head">
            <DewSkeleton variant="text" :width="160" />
            <DewSkeleton variant="text" :width="70" />
          </div>
        </template>
        <DewSkeleton variant="rect" width="100%" :height="38 + 34 * 3" rounded="8px" />
      </DewCard>
    </div>

    <DewCard v-else-if="loadError" variant="default" size="lg" :no-hover="true" class="board-body">
      <div class="error-box">
        <span class="error-text">{{ errorMsg }}</span>
        <DewButton size="sm" @click="retry">重试</DewButton>
      </div>
    </DewCard>

    <DewCard v-else-if="listLoading" variant="default" size="lg" :no-hover="true" class="board-body">
      <template #header>
        <div class="g-head"><DewSkeleton variant="text" :width="180" /></div>
      </template>
      <DewSkeleton variant="rect" width="100%" :height="38 + 34 * 4" rounded="8px" />
      <div class="list-loading-hint">正在加载第 {{ page }} 页…</div>
    </DewCard>

    <DewCard v-else-if="!groups.length" variant="default" size="lg" :no-hover="true" class="board-body">
      <div class="empty">
        <template v-if="mentorId === null">本营暂无学员，学员入营分组后此处展示进度矩阵</template>
        <template v-else-if="mentorId === 'unassigned'">暂无未分组学员</template>
        <template v-else>该导生团队暂无学员</template>
      </div>
    </DewCard>

    <div v-else class="board-body">
      <DewCard v-for="g in groups" :key="g.mentor_user_id ?? 'none'" variant="default" size="lg"
               :no-hover="true" class="group-card">
        <template #header>
          <div class="g-head">
            <h3>{{ g.mentor_name || '未分组' }}<template v-if="g.direction"> · {{ g.direction }}</template></h3>
            <span class="g-rate" :class="{ ok: (g.certified_rate ?? 0) >= 60, low: g.certified_rate != null && g.certified_rate < 30 }">
              认证率 {{ g.certified_rate != null ? g.certified_rate + '%' : '—' }}
            </span>
          </div>
        </template>
        <div v-if="g.hint" class="g-hint">{{ g.hint }}</div>
        <div v-else-if="!g.students.length" class="g-hint">本组暂无学员</div>
        <div v-else class="matrix-wrap">
          <table class="matrix">
            <thead>
              <tr>
                <th class="m-name">学员</th>
                <th v-for="c in g.courses" :key="c.course_id" :title="c.course_title">{{ c.course_title }}</th>
                <th class="m-sum">认证率</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in g.students" :key="s.student_user_id">
                <th class="m-name">{{ s.username }}</th>
                <td v-for="b in s.courses" :key="b.course_id"
                    :class="cellClass(b)"
                    :title="cellTitle(b)">
                  {{ cellText(b) }}
                </td>
                <td class="m-sum" :class="{ ok: (s.certified_rate ?? 0) >= 60 }">
                  {{ s.certified_rate != null ? s.certified_rate + '%' : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </DewCard>
    </div>

    <!-- 分页（TeacherMembers 同款 DewButton 上一页/下一页，不另造蓝色分页器） -->
    <div v-if="!initialLoading && !loadError && totalPages > 0" class="pager">
      <DewButton size="sm" :disabled="page <= 1 || listLoading" @click="goPage(page - 1)">上一页</DewButton>
      <span class="pager-text">第 {{ page }} / {{ totalPages }} 页 · 共 {{ total }} 个团队</span>
      <DewButton size="sm" :disabled="page >= totalPages || listLoading" @click="goPage(page + 1)">下一页</DewButton>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { DewButton, DewCard, DewSelect, DewSkeleton } from '@bme/dew-ui';
import { campService } from '../../services/campService';

const props = defineProps({
  sid: { type: [Number, String], required: true },
});

// 加载态分层：initialLoading（首次整体骨架）/ listLoading（翻页筛选受控加载，旧页不与新页混排）/
// loadError（页面内错误 + 重试，不只弹一次 Toast）；hasData 标记是否已有成功数据
const initialLoading = ref(true);
const listLoading = ref(false);
const loadError = ref(false);
const errorMsg = ref('');
const hasData = ref(false);

const board = ref(null);
const page = ref(1);
const pageSize = 5;
// mentorId：null=全部导生 / 'unassigned'=未分组桶 / 数字=某导生（服务端解析，前端不本地过滤）
const mentorId = ref(null);

let reqSeq = 0;          // 请求序号：快速切筛选/翻页时旧响应一律丢弃，不覆盖新条件数据

async function load() {
  const seq = ++reqSeq;
  if (!hasData.value) initialLoading.value = true;
  else listLoading.value = true;
  loadError.value = false;
  try {
    const d = await campService.fetchProgressBoard(props.sid, {
      page: page.value,
      page_size: pageSize,
      mentor_id: mentorId.value ?? undefined,
    });
    if (seq !== reqSeq) return;                    // 过期响应：丢弃
    board.value = d;
    hasData.value = true;
    // 数据变化后当前页越界（如末页团队被筛掉）→ 回到最后有效页重新请求
    const pages = totalPages.value;
    if (page.value > pages && pages > 0) {
      page.value = pages;
      return load();
    }
  } catch (e) {
    if (seq !== reqSeq) return;
    loadError.value = true;
    errorMsg.value = e.response?.data?.message || '加载学习进度看板失败';
  } finally {
    if (seq === reqSeq) {
      initialLoading.value = false;
      listLoading.value = false;
    }
  }
}

function retry() {
  load();
}
function goPage(p) {
  if (listLoading.value || p < 1 || p > totalPages.value) return;
  page.value = p;
  load();
}
function onFilterChange() {
  page.value = 1;                                   // 切筛选回第一页
  load();
}
// 切营：清筛选、回第一页、重新进入完整准备态
watch(() => props.sid, () => {
  page.value = 1;
  mentorId.value = null;
  hasData.value = false;
  board.value = null;
  load();
}, { immediate: true });
defineExpose({ reload: load });

const summary = computed(() => board.value?.summary || {});
const groups = computed(() => board.value?.groups || []);
const total = computed(() => board.value?.total || 0);
const totalPages = computed(() => (total.value ? Math.max(1, Math.ceil(total.value / pageSize)) : 0));

// 筛选选项来自后端当前营期真实导生列表（mentors 契约：mentor_user_id/mentor_name/direction）
const mentorOptions = computed(() => [
  { label: '全部导生', value: null },
  { label: '未分组', value: 'unassigned' },
  ...(board.value?.mentors || []).map((m) => ({
    label: m.direction ? `${m.mentor_name} · ${m.direction}` : m.mentor_name,
    value: m.mentor_user_id,
  })),
]);

// 单课单元格：完成（绿）/ 进行中 x/y / 未开始（灰）；title 带均分明细
function cellText(b) {
  if (!b || !b.total_chapters) return '—';
  if (b.course_status === 'completed') return '已完成';
  return `${b.certified_chapters}/${b.total_chapters}`;
}
function cellClass(b) {
  if (!b || !b.total_chapters) return 'cell-none';
  if (b.course_status === 'completed') return 'cell-done';
  if (b.certified_chapters > 0) return 'cell-part';
  return 'cell-none';
}
function cellTitle(b) {
  if (!b || !b.total_chapters) return '该课程无学习单元章';
  const avg = b.score_avg != null ? ` · 均分 ${b.score_avg}` : '';
  return `${b.course_title}：${b.certified_chapters}/${b.total_chapters} 章已认证${avg}`;
}
</script>

<style scoped>
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.stat-label { font-size: 12px; color: var(--dew-text-muted); margin-bottom: 6px; }
.stat-value { font-size: 24px; font-weight: 700; color: var(--dew-text-heading); }
.stat-unit { font-size: 15px; font-weight: 600; color: var(--dew-text-muted); }
.stat-sub { font-size: 12px; color: var(--dew-text-faint); margin-top: 6px; min-height: 14px; }

.board-toolbar { display: flex; align-items: center; gap: 10px; margin: 16px 0 0; flex-wrap: wrap; }
.filter-label { font-size: 12.5px; color: var(--dew-text-muted); }
.mentor-filter { width: 220px; }

.board-body { margin-top: 14px; }
.group-card + .group-card { margin-top: 14px; }

.error-box { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 26px 0; }
.error-text { font-size: 13px; color: var(--color-warning); }
.list-loading-hint { margin-top: 10px; font-size: 12px; color: var(--dew-text-faint); text-align: center; }
.empty { padding: 32px 0; color: var(--dew-text-faint); font-size: 13px; text-align: center; }

.pager { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 14px; }
.pager-text { font-size: 12.5px; color: var(--dew-text-faint); }

.g-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; }
.g-head h3 { margin: 0; font-size: 14px; }
.g-rate { font-size: 12.5px; color: var(--dew-text-muted); }
.g-rate.ok { color: var(--color-success); }
.g-rate.low { color: var(--color-warning); }
.g-hint { font-size: 12.5px; color: var(--dew-text-faint); }

.matrix-wrap { overflow-x: auto; }
.matrix { border-collapse: collapse; width: 100%; font-size: 12.5px; }
.matrix th, .matrix td {
  border: 1px solid var(--dew-card-border, rgba(148, 163, 184, .2));
  padding: 6px 10px; text-align: left; white-space: nowrap;
}
.matrix thead th {
  font-weight: 650; color: var(--dew-text-heading);
  background: color-mix(in srgb, var(--dew-text-muted) 6%, transparent);
  max-width: 150px; overflow: hidden; text-overflow: ellipsis;
}
.matrix .m-name { font-weight: 650; color: var(--dew-text-heading); }
.matrix .m-sum { text-align: right; color: var(--dew-text-muted); }
.matrix .m-sum.ok { color: var(--color-success); font-weight: 650; }
.cell-done { color: var(--color-success); font-weight: 600; }
.cell-part { color: var(--dew-text); }
.cell-none { color: var(--dew-text-faint); }

/* 尊重系统减弱动效设置：骨架呼吸动画停用为静态占位 */
@media (prefers-reduced-motion: reduce) {
  .teacher-progress :deep(.dew-skeleton) { animation: none; opacity: 0.7; }
}
</style>
