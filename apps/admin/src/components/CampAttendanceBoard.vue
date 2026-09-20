<template>
  <div class="camp-attendance-board">
    <!-- 控制条 -->
    <div class="control-bar">
      <el-select v-model="sid" placeholder="选择营期" @change="onSessionChange" style="width: 220px">
        <el-option v-for="s in sessions" :key="s.id" :label="s.name" :value="s.id" />
      </el-select>
      <!-- 日期范围仅每日模式有意义；按周累计固定营期范围 -->
      <el-date-picker v-if="board.mode !== 'weekly'" v-model="dateRange" type="daterange" range-separator="至"
        start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD"
        @change="fetchBoard" style="margin-left: 12px" />
      <el-tag v-else-if="board.range" type="info" style="margin-left: 12px">
        按周累计 · {{ board.range.from }} ~ {{ board.range.to }}
      </el-tag>
      <el-tag type="info" style="margin-left: 12px" v-if="sid">
        当前可见 {{ (board.rows || []).length }} 名学员
        <span v-if="role === 'super_admin'">（全营）</span>
      </el-tag>
      <el-button size="small" style="margin-left: auto" :loading="exporting" @click="exportCsv">导出 CSV</el-button>
    </div>

    <!-- 汇总条（每日模式） -->
    <div class="summary-bar" v-if="board.summary">
      <el-tag type="success">出勤 {{ (board.summary.present || 0) + (board.summary.late || 0) }}{{ board.summary.late ? `（迟到 ${board.summary.late}）` : '' }}</el-tag>
      <el-tag type="warning">未达标 {{ (board.summary.short_hours || 0) + (board.summary.late_and_short || 0) }}{{ board.summary.late_and_short ? `（迟到 ${board.summary.late_and_short}）` : '' }}</el-tag>
      <el-tag type="danger">缺勤 {{ board.summary.absent || 0 }}</el-tag>
      <el-tag type="primary">请假 {{ board.summary.on_leave || 0 }}</el-tag>
      <el-tag>达标率 {{ pct(board.summary.attendance_rate) }}</el-tag>
    </div>

    <!-- 汇总条（按周累计模式） -->
    <div class="summary-bar" v-if="board.mode === 'weekly' && (board.rows || []).length">
      <el-tag type="success">累计打卡 {{ weeklyTotals.days }} 次</el-tag>
      <el-tag>累计时长 {{ weeklyTotals.hours }}h</el-tag>
      <el-tag type="info">按周考察次数与时长，无承诺日/达标率</el-tag>
    </div>

    <!-- 按周累计（学期校区）：学员×周 矩阵，格=次数，tooltip=周范围+时长 -->
    <el-table v-if="board.mode === 'weekly'" :data="board.rows || []" v-loading="loading" border stripe
      :empty-text="sid ? '该营期暂无学员或打卡数据' : '请先选择营期'">
      <el-table-column label="学员" prop="username" fixed="left" min-width="100" />
      <el-table-column v-for="wl in weekCols" :key="wl" :label="wl" min-width="76" align="center">
        <template #default="{ row }">
          <div v-if="row._byWeek && row._byWeek[wl]" class="cell cell-present"
               :title="`${row._byWeek[wl].start?.slice(5)} ~ ${row._byWeek[wl].end?.slice(5)} · ${row._byWeek[wl].hours}h`">
            {{ row._byWeek[wl].days }} 次
          </div>
        </template>
      </el-table-column>
      <el-table-column label="累计" fixed="right" width="120" align="center">
        <template #default="{ row }">{{ row.total_days ?? 0 }} 次 · {{ row.total_hours ?? 0 }}h</template>
      </el-table-column>
    </el-table>

    <!-- 学生×日期 矩阵（每日模式：动态日期列 + 单元格色块） -->
    <el-table v-else :data="board.rows || []" v-loading="loading" border stripe
      :empty-text="sid ? '该范围无承诺出勤日数据' : '请先选择营期'">
      <el-table-column label="学员" prop="username" fixed="left" min-width="100" />
      <el-table-column v-for="d in (board.dates || [])" :key="d" :label="label(d)"
        min-width="56" align="center">
        <template #default="{ row }">
          <div v-if="row.daily && row.daily[d]"
               :class="['cell', 'cell-' + visualKey(row.daily[d].status, d === todayIso), { 'is-late': !!row.daily[d].is_late }]"
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
  present: '✓', late: '✓', short_hours: '短', late_and_short: '短',
  absent: '✗', on_leave: '休', pledged: '·', unpledged: '', in_progress: '…',
};
const STATUS_TEXT = {
  present: '出勤', late: '出勤·迟到',
  short_hours: '未达标', late_and_short: '未达标·迟到',
  absent: '缺勤', on_leave: '请假',
  pledged: '待考勤', in_progress: '进行中', unpledged: '未承诺',
};
const glyph = (s) => GLYPH[s] || '';
// 本地时区今天（toISOString 是 UTC，凌晨会差一天；与 onSessionChange 的取法一致）
const _now = new Date();
const todayIso = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, '0')}-${String(_now.getDate()).padStart(2, '0')}`;

// 渲染归类：与 BME_frontend/src/services/campService.js 的 campVisualKey 保持同步
// 后端 9 态细分保留，视觉收敛为 出勤/未达标/缺勤/请假 + 待考勤/未承诺；迟到=角标
// 今天还没打卡时后端判 absent，前端不下结论 → 归为待考勤
function visualKey(status, isToday = false) {
  if (status === 'absent' && isToday) return 'pending';
  switch (status) {
    case 'present': case 'late': return 'present';
    case 'short_hours': case 'late_and_short': return 'insufficient';
    case 'absent': return 'absent';
    case 'on_leave': return 'on_leave';
    case 'pledged': case 'in_progress': return 'pending';
    default: return 'unpledged';
  }
}

const label = (d) => {              // 'YYYY-MM-DD' → 'M/D'
  const [, m, day] = d.split('-');
  return `${parseInt(m)}/${parseInt(day)}`;
};

const tip = (c) => {
  if (!c) return '';
  const parts = [STATUS_TEXT[c.status] || c.status];
  if (c.is_late) parts.push('迟到');
  if (c.first_check_in) parts.push(`签到 ${c.first_check_in.slice(11, 16)}`);
  if (c.total_hours != null) parts.push(`时长 ${c.total_hours}h`);
  if (c.in_progress) parts.push('未签退');
  return parts.join(' / ');
};

const pct = (r) => (r == null ? '-' : (r * 100).toFixed(0) + '%');

// ── 按周累计（09-13 管理端补盲）：周列 = 全体学员周分桶的并集，行内 _byWeek 索引在 fetchBoard 挂 ──
const weekCols = computed(() => {
  const labels = new Set();
  for (const r of board.value.rows || []) {
    for (const w of r.weeks || []) labels.add(w.label);
  }
  return [...labels].sort();
});
const weeklyTotals = computed(() => (board.value.rows || []).reduce(
  (acc, r) => ({ days: acc.days + (r.total_days || 0), hours: Math.round((acc.hours + (r.total_hours || 0)) * 100) / 100 }),
  { days: 0, hours: 0 }));

// ── 考勤导出（09-13）：daily 带当前日期范围，weekly 固定营期范围 ──
const exporting = ref(false);
async function exportCsv() {
  if (!sid.value) { ElMessage.warning('请先选择营期'); return; }
  exporting.value = true;
  try {
    const params = {};
    if (board.value.mode !== 'weekly' && dateRange.value && dateRange.value.length === 2) {
      params.from = dateRange.value[0];
      params.to = dateRange.value[1];
    }
    const res = await api.get(`/camp/attendance/export/${sid.value}`, { params, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `camp_${sid.value}_attendance.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    // 失败响应也是 blob：尽量解析出后端 message
    let msg = '导出失败，请稍后重试';
    try {
      const text = await e.response?.data?.text();
      if (text) msg = JSON.parse(text).message || msg;
    } catch { /* 非 JSON 响应体，保持通用文案 */ }
    ElMessage.error(msg);
  } finally {
    exporting.value = false;
  }
}

