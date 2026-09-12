<template>
  <div class="camp-session-list">
    <div class="header-bar">
      <el-button v-if="canManage" type="primary" @click="openCreate">新建营期</el-button>
    </div>
    <el-table :data="sessions" v-loading="loading" border stripe>
      <el-table-column label="营期名称" prop="name" min-width="160" />
      <el-table-column label="类型" width="100">
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
      <el-table-column label="招募营期" width="120" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.is_featured" type="success" size="small">招募中</el-tag>
          <el-button v-else-if="canManage" size="small" link @click="setFeatured(row)">设为招募</el-button>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="230" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="goDetail(row.id)">详情</el-button>
          <el-button v-if="canManage" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="canManage && NEXT_ACTION[row.status]" size="small" type="primary" plain @click="transition(row, NEXT_ACTION[row.status])">{{ NEXT_ACTION[row.status].label }}</el-button>
          <el-button v-if="canManage && row.status === 'upcoming'" size="small" @click="transition(row, { action: 'retract', label: '撤回发布' })">撤回</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新建营期 -->
    <el-dialog v-model="dlg.visible" :title="dlg.editId ? '编辑营期' : '新建营期'" width="520px">
      <el-form :model="dlg.form" label-width="110px">
        <el-form-item label="营期名称" required>
          <el-input v-model="dlg.form.name" placeholder="如 2026暑期训练营" />
        </el-form-item>
        <el-form-item label="营期类型" required>
          <el-select v-model="dlg.form.category" :disabled="!!dlg.editId" style="width:100%">
            <el-option label="培训营（学习型）" value="learning" />
            <el-option label="项目营" value="project" />
          </el-select>
          <div v-if="dlg.editId" class="field-tip">存量营的营期类型不可修改</div>
        </el-form-item>
        <el-form-item label="教学周期" :required="!dlg.editId">
          <el-select v-model="dlg.form.cycle_id" filterable placeholder="选择教学周期" style="width:100%">
            <el-option v-for="c in cycles" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
          <div v-if="!cycles.length" class="field-tip">暂无教学周期，请先让管理员创建周期</div>
        </el-form-item>
        <el-form-item label="起止日期" required>
          <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
            start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width:100%" />
        </el-form-item>
        <el-form-item label="期望到岗">
          <el-time-picker v-model="dlg.form.expected_check_in" value-format="HH:mm"
            format="HH:mm" placeholder="如 09:00" style="width:100%" />
        </el-form-item>
        <el-form-item label="每日最低时长">
          <el-input-number v-model="dlg.form.min_daily_hours" :min="0" :step="0.5" /> 小时
        </el-form-item>
        <el-form-item label="仅工作日">
          <el-switch v-model="dlg.form.weekdays_only" />
        </el-form-item>

        <!-- 09-12 定稿：弹窗只收基本信息——选导生/方向/课程绑定全部在创建后的
             营期详情「选导生」tab 配置（draft 状态的意义所在） -->
      </el-form>
      <template #footer>
        <el-button @click="dlg.visible = false">取消</el-button>
        <el-button type="primary" :loading="dlg.submitting" @click="submit">{{ dlg.editId ? '保存' : '创建' }}</el-button>
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

const router = useRouter();
const store = useStore();
// 营期管理操作仅老师/超管（mentor 只读查看）
const canManage = computed(() => store.getters.role === 'super_admin');
const sessions = ref([]);
const loading = ref(false);
const dateRange = ref(null);

const dlg = reactive({
  visible: false, submitting: false, editId: null,
  form: { name: '', category: 'learning', cycle_id: null, expected_check_in: null, min_daily_hours: 6, weekdays_only: true },
});

// 教学周期选项（GET /camp/cycles 全员可读；创建营期必须挂一个周期）
const cycles = ref([]);
const categoryLabel = (c) => ({ learning: '培训营', project: '项目营' }[c] || '培训营');
const statusLabel = (s) => ({ draft: '草稿', upcoming: '待开放', selecting: '选择阶段', running: '进行中', archived: '已结营' }[s] || s);
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
  dlg.form = { name: '', category: 'learning', cycle_id: null, expected_check_in: null, min_daily_hours: 6, weekdays_only: true };
  dateRange.value = null;
  dlg.visible = true;
}

function openEdit(row) {
  dlg.editId = row.id;
  dlg.form = {
    name: row.name, category: row.category || 'learning', cycle_id: row.cycle_id || null, status: row.status,
    expected_check_in: row.expected_check_in ? String(row.expected_check_in).slice(0, 5) : null,
    min_daily_hours: row.min_daily_hours,
    weekdays_only: row.weekdays_only,
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
    ElMessage.warning('请选择教学周期（没有可选时请先让管理员创建周期）');
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
    }
    dlg.visible = false;
    fetchList();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败');
  } finally {
    dlg.submitting = false;
  }
}

const goDetail = (id) => router.push(`/camp/sessions/${id}`);

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

onMounted(() => {
  fetchList();
  if (canManage.value) fetchCycles();
});
</script>

<style scoped>
.camp-session-list { padding: 16px; }
.header-bar { margin-bottom: 12px; }
.ms-tip { margin-left: 10px; font-size: 12px; color: var(--el-text-color-secondary, #909399); }
.field-tip { width: 100%; font-size: 12px; line-height: 1.5; color: var(--el-text-color-secondary, #909399); }
</style>
