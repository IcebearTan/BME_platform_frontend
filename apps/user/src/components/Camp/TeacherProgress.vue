<template>
  <div class="teacher-progress">
    <!-- 全营摘要 -->
    <div class="stat-grid">
      <DewCard variant="default" size="md" :no-hover="true">
        <div class="stat-label">团队 / 学员</div>
        <div class="stat-value">{{ summary.group_count }} <span class="stat-unit">组 / {{ summary.student_count }} 人</span></div>
      </DewCard>
      <DewCard variant="default" size="md" :no-hover="true">
        <div class="stat-label">章节认证进度</div>
        <div class="stat-value">{{ summary.certified_rate != null ? summary.certified_rate + '%' : '—' }}</div>
        <div class="stat-sub">{{ summary.certified_chapters }} / {{ summary.total_chapters }} 章</div>
      </DewCard>
      <DewCard variant="default" size="md" :no-hover="true">
        <div class="stat-label">已完成课程</div>
        <div class="stat-value">{{ summary.completed_courses }}</div>
        <div class="stat-sub">全章认证齐即计完成</div>
      </DewCard>
    </div>

    <!-- 团队分桶矩阵 -->
    <div v-if="loading" style="margin-top: 16px;">
      <DewSkeleton variant="rect" width="100%" height="200" rounded="8px" />
    </div>
    <div v-else-if="!groups.length" class="empty">本营暂无学员</div>
    <DewCard v-for="g in groups" :key="g.mentor_user_id ?? 'none'" variant="default" size="lg"
             :no-hover="true" style="margin-top: 14px;">
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
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { DewCard, DewSkeleton } from '@bme/dew-ui';
import { campService } from '../../services/campService';

const props = defineProps({
  sid: { type: [Number, String], required: true },
});

const loading = ref(true);
const board = ref({ summary: {}, groups: [] });

async function load() {
  loading.value = true;
  try {
    board.value = await campService.fetchProgressBoard(props.sid);
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载学习进度看板失败');
  } finally { loading.value = false; }
}
watch(() => props.sid, load, { immediate: true });
defineExpose({ reload: load });

const summary = computed(() => board.value.summary || {});
const groups = computed(() => board.value.groups || []);

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
.stat-sub { font-size: 12px; color: var(--dew-text-faint); margin-top: 6px; }
.empty { padding: 32px 0; color: var(--dew-text-faint); font-size: 13px; text-align: center; }

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
</style>
