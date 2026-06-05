<template>
  <div class="llm-page selectable">
    <div class="page-header">
      <span class="title">大模型用户用量看板</span>
      <el-button @click="openConfig">默认配额配置</el-button>
    </div>

    <el-table :data="users" v-loading="loading" border style="width: 100%">
      <el-table-column prop="user_id" label="用户ID" width="90" />
      <el-table-column prop="username" label="用户名" min-width="120" />
      <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
      <el-table-column prop="key_count" label="Key数" width="80" />
      <el-table-column label="已用($)" width="110">
        <template #default="{ row }">{{ formatMoney(row.spend) }}</template>
      </el-table-column>
      <el-table-column label="额度($)" width="110">
        <template #default="{ row }">{{ formatMoney(row.max_budget) }}</template>
      </el-table-column>
      <el-table-column label="使用率" min-width="160">
        <template #default="{ row }">
          <el-progress :percentage="usagePercent(row)" :status="usageStatus(row)" />
        </template>
      </el-table-column>
      <el-table-column prop="budget_duration" label="周期" width="90" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openQuota(row)">调整额度</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="pagination.total > pagination.per_page"
      style="margin-top: 16px; justify-content: flex-end;"
      layout="prev, pager, next, total"
      :total="pagination.total"
      :page-size="pagination.per_page"
      :current-page="pagination.page"
      @current-change="onPageChange" />

    <!-- 默认配额配置 -->
    <el-dialog v-model="configVisible" title="平台用户默认配额" width="480">
      <el-form :model="config" label-width="120">
        <el-form-item label="默认额度($)">
          <el-input-number v-model="config.default_max_budget" :min="0" :step="1" />
        </el-form-item>
        <el-form-item label="重置周期">
          <el-input v-model="config.budget_duration" placeholder="如 30d / 7d / 1mo" />
        </el-form-item>
        <el-form-item label="允许模型">
          <el-input v-model="config.allowed_models" placeholder="逗号分隔，留空表示全部" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="configVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingConfig" @click="saveConfig">保存</el-button>
      </template>
    </el-dialog>

    <!-- 调整单用户额度 -->
    <el-dialog v-model="quotaVisible" title="调整用户额度" width="420">
      <el-form label-width="120">
        <el-form-item label="用户">
          <span>{{ quotaForm.username }}</span>
        </el-form-item>
        <el-form-item label="新额度($)">
          <el-input-number v-model="quotaForm.max_budget" :min="0" :step="1" />
        </el-form-item>
        <el-form-item label="重置周期">
          <el-input v-model="quotaForm.budget_duration" placeholder="留空保持不变" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="quotaVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingQuota" @click="saveQuota">应用</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import api from '../api';
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

const users = ref([]);
const loading = ref(false);
const pagination = reactive({ page: 1, per_page: 20, total: 0 });

const configVisible = ref(false);
const savingConfig = ref(false);
const config = reactive({ default_max_budget: 5, budget_duration: '30d', allowed_models: '' });

const quotaVisible = ref(false);
const savingQuota = ref(false);
const quotaForm = reactive({ user_id: null, username: '', max_budget: 0, budget_duration: '' });

const formatMoney = (v) => (v === null || v === undefined ? '-' : `$${Number(v).toFixed(4)}`);

const usagePercent = (row) => {
  if (!row.max_budget || row.spend === null || row.spend === undefined) return 0;
  return Math.min(100, Math.round((row.spend / row.max_budget) * 100));
};
const usageStatus = (row) => {
  const p = usagePercent(row);
  if (p >= 100) return 'exception';
  if (p >= 80) return 'warning';
  return 'success';
};

const fetchUsers = async () => {
  loading.value = true;
  try {
    const res = await api.get('/llm/admin/users', { params: { page: pagination.page, per_page: pagination.per_page } });
    const data = res.data.data;
    users.value = data.users || [];
    Object.assign(pagination, data.pagination);
  } catch (e) {
    ElMessage.error('获取用户用量失败');
  } finally {
    loading.value = false;
  }
};

const onPageChange = (p) => {
  pagination.page = p;
  fetchUsers();
};

const openConfig = async () => {
  try {
    const res = await api.get('/llm/admin/quota-config');
    Object.assign(config, res.data.data);
    config.allowed_models = config.allowed_models || '';
    configVisible.value = true;
  } catch (e) {
    ElMessage.error('获取配额配置失败');
  }
};

const saveConfig = async () => {
  savingConfig.value = true;
  try {
    await api.put('/llm/admin/quota-config', { ...config });
    ElMessage.success('已保存');
    configVisible.value = false;
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '保存失败');
  } finally {
    savingConfig.value = false;
  }
};

const openQuota = (row) => {
  quotaForm.user_id = row.user_id;
  quotaForm.username = row.username;
  quotaForm.max_budget = row.max_budget || 0;
  quotaForm.budget_duration = '';
  quotaVisible.value = true;
};

const saveQuota = async () => {
  savingQuota.value = true;
  try {
    const payload = { max_budget: quotaForm.max_budget };
    if (quotaForm.budget_duration) payload.budget_duration = quotaForm.budget_duration;
    await api.put(`/llm/admin/users/${quotaForm.user_id}/quota`, payload);
    ElMessage.success('额度已更新');
    quotaVisible.value = false;
    fetchUsers();
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '更新失败');
  } finally {
    savingQuota.value = false;
  }
};

onMounted(fetchUsers);
</script>

<style scoped>
.llm-page { padding: 20px; box-sizing: border-box; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header .title { font-size: 20px; font-weight: 600; }
</style>