async function fetchSessions() {
  try {
    const res = await api.get('/camp/sessions');
    sessions.value = res.data.sessions || [];
    if (sessions.value.length && !sid.value) {
      // 营期状态机是 running 不是 active（字汇漂移修正，方案 §3.9）
      const active = sessions.value.find((s) => s.status === 'running') || sessions.value[0];
      sid.value = active.id;
      onSessionChange();
    }
  } catch {
    ElMessage.error('获取营期列表失败');
  }
}

function onSessionChange() {
  const s = sessions.value.find((x) => x.id === sid.value);
  if (s) {
    // 默认只看到今天（clamp 到营期范围内）：进行中的营拉全期会带一整排未来空列
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const to = [s.start_date, todayIso, s.end_date].sort()[1];
    dateRange.value = [s.start_date, to];
  }
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
      // weekly 行挂周索引（模板按 label 取格子）
      for (const r of res.data.rows || []) {
        r._byWeek = Object.fromEntries((r.weeks || []).map((w) => [w.label, w]));
      }
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
  position: relative;
}
.cell-present { background: #f0f9eb; color: #67c23a; }
.cell-insufficient { background: #fdf6ec; color: #e6a23c; }
.cell-absent { background: #fef0f0; color: #f56c6c; }
.cell-on_leave { background: #ecf5ff; color: #409eff; }
.cell-pending { background: #f4f4f5; color: #a8abb2; }
.cell-unpledged { background: transparent; color: #dcdfe6; }
.cell.is-late::after {
  content: ''; position: absolute; top: 3px; right: 4px;
  width: 4px; height: 4px; border-radius: 50%; background: #e6a23c;
}
</style>
