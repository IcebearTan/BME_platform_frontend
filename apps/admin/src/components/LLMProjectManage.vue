<template>
  <div class="llm-page selectable">
    <div class="page-header">
      <span class="title">大模型项目管理</span>
      <el-button type="primary" @click="openCreate">新建项目</el-button>
    </div>

    <el-table :data="projects" v-loading="loading" border style="width: 100%">
      <el-table-column prop="name" label="项目名" min-width="140" />
      <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip />
      <el-table-column prop="models" label="可用模型" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ row.models || '全部' }}</template>
      </el-table-column>
      <el-table-column prop="litellm_key" label="API Key" min-width="160" />
      <el-table-column prop="spend" label="已用($)" width="110">
        <template #default="{ row }">{{ formatMoney(row.spend) }}</template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="170" />
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="viewUsage(row)">用量</el-button>
          <el-button size="small" type="warning" @click="regenerateKey(row)">重置Key</el-button>
          <el-button size="small" type="danger" @click="removeProject(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新建项目 -->
    <el-dialog v-model="createVisible" title="新建大模型项目" width="520">
      <el-form :model="form" label-width="100">
        <el-form-item label="项目名">
          <el-input v-model="form.name" placeholder="唯一项目名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="可用模型">
          <el-input v-model="form.models" placeholder="逗号分隔，留空表示全部，如 gpt-4o,deepseek-chat" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>

    <!-- 新 Key 展示 -->
    <el-dialog v-model="keyVisible" title="API Key（仅显示一次，请妥善保存）" width="560">
      <el-alert type="warning" :closable="false" show-icon
        title="该 Key 仅在此显示一次，关闭后将无法再次查看完整内容" style="margin-bottom: 12px;" />
      <el-input v-model="plainKey" readonly>
        <template #append>
          <el-button @click="copyKey">复制</el-button>
        </template>
      </el-input>
      <template #footer>
        <el-button type="primary" @click="keyVisible = false">我已保存</el-button>
      </template>
    </el-dialog>

    <!-- 用量详情 -->
    <el-dialog v-model="usageVisible" title="项目用量详情" width="640">
      <pre class="usage-json">{{ usageDetail }}</pre>
      <template #footer>
        <el-button type="primary" @click="usageVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import api from '../api';
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const projects = ref([]);
const loading = ref(false);
const createVisible = ref(false);
const submitting = ref(false);
const keyVisible = ref(false);
const plainKey = ref('');
const usageVisible = ref(false);
const usageDetail = ref('');

const form = reactive({ name: '', description: '', models: '' });

const formatMoney = (v) => (v === null || v === undefined ? '-' : `$${Number(v).toFixed(4)}`);

const fetchProjects = async () => {
  loading.value = true;
  try {
    const res = await api.get('/llm/admin/projects');
    projects.value = res.data.data || [];
  } catch (e) {
    ElMessage.error('获取项目列表失败');
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  form.name = '';
  form.description = '';
  form.models = '';
  createVisible.value = true;
};

const submitCreate = async () => {
  if (!form.name.trim()) {
    ElMessage.warning('请填写项目名');
    return;
  }
  submitting.value = true;
  try {
    const res = await api.post('/llm/admin/projects', { ...form });
    plainKey.value = res.data.data.litellm_key;
    createVisible.value = false;
    keyVisible.value = true;
    ElMessage.success('项目创建成功');
    fetchProjects();
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '创建失败');
  } finally {
    submitting.value = false;
  }
};

const regenerateKey = async (row) => {
  try {
    await ElMessageBox.confirm(`确认重置项目「${row.name}」的 API Key？旧 Key 将立即失效。`, '提示', { type: 'warning' });
  } catch { return; }
  try {
    const res = await api.post(`/llm/admin/projects/${row.id}/regenerate-key`);
    plainKey.value = res.data.data.litellm_key;
    keyVisible.value = true;
    fetchProjects();
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '重置失败');
  }
};

const removeProject = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除项目「${row.name}」？`, '提示', { type: 'warning' });
  } catch { return; }
  try {
    await api.delete(`/llm/admin/projects/${row.id}`);
    ElMessage.success('已删除');
    fetchProjects();
  } catch (e) {
    ElMessage.error(e?.response?.data?.message || '删除失败');
  }
};

const viewUsage = async (row) => {
  try {
    const res = await api.get(`/llm/admin/projects/${row.id}`);
    usageDetail.value = JSON.stringify(res.data.data.usage, null, 2);
    usageVisible.value = true;
  } catch (e) {
    ElMessage.error('获取用量失败');
  }
};

const copyKey = async () => {
  try {
    await navigator.clipboard.writeText(plainKey.value);
    ElMessage.success('已复制');
  } catch {
    ElMessage.warning('复制失败，请手动复制');
  }
};

onMounted(fetchProjects);
</script>

<style scoped>
.llm-page { padding: 20px; box-sizing: border-box; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header .title { font-size: 20px; font-weight: 600; }
.usage-json { max-height: 420px; overflow: auto; background: #f5f7fa; padding: 12px; border-radius: 6px; font-size: 12px; }
</style>
