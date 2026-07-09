<template>
  <div class="camp-session-list">
    <div class="header-bar">
      <el-button type="primary" @click="openCreate">新建营期</el-button>
    </div>
    <el-table :data="sessions" v-loading="loading" border stripe>
      <el-table-column label="营期名称" prop="name" min-width="160" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">{{ typeLabel(row.camp_type) }}</template>
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
      <el-table-column label="操作" width="190" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="goDetail(row.id)">详情</el-button>
          <el-button v-if="row.status !== 'archived'" size="small" @click="archive(row)">归档</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新建营期 -->
    <el-dialog v-model="dlg.visible" title="新建营期" width="520px">
      <el-form :model="dlg.form" label-width="110px">
        <el-form-item label="营期名称" required>
          <el-input v-model="dlg.form.name" placeholder="如 2026暑期营" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="dlg.form.camp_type" style="width:100%">
            <el-option label="短期营" value="short_term" />
            <el-option label="学期营" value="semester" />
            <el-option label="冬令营" value="winter" />
          </el-select>
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
      </el-form>
      <template #footer>
        <el-button @click="dlg.visible = false">取消</el-button>
        <el-button type="primary" :loading="dlg.submitting" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import api from '../api';
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();
const sessions = ref([]);
const loading = ref(false);
const dateRange = ref(null);

const dlg = reactive({
  visible: false, submitting: false,
  form: { name: '', camp_type: 'short_term', expected_check_in: null, min_daily_hours: 6, weekdays_only: true },
});

const typeLabel = (t) => ({ short_term: '短期营', semester: '学期营', winter: '冬令营' }[t] || t);
const statusLabel = (s) => ({ draft: '草稿', active: '进行中', archived: '已归档' }[s] || s);
const statusType = (s) => ({ draft: 'info', active: 'success', archived: 'warning' }[s] || 'info');

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
  dlg.form = { name: '', camp_type: 'short_term', expected_check_in: null, min_daily_hours: 6, weekdays_only: true };
  dateRange.value = null;
  dlg.visible = true;
}

async function submitCreate() {
  if (!dlg.form.name || !dateRange.value || dateRange.value.length !== 2) {
    ElMessage.warning('请填写营期名称和起止日期');
    return;
  }
  dlg.submitting = true;
  try {
    const body = { ...dlg.form, start_date: dateRange.value[0], end_date: dateRange.value[1] };
    await api.post('/camp/sessions', body);
    ElMessage.success('创建成功');
    dlg.visible = false;
    fetchList();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '创建失败');
  } finally {
    dlg.submitting = false;
  }
}

const goDetail = (id) => router.push(`/camp/sessions/${id}`);

function archive(row) {
  ElMessageBox.confirm(`确定归档「${row.name}」吗？`, '提示', {
    confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
  }).then(async () => {
    await api.put(`/camp/sessions/${row.id}`, { status: 'archived' });
    ElMessage.success('已归档');
    fetchList();
  }).catch(() => {});
}

onMounted(fetchList);
</script>

<style scoped>
.camp-session-list { padding: 16px; }
.header-bar { margin-bottom: 12px; }
</style>
