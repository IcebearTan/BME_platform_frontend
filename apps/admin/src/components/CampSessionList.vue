<template>
  <div class="camps-page">
    <div class="page-header">
      <div class="page-title">教学周期与营期</div>
      <div class="header-actions">
        <el-button v-if="canManage" type="primary" @click="openCreate">新建营期</el-button>
      </div>
    </div>

    <div class="camps-body">
      <!-- 左：教学周期（父对象终于有管理入口——IA-07 修复） -->
      <DewCard no-hover class="cycle-panel">
        <div class="cycle-panel-head">
          <span>教学周期</span>
          <el-button v-if="canManage" size="small" text type="primary" @click="openCycleCreate">新建</el-button>
        </div>
        <div class="cycle-item" :class="{ active: !selectedCycleId }" @click="selectCycle(null)">
          <span class="cycle-name">全部周期</span>
          <span class="cycle-count">{{ sessions.length }}</span>
        </div>
        <div v-for="c in cycles" :key="c.id" class="cycle-item"
          :class="{ active: selectedCycleId === c.id }" @click="selectCycle(c.id)">
          <span class="cycle-name">{{ c.name }}</span>
          <span class="cycle-count">{{ cycleCount(c.id) }}</span>
          <el-dropdown v-if="canManage" trigger="click" @click.stop>
            <el-icon class="cycle-more"><MoreFilled /></el-icon>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="openCycleEdit(c)">重命名</el-dropdown-item>
                <el-dropdown-item @click="moveCycle(c, -1)" :disabled="cycleIndex(c) === 0">上移</el-dropdown-item>
                <el-dropdown-item @click="moveCycle(c, 1)" :disabled="cycleIndex(c) === cycles.length - 1">下移</el-dropdown-item>
                <el-dropdown-item divided @click="deleteCycle(c)">删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </DewCard>

      <!-- 右：当前周期下的营期 -->
      <div class="camp-panel">
        <div class="camp-filters">
          <el-select v-model="categoryFilter" clearable placeholder="全部类型" style="width: 130px;">
            <el-option label="培训营" value="learning" />
            <el-option label="项目营" value="project" />
          </el-select>
          <el-select v-model="statusFilter" clearable placeholder="全部状态" style="width: 130px;">
            <el-option v-for="(label, s) in STATUS_LABELS" :key="s" :label="label" :value="s" />
          </el-select>
        </div>
        <DewCard no-hover class="table-card">
          <el-table :data="filteredSessions" v-loading="loading" border stripe>
            <el-table-column label="营期名称" prop="name" min-width="160" />
            <el-table-column label="类型" width="90">
              <template #default="{ row }">{{ categoryLabel(row.category) }}</template>
            </el-table-column>
            <el-table-column label="教学周期" width="110">
              <template #default="{ row }">{{ row.cycle_name || '—' }}</template>
            </el-table-column>
            <el-table-column label="起止日期" min-width="190">
              <template #default="{ row }">{{ row.start_date }} ~ {{ row.end_date }}</template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="成员数" prop="member_count" width="80" align="center" />
            <el-table-column label="招募营期" width="110" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.is_featured" type="success" size="small">招募中</el-tag>
                <el-button v-else-if="canManage" size="small" link @click="setFeatured(row)">设为招募</el-button>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="290" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="goDetail(row.id)">进入工作区</el-button>
                <el-button v-if="canManage" size="small" @click="openEdit(row)">编辑</el-button>
                <el-button v-if="canManage && NEXT_ACTION[row.status]" size="small" type="primary" plain @click="transition(row, NEXT_ACTION[row.status])">{{ NEXT_ACTION[row.status].label }}</el-button>
                <el-button v-if="canManage && row.status === 'upcoming'" size="small" @click="transition(row, { action: 'retract', label: '撤回发布' })">撤回</el-button>
                <!-- 09-16 逻辑删除：进行中营不可删（后端同款门禁），先结营归档再删 -->
                <el-button v-if="canManage && row.status !== 'running'" size="small" type="danger" link @click="deleteCamp(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </DewCard>
      </div>
    </div>

    <!-- 新建营期 -->
    <el-dialog v-model="dlg.visible" :title="dlg.editId ? '编辑营期' : '新建营期'" width="520px">
      <el-form :model="dlg.form" label-width="110px">
        <el-form-item label="营期名称" required>
          <el-input v-model="dlg.form.name" placeholder="如 2026暑期训练营" />
        </el-form-item>
        <el-form-item label="营期类型" required>
          <el-select v-model="dlg.form.category" :disabled="!!dlg.editId" style="width:100%">
            <el-option label="培训营" value="learning" />
            <el-option label="项目营" value="project" />
          </el-select>
          <div v-if="dlg.editId" class="field-tip">存量营的营期类型不可修改</div>
        </el-form-item>
        <el-form-item label="教学周期" :required="!dlg.editId">
          <el-select v-model="dlg.form.cycle_id" filterable placeholder="选择教学周期" style="width:100%">
            <el-option v-for="c in cycles" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
          <div v-if="!cycles.length" class="field-tip">暂无教学周期，请先在左侧新建周期</div>
        </el-form-item>
        <el-form-item label="起止日期" required>
          <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
            start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>

        <!-- 09-12 定稿：弹窗只收基本信息——选导生/方向/课程绑定在工作区，考勤参数在「设置与生命周期」 -->
      </el-form>
      <template #footer>
        <el-button @click="dlg.visible = false">取消</el-button>
        <el-button type="primary" :loading="dlg.submitting" @click="submit">{{ dlg.editId ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>

    <!-- 周期新建/重命名 -->
    <el-dialog v-model="cycleDlg.visible" :title="cycleDlg.editId ? '重命名周期' : '新建教学周期'" width="440px">
      <el-form label-width="90px">
        <el-form-item label="周期名称" required>
          <el-input v-model="cycleDlg.name" placeholder="如 2026 秋季" />
        </el-form-item>
        <el-form-item v-if="!cycleDlg.editId" label="周期代码">
          <el-input v-model="cycleDlg.code" placeholder="如 2026-autumn（唯一，创建后不可改）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cycleDlg.visible = false">取消</el-button>
        <el-button type="primary" :loading="cycleDlg.submitting" @click="submitCycle">{{ cycleDlg.editId ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import api from '../api';
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import { MoreFilled } from '@element-plus/icons-vue';
import { DewCard } from '@bme/dew-ui';

const router = useRouter();
const store = useStore();
// 营期管理操作仅老师/超管（mentor 只读查看）
const canManage = computed(() => store.getters.role === 'super_admin');
const sessions = ref([]);
const loading = ref(false);
const dateRange = ref(null);

// 周期⇄营期主从（§7.2）：左选周期，右看该周期营期；默认全部
const selectedCycleId = ref(null);
const categoryFilter = ref('');
const statusFilter = ref('');

const STATUS_LABELS = { draft: '草稿', upcoming: '待开放', selecting: '选择阶段', running: '进行中', archived: '已结营' };

const filteredSessions = computed(() => sessions.value.filter((s) =>
  (!selectedCycleId.value || s.cycle_id === selectedCycleId.value)
  && (!categoryFilter.value || s.category === categoryFilter.value)
  && (!statusFilter.value || s.status === statusFilter.value)));

const cycleCount = (cid) => sessions.value.filter((s) => s.cycle_id === cid).length;
const cycleIndex = (c) => cycles.value.findIndex((x) => x.id === c.id);

function selectCycle(cid) {
  selectedCycleId.value = cid;
}

const dlg = reactive({
  visible: false, submitting: false, editId: null,
  form: { name: '', category: 'learning', cycle_id: null },
});

// 教学周期选项（GET /camp/cycles 全员可读；创建营期必须挂一个周期）
const cycles = ref([]);
const categoryLabel = (c) => ({ learning: '培训营', project: '项目营' }[c] || '培训营');
const statusLabel = (s) => STATUS_LABELS[s] || s;
const statusType = (s) => ({ draft: 'info', upcoming: 'primary', selecting: 'warning', running: 'success', archived: 'info' }[s] || 'info');

async function fetchCycles() {
  try {
    const res = await api.get('/camp/cycles');
    cycles.value = res.data.cycles || [];
  } catch { /* 周期接口失败不阻断列表，建营时给行内提示 */ }
}

async function fetchList() {
  loading.value = true;
  try {
    const res = await api.get('/camp/sessions');
    sessions.value = res.data.sessions || [];
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载营期列表失败');
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  dlg.editId = null;
  // 从当前选中周期进入建营，默认带入（§7.2）
  dlg.form = { name: '', category: 'learning', cycle_id: selectedCycleId.value };
  dateRange.value = null;
  dlg.visible = true;
}

function openEdit(row) {
  dlg.editId = row.id;
  dlg.form = {
    name: row.name, category: row.category || 'learning', cycle_id: row.cycle_id || null, status: row.status,
  };
  dateRange.value = [row.start_date, row.end_date];
  dlg.visible = true;
}

async function submit() {
  if (!dlg.form.name || !dateRange.value || dateRange.value.length !== 2) {
    ElMessage.warning('请填写营期名称和起止日期');
    return;
  }
  // 建营必须挂教学周期（后端强校验）；编辑时周期可改
  if (!dlg.form.cycle_id) {
    ElMessage.warning('请选择教学周期（没有可选时请先在左侧新建周期）');
    return;
  }
  dlg.submitting = true;
  try {
    const body = { ...dlg.form, start_date: dateRange.value[0], end_date: dateRange.value[1] };
    if (dlg.editId) {
      await api.put(`/camp/sessions/${dlg.editId}`, body);
      ElMessage.success('已保存');
    } else {
      await api.post('/camp/sessions', body);
      ElMessage.success('创建成功');
      // 新营落当前所选周期视角下
      selectedCycleId.value = dlg.form.cycle_id;
    }
    dlg.visible = false;
    fetchList();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败');
  } finally {
    dlg.submitting = false;
  }
}

const goDetail = (id) => router.push(`/camps/${id}/overview`);

// ── 周期 CRUD（PUT/DELETE 为 09-21 IA 重构新增端点） ──
const cycleDlg = reactive({ visible: false, editId: null, name: '', code: '', submitting: false });

function openCycleCreate() {
  cycleDlg.editId = null;
  cycleDlg.name = '';
  cycleDlg.code = '';
  cycleDlg.visible = true;
}

function openCycleEdit(c) {
  cycleDlg.editId = c.id;
  cycleDlg.name = c.name;
  cycleDlg.visible = true;
}

async function submitCycle() {
  const name = cycleDlg.name.trim();
  if (!name) { ElMessage.warning('请填写周期名称'); return }
  cycleDlg.submitting = true;
  try {
    if (cycleDlg.editId) {
      await api.put(`/camp/cycles/${cycleDlg.editId}`, { name });
      ElMessage.success('已重命名');
    } else {
      const code = (cycleDlg.code || name).trim();
      await api.post('/camp/cycles', { code, name });
      ElMessage.success('周期已创建');
    }
    cycleDlg.visible = false;
    fetchCycles();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败');
  } finally {
    cycleDlg.submitting = false;
  }
}

// 排序 = 与相邻周期互换 sort_order（无全局排序编辑器，保持轻量）
async function moveCycle(c, dir) {
  const idx = cycleIndex(c);
  const other = cycles.value[idx + dir];
  if (!other) return;
  try {
    await Promise.all([
      api.put(`/camp/cycles/${c.id}`, { sort_order: other.sort_order }),
      api.put(`/camp/cycles/${other.id}`, { sort_order: c.sort_order }),
    ]);
    fetchCycles();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '排序失败');
  }
}

function deleteCycle(c) {
  ElMessageBox.confirm(
    `删除周期「${c.name}」？仅空周期可删（其下仍有营期时后端会拒绝）。`,
    '删除周期', { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    await api.delete(`/camp/cycles/${c.id}`);
    ElMessage.success('已删除');
    if (selectedCycleId.value === c.id) selectedCycleId.value = null;
    fetchCycles();
  }).catch((e) => {
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e.response?.data?.message || '删除失败');
  });
}

// 状态机（H-004）：draft→upcoming→selecting→running→archived，动作制迁移
const NEXT_ACTION = {
  draft: { action: 'publish', label: '发布' },
  upcoming: { action: 'open_enrollment', label: '开放报名' },
  selecting: { action: 'open', label: '开营' },
  running: { action: 'close', label: '结营' },
}
function transition(row, { action, label }) {
  const extra = action === 'close'
    ? '结营后营期转为只读，不可撤销。'
    : action === 'open'
      ? (row.mentor_selection_enabled ? '开营将同步截止选导生志愿（未分配学员的归属可开营后再指定）。' : '')
      : '';
  ElMessageBox.confirm(`确定对「${row.name}」执行「${label}」吗？${extra}`, '状态变更', {
    confirmButtonText: label, cancelButtonText: '取消', type: 'warning',
  }).then(async () => {
    const res = await api.post(`/camp/sessions/${row.id}/transitions`, { action });
    ElMessage.success(res.data?.message || `已${label}`);
    fetchList();
  }).catch((e) => {
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e.response?.data?.message || `${label}失败`);
  });
}

async function setFeatured(row) {
  try {
    await api.put(`/camp/sessions/${row.id}/feature`);
    ElMessage.success(`「${row.name}」已设为招募营期`);
    fetchList();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '设置失败');
  }
}

// 逻辑删除（09-16）：物理数据全保留，从所有列表隐藏；招募指针连带清除
function deleteCamp(row) {
  ElMessageBox.confirm(
    `删除后「${row.name}」将从所有列表隐藏（逻辑删除：成员、考勤与档案数据保留，可由管理员恢复）。`,
    '删除营期', { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    const res = await api.delete(`/camp/sessions/${row.id}`);
    ElMessage.success(res.data?.message || '已删除');
    fetchList();
  }).catch((e) => {
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e.response?.data?.message || '删除失败');
  });
}

onMounted(() => {
  fetchList();
  if (canManage.value) fetchCycles();
});
</script>

<style scoped>
.camps-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.camps-body {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.cycle-panel {
  flex: none;
  width: 230px;
  position: sticky;
  top: 80px;
}

.cycle-panel :deep(.dew-card__body) {
  padding: 8px;
}

.cycle-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.cycle-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.cycle-item:hover {
  background: rgba(var(--primary-color-rgb), 0.06);
}

.cycle-item.active {
  background: rgba(var(--primary-color-rgb), 0.12);
  color: var(--primary-color);
  font-weight: 600;
}

.cycle-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cycle-count {
  font-size: 12px;
  color: var(--text-secondary);
}

.cycle-more {
  color: var(--text-secondary);
  cursor: pointer;
}

.camp-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.camp-filters {
  display: flex;
  gap: 8px;
}

.table-card {
  width: 100%;
}

.table-card :deep(.dew-card__body) {
  padding: 0;
}

.field-tip { width: 100%; font-size: 12px; line-height: 1.5; color: var(--text-secondary); }

@media (max-width: 1024px) {
  .camps-body {
    flex-direction: column;
  }
  .cycle-panel {
    width: 100%;
    position: static;
  }
}
</style>
