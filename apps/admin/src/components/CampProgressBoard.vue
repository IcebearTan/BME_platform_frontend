<template>
  <div class="progress-board" v-loading="loading">
    <!-- 汇总条 + 口径说明 -->
    <div class="summary-bar" v-if="summary">
      <el-tag>认证章节 {{ summary.certified_chapters }}/{{ summary.total_chapters }}</el-tag>
      <el-tag>认证率 {{ summary.certified_rate == null ? '—' : summary.certified_rate + '%' }}</el-tag>
      <el-tag type="success">已完结课程 {{ summary.completed_courses }}</el-tag>
      <el-tag type="info">{{ summary.student_count }} 名学员 · {{ summary.group_count }} 个导生组</el-tag>
    </div>
    <el-alert type="info" :closable="false" class="legend"
      title="认证 n/m = 导生按章认证数 / 该课学习章节数；已完结 = 全章认证齐（课程汇总态）。悬停格子看逐章明细（自学完成比 / 认证分）。" />

    <template v-if="groups.length">
      <div v-for="g in groups" :key="g.mentor_user_id ?? 'none'" class="grp">
        <div class="grp-head">
          <div class="grp-title">
            <span class="grp-name">{{ g.mentor_user_id ? g.mentor_name : '未分组' }}</span>
            <el-tag v-if="g.direction" size="small" effect="plain">{{ g.direction }}</el-tag>
            <span class="grp-meta">{{ g.students.length }} 人</span>
          </div>
          <span class="grp-rate">组认证率 {{ g.certified_rate == null ? '—' : g.certified_rate + '%' }}</span>
        </div>
        <div v-if="g.hint" class="grp-hint">{{ g.hint }}</div>
        <el-table :data="g.students" border size="small" :max-height="tableMaxH">
          <el-table-column label="学员" prop="username" fixed="left" min-width="100" />
          <el-table-column v-for="c in g.courses" :key="c.course_id"
            :label="c.course_title" min-width="104" align="center">
            <template #default="{ row }">
              <div v-if="row._byCourse[c.course_id]"
                :class="['cell', 'st-' + cellState(row._byCourse[c.course_id])]"
                :title="courseTip(row._byCourse[c.course_id], c)">
                {{ cellText(row._byCourse[c.course_id]) }}
              </div>
            </template>
          </el-table-column>
          <el-table-column label="汇总" fixed="right" width="86" align="center">
            <template #default="{ row }">{{ row.certified_rate == null ? '—' : row.certified_rate + '%' }}</template>
          </el-table-column>
        </el-table>
      </div>
    </template>
    <el-alert v-else-if="!loading" type="info" :closable="false" title="该营期暂无学员" />
  </div>
</template>

<script setup>
import api from '../api';
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

const props = defineProps({ sid: { type: Number, required: true } });

const loading = ref(false);
const board = ref({});
const groups = computed(() => board.value.groups || []);
const summary = computed(() => board.value.summary);
// 管理端表格高度定式：max-height prop 视口锚定（组矩阵通常 ≤10 行，多为兜底）
const tableMaxH = Math.max(300, window.innerHeight - 460);

// 格子状态：done=课程已完结 / part=有认证 / start=仅自学 / none=未开始（无章节课程为空格子）
function cellState(b) {
  if (!b || !b.total_chapters) return 'none';
  if (b.course_status === 'completed') return 'done';
  if (b.certified_chapters > 0) return 'part';
  return (b.chapters || []).some((c) => c.lessons_completed > 0) ? 'start' : 'none';
}

function cellText(b) {
  if (!b || !b.total_chapters) return '—';
  if (b.course_status === 'completed') return `已完结 ${b.certified_chapters}/${b.total_chapters}`;
  return `${b.certified_chapters}/${b.total_chapters}`;
}

function courseTip(b, c) {
  if (!b || !b.total_chapters) return `${c.course_title}：暂无学习章节`;
  const head = [c.course_title, b.score_avg != null ? `均分 ${b.score_avg}` : null]
    .filter(Boolean).join(' · ');
  const lines = (b.chapters || []).map((ch) => {
    const selfStr = `自学 ${ch.lessons_completed}/${ch.lessons}`;
    const cert = ch.certified
      ? `已认证${ch.certified_at ? ' ' + ch.certified_at.slice(5, 10) : ''}${ch.score != null ? `（${ch.score}分）` : ''}`
      : '未认证';
    return `${ch.name}：${selfStr} · ${cert}`;
  });
  return [head, ...lines].join('\n');
}

async function fetchBoard() {
  loading.value = true;
  try {
    const res = await api.get(`/camp/sessions/${props.sid}/progress/board`);
    if (res.data.code === 200) {
      // 行内挂课程索引（模板按 course_id 取格子，同考勤看板 _byWeek 模式）
      for (const g of res.data.groups || []) {
        for (const s of g.students || []) {
          s._byCourse = Object.fromEntries((s.courses || []).map((b) => [b.course_id, b]));
        }
      }
      board.value = res.data;
    } else {
      ElMessage.error(res.data.message || '加载学习进度看板失败');
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载学习进度看板失败');
  } finally {
    loading.value = false;
  }
}

onMounted(fetchBoard);
</script>

<style scoped>
.summary-bar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.legend { margin-bottom: 16px; }
.grp { margin-bottom: 20px; }
.grp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.grp-title { display: flex; align-items: center; gap: 8px; }
.grp-name { font-weight: 600; font-size: 14px; color: var(--el-text-color-primary); }
.grp-meta { font-size: 12px; color: var(--el-text-color-secondary); }
.grp-rate { font-size: 12px; color: var(--el-text-color-secondary); }
.grp-hint { font-size: 12px; color: var(--el-text-color-secondary); margin: -4px 0 8px; }
.cell {
  width: 100%; height: 26px; line-height: 26px; text-align: center;
  border-radius: 4px; font-size: 12px; font-weight: 600; cursor: default;
}
.st-done { background: var(--el-color-success-light-9); color: var(--el-color-success); }
.st-part { background: var(--el-fill-color-light); color: var(--el-text-color-primary); }
.st-start { color: var(--el-text-color-secondary); }
.st-none { color: var(--el-text-color-placeholder); }
</style>
