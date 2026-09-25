<template>
  <!-- 平台默认项目模板维护（v1.3 阶段4）：负责人创建项目模板时的「平台默认」起点。
       按项目类别维护节点序列（施工图）；下线走状态 archived，不物理删。 -->
  <div class="selectable">
    <div class="page-header">
      <div class="page-title">项目模板</div>
      <div class="header-actions">
        <el-select v-model="statusFilter" size="small" style="width: 120px;" @change="fetchList">
          <el-option label="启用中" value="active" />
          <el-option label="全部" value="all" />
        </el-select>
        <el-button type="primary" size="small" @click="openCreate">新建模板</el-button>
      </div>
    </div>

    <DewCard no-hover class="table-card">
      <el-table :data="rows" v-loading="loading" border size="small">
        <el-table-column label="模板" prop="name" min-width="160" />
        <el-table-column label="适用类别" width="110" align="center">
          <template #default="{ row }">{{ row.category || '通用' }}</template>
        </el-table-column>
        <el-table-column label="节点数" width="80" align="center">
          <template #default="{ row }">{{ row.nodes.length }}</template>
        </el-table-column>
        <el-table-column label="节点概览" min-width="240">
          <template #default="{ row }">
            <span class="node-brief">
              {{ row.nodes.map((n, i) => `${i + 1}.${n.title}${n.submit_mode === 'member' ? '（个）' : ''}`).join(' → ') || '—' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small" effect="plain">
              {{ row.status === 'active' ? '启用中' : '已下线' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" :type="row.status === 'active' ? 'info' : 'success'" plain
              @click="toggleStatus(row)">{{ row.status === 'active' ? '下线' : '启用' }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </DewCard>

    <!-- 新建/编辑弹窗 -->
    <el-dialog v-model="dlg.visible" :title="dlg.id ? '编辑平台模板' : '新建平台模板'" width="640px">
      <el-form :model="dlg.form" label-width="90px">
        <el-form-item label="模板名" required>
          <el-input v-model="dlg.form.name" placeholder="如：硬件研发三阶段" />
        </el-form-item>
        <el-form-item label="适用类别">
          <el-input v-model="dlg.form.category" placeholder="选填，负责人筛选用（如：硬件/软件/调研）" />
        </el-form-item>
        <el-form-item label="节点序列">
          <div class="node-editor">
            <div v-for="(n, i) in dlg.form.nodes" :key="i" class="node-edit-row">
              <span class="node-idx">{{ i + 1 }}</span>
              <el-input v-model="n.title" size="small" placeholder="节点标题" style="width: 160px;" />
              <el-input v-model="n.deliverable_req" size="small" placeholder="交付要求（选填）" style="flex: 1;" />
              <el-select v-model="n.submit_mode" size="small" style="width: 150px;">
                <el-option label="整队交付·老师审" value="team" />
                <el-option label="个人交付·负责人审" value="member" />
              </el-select>
              <el-button size="small" text type="danger" :disabled="dlg.form.nodes.length <= 1" @click="dlg.form.nodes.splice(i, 1)">删</el-button>
            </div>
            <el-button size="small" text type="primary" @click="dlg.form.nodes.push({ title: '', deliverable_req: '', submit_mode: 'team' })">＋ 添加节点</el-button>
            <div class="node-tip">「（个）」= 个人交付节点（成员各交、负责人审）；其余为整队交付（负责人交、老师审）</div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dlg.visible = false">取消</el-button>
          <el-button type="primary" :loading="dlg.submitting" :disabled="!dlg.form.name.trim()" @click="submit">保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { DewCard } from '@bme/dew-ui';
import api from '../api';

const rows = ref([]);
const loading = ref(false);
const statusFilter = ref('active');
const dlg = reactive({ visible: false, id: null, submitting: false, form: { name: '', category: '', nodes: [] } });

async function fetchList() {
  loading.value = true;
  try {
    const res = await api.get('/camp/project-templates', { params: statusFilter.value === 'all' ? { all: 1 } : {} });
    rows.value = res.data.templates || [];
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '加载模板列表失败');
  } finally {
    loading.value = false;
  }
}
onMounted(fetchList);

function blankNode() {
  return { title: '', deliverable_req: '', submit_mode: 'team' };
}
function openCreate() {
  dlg.id = null;
  dlg.form = { name: '', category: '', nodes: [blankNode()] };
  dlg.visible = true;
}
function openEdit(row) {
  dlg.id = row.id;
  dlg.form = {
    name: row.name, category: row.category || '',
    nodes: row.nodes.map((n) => ({ title: n.title, deliverable_req: n.deliverable_req || '', submit_mode: n.submit_mode })),
  };
  dlg.visible = true;
}

async function submit() {
  const nodes = dlg.form.nodes.filter((n) => n.title.trim())
    .map((n) => ({ title: n.title.trim(), deliverable_req: n.deliverable_req.trim() || null, submit_mode: n.submit_mode }));
  if (!dlg.form.name.trim() || !nodes.length) {
    ElMessage.warning('请填写模板名与至少一个节点');
    return;
  }
  dlg.submitting = true;
  try {
    const body = { name: dlg.form.name.trim(), category: dlg.form.category.trim() || null, nodes };
    if (dlg.id) await api.put(`/camp/project-templates/${dlg.id}`, body);
    else await api.post('/camp/project-templates', body);
    ElMessage.success('已保存');
    dlg.visible = false;
    fetchList();
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败');
  } finally {
    dlg.submitting = false;
  }
}

async function toggleStatus(row) {
  const next = row.status === 'active' ? 'archived' : 'active';
  try {
    if (next === 'archived') {
      await ElMessageBox.confirm(`下线「${row.name}」？负责人创建模板时将不再看到它（已引用不受影响）`, '下线模板', {
        confirmButtonText: '下线', cancelButtonText: '取消', type: 'warning',
      });
    }
    await api.put(`/camp/project-templates/${row.id}`, { status: next });
    ElMessage.success(next === 'active' ? '已启用' : '已下线');
    fetchList();
  } catch (e) {
    if (e === 'cancel' || e === 'close') return;
    ElMessage.error(e.response?.data?.message || '操作失败');
  }
}
</script>

<style scoped>
.table-card :deep(.dew-card__body) { padding: 0; }
.node-brief { font-size: 12px; color: var(--text-secondary, #909399); }

.node-editor { width: 100%; display: flex; flex-direction: column; gap: 6px; }
.node-edit-row { display: flex; align-items: center; gap: 6px; }
.node-idx { width: 18px; font-size: 12px; color: var(--text-secondary, #909399); text-align: center; }
.node-tip { font-size: 12px; color: var(--text-secondary, #909399); line-height: 1.5; margin-top: 4px; }
</style>
