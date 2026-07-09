<template>
  <div class="camp-attendance-board">
    <!-- 控制条 -->
    <div class="control-bar">
      <el-select v-model="sid" placeholder="选择营期" @change="onSessionChange" style="width: 220px">
        <el-option v-for="s in sessions" :key="s.id" :label="s.name" :value="s.id" />
      </el-select>
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
        start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD"
        @change="fetchBoard" style="margin-left: 12px" />
      <el-tag type="info" style="margin-left: 12px" v-if="sid">
        当前可见 {{ (board.rows || []).length }} 名学员
        <span v-if="role === 'mentor'">（本团队）</span>
        <span v-else-if="['teacher', 'super_admin'].includes(role)">（全营）</span>
      </el-tag>
    </div>

    <!-- 汇总条 -->
    <div class="summary-bar" v-if="board.summary">
      <el-tag type="success">出勤 {{ board.summary.present }}</el-tag>
      <el-tag type="warning">迟到 {{ board.summary.late }}</el-tag>
      <el-tag type="warning">时长不足 {{ board.summary.short_hours }}</el-tag>
      <el-tag type="danger">迟到+不足 {{ board.summary.late_and_short }}</el-tag>
      <el-tag type="info">缺勤 {{ board.summary.absent }}</el-tag>
      <el-tag type="primary">请假 {{ board.summary.on_leave }}</el-tag>
      <el-tag>达标率 {{ pct(board.summary.attendance_rate) }}</el-tag>
    </div>

    <!-- 学生×日期 矩阵（动态日期列 + 单元格色块） -->
    <el-table :data="board.rows || []" v-loading="loading" border stripe
      :empty-text="sid ? '该范围无承诺出勤日数据' : '请先选择营期'">
      <el-table-column label="学员" prop="username" fixed="left" min-width="100" />
      <el-table-column v-for="d in (board.dates || [])" :key="d" :label="label(d)"
        min-width="56" align="center">
        <template #default="{ row }">
          <div v-if="row.daily && row.daily[d]"
               :class="['cell', 'cell-' + row.daily[d].status]"
               :title="tip(row.daily[d])">
            {{ glyph(row.daily[d].status) }}
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import api from '../api';
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';

const store = useStore();
const role = computed(() => store.getters.role);

const sessions = ref([]);
const sid = ref(null);
const dateRange = ref(null);   // [from, to] YYYY-MM-DD
const board = ref({});
const loading = ref(false);

const GLYPH = {
  present: '✓', late: '迟', short_hours: '短', late_and_short: '⚠',
  absent: '✗', on_leave: '假',
};
const glyph = (s) => GLYPH[s] || '';

const label = (d) => {              // 'YYYY-MM-DD' → 'M/D'
  const [, m, day] = d.split('-');
  return `${parseInt(m)}/${parseInt(day)}`;
};

const tip = (c) => {
  if (!c) return '';
  const parts = [c.status];
  if (c.first_check_in) parts.push(`签到 ${c.first_check_in.slice(11, 16)}`);
  if (c.total_hours != null) parts.push(`时长 ${c.total_hours}h`);
  if (c.in_progress) parts.push('未签退');
  return parts.join(' / ');
};

const pct = (r) => (r == null ? '-' : (r * 100).toFixed(0) + '%');

async function fetchSessions() {
  try {
    const res = await api.get('/camp/sessions');
    sessions.value = res.data.sessions || [];
    if (sessions.value.length && !sid.value) {
      const active = sessions.value.find((s) => s.status === 'active') || sessions.value[0];
      sid.value = active.id;
      onSessionChange();
    }
  } catch {
    ElMessage.error('获取营期列表失败');
  }
}

function onSessionChange() {
  const s = sessions.value.find((x) => x.id === sid.value);
  if (s) dateRange.value = [s.start_date, s.end_date];   // 默认范围 = 营期起止
  fetchBoard();
}

async function fetchBoard() {
  if (!sid.value) return;
  loading.value = true;
  try {
    const params = {};
    if (dateRange.value && dateRange.value.length === 2) {
      params.from = dateRange.value[0];
      params.to = dateRange.value[1];
    }
    const res = await api.get(`/camp/attendance/dashboard/${sid.value}`, { params });
    if (res.data.code === 200) {
      board.value = res.data;
    } else {
      ElMessage.error(res.data.message || '加载看板失败');
    }
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载看板失败');
  } finally {
    loading.value = false;
  }
}

onMounted(fetchSessions);
</script>

<style scoped>
.camp-attendance-board { padding: 16px; }
.control-bar { margin-bottom: 12px; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.summary-bar { margin-bottom: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
.cell {
  width: 100%; height: 28px; line-height: 28px; text-align: center;
  border-radius: 4px; font-size: 12px; font-weight: 600; cursor: default;
}
.cell-present { background: #f0f9eb; color: #67c23a; }
.cell-late { background: #fdf6ec; color: #e6a23c; }
.cell-short_hours { background: #fef0f0; color: #f56c6c; }
.cell-late_and_short { background: #fde2e2; color: #f56c6c; }
.cell-absent { background: #f4f4f5; color: #bbb; }
.cell-on_leave { background: #ecf5ff; color: #409eff; }
</style>
